// CountingGame.js
// Counting mini-game for Cocos Creator 2.x
//
// FLOW per level:
//   1) RUN phase    - characters walk left -> right (~5-8s). Player watches.
//                     Hand + counter badge HIDDEN.
//   2) ANSWER phase - after everyone exits, the question + hand + counter badge appear.
//                     Click hand to build the answer, then Submit (or Space) to check.
//   After each answer a progress icon is shown:
//       white check on green circle = correct,  white cross on red circle = wrong.
//
// WIN CONDITION: get at least 2 of 3 levels correct -> "You Win", else "You Lose".
// All 3 levels are always played so the icon row fills up.
//
// *** Characters use prefabs YOU build from SpriteFrames in your .plist files ***

const GameFlow = require('GameFlow');

cc.Class({
    extends: cc.Component,

    properties: {
        marioPrefab:        { default: null, type: cc.Prefab },
        goombaPrefab:       { default: null, type: cc.Prefab },
        wingedGoombaPrefab: { default: null, type: cc.Prefab },

        characterLayer: { default: null, type: cc.Node },

        // UI
        counterLabel:  { default: null, type: cc.Label },
        counterBadge:  { default: null, type: cc.Node,  tooltip: 'Counter badge node (parent of CounterLabel)' },
        questionLabel: { default: null, type: cc.Label },
        hintLabel:     { default: null, type: cc.Label, tooltip: 'Yellow hint shown on level 1 ("Click the hand to answer")' },
        resultLabel:   { default: null, type: cc.Label, tooltip: 'Shows "Correct!"/"Wrong!" between levels' },
        endLabel:      { default: null, type: cc.Label, tooltip: 'Big centered You Win / You Lose label' },
        handButton:    { default: null, type: cc.Node,  tooltip: 'Hand button (needs a Size to be tappable)' },
        submitButton:  { default: null, type: cc.Node,  tooltip: 'Submit/Check button (Space also works)' },

        // Progress icons
        scoreIconsLayer: { default: null, type: cc.Node,    tooltip: 'Empty node where check/cross icons appear in a row' },
        correctIcon:     { default: null, type: cc.SpriteFrame, tooltip: 'icon_correct.png' },
        wrongIcon:       { default: null, type: cc.SpriteFrame, tooltip: 'icon_wrong.png' },
        iconSize:        { default: 64, tooltip: 'Width/height of each progress icon (px)' },
        iconGap:         { default: 24, tooltip: 'Gap between icons (px)' },

        // Tuning
        characterScale: { default: 3 },
        baseDistractors:{ default: 4 },
        minTarget:      { default: 3 },
        maxTarget:      { default: 6 },
        minRunTime:     { default: 5 },
        maxRunTime:     { default: 8 },

        spawnX: { default: -500 },
        exitX:  { default:  520 },
        laneTop:    { default:  120 },
        laneBottom: { default: -160 },

        // ===== Per-game music (drag an audio clip here in the Inspector) =====
        bgm:       { default: null, type: cc.AudioClip, tooltip: 'Background music for this game (loops)' },
        bgmVolume: { default: 0.6, tooltip: 'Music volume 0..1' },

        // ===== Sound effects (drag an audio clip into each) =====
        tapSfx:     { default: null, type: cc.AudioClip, tooltip: 'Plays each time you tap the hand to count' },
        correctSfx: { default: null, type: cc.AudioClip, tooltip: 'Plays when an answer is correct' },
        wrongSfx:   { default: null, type: cc.AudioClip, tooltip: 'Plays when an answer is wrong' },
    },

    onLoad() {
        this.levels = [
            { target: 'mario',  distMult: 1.0, question: 'How many Marios?' },
            { target: 'goomba', distMult: 1.5, question: 'How many Goombas (without wings)?' },
            { target: 'winged', distMult: 2.5, question: 'How many Goombas with wings?' },
        ];
        this.winThreshold = 2;             // need 2 of 3 to win

        this.level = 0;
        this.correctCount = 0;             // how many levels answered correctly
        this.results = [];                 // true/false per level (for icon row)
        this.movers = [];
        this.phase = 'idle';
        this.counterBaseY = this.counterLabel ? this.counterLabel.node.y : 0;

        if (this.handButton)   this.handButton.on(cc.Node.EventType.TOUCH_START, this.onTapHand, this);
        if (this.submitButton) this.submitButton.on(cc.Node.EventType.TOUCH_START, this.onSubmit, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);

        if (this.endLabel) this.endLabel.node.active = false;
        this.clearIcons();

        GameFlow.onEnterGame('counterGame', this.node);
        this._playBgm();

        this.startLevel();
    },

    // Play this game's music (only if a clip was dragged into `bgm`)
    _playBgm() {
        if (!this.bgm) return;
        cc.audioEngine.stopMusic();
        cc.audioEngine.playMusic(this.bgm, true);
        cc.audioEngine.setMusicVolume(this.bgmVolume);
    },

    // Play a one-shot sound effect (only if a clip is assigned)
    _sfx(clip) {
        if (clip) cc.audioEngine.playEffect(clip, false);
    },

    onDestroy() {
        if (this.handButton)   this.handButton.off(cc.Node.EventType.TOUCH_START, this.onTapHand, this);
        if (this.submitButton) this.submitButton.off(cc.Node.EventType.TOUCH_START, this.onSubmit, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
    },

    // ----- RUN phase -----
    startLevel() {
        this.cfg = this.levels[this.level];
        this.phase = 'run';

        this.counter = 0;
        this.updateCounter();
        if (this.questionLabel) this.questionLabel.string = 'Watch carefully...';
        if (this.resultLabel) this.resultLabel.string = '';

        if (this.handButton)   this.handButton.active = false;
        if (this.submitButton) this.submitButton.active = false;
        if (this.counterBadge) this.counterBadge.active = false;
        if (this.hintLabel)    this.hintLabel.node.active = false;

        this.movers.forEach(m => m.node.destroy());
        this.movers = [];

        const targetType = this.cfg.target;
        this.targetCount = this.randInt(this.minTarget, this.maxTarget);
        const totalDistractors = Math.round(this.baseDistractors * this.cfg.distMult);

        const distractorTypes = ['mario', 'goomba', 'winged'].filter(t => t !== targetType);
        const d0 = Math.round(totalDistractors / 2);
        const d1 = totalDistractors - d0;

        const queue = [];
        for (let i = 0; i < this.targetCount; i++) queue.push(targetType);
        for (let i = 0; i < d0; i++) queue.push(distractorTypes[0]);
        for (let i = 0; i < d1; i++) queue.push(distractorTypes[1]);
        this.shuffle(queue);

        queue.forEach((type, idx) => this.spawnCharacter(type, idx));
    },

    spawnCharacter(type, idx) {
        let prefab = this.marioPrefab;
        if (type === 'goomba') prefab = this.goombaPrefab;
        else if (type === 'winged') prefab = this.wingedGoombaPrefab;
        if (!prefab || !this.characterLayer) return;

        const node = cc.instantiate(prefab);
        this.characterLayer.addChild(node);
        node.scale = this.characterScale;

        node.x = this.spawnX - idx * (70 + Math.random() * 120);
        node.y = this.laneBottom + Math.random() * (this.laneTop - this.laneBottom);

        const runTime = this.minRunTime + Math.random() * (this.maxRunTime - this.minRunTime);
        const speed = (this.exitX - node.x) / runTime;
        this.movers.push({ node: node, speed: speed });
    },

    update(dt) {
        if (this.phase !== 'run' || this.movers.length === 0) return;
        for (let i = this.movers.length - 1; i >= 0; i--) {
            const m = this.movers[i];
            m.node.x += m.speed * dt;
            if (m.node.x > this.exitX) {
                m.node.destroy();
                this.movers.splice(i, 1);
            }
        }
        if (this.movers.length === 0) this.enterAnswerPhase();
    },

    // ----- ANSWER phase -----
    enterAnswerPhase() {
        this.phase = 'answer';
        this.counter = 0;
        this.updateCounter();
        if (this.questionLabel) this.questionLabel.string = this.cfg.question;
        if (this.hintLabel) {
            // Yellow hint, only on the first question
            this.hintLabel.node.active = (this.level === 0);
            this.hintLabel.string = 'Click the hand to answer';
        }
        if (this.handButton)   this.handButton.active = true;
        if (this.submitButton) this.submitButton.active = true;
        if (this.counterBadge) this.counterBadge.active = true;
    },

    onTapHand() {
        if (this.phase !== 'answer') return;
        this.counter++;
        this.updateCounter();
        this.shakeCounter();
        this._sfx(this.tapSfx);
    },

    onKeyDown(event) {
        if (event.keyCode === cc.macro.KEY.space) this.onSubmit();
    },

    onSubmit() {
        if (this.phase !== 'answer') return;
        this.phase = 'idle';
        if (this.handButton)   this.handButton.active = false;
        if (this.submitButton) this.submitButton.active = false;
        this.checkAnswer();
    },

    checkAnswer() {
        const correct = (this.counter === this.targetCount);
        this.results.push(correct);
        if (correct) this.correctCount++;
        this.addIcon(correct);            // show check / cross in the row
        this._sfx(correct ? this.correctSfx : this.wrongSfx);

        if (this.resultLabel) {
            this.resultLabel.string = correct
                ? ('Correct! There were ' + this.targetCount)
                : ('Wrong! It was ' + this.targetCount);
            this.resultLabel.node.color = correct ? cc.Color.GREEN : cc.Color.RED;
        }

        if (this.level >= this.levels.length - 1) {
            this.scheduleOnce(this.finishGame, 1.6);   // last level -> verdict
        } else {
            this.scheduleOnce(this.nextLevel, 1.6);
        }
    },

    nextLevel() {
        this.level++;
        this.startLevel();
    },

    finishGame() {
        const won = (this.correctCount >= this.winThreshold);
        this.showEnd(won ? 'You Win' : 'You Lose', won ? cc.Color.GREEN : cc.Color.RED);
        this.scheduleOnce(() => (won ? GameFlow.win() : GameFlow.lose()), 1.4);
    },

    // ----- Progress icons -----
    clearIcons() {
        if (this.scoreIconsLayer) this.scoreIconsLayer.removeAllChildren();
    },

    addIcon(correct) {
        if (!this.scoreIconsLayer) return;
        const frame = correct ? this.correctIcon : this.wrongIcon;
        if (!frame) return;

        const node = new cc.Node('icon');
        const sp = node.addComponent(cc.Sprite);
        sp.spriteFrame = frame;
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;   // honor iconSize instead of native 160px
        sp.trim = false;
        node.width = this.iconSize;
        node.height = this.iconSize;
        this.scoreIconsLayer.addChild(node);

        // lay out the whole row centered horizontally
        const n = this.scoreIconsLayer.childrenCount;
        const step = this.iconSize + this.iconGap;
        const startX = -((n - 1) * step) / 2;
        this.scoreIconsLayer.children.forEach((c, i) => { c.x = startX + i * step; c.y = 0; });

        // little pop
        node.scale = 0;
        cc.tween(node).to(0.18, { scale: 1 }, { easing: 'backOut' }).start();
    },

    // ----- End screen -----
    showEnd(text, color) {
        this.phase = 'idle';
        this.movers.forEach(m => m.node.destroy());
        this.movers = [];
        if (this.characterLayer) this.characterLayer.active = false;
        if (this.handButton)     this.handButton.active = false;
        if (this.submitButton)   this.submitButton.active = false;
        if (this.counterBadge)   this.counterBadge.active = false;
        if (this.questionLabel)  this.questionLabel.node.active = false;
        if (this.hintLabel)      this.hintLabel.node.active = false;
        if (this.resultLabel && this.endLabel) this.resultLabel.node.active = false;
        // keep scoreIconsLayer visible so the player sees their 3 results

        const lbl = this.endLabel || this.resultLabel;
        if (lbl) {
            lbl.node.active = true;
            lbl.node.setPosition(0, 0);   // center; size/bold/line-height set in editor
            lbl.string = text;
            lbl.node.color = color;
        }
    },

    // ----- helpers -----
    updateCounter() {
        if (this.counterLabel) this.counterLabel.string = '' + this.counter;
    },

    shakeCounter() {
        if (!this.counterLabel) return;
        const node = this.counterLabel.node;
        cc.Tween.stopAllByTarget(node);
        node.y = this.counterBaseY;
        cc.tween(node).by(0.05, { y: 12 }).by(0.05, { y: -12 }).start();
    },

    randInt(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); },

    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    },
});
