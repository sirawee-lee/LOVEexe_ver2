// GameFlow.js  -  Boss-stage flow manager for the 5 mini-games (Cocos Creator 2.4.8)
//
// Chains the 5 games into ONE boss stage:
//     needle -> counterGame -> dontPress -> flappy1 -> runner
//
// WIN  a game  -> go to the next game (last game -> "Boss Cleared").
// LOSE a game  -> "Try Again" overlay, the love meter loses 1/3 (one of 3 hearts),
//                 then retry the SAME game. 0 hearts left -> "Game Over".
//
// This is a PLAIN module (not a cc.Component). JS modules survive cc.director.loadScene,
// so the love meter / progress are kept across scenes WITHOUT a persist-root node.
// All UI (heart HUD + overlays) is drawn in code into the active scene's Canvas,
// so NONE of the existing game scenes (.fire) need to be edited.
//
// Each game only has to:
//     const GameFlow = require('GameFlow');
//     onLoad()  -> GameFlow.onEnterGame('needle', this.node);   // scene name
//     on win    -> GameFlow.win();
//     on lose   -> GameFlow.lose();

const SEQUENCE = ['needle', 'counterGame', 'dontPress', 'flappy1', 'runner'];
const MAX_LOVE = 3;            // 3 hearts = 100% (each heart = 1/3)

const COL_BG      = cc.color(20, 20, 30, 200);
const COL_HEART   = cc.color(231, 76, 60);
const COL_EMPTY   = cc.color(90, 90, 100);
const COL_WIN     = cc.color(120, 230, 130);
const COL_LOSE    = cc.color(255, 95, 95);
const COL_BTN     = cc.color(70, 160, 255);
const COL_BTN2    = cc.color(120, 120, 130);

const GameFlow = {
    sequence: SEQUENCE,

    // ---- persistent state (kept across loadScene because the module persists) ----
    started: false,
    love: MAX_LOVE,
    currentIndex: 0,
    _busy: false,            // guards against double win/lose during transitions

    // -----------------------------------------------------------------
    //  Called from each game's onLoad()
    // -----------------------------------------------------------------
    onEnterGame(sceneName, gameNode) {
        const idx = this.sequence.indexOf(sceneName);
        if (idx >= 0) this.currentIndex = idx;

        if (!this.started) {
            this.started = true;
            this.love = MAX_LOVE;
        }
        this._busy = false;
        this._buildHud();
    },

    // -----------------------------------------------------------------
    //  Win / Lose entry points (call from the games)
    // -----------------------------------------------------------------
    win() {
        if (this._busy) return;
        this._busy = true;

        if (this.currentIndex >= this.sequence.length - 1) {
            this._showOverlay({
                title: "OMG! You're amazing! xoxo",
                titleColor: COL_WIN,
                titleSize: 56,
                subtitle: 'You cleared all 5 games',
                btnText: 'Next ▶',
                btnColor: COL_BTN,
                onClick: () => this._goToEnding(),
            });
            return;
        }
        this.currentIndex++;
        this._loadScene(this.sequence[this.currentIndex]);
    },

    // -----------------------------------------------------------------
    //  Entry points used by the Start menu
    // -----------------------------------------------------------------
    startBoss() {
        this.started = true;
        this.love = MAX_LOVE;
        this.currentIndex = 0;
        this._busy = false;
        this._loadScene(this.sequence[0]);
    },

    // Final win -> ending sequence. The end-credit scene is built later;
    // until it exists, show a friendly placeholder instead of crashing.
    _goToEnding() {
        if (!cc.director.loadScene('endCredit')) {
            this._showOverlay({
                title: '🎬 To be continued...',
                titleColor: COL_WIN,
                titleSize: 48,
                subtitle: 'End credit coming soon',
                btnText: 'Play Again',
                btnColor: COL_BTN,
                onClick: () => this._restartBoss(),
            });
        }
    },

    lose() {
        if (this._busy) return;
        this._busy = true;

        this.love = Math.max(0, this.love - 1);   // lose 1/3
        this._refreshHearts();

        if (this.love <= 0) {
            this._showOverlay({
                title: 'GAME OVER',
                titleColor: COL_LOSE,
                subtitle: 'Out of love...',
                btnText: 'Restart',
                btnColor: COL_BTN2,
                onClick: () => this._restartBoss(),
            });
        } else {
            const pct = Math.round((this.love / MAX_LOVE) * 100);
            this._showOverlay({
                title: 'Try Again',
                titleColor: COL_LOSE,
                subtitle: 'Love: ' + pct + '%   (' + this.love + ' / ' + MAX_LOVE + ')',
                btnText: 'Retry',
                btnColor: COL_BTN,
                onClick: () => this._loadScene(this.sequence[this.currentIndex]),
            });
        }
    },

    // -----------------------------------------------------------------
    //  Internal helpers
    // -----------------------------------------------------------------
    _restartBoss() {
        this.love = MAX_LOVE;
        this.currentIndex = 0;
        this._loadScene(this.sequence[0]);
    },

    _loadScene(name) {
        cc.director.loadScene(name);
    },

    _getCanvas() {
        const scene = cc.director.getScene();
        if (!scene) return null;
        let canvas = scene.getChildByName('Canvas');
        if (!canvas) {
            const cc2 = cc.Canvas.instance;
            canvas = cc2 ? cc2.node : null;
        }
        return canvas;
    },

    // ---- Love HUD (top-left, 😍 x3) ------------------------------------------
    _buildHud() {
        const canvas = this._getCanvas();
        if (!canvas) return;

        // remove an old HUD if this scene somehow already has one
        const old = canvas.getChildByName('__FlowHud');
        if (old) old.destroy();

        const margin = 28;
        const step = 50;        // spacing between emojis

        const hud = new cc.Node('__FlowHud');
        hud.parent = canvas;
        hud.zIndex = 9999;
        // anchor the group to the top-left corner (with a little margin)
        hud.setPosition(-canvas.width / 2 + margin, canvas.height / 2 - margin);

        this._hearts = [];
        for (let i = 0; i < MAX_LOVE; i++) {
            // i=0 leftmost, growing to the right from the corner
            const x = i * step + 22;
            const h = this._makeLabel(hud, '😍', 40, cc.color(255, 255, 255), x, -24);
            this._hearts.push(h);
        }
        this._hudNode = hud;
        this._refreshHearts();
    },

    _refreshHearts() {
        if (!this._hearts) return;
        for (let i = 0; i < this._hearts.length; i++) {
            const lbl = this._hearts[i];
            if (!lbl || !cc.isValid(lbl.node)) continue;
            // lost love -> dim the emoji so it reads as "spent"
            lbl.node.opacity = (i < this.love) ? 255 : 60;
        }
    },

    // ---- Result overlay -------------------------------------------------------
    _showOverlay(opt) {
        const canvas = this._getCanvas();
        if (!canvas) return;

        const old = canvas.getChildByName('__FlowOverlay');
        if (old) old.destroy();

        const root = new cc.Node('__FlowOverlay');
        root.parent = canvas;
        root.zIndex = 10000;

        // dim background (also swallows taps so the game underneath is inert)
        const bg = new cc.Node('bg');
        bg.parent = root;
        bg.setContentSize(canvas.width, canvas.height);
        const g = bg.addComponent(cc.Graphics);
        g.fillColor = COL_BG;
        g.rect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        g.fill();
        bg.on(cc.Node.EventType.TOUCH_START, () => {}, this);  // eat touches

        const titleLbl = this._makeLabel(root, opt.title, opt.titleSize || 72, opt.titleColor, 0, 90);
        titleLbl.node.width = canvas.width - 120;
        titleLbl.overflow = cc.Label.Overflow.RESIZE_HEIGHT;
        titleLbl.enableWrapText = true;
        if (opt.subtitle) this._makeLabel(root, opt.subtitle, 30, cc.color(230, 230, 235), 0, 20);
        this._makeButton(root, opt.btnText, 0, -80, 260, 84, opt.btnColor, opt.onClick);
    },

    // ---- tiny UI builders -----------------------------------------------------
    _makeLabel(parent, str, size, color, x, y) {
        const node = new cc.Node('lbl');
        node.parent = parent;
        node.setPosition(x, y);
        const l = node.addComponent(cc.Label);
        l.fontSize = size;
        l.lineHeight = size + 4;
        l.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        l.string = str;
        node.color = color;
        return l;
    },

    _makeButton(parent, str, x, y, w, h, bgColor, cb) {
        const node = new cc.Node('btn');
        node.parent = parent;
        node.setPosition(x, y);
        node.setContentSize(w, h);

        const g = node.addComponent(cc.Graphics);
        g.fillColor = bgColor;
        g.roundRect(-w / 2, -h / 2, w, h, 16);
        g.fill();

        this._makeLabel(node, str, 36, cc.color(255, 255, 255), 0, 0);

        node.on(cc.Node.EventType.TOUCH_END, () => {
            if (typeof cb === 'function') cb();
        }, this);
        return node;
    },
};

module.exports = GameFlow;
