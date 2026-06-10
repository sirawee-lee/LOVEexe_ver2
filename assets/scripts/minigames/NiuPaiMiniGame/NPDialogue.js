'use strict';

var DialogueType = {
    IntroControls: 'intro_controls',
};

var DialogueContent = {};
DialogueContent[DialogueType.IntroControls] = {
    text: 'Controls\nWASD / Arrow Keys: Run\nShift: Walk\nE: Interact / Use item\nP: Pause\nGet the correct food and make it out safely! good luck!',
    confirmText: '[E] Start',
};
DialogueContent.OrderFlow = {
    askOrder: {
        text: 'Do I want to order food?',
        choices: [
            { label: 'Yes, order food', next: 'askHelper' },
            { label: 'No, leave counter', action: 'close' },
        ],
    },
    askHelper: {
        text: 'Niu Pai: Woof Woof! \n(I can help you wait in line and order the food.)',
        choices: [
            { label: 'Let Niu Pai help', actor: 'niupai', mode: 'wait', next: 'niuPaiCut' },
            { label: 'Order by myself', actor: 'player', next: 'askLine' },
        ],
    },
    askLine: {
        text: 'Should I be a civilized individual?',
        choices: [
            { label: 'Wait in line', mode: 'wait', next: 'chooseFood' },
            { label: 'Cut in line', mode: 'cut', next: 'chooseFood' },
        ],
    },
    niuPaiCut: {
        text: '(from other customers): Wow Niu Pai is so cute!\n(Some customers let Niu Pai cut in line.)',
        choices: [
            { label: '(Pat Niu Pai) Good Boy!', next: 'chooseFood' },
        ],
    },
    chooseFood: {
        text: 'What food should I order for her?',
        choices: [
            { label: 'Apple Pie', item: 'apple_pie', next: 'orderComplete' },
            { label: 'Big Mac', item: 'bigmac', next: 'orderComplete' },
            { label: 'McFlurry', item: 'mcflurry', next: 'orderComplete' },
        ],
    },
    orderComplete: {
        text: 'Order complete. Take the food and get out safely \nafter the deal is done.',
        choices: [
            { label: 'Done', action: 'close' },
        ],
    },
};
DialogueContent.ItemLabels = {
    apple_pie: 'Apple Pie',
    bigmac: 'Big Mac',
    mcflurry: 'McFlurry',
};

var NPDialogue = cc.Class({
    name: 'NPDialogue',
    extends: cc.Component,

    properties: {},

    init: function (game) {
        this.game = game;
        this.activeType = this.activeType || null;
        this.onConfirm = this.onConfirm || null;
        this._ensureRoot();
        this._ensureOrderRoot();
    },

    show: function (type, onConfirm) {
        var content = this._getContent(type);
        if (!content) return false;

        this._ensureRoot();
        this.activeType = type;
        this.onConfirm = onConfirm || null;
        this._root.active = true;
        this._textLabel.getComponent(cc.Label).string = content.text || '';
        this._confirmLabel.getComponent(cc.Label).string = content.confirmText || '[E] Confirm';
        this._layout();
        return true;
    },

    confirm: function () {
        if (!this.activeType) return false;

        var callback = this.onConfirm;
        this.close();
        if (callback) callback();
        return true;
    },

    close: function () {
        this.activeType = null;
        this.onConfirm = null;
        if (this._root && this._root.isValid) this._root.active = false;
        if (this._orderRoot && this._orderRoot.isValid) this._orderRoot.active = false;
    },

    isOpen: function () {
        return !!this.activeType;
    },

    isSimpleOpen: function () {
        return !!this.activeType && this.activeType !== 'order';
    },

    getOrderFlow: function () {
        return DialogueContent.OrderFlow;
    },

    getOrderState: function (stateKey) {
        return DialogueContent.OrderFlow[stateKey] || null;
    },

    getOrderChoice: function (stateKey, index) {
        var state = this.getOrderState(stateKey);
        return state && state.choices ? state.choices[index] : null;
    },

    showOrder: function (stateKey, selectedIndex, heldItem) {
        var state = this.getOrderState(stateKey);
        if (!state) return false;

        this._ensureOrderRoot();
        this.activeType = 'order';
        this._orderRoot.active = true;
        this._renderOrder(state, selectedIndex || 0, heldItem);
        return true;
    },

    closeOrder: function () {
        if (this.activeType === 'order') this.activeType = null;
        if (this._orderRoot && this._orderRoot.isValid) this._orderRoot.active = false;
    },

    update: function () {
        if (this.isOpen()) this._layout();
        if (this.activeType === 'order') this._layoutOrder();
    },

    _ensureRoot: function () {
        if (this._root && this._root.isValid) return;

        var root = new cc.Node('NPDialogueRoot');
        root.zIndex = 2400;
        root.active = false;
        this.node.addChild(root, 2400);
        this._root = root;

        var bg = new cc.Node('DialoguePanel');
        bg.addComponent(cc.Graphics);
        root.addChild(bg, 0);
        this._bg = bg;

        this._textLabel = this._createLabel('DialogueText', '', 14, cc.Color.WHITE);
        this._textLabel.getComponent(cc.Label).horizontalAlign = cc.Label.HorizontalAlign.LEFT;
        root.addChild(this._textLabel, 1);

        this._confirmLabel = this._createLabel('ConfirmText', '', 11, cc.color(255, 235, 130));
        root.addChild(this._confirmLabel, 1);
    },

    _ensureOrderRoot: function () {
        if (this._orderRoot && this._orderRoot.isValid) return;

        var root = new cc.Node('NPOrderDialogueRoot');
        root.zIndex = 2400;
        root.active = false;
        this.node.addChild(root, 2400);
        this._orderRoot = root;

        this._orderDialogueBg = this._createPanelNode('DialoguePanel');
        root.addChild(this._orderDialogueBg, 0);

        this._orderMenuBg = this._createPanelNode('ChoicePanel');
        root.addChild(this._orderMenuBg, 1);

        this._orderDialogueLabel = this._createLabel('DialogueText', '', 15, cc.Color.WHITE);
        root.addChild(this._orderDialogueLabel, 2);

        this._orderHelpLabel = this._createLabel('OrderHelp', '[W/S] Select    [E] Confirm    [R] Back', 10, cc.color(210, 220, 255));
        root.addChild(this._orderHelpLabel, 2);

        this._orderChoiceLabels = [];
        for (var i = 0; i < 4; i++) {
            var label = this._createLabel('Choice' + i, '', 14, cc.Color.WHITE);
            root.addChild(label, 3);
            this._orderChoiceLabels.push(label);
        }
    },

    _createPanelNode: function (name) {
        var node = new cc.Node(name);
        node.addComponent(cc.Graphics);
        return node;
    },

    _createLabel: function (name, text, size, color) {
        var node = new cc.Node(name);
        var label = node.addComponent(cc.Label);
        label.string = text;
        label.font = this.game ? this.game.labelFont : null;
        label.fontSize = size;
        label.lineHeight = size + 6;
        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        label.verticalAlign = cc.Label.VerticalAlign.CENTER;
        label.overflow = cc.Label.Overflow.NONE;
        node.color = color || cc.Color.WHITE;
        return node;
    },

    _layout: function () {
        if (!this._root || !this._root.isValid) return;
        if (!this._root.active) return;

        var camera = this.game && this.game._camera;
        var cameraPos = camera && camera.node ? camera.node.getPosition() : cc.v2(0, 0);
        this._root.setPosition(cameraPos);

        var zoom = camera ? (camera.zoomRatio || 1) : 1;
        var viewW = cc.winSize.width / zoom;
        var viewH = cc.winSize.height / zoom;
        var width = Math.min(Math.max(220, viewW - 80), this.game ? (this.game.dialoguePanelWidth || 420) : 420);
        var height = this.game ? (this.game.dialoguePanelHeight || 150) : 150;
        var y = Math.min(viewH / 2 - height / 2 - 28, 86);

        this._drawPanel(this._bg, width, height);
        this._bg.setPosition(0, y);

        this._textLabel.setContentSize(width - 34, height - 48);
        this._textLabel.setPosition(0, y + 12);
        this._confirmLabel.setContentSize(width - 24, 22);
        this._confirmLabel.setPosition(0, y - height / 2 + 20);
    },

    _renderOrder: function (state, selectedIndex, heldItem) {
        this._layoutOrder();

        var held = heldItem ? 'Holding: ' + this._formatItemName(heldItem) + '\n' : '';
        this._orderDialogueLabel.getComponent(cc.Label).string = held + state.text;

        for (var i = 0; i < this._orderChoiceLabels.length; i++) {
            var node = this._orderChoiceLabels[i];
            var choice = state.choices[i];
            if (!choice) {
                node.active = false;
                continue;
            }

            node.active = true;
            node.getComponent(cc.Label).string =
                (i === selectedIndex ? '> ' : '  ') + (i + 1) + '. ' + choice.label;
            node.color = i === selectedIndex
                ? cc.color(255, 235, 80)
                : cc.Color.WHITE;
        }
    },

    _layoutOrder: function () {
        if (!this._orderRoot || !this._orderRoot.isValid || !this._orderRoot.active) return;

        var camera = this.game && this.game._camera;
        var cameraPos = camera && camera.node ? camera.node.getPosition() : cc.v2(0, 0);
        this._orderRoot.setPosition(cameraPos);

        var zoom = camera ? (camera.zoomRatio || 1) : 1;
        var viewW = cc.winSize.width / zoom;
        var viewH = cc.winSize.height / zoom;
        var dialogH = this.game ? this.game.orderDialogueHeight : 100;
        var dialogY = -viewH / 2 + dialogH / 2;
        var menuW = this.game ? this.game.orderMenuWidth : 300;
        var menuH = this.game ? this.game.orderMenuHeight : 125;
        var lineH = this.game ? this.game.orderChoiceLineHeight : 24;

        this._drawPanel(this._orderDialogueBg, viewW, dialogH, cc.color(20, 18, 45, 210), cc.color(255, 70, 70, 230));
        this._orderDialogueBg.setPosition(0, dialogY);

        this._drawPanel(this._orderMenuBg, menuW, menuH, cc.color(30, 64, 150, 200), cc.color(90, 140, 255, 230));
        this._orderMenuBg.setPosition(0, 22);

        this._orderDialogueLabel.setPosition(0, dialogY + 18);
        this._orderHelpLabel.setPosition(viewW / 2 - 175, dialogY - dialogH / 2 + 22);

        var startY = 58;
        for (var i = 0; i < this._orderChoiceLabels.length; i++) {
            this._orderChoiceLabels[i].setPosition(0, startY - (i + 1) * lineH);
        }
    },

    _drawPanel: function (node, width, height, fillColor, strokeColor) {
        var gfx = node.getComponent(cc.Graphics);
        gfx.clear();
        gfx.fillColor = fillColor || cc.color(25, 48, 150, 220);
        gfx.strokeColor = strokeColor || cc.color(70, 130, 255, 245);
        gfx.lineWidth = 2;
        gfx.rect(-width / 2, -height / 2, width, height);
        gfx.fill();
        gfx.stroke();
    },

    _formatItemName: function (item) {
        return DialogueContent.ItemLabels[item] || item || '';
    },

    _getContent: function (type) {
        var content = DialogueContent[type];
        if (!content) {
            cc.warn('[NiuPai] Missing dialogue content for type: ' + type);
            return null;
        }
        return content;
    },
});

NPDialogue.Type = DialogueType;
NPDialogue.Content = DialogueContent;

module.exports = NPDialogue;
