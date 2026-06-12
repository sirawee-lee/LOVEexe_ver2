'use strict';

// PauseMenu.js — global ESC pause overlay with audio controls.
//
// Plain module (like GameFlow / EndingScreen): it self-initialises on first
// require and registers ONE global ESC key listener that survives scene loads,
// then draws a pause overlay into whatever scene's Canvas is active. Game logic
// is frozen with cc.director.pause() (audio keeps playing so the player can hear
// the volume change); ESC or Resume unpauses.
//
// Require it once from a startup component and it works in every scene:
//     require('PauseMenu');
// Requiring it again elsewhere is a harmless no-op.

var PixelFont = require('PixelFont');

var VOL_KEY = 'loveexe_audio';   // localStorage: { vol: 0..10, muted: bool }

var COL_DIM   = cc.color(0, 0, 0, 205);
var COL_PANEL = cc.color(18, 14, 24, 255);
var COL_PINK  = cc.color(232, 90, 140);
var COL_PINK2 = cc.color(255, 130, 175);
var COL_GREY  = cc.color(92, 92, 108);
var COL_GREY2 = cc.color(132, 132, 150);
var COL_GOLD  = cc.color(255, 210, 120);
var COL_TEXT  = cc.color(240, 235, 245);
var COL_BAR   = cc.color(120, 220, 150);
var COL_OFF   = cc.color(70, 70, 82);

var PauseMenu = {
    _inited: false,
    _open: false,
    _overlay: null,
    _canvas: null,
    _overlayTarget: null,
    _barNode: null,
    _muteLbl: null,
    _vol: 10,
    _muted: false,
    _audioClients: [],
    _hooked: false,
    _reqMusic: 1,        // last volume the MUSIC channel asked for (before master scaling)
    _reqEffects: 1,      // last volume the EFFECTS channel asked for
    _setMusicRaw: null,  // original (unwrapped) cc.audioEngine setters
    _setEffectsRaw: null,

    isOpen: function () {
        return !!this._open;
    },

    getMasterVolume: function () {
        return this._muted ? 0 : this._vol / 10;
    },

    registerAudioClient: function (client) {
        if (!client) return;
        if (this._audioClients.indexOf(client) >= 0) return;
        this._audioClients.push(client);
    },

    unregisterAudioClient: function (client) {
        if (!client || !this._audioClients) return;
        var kept = [];
        for (var i = 0; i < this._audioClients.length; i++) {
            if (this._audioClients[i] !== client) kept.push(this._audioClients[i]);
        }
        this._audioClients = kept;
    },

    // ── lifecycle ─────────────────────────────────────────────
    init: function () {
        if (this._inited) return;
        this._inited = true;
        this._installAudioHook();   // make EVERY audioEngine call obey the master mute/volume
        this._load();
        this._apply();   // apply saved volume to the audio engine right away
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKey, this);
    },

    // Route every cc.audioEngine volume/playback call through the master mute+volume.
    // Scenes & minigames call setMusicVolume / play / playMusic with their own levels;
    // without this, loading a new scene re-raises the volume and ignores a mute. We wrap
    // the engine ONCE here so the master setting is always enforced, everywhere.
    _installAudioHook: function () {
        if (this._hooked) return;
        var ae = cc.audioEngine;
        if (!ae || typeof ae.setMusicVolume !== 'function') return;
        this._hooked = true;
        var PM = this;
        var master = function () { return PM._muted ? 0 : PM._vol / 10; };

        var _setMusic   = ae.setMusicVolume.bind(ae);
        var _setEffects = ae.setEffectsVolume.bind(ae);
        var _play       = ae.play.bind(ae);
        var _playMusic  = ae.playMusic.bind(ae);
        PM._setMusicRaw = _setMusic;
        PM._setEffectsRaw = _setEffects;

        ae.setMusicVolume = function (v) {
            PM._reqMusic = (v == null) ? 1 : v;          // remember what the scene asked for…
            return _setMusic(PM._reqMusic * master());   // …but actually apply it scaled by master
        };
        ae.setEffectsVolume = function (v) {
            PM._reqEffects = (v == null) ? 1 : v;
            return _setEffects(PM._reqEffects * master());
        };
        ae.play = function (clip, loop, vol) {
            var req = (vol == null) ? 1 : vol;
            return _play(clip, loop, req * master());     // per-sound volume obeys the master too
        };
        ae.playMusic = function (clip, loop) {
            PM._reqMusic = 1;                             // a fresh track defaults to full…
            var id = _playMusic(clip, loop);
            try { _setMusic(master()); } catch (e) {}     // …scaled by master (a later setMusicVolume can override)
            return id;
        };
    },

    _onKey: function (e) {
        if (e.keyCode === cc.macro.KEY.escape) this.toggle();
    },

    toggle: function () { if (this._open) this.resume(); else this.pause(); },

    pause: function () {
        if (this._open) return;
        var canvas = this._getCanvas();
        if (!canvas) return;
        this._canvas = canvas;
        this._overlayTarget = this._getOverlayTarget(canvas);
        this._open = true;
        this._notifyAudioClients('onGlobalPauseChanged', true);
        try { cc.director.pause(); } catch (e) {}   // freeze game logic (audio keeps playing)
        this._build();
    },

    resume: function () {
        if (!this._open) return;
        this._open = false;
        try { cc.director.resume(); } catch (e) {}
        this._notifyAudioClients('onGlobalPauseChanged', false);
        this._destroy();
    },

    _quit: function () {
        this._open = false;
        try { cc.director.resume(); } catch (e) {}   // MUST resume before loading, or the new scene loads paused
        this._notifyAudioClients('onGlobalPauseChanged', false);
        this._destroy();
        var StoryState = require('StoryState');
        StoryState.dialogueActive = false;
        cc.director.loadScene('MainMenu');
    },

    _destroy: function () {
        if (this._overlay && cc.isValid(this._overlay)) this._overlay.destroy();
        this._overlay = null;
        this._overlayTarget = null;
        this._barNode = null;
        this._muteLbl = null;
    },

    // ── audio state ───────────────────────────────────────────
    _load: function () {
        try {
            var raw = cc.sys.localStorage.getItem(VOL_KEY);
            if (raw) {
                var d = JSON.parse(raw);
                if (d && typeof d === 'object') {
                    this._vol = (d.vol == null) ? 10 : Math.max(0, Math.min(10, d.vol));
                    this._muted = !!d.muted;
                }
            }
        } catch (e) {}
    },
    _save: function () {
        try { cc.sys.localStorage.setItem(VOL_KEY, JSON.stringify({ vol: this._vol, muted: this._muted })); } catch (e) {}
    },
    // Apply to BOTH channels: music (boss/dog minigames use playMusic) and effects
    // (overworld + typing BGM + all SFX use play/playEffect) — so this is a master volume.
    _apply: function () {
        var m = this._muted ? 0 : this._vol / 10;
        // Re-scale whatever each channel last asked for by the master multiplier, using
        // the RAW setters so we don't overwrite the remembered request values. This also
        // updates everything that is already playing (mute/unmute takes effect live).
        var setM = this._setMusicRaw || function (x) { cc.audioEngine.setMusicVolume(x); };
        var setE = this._setEffectsRaw || function (x) { cc.audioEngine.setEffectsVolume(x); };
        try { setM(this._reqMusic * m); } catch (e) {}
        try { setE(this._reqEffects * m); } catch (e) {}
        this._notifyAudioClients('onGlobalAudioVolumeChanged', m);
    },
    _setVol: function (delta) {
        this._vol = Math.max(0, Math.min(10, this._vol + delta));
        if (this._vol > 0) this._muted = false;
        this._apply(); this._save(); this._refresh();
    },
    _toggleMute: function () {
        this._muted = !this._muted;
        this._apply(); this._save(); this._refresh();
    },

    _notifyAudioClients: function (method, arg) {
        if (!this._audioClients) return;
        var kept = [];
        for (var i = 0; i < this._audioClients.length; i++) {
            var client = this._audioClients[i];
            if (!client || (client.node && !cc.isValid(client.node))) continue;
            kept.push(client);
            if (typeof client[method] === 'function') {
                try { client[method](arg); } catch (e) {}
            }
        }
        this._audioClients = kept;
    },

    // ── UI ────────────────────────────────────────────────────
    _getCanvas: function () {
        var scene = cc.director.getScene();
        if (!scene) return null;
        var c = scene.getChildByName('Canvas');
        if (!c) { var cv = cc.Canvas.instance; c = cv ? cv.node : null; }
        return c;
    },

    _getOverlayTarget: function (canvas) {
        var scene = cc.director.getScene();
        var sceneName = scene && scene.name ? scene.name : '';
        var camera = sceneName === 'XiaoChiBu' ? cc.Camera.main : null;
        if (camera && camera.node && cc.isValid(camera.node)) {
            return { parent: camera.node, camera: camera, useCamera: true };
        }
        return { parent: canvas, camera: null, useCamera: false };
    },

    _build: function () {
        this._destroy();
        var target = this._overlayTarget || this._getOverlayTarget(this._canvas);
        var parent = target.parent || this._canvas;
        var size = this._getOverlaySize(parent, target);
        var W = size.width;
        var H = size.height;

        var root = new cc.Node('__PauseOverlay');
        root.parent = parent;
        root.zIndex = 99999;
        root.setPosition(0, 0);
        if (target.useCamera) {
            var zoom = target.camera ? (target.camera.zoomRatio || 1) : 1;
            root.setScale(zoom > 0 ? 1 / zoom : 1);
        }
        this._overlay = root;

        // dim full-screen background (also eats taps on the scene underneath)
        var bg = new cc.Node('bg');
        bg.parent = root;
        bg.setContentSize(W, H);
        var bgg = bg.addComponent(cc.Graphics);
        bgg.fillColor = COL_DIM;
        bgg.rect(-W / 2, -H / 2, W, H);
        bgg.fill();
        bg.on(cc.Node.EventType.TOUCH_START, function () {}, this);

        // panel
        var PW = 470, PH = 410;
        var panel = new cc.Node('panel');
        panel.parent = root;
        var pg = panel.addComponent(cc.Graphics);
        pg.fillColor = COL_PANEL;
        pg.roundRect(-PW / 2, -PH / 2, PW, PH, 18); pg.fill();
        pg.lineWidth = 3; pg.strokeColor = COL_PINK;
        pg.roundRect(-PW / 2, -PH / 2, PW, PH, 18); pg.stroke();

        this._label(root, '⏸  PAUSED', 44, COL_GOLD, 0, 148);

        // ── volume ──
        this._label(root, 'Volume', 26, COL_TEXT, 0, 90);
        this._button(root, '–', -150, 44, 58, 54, COL_GREY, COL_GREY2, function () { PauseMenu._setVol(-1); });
        this._button(root, '+',      150, 44, 58, 54, COL_GREY, COL_GREY2, function () { PauseMenu._setVol(1); });
        this._barNode = new cc.Node('bar');
        this._barNode.parent = root;
        this._barNode.setPosition(0, 44);
        this._barNode.addComponent(cc.Graphics);

        // ── mute toggle ──
        var muteBtn = this._button(root, '', 0, -24, 320, 54, COL_GREY, COL_GREY2, function () { PauseMenu._toggleMute(); });
        this._muteLbl = this._label(muteBtn, '', 24, COL_TEXT, 0, 0);

        // ── resume / quit ──
        this._button(root, '▶  Resume   (Esc)', 0, -96, 320, 58, COL_PINK, COL_PINK2, function () { PauseMenu.resume(); });
        this._button(root, '🏠  Main Menu', 0, -164, 320, 52, COL_GREY, COL_GREY2, function () { PauseMenu._quit(); });

        this._refresh();
    },

    _getOverlaySize: function (parent, target) {
        if (target && target.useCamera) {
            return cc.winSize;
        }
        if (parent && parent.getContentSize) {
            var size = parent.getContentSize();
            if (size && size.width > 0 && size.height > 0) return size;
        }
        return cc.view.getVisibleSize();
    },

    // redraw the volume bar + mute label from current state (no full rebuild)
    _refresh: function () {
        if (this._barNode && cc.isValid(this._barNode)) {
            var g = this._barNode.getComponent(cc.Graphics);
            g.clear();
            var n = 10, segW = 18, gap = 4;
            var x0 = -(n * segW + (n - 1) * gap) / 2;
            for (var i = 0; i < n; i++) {
                g.fillColor = (!this._muted && i < this._vol) ? COL_BAR : COL_OFF;
                g.roundRect(x0 + i * (segW + gap), -11, segW, 22, 3);
                g.fill();
            }
        }
        if (this._muteLbl && cc.isValid(this._muteLbl.node)) {
            this._muteLbl.string = this._muted ? '🔇  Sound: OFF' : '🔊  Sound: ON';
        }
    },

    // ── tiny builders ─────────────────────────────────────────
    _label: function (parent, str, size, color, x, y) {
        var node = new cc.Node('lbl');
        node.parent = parent;
        node.setPosition(x, y);
        var l = node.addComponent(cc.Label);
        l.fontSize = size;
        l.lineHeight = size + 4;
        l.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        l.verticalAlign = cc.Label.VerticalAlign.CENTER;
        l.string = str;
        node.color = color;
        PixelFont.apply(l);
        return l;
    },

    _button: function (parent, str, x, y, w, h, color, hiColor, cb) {
        var node = new cc.Node('btn');
        node.parent = parent;
        node.setPosition(x, y);
        node.setContentSize(w, h);
        var g = node.addComponent(cc.Graphics);
        var draw = function (c) {
            g.clear();
            g.fillColor = c;
            g.roundRect(-w / 2, -h / 2, w, h, 12); g.fill();
            g.lineWidth = 2; g.strokeColor = cc.color(255, 255, 255, 55);
            g.roundRect(-w / 2, -h / 2, w, h, 12); g.stroke();
        };
        draw(color);
        if (str) this._label(node, str, 24, cc.color(255, 255, 255), 0, 0);
        node.on(cc.Node.EventType.MOUSE_ENTER, function () { draw(hiColor); }, this);
        node.on(cc.Node.EventType.MOUSE_LEAVE, function () { draw(color); }, this);
        node.on(cc.Node.EventType.TOUCH_END, function () { if (typeof cb === 'function') cb(); }, this);
        return node;
    },
};

PauseMenu.init();
module.exports = PauseMenu;
