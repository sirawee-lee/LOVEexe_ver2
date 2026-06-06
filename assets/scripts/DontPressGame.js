// DontPressGame.js
// One-button puzzle game for Cocos Creator 2.x  (homage to "don't press the button" puzzles)
//
// Each level has its own rule:
//   required = 0  -> DON'T press. Survive the time limit without pressing = pass.
//   required = N  -> press the button EXACTLY N times before the time runs out.
// Wrong action = You Lose. Clear every level = You Win.
// Click the button (or press Space). After a win/lose, tap the button to play again.

const GameFlow = require("GameFlow");

cc.Class({
  extends: cc.Component,

  properties: {
    button: {
      default: null,
      type: cc.Node,
      tooltip: "The button (needs a Size to be tappable)",
    },
    promptLabel: {
      default: null,
      type: cc.Label,
      tooltip: "Shows each level instruction",
    },
    timerLabel: { default: null, type: cc.Label, tooltip: "Countdown" },
    countLabel: {
      default: null,
      type: cc.Label,
      tooltip: "Presses this level",
    },
    resultLabel: {
      default: null,
      type: cc.Label,
      tooltip: "Nice! / You Win / You Lose",
    },

    idleWindow: {
      default: 1.0,
      tooltip: 'Seconds of no-press before a "press N" level is judged',
    },

    // Per-game music (drag an audio clip here in the Inspector)
    bgm: {
      default: null,
      type: cc.AudioClip,
      tooltip: "Background music for this game (loops)",
    },
    bgmVolume: { default: 0.6, tooltip: "Music volume 0..1" },

    // Sound effects (drag an audio clip into each)
    pressSfx: {
      default: null,
      type: cc.AudioClip,
      tooltip: "Plays when the button is pressed",
    },
    passSfx: {
      default: null,
      type: cc.AudioClip,
      tooltip: "Plays when a level is passed (Nice!)",
    },
    failSfx: {
      default: null,
      type: cc.AudioClip,
      tooltip: "Plays when you lose",
    },
  },

  onLoad() {
    // Original level set (rule per level)
    this.levels = [
      { prompt: "DON'T press the button.", required: 0, timeLimit: 4 },
      { prompt: "Good. Now press it ONCE.", required: 1, timeLimit: 3 },
      { prompt: "Press the button 3 times.", required: 3, timeLimit: 4 },
      {
        prompt: "Press the number of sides on a triangle.",
        required: 3,
        timeLimit: 4,
      },
      {
        prompt: "It's a trap. Do NOT press anything.",
        required: 0,
        timeLimit: 3,
      },
      {
        prompt: "Press the number of corners on a square.",
        required: 4,
        timeLimit: 4,
      },
      {
        prompt: "Last one... whatever happens, DON'T press!",
        required: 0,
        timeLimit: 3,
      },
    ];

    this.level = 0;
    this.phase = "idle"; // 'play' | 'between' | 'over'

    if (this.button)
      this.button.on(cc.Node.EventType.TOUCH_START, this.onPress, this);
    cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);

    this._handoff = false;
    GameFlow.onEnterGame("dontPress", this.node);
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
    if (this.button)
      this.button.off(cc.Node.EventType.TOUCH_START, this.onPress, this);
    cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
  },

  startLevel() {
    this.cfg = this.levels[this.level];
    this.phase = "play";
    this.count = 0;
    this.levelTime = 0;
    this.idleTime = 0;
    this.pressed = false;

    if (this.promptLabel) this.promptLabel.string = this.cfg.prompt;
    if (this.resultLabel) this.resultLabel.string = "";
    this.updateCount();
    this.updateTimer();

    // Button stays still at all times; it only reacts when pressed
    this.stopPulse();
  },

  update(dt) {
    if (this.phase !== "play") return;
    this.levelTime += dt;

    if (this.cfg.required === 0) {
      // survive the timer
      if (this.levelTime >= this.cfg.timeLimit) this.pass();
    } else {
      if (this.pressed) {
        this.idleTime += dt;
        if (this.idleTime >= this.idleWindow) this.evaluate();
      }
      if (this.levelTime >= this.cfg.timeLimit) this.evaluate();
    }
    this.updateTimer();
  },

  onKeyDown(event) {
    if (event.keyCode === cc.macro.KEY.space) this.onPress();
  },

  onPress() {
    if (this._handoff) return; // flow is taking over -> ignore taps
    if (this.phase === "over") {
      this.restartGame();
      return;
    }
    if (this.phase !== "play") return;

    this.buttonPunch();
    this._sfx(this.pressSfx);

    if (this.cfg.required === 0) {
      this.fail("You pressed it!");
      return;
    }

    this.count++;
    this.pressed = true;
    this.idleTime = 0;
    this.updateCount();

    if (this.count > this.cfg.required) this.fail("Too many presses!");
  },

  evaluate() {
    if (this.count === this.cfg.required) this.pass();
    else
      this.fail(
        "Wrong number (" + this.count + " / " + this.cfg.required + ")",
      );
  },

  pass() {
    this.phase = "between";
    this.stopPulse();
    this._sfx(this.passSfx);
    if (this.resultLabel) {
      this.resultLabel.string = "Nice!";
      this.resultLabel.node.color = cc.Color.GREEN;
    }
    if (this.timerLabel) this.timerLabel.string = "";

    if (this.level >= this.levels.length - 1) this.scheduleOnce(this.win, 1.0);
    else this.scheduleOnce(this.nextLevel, 1.0);
  },

  nextLevel() {
    this.level++;
    this.startLevel();
  },

  win() {
    this.phase = "over";
    this.stopPulse();
    if (this.resultLabel) {
      this.resultLabel.string = "YOU WIN!";
      this.resultLabel.node.color = cc.Color.GREEN;
    }
    if (this.promptLabel) this.promptLabel.string = "";
    if (this.timerLabel) this.timerLabel.string = "";
    if (this.countLabel) this.countLabel.string = "";

    this._handoff = true;
    this.scheduleOnce(() => GameFlow.win(), 1.0); // -> next game
  },

  fail(reason) {
    this.phase = "over";
    this.stopPulse();
    this._sfx(this.failSfx);
    if (this.resultLabel) {
      this.resultLabel.string = "YOU LOSE\n" + reason;
      this.resultLabel.node.color = cc.Color.RED;
    }
    if (this.promptLabel) this.promptLabel.string = "";
    if (this.timerLabel) this.timerLabel.string = "";

    this._handoff = true;
    this.scheduleOnce(() => GameFlow.lose(), 1.2); // -> Try Again
  },

  restartGame() {
    this.level = 0;
    if (this.resultLabel) this.resultLabel.string = "";
    this.startLevel();
  },

  // ----- visuals -----
  startPulse() {
    if (!this.button) return;
    cc.Tween.stopAllByTarget(this.button);
    this.button.scale = 1;
    cc.tween(this.button)
      .repeatForever(
        cc
          .tween()
          .to(0.45, { scale: 1.12 }, { easing: "sineInOut" })
          .to(0.45, { scale: 1.0 }, { easing: "sineInOut" }),
      )
      .start();
  },

  stopPulse() {
    if (!this.button) return;
    cc.Tween.stopAllByTarget(this.button);
    this.button.scale = 1;
  },

  buttonPunch() {
    if (!this.button) return;
    cc.Tween.stopAllByTarget(this.button);
    cc.tween(this.button)
      .to(0.05, { scale: 0.85 })
      .to(0.1, { scale: 1.0 }, { easing: "backOut" })
      .start();
  },

  // ----- ui helpers -----
  updateCount() {
    if (!this.countLabel) return;
    // Default shows "Press: ?" on every level (even "don't press" ones).
    // Becomes a number once the player has actually pressed.
    this.countLabel.string = this.pressed ? "Press: " + this.count : "Press: ?";
  },

  updateTimer() {
    if (!this.timerLabel) return;
    const remain = Math.max(0, this.cfg.timeLimit - this.levelTime);
    this.timerLabel.string = Math.ceil(remain) + "s";
  },
});
