'use strict';

var DialogueType = {
    IntroControls: 'intro_controls',
    TunnelIntro: 'tunnel_intro',
    TunnelExitNoFood: 'tunnel_exit_no_food',
    TrollTeleport: 'troll_teleport',
    ExitPreResult: 'exit_pre_result',
    ExitResultSummary: 'exit_result_summary',
};

var DialogueContent = {};
DialogueContent[DialogueType.IntroControls] = {
    text: 'WASD / Arrow Keys: Run\nShift: Walk\nE: Interact / Use item\nGood Luck!',
    confirmText: '[E] Start',
};
DialogueContent[DialogueType.TunnelIntro] = {
    pages: [
        'Oh my god where am I?\nIt\'s an exit doesn\'t it... What happened???',
        'It\'s so dark, and kinda feels suffocating...',
        'I need to find a way out of here.',
    ],
    confirmText: '[E] Continue',
    finalConfirmText: '[E] Continue',
};
DialogueContent[DialogueType.TunnelExitNoFood] = {
    text: "Oh shit, I didn't brought any food for Mei...",
    confirmText: '[E] Continue',
};
DialogueContent[DialogueType.TrollTeleport] = {
    text: 'wtf?',
    confirmText: '[E] Continue',
};
DialogueContent[DialogueType.ExitPreResult] = {
    pages: [
        '(MC Opened the door, light went in)',
        'Oh my god, this is actually the exit?',
        'Still don\'t understand why I get into here...',
        'But at least I made it out safely :)',
    ],
    confirmText: '[E] Continue',
    finalConfirmText: '[E] Continue',
};
DialogueContent[DialogueType.ExitResultSummary] = {
    text: '',
    confirmText: '[E] Confirm',
    panelWidth: 460,
    panelHeight: 190,
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
        this.pageIndex = this.pageIndex || 0;
        this._ensureRoot();
        this._ensureOrderRoot();
    },

    show: function (type, onConfirm) {
        var content = this._getContent(type);
        if (!content) return false;

        this._ensureRoot();
        this.activeType = type;
        this.onConfirm = onConfirm || null;
        this.pageIndex = 0;
        this._root.active = true;
        this._setHudHidden(true);
        this._renderSimpleContent(content);
        this._layout();
        return true;
    },

    confirm: function () {
        if (!this.activeType) return false;

        var content = this._getContent(this.activeType);
        if (content && content.pages && this.pageIndex < content.pages.length - 1) {
            this.pageIndex++;
            this._renderSimpleContent(content);
            this._layout();
            return true;
        }

        var callback = this.onConfirm;
        this.close();
        if (callback) callback();
        return true;
    },

    close: function () {
        this.activeType = null;
        this.onConfirm = null;
        this.pageIndex = 0;
        if (this._root && this._root.isValid) this._root.active = false;
        if (this._orderRoot && this._orderRoot.isValid) this._orderRoot.active = false;
        this._setHudHidden(false);
    },

    isOpen: function () {
        return !!this.activeType;
    },

    isSimpleOpen: function () {
        return !!this.activeType && this.activeType !== 'order';
    },

    isOrderOpen: function () {
        return this.activeType === 'order';
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
        this._setHudHidden(true);
        this._renderOrder(state, selectedIndex || 0, heldItem);
        return true;
    },

    closeOrder: function () {
        if (this.activeType === 'order') this.activeType = null;
        if (this._orderRoot && this._orderRoot.isValid) this._orderRoot.active = false;
        this._setHudHidden(false);
    },

    update: function () {
        if (this.isOpen()) this._layout();
        if (this.activeType === 'order') this._layoutOrder();
    },

    _ensureRoot: function () {
        if (this._root && this._root.isValid) {
            this._ensureRootParent(this._root);
            return;
        }

        var root = new cc.Node('NPDialogueRoot');
        root.zIndex = 2400;
        root.active = false;
        this.node.addChild(root, 2400);
        this._root = root;
        this._ensureRootParent(root);

        var bg = new cc.Node('DialoguePanel');
        root.addChild(bg, 0);
        this._bg = bg;

        this._textLabel = this._createLabel('DialogueText', '', 20, cc.Color.BLACK);
        this._textLabel.getComponent(cc.Label).horizontalAlign = cc.Label.HorizontalAlign.LEFT;
        root.addChild(this._textLabel, 1);

        this._confirmLabel = this._createLabel('ConfirmText', '', 20, cc.color(155, 145, 30));
        root.addChild(this._confirmLabel, 1);
    },

    _ensureOrderRoot: function () {
        if (this._orderRoot && this._orderRoot.isValid) {
            this._ensureRootParent(this._orderRoot);
            return;
        }

        var root = new cc.Node('NPOrderDialogueRoot');
        root.zIndex = 2400;
        root.active = false;
        this.node.addChild(root, 2400);
        this._orderRoot = root;
        this._ensureRootParent(root);

        this._orderDialogueBg = this._createPanelNode('DialoguePanel');
        root.addChild(this._orderDialogueBg, 0);

        this._orderDialogueLabel = this._createLabel('DialogueText', '', 16, cc.Color.BLACK);
        root.addChild(this._orderDialogueLabel, 2);

        this._orderHelpLabel = this._createLabel('OrderHelp', '[W/S] Select    [E] Confirm    [R] Back', 16, cc.color(155, 145, 30));
        root.addChild(this._orderHelpLabel, 2);

        this._orderChoiceButtons = [];
        this._orderChoiceBgs = [];
        this._orderChoiceLabels = [];
        for (var i = 0; i < 4; i++) {
            var button = new cc.Node('ChoiceButton' + i);
            button.setAnchorPoint(0.5, 0.5);
            root.addChild(button, 3);

            var bg = this._createPanelNode('ChoiceButtonBg' + i);
            button.addChild(bg, 0);

            var label = this._createLabel('Choice' + i, '', 16, cc.Color.WHITE);
            label.getComponent(cc.Label).horizontalAlign = cc.Label.HorizontalAlign.LEFT;
            button.addChild(label, 1);

            this._orderChoiceButtons.push(button);
            this._orderChoiceBgs.push(bg);
            this._orderChoiceLabels.push(label);
        }
    },

    _createPanelNode: function (name) {
        var node = new cc.Node(name);
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
        var cameraUi = this._updateRootTransform(this._root);
        var zoom = camera ? (camera.zoomRatio || 1) : 1;
        var viewW = cameraUi ? cc.winSize.width : cc.winSize.width / zoom;
        var viewH = cameraUi ? cc.winSize.height : cc.winSize.height / zoom;
        var content = this._getContent(this.activeType);
        var widthLimit = content && content.panelWidth
            ? content.panelWidth
            : (this.game ? (this.game.dialoguePanelWidth || 420) : 420);
        var width = Math.min(Math.max(220, viewW - 80), widthLimit);
        var height = content && content.panelHeight
            ? content.panelHeight
            : (this.game ? (this.game.dialoguePanelHeight || 150) : 150);
        var y = Math.min(viewH / 2 - height / 2 - 28, 86);

        this._bg.setPosition(0, y);
        this._drawPanel(this._bg, width, height, null, null, this._getDialoguePanelSprite());

        this._textLabel.setContentSize(width - 34, height - 48);
        this._textLabel.setPosition(0, y + 12);
        this._confirmLabel.setContentSize(width - 24, 22);
        this._confirmLabel.setPosition(0, y - height / 2 + 20);
    },

    _renderOrder: function (state, selectedIndex, heldItem) {
        this._orderSelectedIndex = selectedIndex || 0;
        var held = heldItem ? 'Holding: ' + this._formatItemName(heldItem) + '\n' : '';
        this._orderDialogueLabel.getComponent(cc.Label).string = held + state.text;

        for (var i = 0; i < this._orderChoiceLabels.length; i++) {
            var node = this._orderChoiceLabels[i];
            var button = this._orderChoiceButtons[i];
            var choice = state.choices[i];
            if (!choice) {
                if (button) button.active = false;
                node.active = false;
                continue;
            }

            if (button) button.active = true;
            node.active = true;
            node.getComponent(cc.Label).string =
                (i === selectedIndex ? '> ' : '  ') + (i + 1) + '. ' + choice.label;
            node.color = i === selectedIndex
                ? cc.color(255, 235, 80)
                : cc.Color.WHITE;
        }

        this._layoutOrder();
    },

    _renderSimpleContent: function (content) {
        if (!content) return;

        var pages = content.pages || null;
        var text = pages
            ? (pages[this.pageIndex] || '')
            : (content.text || '');
        var isLastPage = !pages || this.pageIndex >= pages.length - 1;
        var confirmText = isLastPage && content.finalConfirmText
            ? content.finalConfirmText
            : (content.confirmText || '[E] Confirm');

        this._textLabel.getComponent(cc.Label).string = text;
        this._confirmLabel.getComponent(cc.Label).string = confirmText;
    },

    _layoutOrder: function () {
        if (!this._orderRoot || !this._orderRoot.isValid || !this._orderRoot.active) return;

        var camera = this.game && this.game._camera;
        var cameraUi = this._updateRootTransform(this._orderRoot);
        var zoom = camera ? (camera.zoomRatio || 1) : 1;
        var viewW = cameraUi ? cc.winSize.width : cc.winSize.width / zoom;
        var dialogueW = viewW - 80;
        var viewH = cameraUi ? cc.winSize.height : cc.winSize.height / zoom;
        var dialogH = this.game ? this.game.orderDialogueHeight : 100;
        var dialogY = -viewH / 2 + dialogH / 2 + 10;
        var buttonW = this.game ? (this.game.orderButtonWidth || 260) : 260;
        var buttonH = this.game ? (this.game.orderButtonHeight || 26) : 26;
        var buttonGap = this.game ? (this.game.orderButtonGap || 4) : 4;
        var lineH = this.game ? this.game.orderChoiceLineHeight : 24;

        this._orderDialogueBg.setPosition(0, dialogY);
        this._drawPanel(this._orderDialogueBg, dialogueW, dialogH, cc.color(20, 18, 45, 210), cc.color(255, 70, 70, 230), this._getDialoguePanelSprite());

        this._orderDialogueLabel.setPosition(0, dialogY + 18);
        this._orderHelpLabel.setPosition(dialogueW / 2 - 175, dialogY - dialogH / 2 + 22);

        var activeCount = 0;
        for (var i = 0; i < this._orderChoiceLabels.length; i++) {
            if (this._orderChoiceButtons[i] && this._orderChoiceButtons[i].active) activeCount++;
        }

        var totalH = Math.max(1, activeCount) * buttonH + Math.max(0, activeCount - 1) * buttonGap;
        var startY = 36 + totalH / 2 - buttonH / 2;
        var visibleIndex = 0;
        for (var j = 0; j < this._orderChoiceLabels.length; j++) {
            var button = this._orderChoiceButtons[j];
            var label = this._orderChoiceLabels[j];
            if (!button || !button.active) continue;

            var y = startY - visibleIndex * (buttonH + buttonGap);
            button.setContentSize(buttonW, buttonH);
            button.setPosition(0, y);
            this._drawPanel(
                this._orderChoiceBgs[j],
                buttonW,
                buttonH,
                j === this._orderSelectedIndex ? cc.color(58, 70, 165, 230) : cc.color(35, 50, 120, 215),
                j === this._orderSelectedIndex ? cc.color(255, 235, 80, 245) : cc.color(95, 130, 225, 230),
                this._getDialogueButtonSprite()
            );
            label.setContentSize(buttonW - 26, Math.max(lineH, buttonH));
            label.setPosition(0, 0);
            visibleIndex++;
        }
    },

    _getCameraPosition: function () {
        if (this.game && this.game._getCameraPositionInGameNode) {
            return this.game._getCameraPositionInGameNode();
        }
        var camera = this.game && this.game._camera;
        if (!camera || !camera.node) return cc.v2(0, 0);
        return camera.node.getPosition();
    },

    _ensureRootParent: function (root) {
        if (!root || !root.isValid) return;
        var camera = this.game && this.game._camera;
        if (!camera || !camera.node || !camera.node.isValid) return;
        if (root.parent === camera.node) return;

        root.parent = camera.node;
        root.zIndex = 2400;
        root.setPosition(0, 0);
    },

    _updateRootTransform: function (root) {
        if (!root || !root.isValid) return false;
        this._ensureRootParent(root);

        var camera = this.game && this.game._camera;
        if (camera && camera.node && root.parent === camera.node) {
            var zoom = camera.zoomRatio || 1;
            root.setPosition(0, 0);
            root.setScale(1 / zoom);
            return true;
        }

        root.setPosition(this._getCameraPosition());
        root.setScale(1, 1);
        return false;
    },

    _drawPanel: function (node, width, height, fillColor, strokeColor, spriteFrame) {
        if (!node || !node.isValid) return;

        node.setContentSize(width, height);

        var sprite = node.getComponent(cc.Sprite);
        var gfx = node.getComponent(cc.Graphics);
        if (spriteFrame) {
            if (!sprite) sprite = node.addComponent(cc.Sprite);
            sprite.spriteFrame = spriteFrame;
            sprite.type = cc.Sprite.Type.SLICED;
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            node.setContentSize(width, height);
            if (gfx) gfx.clear();
            this._drawGuiShadow(node, width, height);
            return;
        }

        if (sprite) sprite.spriteFrame = null;
        if (!gfx) gfx = node.addComponent(cc.Graphics);
        gfx.clear();
        gfx.fillColor = fillColor || cc.color(25, 48, 150, 220);
        gfx.strokeColor = strokeColor || cc.color(70, 130, 255, 245);
        gfx.lineWidth = 2;
        gfx.rect(-width / 2, -height / 2, width, height);
        gfx.fill();
        gfx.stroke();
        this._drawGuiShadow(node, width, height);
    },

    _drawGuiShadow: function (node, width, height) {
        if (!node || !node.isValid) return;

        var game = this.game || {};
        var oldChildShadow = node.getChildByName('GuiDropShadow');
        if (oldChildShadow && oldChildShadow.isValid) oldChildShadow.destroy();

        var shadowName = node.name + '_GuiDropShadow';
        var shadow = node.parent ? node.parent.getChildByName(shadowName) : null;
        if (!game.guiShadowSprite) {
            if (shadow && shadow.isValid) shadow.active = false;
            return;
        }

        if (!node.parent) return;
        if (!shadow || !shadow.isValid) {
            shadow = new cc.Node(shadowName);
            shadow.setAnchorPoint(0.5, 0.5);
            node.parent.addChild(shadow, (node.zIndex || 0) - 1);
            var sprite = shadow.addComponent(cc.Sprite);
            sprite.type = cc.Sprite.Type.SLICED;
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        }

        shadow.zIndex = (node.zIndex || 0) - 1;
        var shadowSprite = shadow.getComponent(cc.Sprite);
        shadowSprite.spriteFrame = game.guiShadowSprite;
        shadowSprite.type = cc.Sprite.Type.SLICED;
        shadowSprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        shadow.setContentSize(width, height);
        shadow.setPosition(
            node.x + (typeof game.guiShadowOffsetX === 'number' ? game.guiShadowOffsetX : -3),
            node.y + (typeof game.guiShadowOffsetY === 'number' ? game.guiShadowOffsetY : -3)
        );
        shadow.active = true;
    },

    _getDialoguePanelSprite: function () {
        return this.game ? (this.game.dialoguePanelSprite || null) : null;
    },

    _getDialogueButtonSprite: function () {
        return this.game ? (this.game.dialogueButtonSprite || null) : null;
    },

    _setHudHidden: function (hidden) {
        if (this.game && this.game._setHudHiddenForDialogue) {
            this.game._setHudHiddenForDialogue(hidden);
        }
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
