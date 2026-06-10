'use strict';

var NotificationType = {
    NiuPaiOrderDone: 'niupai_order_done',
    FirstNormieBump: 'first_normie_bump',
    FirstApplePie: 'first_apple_pie',
    FirstBigMac: 'first_bigmac',
    FirstMcFlurry: 'first_mcflurry',
    FirstObstacleBump: 'first_obstacle_bump',
    WalletSeen: 'wallet_seen',
    FirstWalletPickup: 'first_wallet_pickup',
    NiuPaiHurt: 'niupai_hurt',
};

var NotificationContent = {};
NotificationContent[NotificationType.NiuPaiOrderDone] = {
    id: 'niupai_order_done',
    text: 'woof! woof!\n(Order is ready!)',
    persistent: true,
};
NotificationContent[NotificationType.FirstNormieBump] = {
    id: 'first_normie_bump',
    text: 'Hey! Do not run inside! I almost spilled my food!',
};
NotificationContent[NotificationType.FirstApplePie] = {
    id: 'first_item_apple_pie',
    text: 'The smell of cinnamon with the sweet-and-sour apple filling...\n Feels so COMFORTING!',
};
NotificationContent[NotificationType.FirstBigMac] = {
    id: 'first_item_bigmac',
    text: 'Who can resist the irresistible Big Mac?\nEven the DOGS love it!',
};
NotificationContent[NotificationType.FirstMcFlurry] = {
    id: 'first_item_mcflurry',
    text: 'This McFlurry is freezing cold...\nMight cause some BRAIN FREEZE~',
};
NotificationContent[NotificationType.FirstObstacleBump] = {
    id: 'first_obstacle_bump',
    text: 'something is on my way...\nbut this seems pretty brittle...',
};
NotificationContent[NotificationType.WalletSeen] = {
    id: 'wallet_seen',
    text: "hey there's a wallet...\n(Walk slowly to pick it up!)",
};
NotificationContent[NotificationType.FirstWalletPickup] = {
    id: 'first_wallet_pickup',
    text: "Hmm... Hopefully somebody didn't notice >:)",
};
NotificationContent[NotificationType.NiuPaiHurt] = {
    id: 'niupai_hurt',
    text: 'oh no niupai was hurt,\nsave him immediately!',
};

var NPNotification = cc.Class({
    name: 'NPNotification',
    extends: cc.Component,

    properties: {},

    init: function (game) {
        this.game = game;
        this.entries = this.entries || [];
        this._ensureRoot();
    },

    clear: function () {
        this.entries = [];
        if (this._root && this._root.isValid) {
            this._root.destroyAllChildren();
            this._root.active = false;
        }
    },

    showTimed: function (type, duration) {
        var content = this._getContent(type);
        if (!content) return;
        this._show(content.id || type, content.text, Math.max(0.01, duration || content.duration || this._getDefaultDuration()), false);
    },

    showPersistent: function (type) {
        var content = this._getContent(type);
        if (!content) return;
        this._show(content.id || type, content.text, -1, true);
    },

    show: function (type, duration) {
        var content = this._getContent(type);
        if (!content) return;
        if (content.persistent) this.showPersistent(type);
        else this.showTimed(type, duration);
    },

    dismissType: function (type) {
        var content = this._getContent(type);
        if (!content) return;
        this.dismiss(content.id || type);
    },

    dismiss: function (id) {
        if (!id || !this.entries) return;

        for (var i = this.entries.length - 1; i >= 0; i--) {
            if (this.entries[i].id === id) {
                this._destroyEntry(this.entries[i]);
                this.entries.splice(i, 1);
            }
        }
        this._layout();
    },

    update: function (dt) {
        this._updateRootPosition();

        if (!this.entries || this.entries.length === 0) return;
        if (this.game && this.game._paused) return;

        var changed = false;
        for (var i = this.entries.length - 1; i >= 0; i--) {
            var entry = this.entries[i];
            if (!entry || entry.persistent) continue;
            entry.timer -= dt;
            if (entry.timer <= 0) {
                this._destroyEntry(entry);
                this.entries.splice(i, 1);
                changed = true;
            }
        }
        if (changed) this._layout();
    },

    _show: function (id, text, duration, persistent) {
        this._ensureRoot();
        if (!this._root) return;

        if (id) this.dismiss(id);

        var entry = this._createEntry(id, text, duration, persistent);
        this.entries.push(entry);
        this._root.active = true;
        this._layout();
    },

    _getContent: function (type) {
        var content = NotificationContent[type];
        if (!content) {
            cc.warn('[NiuPai] Missing notification content for type: ' + type);
            return null;
        }
        return content;
    },

    _createEntry: function (id, text, duration, persistent) {
        var game = this.game || {};
        var width = Math.max(80, game.notificationWidth || 360);
        var height = Math.max(24, game.notificationHeight || 58);

        var node = new cc.Node('NPNotificationItem');
        node.setAnchorPoint(0.5, 0.5);
        node.setContentSize(width, height);
        this._root.addChild(node, 0);

        var gfx = node.addComponent(cc.Graphics);
        gfx.fillColor = cc.color(35, 70, 190, 205);
        gfx.strokeColor = cc.color(70, 125, 255, 240);
        gfx.lineWidth = 2;
        gfx.rect(-width / 2, -height / 2, width, height);
        gfx.fill();
        gfx.stroke();

        var labelNode = new cc.Node('Text');
        labelNode.setAnchorPoint(0.5, 0.5);
        labelNode.setPosition(0, 0);
        labelNode.setContentSize(width - 24, height - 12);
        node.addChild(labelNode, 1);

        var label = labelNode.addComponent(cc.Label);
        label.string = text || '';
        label.font = game.labelFont;
        label.fontSize = Math.max(8, game.notificationFontSize || 13);
        label.lineHeight = label.fontSize + 5;
        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        label.verticalAlign = cc.Label.VerticalAlign.CENTER;
        label.overflow = cc.Label.Overflow.SHRINK;
        labelNode.color = cc.color(240, 245, 255);

        return {
            id: id || ('notification_' + Date.now() + '_' + Math.random()),
            node: node,
            timer: duration,
            persistent: !!persistent,
        };
    },

    _layout: function () {
        this._updateRootPosition();
        if (!this.entries || this.entries.length === 0) {
            if (this._root) this._root.active = false;
            return;
        }

        var game = this.game || {};
        var height = Math.max(24, game.notificationHeight || 58);
        var gap = Math.max(0, game.notificationGap || 8);
        var topY = this._getTopY();

        for (var i = this.entries.length - 1, stackIndex = 0; i >= 0; i--, stackIndex++) {
            var entry = this.entries[i];
            if (!entry || !entry.node || !entry.node.isValid) continue;
            entry.node.setPosition(0, topY - height / 2 - stackIndex * (height + gap));
        }
    },

    _ensureRoot: function () {
        if (this._root && this._root.isValid) return;
        var root = new cc.Node('NPNotificationRoot');
        root.zIndex = 2600;
        root.active = false;
        this.node.addChild(root, 2600);
        this._root = root;
        this._updateRootPosition();
    },

    _updateRootPosition: function () {
        if (!this._root || !this._root.isValid) return;
        this._root.setPosition(this._getCameraPosition());
    },

    _getCameraPosition: function () {
        if (this.game && this.game._getCameraPositionInGameNode) {
            return this.game._getCameraPositionInGameNode();
        }
        var camera = this.game && this.game._camera;
        if (!camera || !camera.node) return cc.v2(0, 0);
        return camera.node.getPosition();
    },

    _getTopY: function () {
        var game = this.game || {};
        var camera = game._camera;
        var zoom = camera ? (camera.zoomRatio || 1) : 1;
        var viewH = cc.winSize.height / zoom;
        return viewH / 2 - Math.max(0, game.notificationTopOffset || 28);
    },

    _getDefaultDuration: function () {
        return this.game ? (this.game.notificationDuration || 3) : 3;
    },

    _destroyEntry: function (entry) {
        if (entry && entry.node && entry.node.isValid) entry.node.destroy();
    },
});

NPNotification.Type = NotificationType;
NPNotification.Content = NotificationContent;

module.exports = NPNotification;
