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
//     during    -> GameFlow.addScore(delta);   // +sub-objective / -mistake (live HUD)
//     on win    -> GameFlow.win();
//     on lose   -> GameFlow.lose();
//
// SCORE: points tick up LIVE while you play - each game calls addScore() for every
// sub-objective (+) or mistake (-). Those points stay "pending" until you clear the
// game; clearing banks them + CLEAR_BONUS. A failed attempt's pending points are
// dropped (and you lose a heart). When all 5 games are cleared, every heart still
// left adds HEART_POINTS. The boss total is added to StoryState (key 'boss') so it
// joins the campus games (Osu/Typing/Dog) in ONE grand total — the single leaderboard
// lives on the win screen (EndingScreen). The end-of-run summary shows the full
// breakdown. The live SCORE is shown top-right next to the hearts.

const PixelFont    = require('PixelFont');
const Juice        = require('Juice');           // screen shake / floating text / bursts
const Gamepad      = require('Gamepad');         // controller support (Gamepad API)
const StoryState   = require('StoryState');     // overworld bridge (persists across loadScene)
const EndingScreen = require('EndingScreen');   // finale / boss-fail end screens
const ScreenTransition = require('ScreenTransition');
require('PauseMenu');                            // global ESC pause menu (idempotent init)

const SEQUENCE = ['needle', 'counterGame', 'dontPress', 'flappy1', 'runner'];
const MAX_LOVE = 3;            // 3 hearts = 100% (each heart = 1/3)

// ---- Scoring economy (tune these freely) ------------------------------------
// Final score = sum over cleared games of (points earned inside it + CLEAR_BONUS)
//               + (hearts still left at the very end) * HEART_POINTS.
// The "points earned inside" come from each game's live addScore() calls; per-game
// point values are defined at the top of each game file.
const CLEAR_BONUS  = 500;      // bonus for finishing a game (on top of its live points)
const HEART_POINTS = 1500;     // per heart still left when the boss is cleared

const COL_BG      = cc.color(20, 20, 30, 200);
const COL_HEART   = cc.color(231, 76, 60);
const COL_EMPTY   = cc.color(90, 90, 100);
const COL_WIN     = cc.color(120, 230, 130);
const COL_LOSE    = cc.color(255, 95, 95);
const COL_BTN     = cc.color(70, 160, 255);
const COL_BTN2    = cc.color(120, 120, 130);
const COL_GOLD    = cc.color(255, 215, 90);

const GameFlow = {
    sequence: SEQUENCE,

    // ---- persistent state (kept across loadScene because the module persists) ----
    started: false,
    love: MAX_LOVE,
    currentIndex: 0,
    score: 0,                // banked total from cleared games
    pending: 0,              // live points in the CURRENT game (not banked yet)
    scores: {},              // per-game banked points, e.g. { needle: 1350, ... }
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
            this.score = 0;
            this.scores = {};
        }
        this._gameNode = gameNode || null;   // screen-shake target
        this.pending = 0;        // fresh attempt -> no live points yet
        this._busy = false;
        Gamepad.ensureStarted();             // controller support (idempotent)
        this._buildHud();
        this._fadeIn();                      // smooth entry from the previous scene
    },

    // -----------------------------------------------------------------
    //  Win / Lose entry points (call from the games)
    // -----------------------------------------------------------------
    // Live points earned during play (+ sub-objective, - mistake). They stay
    // "pending" until the game is cleared; clamped so the live total never drops
    // below what's already banked.
    addScore(delta) {
        this.pending = Math.max(0, this.pending + delta);
        this._refreshScore();
        if (delta) this._popScore(delta);   // floating +N / -N near the HUD
    },

    // Floating "+100" (gold) / "-150" (red) just under the score label.
    _popScore(delta) {
        const canvas = this._getCanvas();
        if (!canvas || !this._scoreLabel || !cc.isValid(this._scoreLabel.node)) return;
        const wp = this._scoreLabel.node.parent.convertToWorldSpaceAR(this._scoreLabel.node.position);
        const lp = canvas.convertToNodeSpaceAR(wp);
        const txt = (delta > 0 ? '+' : '') + delta;
        Juice.floatText(canvas, txt, delta > 0 ? COL_GOLD : COL_LOSE, lp.x - 24, lp.y - 36, 28);
    },

    win() {
        if (this._busy) return;
        this._busy = true;

        // bank this game's live points + a flat clear bonus
        const gameName = this.sequence[this.currentIndex];
        const earned = this.pending + CLEAR_BONUS;
        this.scores[gameName] = earned;
        this.score += earned;
        this.pending = 0;
        this._refreshScore();

        if (this.currentIndex >= this.sequence.length - 1) {
            this._finishBoss();      // last game -> tally score + heart bonus
            return;
        }
        this.currentIndex++;
        this._loadScene(this.sequence[this.currentIndex]);
    },

    // All 5 games cleared: add the heart bonus, fold the boss total into the
    // overworld grand total, then show the full-run breakdown.
    _finishBoss() {
        const heartBonus = this.love * HEART_POINTS;
        const finalScore = this.score + heartBonus;
        StoryState.addScore('boss', finalScore);   // joins the campus games in the grand total
        StoryState.finalCleared = true;
        this._showScoreSummary(heartBonus);
    },

    // -----------------------------------------------------------------
    //  Entry points used by the Start menu
    // -----------------------------------------------------------------
    startBoss() {
        this.started = true;
        this.love = MAX_LOVE;
        this.score = 0;
        this.pending = 0;
        this.scores = {};
        this.currentIndex = 0;
        this._busy = false;
        this._loadScene(this.sequence[0]);
    },

    // Final win (from the score-summary "Next ▶") -> the romance finale:
    // black girl/dog choice -> ending art + Leaderboard/Credits/Exit.
    _goToEnding() {
        this.started = false;
        EndingScreen.showBossWin();
    },

    lose() {
        if (this._busy) return;
        this._busy = true;

        this.pending = 0;            // drop the failed attempt's live points
        this.love = Math.max(0, this.love - 1);   // lose 1/3
        this._refreshHearts();
        this._refreshScore();
        this._juiceHeartLoss();      // screen shake + a burst where the heart was

        if (this.love <= 0) {
            // Failed the final boss (out of love) → EECS overload ending.
            this.started = false;
            EndingScreen.showBossLose();
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
        this.score = 0;
        this.pending = 0;
        this.scores = {};
        this.currentIndex = 0;
        this._loadScene(this.sequence[0]);
    },

    _loadScene(name) {
        this._fadeOut(() => cc.director.loadScene(name));
    },

    // ---- Scene-transition fade + heart-loss juice ----------------------------
    _fadeOut(cb) {
        ScreenTransition.fadeOut(cb);
    },

    _fadeIn() {
        ScreenTransition.fadeIn();
    },

    _juiceHeartLoss() {
        const canvas = this._getCanvas();
        if (!canvas) return;
        // shake the game content (HUD + overlay stay put); fall back to the canvas
        Juice.shake((this._gameNode && cc.isValid(this._gameNode)) ? this._gameNode : canvas, 16, 0.35);
        // pop a burst of red right where the heart that just emptied sits
        const lost = this._hearts && this._hearts[this.love];
        if (lost && cc.isValid(lost.node)) {
            const wp = lost.node.parent.convertToWorldSpaceAR(lost.node.position);
            const lp = canvas.convertToNodeSpaceAR(wp);
            Juice.burst(canvas, lp.x, lp.y, COL_HEART, 14);
        }
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

        // running score, top-right (same group, so it's torn down with the HUD)
        const sx = canvas.width - 2 * margin;   // hud origin is the top-left+margin corner
        const sLbl = this._makeLabel(hud, '', 36, COL_GOLD, sx, -24);
        sLbl.horizontalAlign = cc.Label.HorizontalAlign.RIGHT;
        sLbl.node.anchorX = 1;
        this._scoreLabel = sLbl;

        this._hudNode = hud;
        this._refreshHearts();
        this._refreshScore();
    },

    _refreshScore() {
        if (this._scoreLabel && cc.isValid(this._scoreLabel.node)) {
            this._scoreLabel.string = 'SCORE ' + (this.score + this.pending);
        }
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

    // ---- End-of-run breakdown: the WHOLE run (campus games + boss) in one place,
    // summing to the GRAND TOTAL that the win-screen leaderboard records. ---------
    _showScoreSummary(heartBonus) {
        const canvas = this._getCanvas();
        if (!canvas) return;

        const old = canvas.getChildByName('__FlowOverlay');
        if (old) old.destroy();

        const root = new cc.Node('__FlowOverlay');
        root.parent = canvas;
        root.zIndex = 10000;

        const bg = new cc.Node('bg');
        bg.parent = root;
        bg.setContentSize(canvas.width, canvas.height);
        const g = bg.addComponent(cc.Graphics);
        g.fillColor = COL_BG;
        g.rect(-canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
        g.fill();
        bg.on(cc.Node.EventType.TOUCH_START, () => {}, this);   // eat taps

        const H = canvas.height;
        const halfW = Math.min(300, canvas.width / 2 - 50);
        const step = 36;
        const top = H / 2;
        const ss = StoryState.scores || {};

        this._makeLabel(root, "You're amazing! xoxo", 36, COL_WIN, 0, top - 44);

        // Campus challenges (incl. Osu) first, then the 5 boss games, then hearts —
        // these rows sum exactly to the GRAND TOTAL shown below.
        const rows = [
            ['Osu  (Dad)',        ss.father    || 0],
            ['Typing  (Prof)',    ss.professor || 0],
            ['Niu Pai  (Dog)',    ss.niupai    || 0],
            ['Thread the Needle', this.scores.needle      || 0],
            ['Counting',          this.scores.counterGame || 0],
            ["Don't Press",       this.scores.dontPress   || 0],
            ['Flappy',            this.scores.flappy1     || 0],
            ['Race',              this.scores.runner      || 0],
        ];
        let y = top - 100;
        for (let i = 0; i < rows.length; i++) {
            this._makeScoreRow(root, rows[i][0], '' + rows[i][1], y, halfW, cc.color(228, 228, 236), 24);
            y -= step;
        }
        this._makeScoreRow(root, 'Hearts left ×' + this.love, '+' + heartBonus, y, halfW, COL_HEART, 24);
        y -= step + 8;

        this._makeScoreRow(root, 'GRAND TOTAL', '' + StoryState.totalScore(), y, halfW, COL_GOLD, 38);
        y -= step;

        this._makeButton(root, 'Next ▶', 0, y - 54, 260, 78, COL_BTN, () => this._goToEnding());
    },

    // One "Name .......... value" row: name left-aligned, value right-aligned.
    _makeScoreRow(parent, leftStr, rightStr, y, halfW, color, size) {
        const lt = this._makeLabel(parent, leftStr, size, color, -halfW, y);
        lt.horizontalAlign = cc.Label.HorizontalAlign.LEFT;
        lt.node.anchorX = 0;
        const rt = this._makeLabel(parent, rightStr, size, color, halfW, y);
        rt.horizontalAlign = cc.Label.HorizontalAlign.RIGHT;
        rt.node.anchorX = 1;
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
        PixelFont.apply(l);
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
