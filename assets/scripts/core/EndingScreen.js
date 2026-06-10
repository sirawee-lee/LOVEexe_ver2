'use strict';

// EndingScreen.js — full-screen end-game overlays (game over, finale, leaderboard).
//
// This is a PLAIN module (not a cc.Component), exactly like GameFlow.js: it draws
// a full-screen overlay into whatever scene's Canvas is currently active, so NO
// new scene files (.fire) need to be authored or wired. JS modules survive
// cc.director.loadScene, so the same instance is reused everywhere.
//
//   var EndingScreen = require('EndingScreen');
//   EndingScreen.showGameOver();   // 3 hearts gone (from the overworld)
//   EndingScreen.showBossLose();   // failed the final boss  -> ending_eecs_overload_2
//   EndingScreen.showBossWin();    // beat the final boss    -> black girl/dog choice
//
// Ending art lives in  assets/resources/endings/  (loaded by name at runtime).

var StoryState = require('StoryState');
var PixelFont  = require('PixelFont');   // VT323 8-bit font (matches the rest of the game)

// ── palette ───────────────────────────────────────────────
var COL_BLACK   = cc.color(8, 6, 12, 255);
var COL_DIM     = cc.color(0, 0, 0, 170);
var COL_PINK    = cc.color(232, 90, 140);
var COL_PINK_HI = cc.color(255, 130, 175);
var COL_GREY    = cc.color(95, 95, 110);
var COL_GREY_HI = cc.color(135, 135, 150);
var COL_GOLD    = cc.color(255, 210, 120);
var COL_TEXT    = cc.color(245, 240, 245);

var LB_KEY = 'loveexe_leaderboard';

var EndingScreen = {

    // ── public entry points ───────────────────────────────
    // 3 hearts gone in the overworld (osu / typing / niupai failures).
    showGameOver: function () {
        StoryState.dialogueActive = true;   // freeze the overworld underneath
        var self = this;
        this._imageScreen({
            image: 'game_over_screen',
            fallbackColor: cc.color(30, 10, 16),
            fallbackTitle: 'GAME OVER',
            subtitle: "Your heart couldn't take it...",
            buttons: [
                { text: 'Try Again', color: COL_PINK, hi: COL_PINK_HI, onClick: function () { self._restart(); } },
                { text: 'Exit',      color: COL_GREY, hi: COL_GREY_HI, onClick: function () { self._exit(); } },
            ],
        });
    },

    // Lost the final boss (boss love meter hit 0) -> EECS overload ending.
    showBossLose: function () {
        cc.audioEngine.stopMusic();   // stop the boss BGM so it doesn't bleed into the ending
        StoryState.dialogueActive = true;
        var self = this;
        this._imageScreen({
            image: 'ending_eecs_overload_2',
            fallbackColor: cc.color(10, 22, 12),
            fallbackTitle: 'EECS OVERLOAD',
            subtitle: 'Achievement unlocked: still single.',
            buttons: [
                // Keep your 3 cleared challenges — just walk back to Mei and retry the boss.
                { text: 'Try Again', color: COL_PINK, hi: COL_PINK_HI, onClick: function () { self._toOverworld(); } },
                { text: 'Exit',      color: COL_GREY, hi: COL_GREY_HI, onClick: function () { self._exit(); } },
            ],
        });
    },

    // Beat the final boss -> black "who do you choose?" screen.
    showBossWin: function () {
        cc.audioEngine.stopMusic();   // stop the boss BGM so it doesn't bleed into the finale
        StoryState.dialogueActive = true;
        this._recorded = false;   // let this playthrough's win be recorded once
        this._showChoice();
    },

    // ── the girl / dog choice (black screen) ──────────────
    _showChoice: function () {
        var self = this;
        var root = this._root(COL_BLACK);
        var vs = cc.view.getVisibleSize();
        var H = vs.height;

        this._label(root, "YOU DID IT!", 56, COL_GOLD, 0, H / 2 - 130);
        this._label(root, "Your campus days are over. Who will you\nspend the rest of them with?", 26, COL_TEXT, 0, H / 2 - 215);
        this._label(root, "Total score   " + StoryState.totalScore(), 24, cc.color(180, 200, 255), 0, 60);

        // two big choice buttons
        this._button(root, '💛  Mei', -170, -90, 280, 96, COL_PINK, COL_PINK_HI, function () {
            StoryState.endingRoute = 'true_love';
            self._showFinale('true_love');
        });
        this._button(root, '🐾  Niu Pai', 170, -90, 280, 96, cc.color(150, 110, 70), cc.color(195, 150, 100), function () {
            StoryState.endingRoute = 'niupai';
            self._showFinale('niupai');
        });
    },

    // ── the chosen finale: ending art + Leaderboard / Credits / Exit ──
    _showFinale: function (route) {
        var self = this;
        var image = route === 'niupai' ? 'ending_niupai_1' : 'ending_true_love_1';
        var title = route === 'niupai' ? 'NIU PAI ENDING' : 'TRUE LOVE ENDING';

        // record this winning run on the leaderboard exactly once
        if (!this._recorded) {
            this._recorded = true;
            this._addBoard(StoryState.totalScore(), route);
        }

        this._imageScreen({
            image: image,
            fallbackColor: route === 'niupai' ? cc.color(20, 16, 30) : cc.color(40, 16, 26),
            fallbackTitle: title,
            subtitle: 'Final score   ' + StoryState.totalScore(),
            buttons: [
                { text: 'Leaderboard', color: COL_PINK, hi: COL_PINK_HI, onClick: function () { self._showLeaderboard(function () { self._showFinale(route); }); } },
                { text: 'Credits',     color: COL_GREY, hi: COL_GREY_HI, onClick: function () { self._showCredits(function () { self._showFinale(route); }); } },
                { text: 'Exit',        color: COL_GREY, hi: COL_GREY_HI, onClick: function () { self._exit(); } },
            ],
        });
    },

    // ── leaderboard screen (Back returns to caller) ───────
    _showLeaderboard: function (backFn) {
        var root = this._root(cc.color(14, 12, 22, 255));
        var vs = cc.view.getVisibleSize();
        var H = vs.height;

        this._label(root, "🏆  LEADERBOARD", 44, COL_GOLD, 0, H / 2 - 90);

        var board = this._loadBoard();
        if (!board.length) {
            this._label(root, "No scores yet — be the first!", 26, COL_TEXT, 0, 20);
        } else {
            var top = H / 2 - 175;
            for (var i = 0; i < board.length && i < 8; i++) {
                var e = board[i];
                var tag = e.route === 'niupai' ? '🐾' : '💛';
                var row = (i + 1) + '.   ' + e.score + '   ' + tag;
                var col = i === 0 ? COL_GOLD : COL_TEXT;
                this._label(root, row, 28, col, 0, top - i * 44);
            }
        }
        this._button(root, '◀ Back', 0, -H / 2 + 70, 220, 76, COL_GREY, COL_GREY_HI, backFn);
    },

    // ── credits placeholder (Back returns to caller) ──────
    _showCredits: function (backFn) {
        var root = this._root(cc.color(14, 12, 22, 255));
        var vs = cc.view.getVisibleSize();
        var H = vs.height;
        this._label(root, "CREDITS", 48, COL_GOLD, 0, H / 2 - 110);
        this._label(root, "LOVE.EXE\n\nA Software Studios project.\n\n(Full credits coming soon.)", 28, COL_TEXT, 0, 30);
        this._button(root, '◀ Back', 0, -H / 2 + 70, 220, 76, COL_GREY, COL_GREY_HI, backFn);
    },

    // ── generic image + buttons screen ────────────────────
    // opt = { image, fallbackColor, fallbackTitle, subtitle, buttons:[{text,color,hi,onClick}] }
    _imageScreen: function (opt) {
        var self = this;
        var root = this._root(opt.fallbackColor || COL_BLACK);
        if (!root) return;
        var vs = cc.view.getVisibleSize();
        var W = vs.width, H = vs.height;

        // Full-screen art node, created NOW so its sibling order is correct:
        // above the opaque background (added by _root) but below the bar/buttons
        // added just after. The texture is filled in once it loads async.
        var imgNode = new cc.Node('art');
        imgNode.parent = root;
        var spr = imgNode.addComponent(cc.Sprite);
        spr.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        spr.trim = false;
        imgNode.setContentSize(W, H);            // stretch to fill the visible area
        imgNode.setPosition(0, 0);
        this._loadImage(opt.image, function (sf) {
            if (!cc.isValid(imgNode)) return;
            if (sf) {
                spr.spriteFrame = sf;
            } else if (cc.isValid(root)) {
                // no art available -> show the fallback title in the middle
                self._label(root, opt.fallbackTitle || '', 60, COL_TEXT, 0, 40);
            }
        });

        // a soft bar behind the buttons so text stays readable over any art
        var bar = new cc.Node('bar');
        bar.parent = root;
        bar.setPosition(0, -H / 2 + 64);
        var bg = bar.addComponent(cc.Graphics);
        bg.fillColor = COL_DIM;
        bg.rect(-W / 2, -64, W, 128);
        bg.fill();

        if (opt.subtitle) this._label(root, opt.subtitle, 24, COL_TEXT, 0, -H / 2 + 118);

        // lay the buttons out in a centred row
        var btns = opt.buttons || [];
        var bw = 230, gap = 28;
        var totalW = btns.length * bw + (btns.length - 1) * gap;
        var startX = -totalW / 2 + bw / 2;
        for (var i = 0; i < btns.length; i++) {
            var b = btns[i];
            this._button(root, b.text, startX + i * (bw + gap), -H / 2 + 64, bw, 76, b.color, b.hi, b.onClick);
        }
    },

    // ── overlay root (clears any previous overlay) ────────
    _root: function (bgColor) {
        var canvas = this._getCanvas();
        if (!canvas) return null;
        this._clear();

        var root = new cc.Node('__EndingOverlay');
        root.parent = canvas;
        root.zIndex = 100000;
        this._overlay = root;

        var vs = cc.view.getVisibleSize();
        var W = vs.width, H = vs.height;

        // opaque background that also swallows touches on the scene underneath
        var bgN = new cc.Node('bg');
        bgN.parent = root;
        bgN.setContentSize(W, H);
        var g = bgN.addComponent(cc.Graphics);
        g.fillColor = bgColor || COL_BLACK;
        g.rect(-W / 2, -H / 2, W, H);
        g.fill();
        bgN.on(cc.Node.EventType.TOUCH_START, function () {}, this);  // eat taps

        return root;
    },

    _clear: function () {
        if (this._overlay && cc.isValid(this._overlay)) this._overlay.destroy();
        this._overlay = null;
    },

    _getCanvas: function () {
        var scene = cc.director.getScene();
        if (!scene) return null;
        var canvas = scene.getChildByName('Canvas');
        if (!canvas) {
            var c = cc.Canvas.instance;
            canvas = c ? c.node : null;
        }
        return canvas;
    },

    // ── tiny UI builders ──────────────────────────────────
    _label: function (parent, str, size, color, x, y) {
        var node = new cc.Node('lbl');
        node.parent = parent;
        node.setPosition(x, y);
        var l = node.addComponent(cc.Label);
        l.fontSize = size;
        l.lineHeight = size + 8;
        l.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        l.verticalAlign = cc.Label.VerticalAlign.CENTER;
        l.string = str;
        node.color = color;
        PixelFont.apply(l);   // emoji still fall back to the system font on web canvas
        return l;
    },

    _button: function (parent, str, x, y, w, h, bgColor, hiColor, cb) {
        var node = new cc.Node('btn');
        node.parent = parent;
        node.setPosition(x, y);
        node.setContentSize(w, h);

        var g = node.addComponent(cc.Graphics);
        var draw = function (col) {
            g.clear();
            g.fillColor = col;
            g.roundRect(-w / 2, -h / 2, w, h, 14);
            g.fill();
            g.lineWidth = 3;
            g.strokeColor = cc.color(255, 255, 255, 60);
            g.roundRect(-w / 2, -h / 2, w, h, 14);
            g.stroke();
        };
        draw(bgColor);

        this._label(node, str, 28, cc.color(255, 255, 255), 0, 0);

        // hover + press feedback (desktop has mouse events; touch ignores enter/leave)
        node.on(cc.Node.EventType.MOUSE_ENTER, function () { draw(hiColor || bgColor); node.scale = 1.04; }, this);
        node.on(cc.Node.EventType.MOUSE_LEAVE, function () { draw(bgColor); node.scale = 1.0; }, this);
        node.on(cc.Node.EventType.TOUCH_END, function () {
            node.scale = 1.0;
            if (typeof cb === 'function') cb();
        }, this);
        return node;
    },

    // ── ending art loader (SpriteFrame, falling back to Texture2D) ──
    _loadImage: function (name, onDone) {
        var res = cc.resources;
        if (!res) { onDone(null); return; }
        res.load('endings/' + name, cc.SpriteFrame, function (err, sf) {
            if (!err && sf) { onDone(sf); return; }
            res.load('endings/' + name, cc.Texture2D, function (err2, tex) {
                if (!err2 && tex) { onDone(new cc.SpriteFrame(tex)); return; }
                cc.warn('[EndingScreen] could not load endings/' + name + ' — showing fallback');
                onDone(null);
            });
        });
    },

    // ── leaderboard persistence (cc.sys.localStorage) ─────
    _loadBoard: function () {
        try {
            var raw = cc.sys.localStorage.getItem(LB_KEY);
            var arr = raw ? JSON.parse(raw) : [];
            return Array.isArray(arr) ? arr : [];
        } catch (e) { return []; }
    },

    _addBoard: function (score, route) {
        var list = this._loadBoard();
        list.push({ score: score || 0, route: route, date: Date.now() });
        list.sort(function (a, b) { return b.score - a.score; });
        list = list.slice(0, 10);
        try { cc.sys.localStorage.setItem(LB_KEY, JSON.stringify(list)); } catch (e) {}
        return list;
    },

    // ── navigation actions ────────────────────────────────
    _restart: function () {
        this._clear();
        StoryState.reset();                 // fresh hearts, scores, progress
        cc.director.loadScene('MainScene');
    },

    _toOverworld: function () {
        // return to the campus WITHOUT wiping progress (cleared challenges remain,
        // hearts remain) so the player can walk back to Mei and retry the boss.
        this._clear();
        StoryState.dialogueActive = false;
        cc.director.loadScene('MainScene');
    },

    _exit: function () {
        try { if (cc.sys.isBrowser && typeof window !== 'undefined') window.close(); } catch (e) {}
        try { cc.game.end(); } catch (e) {}
    },
};

module.exports = EndingScreen;
