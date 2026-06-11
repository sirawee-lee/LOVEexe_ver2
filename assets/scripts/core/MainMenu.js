'use strict';

// MainMenu.js — the title screen. Shows main_menu.png + a START button and plays
// a title BGM. START begins a fresh playthrough (loads MainScene); the pause
// menu's "Main Menu" returns here. All UI is built in code, so the scene only
// needs this one component on a node centred under the Canvas.

var PixelFont  = require('PixelFont');
var StoryState = require('StoryState');
require('PauseMenu');   // applies the saved volume + gives ESC sound options on the title too

var COL_PINK  = cc.color(232, 90, 140);
var COL_PINK2 = cc.color(255, 130, 175);

cc.Class({
    extends: cc.Component,

    onLoad: function () {
        var self = this;
        var vs = cc.view.getVisibleSize();
        var W = vs.width, H = vs.height;

        // ── full-screen background art (main_menu.png from resources) ──
        var bgNode = new cc.Node('bg');
        bgNode.parent = this.node;
        bgNode.setPosition(0, 0);
        bgNode.zIndex = 0;
        var spr = bgNode.addComponent(cc.Sprite);
        spr.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        spr.trim = false;
        bgNode.setContentSize(W, H);
        this._loadImage('endings/main_menu', function (sf) {
            if (sf && cc.isValid(bgNode)) spr.spriteFrame = sf;
        });

        // ── falling sakura petals (opening particle effect — 5th particle type) ──
        this._sakura(W, H);

        // ── typed tagline in the top-right corner (開場動畫 / opening animation) ──
        // (the game title already lives in main_menu.png, so we don't repeat it here)
        var taglineStr = 'A campus love story';
        var tagline = this._label('', 26, cc.color(255, 235, 245), 0, 0);
        tagline.horizontalAlign = cc.Label.HorizontalAlign.RIGHT;
        tagline.node.anchorX = 1;        // pin the right edge so it grows leftward
        tagline.node.anchorY = 1;        // pin the top edge
        tagline.node.setPosition(W / 2 - 30, H / 2 - 26);   // top-right, small margin
        this.scheduleOnce(function () {
            // type the whole sentence over ~5 seconds
            self._typewriter(tagline, taglineStr, 5 / taglineStr.length);
        }, 0.6);

        // ── START button + hint (fade in after the opening reveal) ──
        var btn = this._button('▶  START GAME', 0, -H / 2 + 104, 380, 84, COL_PINK, COL_PINK2, function () {
            self._start();
        });
        var hint = this._label('press  Esc  for sound options', 18, cc.color(235, 230, 240), 0, -H / 2 + 44);
        btn.opacity = 0;
        hint.node.opacity = 0;
        cc.tween(btn).delay(0.6).to(0.5, { opacity: 255 }).start();
        cc.tween(hint.node).delay(0.8).to(0.5, { opacity: 255 }).start();

        // ── opening fade-in: a black overlay that dissolves away on load ──
        var overlay = new cc.Node('intro_fade');
        overlay.parent = this.node;
        overlay.zIndex = 100;
        var ov = overlay.addComponent(cc.Sprite);
        ov.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        ov.trim = false;
        ov.spriteFrame = this._solidSF();
        overlay.setContentSize(W + 4, H + 4);
        overlay.color = cc.color(0, 0, 0);
        cc.tween(overlay)
            .to(0.85, { opacity: 0 })
            .call(function () { if (cc.isValid(overlay)) overlay.destroy(); })
            .start();

        // ── title music (master volume from the pause menu applies via setMusicVolume) ──
        cc.resources.load('audio/bgm_title', cc.AudioClip, function (err, clip) {
            if (!err && clip) { try { cc.audioEngine.playMusic(clip, true); } catch (e) {} }
        });
    },

    onDestroy: function () {
        try { cc.audioEngine.stopMusic(); } catch (e) {}
    },

    _start: function () {
        try { cc.audioEngine.stopMusic(); } catch (e) {}
        StoryState.reset();                 // every Start from the title = a fresh playthrough
        cc.director.loadScene('MainScene');
    },

    // ── helpers ───────────────────────────────────────────────
    _loadImage: function (name, onDone) {
        var res = cc.resources;
        if (!res) { onDone(null); return; }
        res.load(name, cc.SpriteFrame, function (err, sf) {
            if (!err && sf) { onDone(sf); return; }
            res.load(name, cc.Texture2D, function (e2, tex) {
                onDone((!e2 && tex) ? new cc.SpriteFrame(tex) : null);
            });
        });
    },

    _label: function (str, size, color, x, y) {
        var node = new cc.Node('lbl');
        node.parent = this.node;
        node.setPosition(x, y);
        var l = node.addComponent(cc.Label);
        l.fontSize = size;
        l.lineHeight = size + 4;
        l.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        l.string = str;
        node.color = color;
        PixelFont.apply(l);
        return l;
    },

    _button: function (str, x, y, w, h, color, hiColor, cb) {
        var node = new cc.Node('btn');
        node.parent = this.node;
        node.setPosition(x, y);
        node.setContentSize(w, h);
        var g = node.addComponent(cc.Graphics);
        var draw = function (c) {
            g.clear();
            g.fillColor = c;
            g.roundRect(-w / 2, -h / 2, w, h, 14); g.fill();
            g.lineWidth = 3; g.strokeColor = cc.color(255, 255, 255, 70);
            g.roundRect(-w / 2, -h / 2, w, h, 14); g.stroke();
        };
        draw(color);
        var ln = new cc.Node('lbl');
        ln.parent = node;
        var l = ln.addComponent(cc.Label);
        l.fontSize = 30;
        l.lineHeight = 34;
        l.string = str;
        ln.color = cc.color(255, 255, 255);
        PixelFont.apply(l);
        node.on(cc.Node.EventType.MOUSE_ENTER, function () { draw(hiColor); }, this);
        node.on(cc.Node.EventType.MOUSE_LEAVE, function () { draw(color); }, this);
        node.on(cc.Node.EventType.TOUCH_END, function () { if (typeof cb === 'function') cb(); }, this);
        return node;
    },

    // ── opening particle effect: cherry-blossom petals drifting down ─────
    _sakura: function (W, H) {
        var node = new cc.Node('Sakura');
        node.parent = this.node;
        node.setPosition(0, H / 2 + 24);     // emit just above the top edge
        node.zIndex = 10;
        var ps = node.addComponent(cc.ParticleSystem);
        ps.custom = true;                    // configure by code, not a .plist
        ps.spriteFrame = this._petalSF();
        ps.srcBlendFactor = cc.macro.BlendFactor.SRC_ALPHA;        // soft alpha blend
        ps.dstBlendFactor = cc.macro.BlendFactor.ONE_MINUS_SRC_ALPHA;
        ps.duration = cc.ParticleSystem.DURATION_INFINITY;
        ps.emitterMode = cc.ParticleSystem.EmitterMode.GRAVITY;
        ps.positionType = cc.ParticleSystem.PositionType.FREE;
        ps.totalParticles = 130;             // more on screen since each falls longer
        ps.emissionRate = 12;
        ps.life = 10; ps.lifeVar = 3;        // longer life so slow petals still reach the bottom
        ps.posVar = cc.v2(W / 2 + 40, 8);    // spread across the whole width
        ps.angle = 270; ps.angleVar = 20;    // fall downward
        ps.speed = 33; ps.speedVar = 13;     // 40% slower descent
        ps.gravity = cc.v2(0, -12);          // 40% less downward pull
        ps.tangentialAccel = 10; ps.tangentialAccelVar = 20;   // gentle side-to-side sway
        ps.radialAccel = 0; ps.radialAccelVar = 0;
        ps.startSize = 18; ps.startSizeVar = 6;
        ps.endSize = 12; ps.endSizeVar = 4;
        ps.startSpin = 0; ps.startSpinVar = 180;               // tumble as they fall
        ps.endSpin = 360; ps.endSpinVar = 200;
        ps.startColor = cc.color(255, 188, 214, 255);
        ps.startColorVar = cc.color(16, 24, 16, 0);
        ps.endColor = cc.color(255, 150, 192, 90);
        ps.endColorVar = cc.color(16, 16, 16, 40);
        return ps;
    },

    // reveal a label one character at a time (typewriter)
    _typewriter: function (label, fullStr, interval) {
        if (!label || !cc.isValid(label.node)) return;
        var i = 0, n = fullStr.length;
        label.string = '';
        this.schedule(function () {
            i++;
            if (cc.isValid(label.node)) label.string = fullStr.substr(0, i);
        }, interval, n - 1);
    },

    // a soft white petal texture, generated at runtime (tinted via particle colour)
    _petalSF: function () {
        var S = 24, data = new Uint8Array(S * S * 4);
        var cx = (S - 1) / 2, cy = (S - 1) / 2;
        for (var y = 0; y < S; y++) {
            for (var x = 0; x < S; x++) {
                var dx = (x - cx) / (S * 0.46);   // wide ellipse → petal-ish
                var dy = (y - cy) / (S * 0.30);
                var d = dx * dx + dy * dy;
                var a = d < 1 ? Math.round(235 * Math.pow(1 - d, 0.85)) : 0;
                var i = (y * S + x) * 4;
                data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = a;
            }
        }
        var tex = new cc.Texture2D();
        tex.initWithData(data, cc.Texture2D.PixelFormat.RGBA8888, S, S);
        return new cc.SpriteFrame(tex);
    },

    // a 4×4 solid-white texture, reused for the black fade overlay
    _solidSF: function () {
        var S = 4, n = S * S * 4, data = new Uint8Array(n);
        for (var i = 0; i < n; i++) data[i] = 255;
        var tex = new cc.Texture2D();
        tex.initWithData(data, cc.Texture2D.PixelFormat.RGBA8888, S, S);
        return new cc.SpriteFrame(tex);
    },
});
