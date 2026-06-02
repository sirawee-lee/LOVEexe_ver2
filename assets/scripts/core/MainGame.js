'use strict';

// Map: 100×60 tiles × 16px = 1600×960 CC units
var MAP_W = 1600;
var MAP_H = 960;

// Interaction zones in CC local coords (0,0 = map center, Y-up)
// Adjust x,y to match building positions on map.png
var ZONES = [
    { id: 'xiaochibu', label: 'Xiao Chi Bu',  game: 'niupai',    x: -480, y:  340, r: 100 },
    { id: 'delta',     label: 'Delta Bldg',   game: 'professor', x:  480, y:  340, r: 100 },
    { id: 'chengk',    label: 'Cheng K Lake', game: 'father',    x: -480, y: -300, r: 110 },
    { id: 'library',   label: 'Library',      game: 'finalboss', x:  480, y: -300, r: 100 },
];

var WALK_SPEED = 80;   // CC units / second (map coords)
var RUN_SPEED  = 180;  // holding Shift
var ZOOM       = 2;    // world scale — zooms in, eliminates edge voids

cc.Class({
    extends: cc.Component,

    properties: {
        mapTexture:   { default: null, type: cc.SpriteFrame },
        playerSheet:  { default: null, type: cc.Texture2D   }, // boy_spritesheet.png
        playerFrameW: { default: 48,   type: cc.Integer     }, // pixels per frame
        playerFrameH: { default: 64,   type: cc.Integer     },
        bgm:          { default: null, type: cc.AudioClip   },
    },

    // ── CC lifecycle ──────────────────────────────────────────
    onLoad: function () {
        cc.log('[MainGame] v3 onLoad');
        var self = this;
        self._W = 700;
        self._H = 400;
        // Map is 100×60 tiles × 16px = 1600×960 (confirmed by PowerShell)
        self._mapW = 1600;
        self._mapH = 960;
        self._camLogged = false;

        // ── World node (scrolls with camera) ──
        var world = new cc.Node('World');
        world.setPosition(0, 0);
        world.setScale(ZOOM);           // 2× zoom — map appears larger on screen
        self.node.addChild(world, 0);
        self._world = world;

        // Map background
        var mapNode = new cc.Node('MapBg');
        var mapSpr  = mapNode.addComponent(cc.Sprite);
        mapSpr.spriteFrame = self.mapTexture;
        mapSpr.sizeMode    = cc.Sprite.SizeMode.RAW;
        mapNode.setPosition(0, 0);
        world.addChild(mapNode, 0);

        // Log actual texture size for verification
        self.scheduleOnce(function () {
            var sz  = mapNode.getContentSize();
            var tex = self.mapTexture ? self.mapTexture.getTexture() : null;
            cc.log('[MainGame] sprite contentSize=' + sz.width + 'x' + sz.height +
                   '  texture=' + (tex ? tex.width + 'x' + tex.height : 'null'));
        }, 0.5);

        // Zone marker nodes (subtle circle + label)
        var markerGfx = new cc.Node('ZoneMarkers');
        var gfx = markerGfx.addComponent(cc.Graphics);
        ZONES.forEach(function (zone) {
            gfx.strokeColor = cc.color(255, 240, 100, 60);
            gfx.lineWidth   = 2;
            gfx.circle(zone.x, zone.y, zone.r);
            gfx.stroke();

            var lbl = new cc.Node('zl_' + zone.id);
            var l   = lbl.addComponent(cc.Label);
            l.string    = zone.label;
            l.fontSize  = 12;
            l.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
            lbl.color   = cc.color(255, 240, 120);
            lbl.setPosition(zone.x, zone.y + zone.r + 10);
            world.addChild(lbl, 1);
        });
        world.addChild(markerGfx, 1);

        // Player node — Sprite + PlayerAnimator
        var pNode = new cc.Node('Player');
        pNode.addComponent(cc.Sprite);
        pNode.setContentSize(self.playerFrameW, self.playerFrameH);
        pNode.setPosition(0, 0);
        world.addChild(pNode, 2);
        self._playerNode = pNode;
        self._px = 0;
        self._py = 0;

        // Attach animator and give it the spritesheet
        var anim = pNode.addComponent('PlayerAnimator');
        anim.spritesheet  = self.playerSheet;
        anim.frameWidth   = self.playerFrameW;
        anim.frameHeight  = self.playerFrameH;
        if (self.playerSheet) anim._buildFrames();
        self._anim = anim;

        // ── UI layer (fixed — doesn't scroll) ──
        // Interaction hint
        var hintNode = new cc.Node('Hint');
        var hintBg   = hintNode.addComponent(cc.Graphics);
        hintNode.setPosition(0, -self._H / 2 + 28);
        hintNode.opacity = 0;
        self.node.addChild(hintNode, 5);
        self._hintNode = hintNode;
        self._hintBg   = hintBg;

        var hintLbl = new cc.Node('HintText');
        var hl = hintLbl.addComponent(cc.Label);
        hl.string    = '';
        hl.fontSize  = 13;
        hl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        hintLbl.color = cc.color(255, 240, 80);
        hintLbl.setPosition(0, 0);
        hintNode.addChild(hintLbl, 1);
        self._hintLabel = hl;

        // Location name (top-center)
        var locNode = new cc.Node('LocName');
        var locLbl  = locNode.addComponent(cc.Label);
        locLbl.string   = '';
        locLbl.fontSize = 12;
        locLbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        locNode.color  = cc.color(200, 220, 255);
        locNode.setPosition(0, self._H / 2 - 18);
        locNode.opacity = 0;
        self.node.addChild(locNode, 5);
        self._locNode  = locNode;
        self._locLabel = locLbl;

        // Input
        self._keys = {};
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, self._onKeyDown, self);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP,   self._onKeyUp,   self);

        self._activeZone  = null;
        self._bgmId       = -1;
        self._hintTimer   = 0;
    },

    onEnable: function () {
        // Resume BGM when returning from minigame
        if (this.bgm && this._bgmId < 0) {
            this._bgmId = cc.audioEngine.play(this.bgm, true, 0.6);
        }
    },

    onDisable: function () {
        if (this._bgmId >= 0) {
            cc.audioEngine.stop(this._bgmId);
            this._bgmId = -1;
        }
    },

    onDestroy: function () {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP,   this._onKeyUp,   this);
        if (this._bgmId >= 0) cc.audioEngine.stop(this._bgmId);
    },

    // ── Input ─────────────────────────────────────────────────
    _onKeyDown: function (e) {
        this._keys[e.keyCode] = true;
        // Interact with zone
        if (e.keyCode === cc.macro.KEY.e || e.keyCode === cc.macro.KEY.space) {
            if (this._activeZone) {
                this.node.emit('launch-minigame', this._activeZone.game);
            }
        }
    },

    _onKeyUp: function (e) {
        this._keys[e.keyCode] = false;
    },

    // ── Update ────────────────────────────────────────────────
    update: function (dt) {
        var self = this;

        // ── Player movement — 4-directional only, Shift to run ──
        var running = !!self._keys[cc.macro.KEY.shift];
        var spd     = (running ? RUN_SPEED : WALK_SPEED) * dt;

        var upKey    = self._keys[cc.macro.KEY.w] || self._keys[cc.macro.KEY.up];
        var downKey  = self._keys[cc.macro.KEY.s] || self._keys[cc.macro.KEY.down];
        var leftKey  = self._keys[cc.macro.KEY.a] || self._keys[cc.macro.KEY.left];
        var rightKey = self._keys[cc.macro.KEY.d] || self._keys[cc.macro.KEY.right];

        var dx = 0, dy = 0;
        // Vertical has priority — prevents diagonal movement
        if      (upKey)    dy =  spd;
        else if (downKey)  dy = -spd;
        else if (leftKey)  dx = -spd;
        else if (rightKey) dx =  spd;

        var moving = dx !== 0 || dy !== 0;
        if (self._anim) {
            self._anim.fps = running ? 14 : 8;
            if      (dy > 0) self._anim.setDirection('up');
            else if (dy < 0) self._anim.setDirection('down');
            else if (dx < 0) self._anim.setDirection('left');
            else if (dx > 0) self._anim.setDirection('right');
            self._anim.setMoving(moving);
        }

        // Clamp player to map bounds
        var hW = self._mapW / 2 - 20, hH = self._mapH / 2 - 20;
        self._px = Math.max(-hW, Math.min(hW, self._px + dx));
        self._py = Math.max(-hH, Math.min(hH, self._py + dy));
        self._playerNode.setPosition(self._px, self._py);

        // ── Camera — world node is scaled by ZOOM ─────────────
        // A child at (px,py) appears on screen at:
        //   screen = world.pos + (px,py) × ZOOM
        // → world.pos = -(px,py) × ZOOM  (player at screen centre)
        // Clamp so no black void: map edges must stay inside viewport.
        var vHW = self._W / 2, vHH = self._H / 2;
        var sHW = self._mapW / 2 * ZOOM, sHH = self._mapH / 2 * ZOOM;

        var worldX = sHW <= vHW ? 0 : Math.max(vHW - sHW, Math.min(sHW - vHW, -self._px * ZOOM));
        var worldY = sHH <= vHH ? 0 : Math.max(vHH - sHH, Math.min(sHH - vHH, -self._py * ZOOM));
        self._world.setPosition(worldX, worldY);

        // One-shot diagnostic — check CC Console after 2 seconds of play
        if (!self._camLogged) {
            if (!self._camTimer) self._camTimer = 0;
            self._camTimer += dt;
            if (self._camTimer >= 2) {
                self._camLogged = true;
                cc.log('[CAM] mapW=' + self._mapW + ' ZOOM=' + ZOOM +
                       ' sHW=' + sHW + ' vHW=' + vHW +
                       ' px=' + Math.round(self._px) +
                       ' worldX=' + Math.round(worldX) +
                       ' mapRightEdge=' + Math.round(worldX + sHW));
            }
        }

        // ── Zone detection ─────────────────────────────────────
        var nearZone = null;
        var minDist  = Infinity;
        for (var i = 0; i < ZONES.length; i++) {
            var z    = ZONES[i];
            var dist = Math.hypot(self._px - z.x, self._py - z.y);
            if (dist < z.r && dist < minDist) {
                minDist  = dist;
                nearZone = z;
            }
        }

        self._activeZone = nearZone;

        // ── Hint display ───────────────────────────────────────
        if (nearZone) {
            self._hintLabel.string  = '[E] Enter ' + nearZone.label;
            self._locLabel.string   = nearZone.label;
            self._hintNode.opacity  = 255;
            self._locNode.opacity   = 255;
            // Draw background pill for hint
            var bg = self._hintBg;
            bg.clear();
            bg.fillColor = cc.color(0, 0, 0, 160);
            bg.roundRect(-120, -14, 240, 28, 6);
            bg.fill();
        } else {
            self._hintNode.opacity = 0;
            self._locNode.opacity  = 0;
        }
    },
});
