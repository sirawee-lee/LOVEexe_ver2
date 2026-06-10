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
        var spr = bgNode.addComponent(cc.Sprite);
        spr.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        spr.trim = false;
        bgNode.setContentSize(W, H);
        this._loadImage('endings/main_menu', function (sf) {
            if (sf && cc.isValid(bgNode)) spr.spriteFrame = sf;
        });

        // ── START button ──
        this._button('▶  START GAME', 0, -H / 2 + 104, 380, 84, COL_PINK, COL_PINK2, function () {
            self._start();
        });
        // small hint
        this._label('press  Esc  for sound options', 18, cc.color(235, 230, 240), 0, -H / 2 + 44);

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
});
