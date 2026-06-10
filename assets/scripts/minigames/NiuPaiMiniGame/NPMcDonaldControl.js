'use strict';

var NPMcDonaldControl = cc.Class({
    name: 'NPMcDonaldControl',

    ctor: function (game) {
        this.game = game;
        this.root = null;
        this.queue = [];
        this.nextId = 1;
    },

    createQueue: function () {
        var game = this.game;
        this.queue = [];
        this.nextId = 1;

        if (!game._world || !game._mainTiledMap) return;

        if (this.root && this.root.isValid) {
            this.root.destroy();
        }

        this.root = new cc.Node('McDonaldQueueNormies');
        this.root.zIndex = 17;
        game._world.addChild(this.root, 17);

        var count = this._randomInt(game.normieQueueMinCount, game.normieQueueMaxCount);
        for (var i = 0; i < count; i++) {
            this._appendNormie();
        }

        this._layoutQueue();
        cc.log('[NiuPai] McDonald queue created. normies=' + this.queue.length);
    },

    update: function (dt) {
        var game = this.game;
        if (!game._active || game._currentSection !== 'main' || !this.root) return;
        if (dt <= 0 || this.queue.length === 0) return;

        this._layoutQueue();
        var head = this.queue[0];
        head.orderTimer -= dt;
        this._updateQueueLabels();
        if (head.orderTimer > 0) return;

        this._finishHeadEntry();
    },

    startActorOrder: function (actorType, item, mode) {
        if (this._hasActorInQueue(actorType)) return false;

        var actorNode = this._getActorNode(actorType);
        if (!actorNode) return false;

        var entry = {
            type: actorType,
            item: item,
            node: actorNode,
            label: this._makeTimerLabel(actorNode),
            orderTimer: this._randomFloat(this.game.normieOrderMinSeconds, this.game.normieOrderMaxSeconds),
        };

        this._insertActorEntry(entry, mode || 'wait');
        if (actorType === 'player') this.game._playerInQueue = true;
        if (actorType === 'niupai') this.game._niuPaiInQueue = true;
        this._layoutQueue();
        cc.log('[NiuPai] ' + actorType + ' joined McDonald queue. item=' + item + ' mode=' + mode);
        return true;
    },

    getQueueNormieNodes: function () {
        var nodes = [];
        for (var i = 0; i < this.queue.length; i++) {
            var entry = this.queue[i];
            if (entry && entry.type === 'normie' && entry.node && entry.node.isValid) {
                nodes.push(entry.node);
            }
        }
        return nodes;
    },

    _finishHeadEntry: function () {
        var game = this.game;
        var finished = this.queue.shift();
        if (finished && finished.type === 'normie' && finished.node && finished.node.isValid) {
            this._clearEntryLabel(finished);
            if (game._normieControl) {
                game._normieControl.releaseQueueNormie(finished.node);
            } else {
                finished.node.destroy();
            }
        } else if (finished) {
            this._clearEntryLabel(finished);
            game._completeQueuedOrder(finished.type, finished.item);
        }

        var refill = this._randomInt(game.normieRefillMinCount, game.normieRefillMaxCount);
        for (var i = 0; i < refill && this.queue.length < game.normieQueueMaxCount; i++) {
            this._appendNormie();
        }

        while (this.queue.length < game.normieQueueMinCount) {
            this._appendNormie();
        }

        this._layoutQueue();
    },

    _appendNormie: function () {
        if (this.game._normieControl) {
            this.game._normieControl.onQueueNormieAdded();
        }

        var node = new cc.Node('QueueNormie_' + this.nextId++);
        node.setAnchorPoint(0.5, 0.5);
        node.setContentSize(this.game.normieFrameW, this.game.normieFrameH);
        this.root.addChild(node, 0);

        node.addComponent(cc.Sprite);
        var sheet = this.game._getRandomNormieSheet ? this.game._getRandomNormieSheet() : this.game.normieSheet;
        if (sheet) {
            var anim = node.addComponent('PlayerAnimator');
            anim.spritesheet = sheet;
            anim.frameWidth = this.game.normieFrameW;
            anim.frameHeight = this.game.normieFrameH;
            anim._buildFrames();
            anim.setDirection('down');
            anim.setMoving(false);
        } else {
            this._drawFallback(node);
        }

        this.queue.push({
            type: 'normie',
            node: node,
            label: this._makeTimerLabel(node),
            orderTimer: this._randomFloat(this.game.normieOrderMinSeconds, this.game.normieOrderMaxSeconds),
        });
    },

    _layoutQueue: function () {
        var config = this._getQueueConfig();
        for (var i = 0; i < this.queue.length; i++) {
            var pos = cc.v2(
                config.start.x + config.dir.x * config.spacing * i,
                config.start.y + config.dir.y * config.spacing * i
            );
            this.queue[i].node.setPosition(pos);
            this._syncActorBody(this.queue[i]);
            this._syncCompanionBesidePlayer(this.queue[i], config);
        }
        this._updateQueueLabels();
    },

    _makeTimerLabel: function (parent) {
        var node = new cc.Node('QueueTimer');
        var label = node.addComponent(cc.Label);
        label.fontSize = 9;
        label.font = this.game.labelFont;
        label.lineHeight = 11;
        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        node.color = cc.color(255, 235, 120);
        node.setPosition(0, this.game.normieFrameH / 2 + 8);
        parent.addChild(node, 1);
        return label;
    },

    _updateQueueLabels: function () {
        for (var i = 0; i < this.queue.length; i++) {
            var entry = this.queue[i];
            if (!entry) continue;
            if (entry.label) entry.label.string = i === 0
                ? Math.ceil(this.queue[i].orderTimer) + 's'
                : '';
            if (this.game._setOrderingStatusIcon) {
                this.game._setOrderingStatusIcon(entry.node, i === 0, this._getEntryFrameH(entry));
            }
        }
    },

    _insertActorEntry: function (entry, mode) {
        if (entry.type === 'niupai') {
            this._insertNiuPaiWithCourtesy(entry);
            return;
        }

        if (mode === 'cut') {
            var success = Math.random() < this.game.playerCutSuccessRate;
            var index = success ? Math.min(1, this.queue.length) : this.queue.length;
            this.queue.splice(index, 0, entry);
            return;
        }

        this.queue.push(entry);
    },

    _insertNiuPaiWithCourtesy: function (entry) {
        var index = this.queue.length;
        while (index > 0 && Math.random() < this.game.niuPaiQueuePassRate) {
            index--;
        }

        this.queue.splice(index, 0, entry);
    },

    _hasActorInQueue: function (actorType) {
        for (var i = 0; i < this.queue.length; i++) {
            if (this.queue[i].type === actorType) return true;
        }
        return false;
    },

    _getActorNode: function (actorType) {
        if (actorType === 'player') return this.game._playerNode;
        if (actorType === 'niupai') return this.game._niuPaiNode;
        return null;
    },

    _syncActorBody: function (entry) {
        if (!entry || entry.type === 'normie') return;

        var body = entry.node.getComponent(cc.RigidBody);
        if (!body) return;

        body.linearVelocity = cc.v2(0, 0);
        body.syncPosition(true);
    },

    _syncCompanionBesidePlayer: function (entry, config) {
        var game = this.game;
        if (!entry || entry.type !== 'player' || !game._niuPaiNode) return;

        var side = cc.v2(-config.dir.y, config.dir.x);
        var distance = Math.max(game.mapTileSize * 0.75, game.niuPaiFrameW);
        game._niuPaiNode.setPosition(
            entry.node.x + side.x * distance,
            entry.node.y + side.y * distance
        );

        if (game._niuPaiBody) {
            game._niuPaiBody.linearVelocity = cc.v2(0, 0);
            game._niuPaiBody.syncPosition(true);
        }
        if (game._niuPaiAnimator) {
            game._niuPaiAnimator.setMoving(false);
        }
    },

    _clearEntryLabel: function (entry) {
        if (!entry) return;
        if (entry.label && entry.label.node && entry.label.node.isValid) entry.label.node.destroy();
        entry.label = null;
        if (this.game._setOrderingStatusIcon) {
            this.game._setOrderingStatusIcon(entry.node, false, this._getEntryFrameH(entry));
        }
    },

    _getEntryFrameH: function (entry) {
        if (!entry) return this.game.normieFrameH;
        if (entry.type === 'player') return this.game.playerFrameH;
        if (entry.type === 'niupai') return this.game.niuPaiFrameH;
        return this.game.normieFrameH;
    },

    _getQueueConfig: function () {
        var game = this.game;
        var props = game._mainTiledMap ? game._mainTiledMap.getProperties() || {} : {};

        var startX = game._readOptionalNumberProperty(props, 'mcQueueStartX');
        var startY = game._readOptionalNumberProperty(props, 'mcQueueStartY');
        var start = null;
        if (startX !== null && startY !== null) {
            start = cc.v2(
                game.mainTilemapOffset.x + (startX + 0.5) * game.mapTileSize,
                game.mainTilemapOffset.y + (startY + 0.5) * game.mapTileSize
            );
        } else {
            var orderRect = game._getMcOrderTriggerRect();
            start = orderRect
                ? cc.v2((orderRect.minX + orderRect.maxX) / 2, (orderRect.minY + orderRect.maxY) / 2)
                : cc.v2(game.mainTilemapOffset.x + game.mapTileSize, game.mainTilemapOffset.y + game.mapTileSize);
        }

        var dirX = game._readOptionalNumberProperty(props, 'mcQueueDirX');
        var dirY = game._readOptionalNumberProperty(props, 'mcQueueDirY');
        var dir = (dirX !== null && dirY !== null)
            ? cc.v2(dirX, dirY)
            : game.normieQueueDirection;
        dir = this._normalizeDirection(dir);

        var spacingTiles = game._readOptionalNumberProperty(props, 'mcQueueSpacing');
        if (spacingTiles === null) spacingTiles = game.normieQueueSpacingTiles;

        return {
            start: start,
            dir: dir,
            spacing: spacingTiles * game.mapTileSize,
        };
    },

    _normalizeDirection: function (dir) {
        var x = dir ? dir.x : 0;
        var y = dir ? dir.y : -1;
        var len = Math.sqrt(x * x + y * y);
        if (len <= 0) return cc.v2(0, -1);
        return cc.v2(x / len, y / len);
    },

    _drawFallback: function (node) {
        var gfx = node.addComponent(cc.Graphics);
        var w = this.game.normieFrameW;
        var h = this.game.normieFrameH;
        var colors = [
            cc.color(92, 160, 220),
            cc.color(210, 130, 180),
            cc.color(110, 190, 135),
            cc.color(230, 170, 80),
        ];
        var c = colors[(this.nextId - 1) % colors.length];

        gfx.fillColor = c;
        gfx.rect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 13);
        gfx.fill();

        gfx.fillColor = cc.color(236, 198, 160);
        gfx.rect(-w / 2 + 9, h / 2 - 13, w - 18, 8);
        gfx.fill();

        gfx.fillColor = cc.color(35, 35, 42);
        gfx.rect(-5, h / 2 - 10, 3, 3);
        gfx.rect(3, h / 2 - 10, 3, 3);
        gfx.fill();
    },

    _randomInt: function (min, max) {
        min = Math.floor(min);
        max = Math.floor(max);
        if (max < min) max = min;
        return min + Math.floor(Math.random() * (max - min + 1));
    },

    _randomFloat: function (min, max) {
        if (max < min) max = min;
        return min + Math.random() * (max - min);
    },
});

module.exports = NPMcDonaldControl;
