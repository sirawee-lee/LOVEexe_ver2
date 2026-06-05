// FlappyGame.js  -  Flappy-style game for Cocos Creator 2.4.8  (Canvas 960 x 800)
//
// Flap to rise, gravity pulls down. Pass pipes to score. Pass 10 = WIN.
// Hit a pipe or the ground = Game Over. Tap (Input Area) or Space to flap / restart.
// Pipes are built in code from pipe_body / pipe_cap SpriteFrames (no prefabs).

const GameFlow = require('GameFlow');

cc.Class({
  extends: cc.Component,

  properties: {
    bird: { default: null, type: cc.Node },
    pipeContainer: {
      default: null,
      type: cc.Node,
      tooltip: "Empty node at Canvas center (0,0)",
    },
    inputArea: {
      default: null,
      type: cc.Node,
      tooltip: "Full-screen node to catch taps (the BG)",
    },
    scoreLabel: { default: null, type: cc.Label },
    messageLabel: { default: null, type: cc.Label },

    pipeBody: { default: null, type: cc.SpriteFrame, tooltip: "pipe_body.png" },
    pipeCap: { default: null, type: cc.SpriteFrame, tooltip: "pipe_cap.png" },

    ground1: { default: null, type: cc.Node },
    ground2: { default: null, type: cc.Node },

    // ---- Goal ----
    winThreshold: { default: 10, tooltip: "Pipes to pass to win" },

    // ---- Physics ----
    gravity: { default: -1500 },
    flapSpeed: { default: 480 },
    pipeSpeed: { default: 165 },

    // ---- Difficulty: stepped gap (0-30% base, after 30% -15%, after 60% -15% more) ----
    startGap: { default: 340 },
    maxGapShift: {
      default: 120,
      tooltip: "Max vertical change between consecutive gaps",
    },
    groundClearance: {
      default: 110,
      tooltip: "Min height the bottom gap sits above the ground",
    },
    topClearance: { default: 30 },

    spawnInterval: { default: 1.7 },
    pipeWidth: { default: 86 },
    birdRadius: { default: 30 },
    capWidthExtra: {
      default: 16,
      tooltip: "How much wider the cap is than the body",
    },
    capHeight: { default: 40 },
    pipeOverfill: {
      default: 120,
      tooltip: "Pipes extend this far past the ceiling/ground so no gaps show",
    },

    // ---- Bounds (Canvas-center coords; for 960x800 full canvas) ----
    ceilingY: { default: 400, tooltip: "+halfHeight (800/2)" },
    groundY: { default: -330, tooltip: "Top of the ground strip (death line)" },
    spawnX: { default: 540, tooltip: "Just off the right edge (>+480)" },
    despawnX: { default: -560 },
    groundLeftX: {
      default: -520,
      tooltip: "Ground recycles when fully past this x",
    },

    // Per-game music (drag an audio clip here in the Inspector)
    bgm: {
      default: null,
      type: cc.AudioClip,
      tooltip: "Background music for this game (loops)",
    },
    bgmVolume: { default: 0.6, tooltip: "Music volume 0..1" },

    // Sound effects (drag an audio clip into each)
    flapSfx:  { default: null, type: cc.AudioClip, tooltip: "Plays on each flap" },
    scoreSfx: { default: null, type: cc.AudioClip, tooltip: "Plays when you pass a pipe" },
    hitSfx:   { default: null, type: cc.AudioClip, tooltip: "Plays when you crash (game over)" },
  },

  onLoad() {
    this.birdX = this.bird ? this.bird.x : -160;

    if (this.inputArea)
      this.inputArea.on(cc.Node.EventType.TOUCH_START, this.onFlap, this);
    cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);

    this._handoff = false;
    GameFlow.onEnterGame('flappy1', this.node);
    this._playBgm();

    this.resetGame();
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
    if (this.inputArea)
      this.inputArea.off(cc.Node.EventType.TOUCH_START, this.onFlap, this);
    cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
  },

  resetGame() {
    this.phase = "ready"; // 'ready' | 'play' | 'over'
    this.vy = 0;
    this.score = 0;
    this.spawned = 0;
    this.spawnAcc = 0;
    this.readyT = 0;
    this.prevGapY = 0;
    this.pipes = this.pipes || [];
    this.pipes.forEach((p) => p.node.destroy());
    this.pipes = [];

    if (this.bird) {
      this.bird.y = 0;
      this.bird.angle = 0;
    }
    this.updateScore();
    if (this.messageLabel) {
      this.messageLabel.string = "Tap to start";
      this.messageLabel.node.color = cc.Color.WHITE;
    }
  },

  onKeyDown(e) {
    if (e.keyCode === cc.macro.KEY.space) this.onFlap();
  },

  onFlap() {
    if (this._handoff) return;          // flow is taking over -> ignore taps
    if (this.phase === "over") {
      this.resetGame();
      return;
    }
    if (this.phase === "ready") {
      this.phase = "play";
      if (this.messageLabel) this.messageLabel.string = "";
    }
    this.vy = this.flapSpeed;
    this._sfx(this.flapSfx);
  },

  update(dt) {
    if (this.phase === "ready") {
      this.readyT += dt;
      if (this.bird) this.bird.y = Math.sin(this.readyT * 4) * 10;
      this.scrollGround(dt);
      return;
    }
    if (this.phase !== "play") return;

    // ---- bird ----
    this.vy += this.gravity * dt;
    if (this.bird) {
      this.bird.y += this.vy * dt;
      this.bird.angle = Math.max(-80, Math.min(25, this.vy * 0.06));

      if (this.bird.y + this.birdRadius >= this.ceilingY) {
        // clamp at top
        this.bird.y = this.ceilingY - this.birdRadius;
        this.vy = 0;
      }
      if (this.bird.y - this.birdRadius <= this.groundY) {
        // hit ground -> die
        this.bird.y = this.groundY + this.birdRadius;
        this.finish(false);
        return;
      }
    }

    // ---- spawn ----
    this.spawnAcc += dt;
    if (this.spawnAcc >= this.spawnInterval) {
      this.spawnAcc -= this.spawnInterval;
      this.spawnPipe();
    }

    // ---- move / score / collide ----
    const bx = this.birdX,
      by = this.bird ? this.bird.y : 0,
      r = this.birdRadius;
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.node.x -= this.pipeSpeed * dt;

      if (!p.passed && p.node.x < bx) {
        p.passed = true;
        this.score++;
        this.updateScore();
        this._sfx(this.scoreSfx);
        if (this.score >= this.winThreshold) {
          this.finish(true);
          return;
        }
      }

      const left = p.node.x - this.pipeWidth / 2;
      const right = p.node.x + this.pipeWidth / 2;
      if (bx + r > left && bx - r < right) {
        if (by + r > p.gapTop || by - r < p.gapBottom) {
          this.finish(false);
          return;
        }
      }

      if (p.node.x < this.despawnX) {
        p.node.destroy();
        this.pipes.splice(i, 1);
      }
    }

    this.scrollGround(dt);
  },

  currentGap() {
    const t = this.spawned / Math.max(1, this.winThreshold);
    if (t < 0.3) return this.startGap; // 340 (ง่าย)
    if (t < 0.6) return this.startGap * 0.8; // 272
    return this.startGap * 0.62; // ~211 (ยากขึ้นแต่ยังผ่านได้)
  },

  spawnPipe() {
    if (!this.pipeContainer || !this.pipeBody) return;

    const gap = this.currentGap();
    const rMin = this.groundY + this.groundClearance + gap / 2;
    const rMax = this.ceilingY - this.topClearance - gap / 2;

    let gapY;
    if (rMin > rMax) {
      gapY = (this.groundY + this.ceilingY) / 2;
    } else {
      gapY =
        this.prevGapY + this.randRange(-this.maxGapShift, this.maxGapShift);
      gapY = Math.max(rMin, Math.min(rMax, gapY));
    }
    this.prevGapY = gapY;

    const gapTop = gapY + gap / 2;
    const gapBottom = gapY - gap / 2;
    const over = this.pipeOverfill;
    const capW = this.pipeWidth + this.capWidthExtra;

    const pair = new cc.Node("pipe");
    pair.setPosition(this.spawnX, 0);
    this.pipeContainer.addChild(pair);

    // bottom pipe (extends below the ground so no gap)
    const bBottom = this.groundY - over;
    const bH = gapBottom - bBottom;
    const bBody = this.makeSprite(this.pipeBody, this.pipeWidth, bH);
    bBody.y = bBottom + bH / 2;
    pair.addChild(bBody);
    const bCap = this.makeSprite(this.pipeCap, capW, this.capHeight);
    bCap.y = gapBottom - this.capHeight / 2;
    pair.addChild(bCap);

    // top pipe (extends above the ceiling so it fills to the top)
    const tTop = this.ceilingY + over;
    const tH = tTop - gapTop;
    const tBody = this.makeSprite(this.pipeBody, this.pipeWidth, tH);
    tBody.y = gapTop + tH / 2;
    pair.addChild(tBody);
    const tCap = this.makeSprite(this.pipeCap, capW, this.capHeight);
    tCap.y = gapTop + this.capHeight / 2;
    pair.addChild(tCap);

    this.pipes.push({
      node: pair,
      gapTop: gapTop,
      gapBottom: gapBottom,
      passed: false,
    });
    this.spawned++;
  },

  makeSprite(frame, w, h) {
    const node = new cc.Node();
    const sp = node.addComponent(cc.Sprite);
    sp.spriteFrame = frame;
    sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
    sp.trim = false;
    node.width = w;
    node.height = Math.max(2, h);
    return node;
  },

  scrollGround(dt) {
    const tiles = [this.ground1, this.ground2].filter((g) => g);
    if (tiles.length < 2) return;
    const w = tiles[0].width;
    const span = w * tiles.length;
    tiles.forEach((g) => {
      g.x -= this.pipeSpeed * dt;
      if (g.x + w / 2 < this.groundLeftX) g.x += span;
    });
  },

  finish(won) {
    this.phase = "over";
    if (!won) this._sfx(this.hitSfx);
    if (this.messageLabel) {
      this.messageLabel.string = won
        ? "You Win!\nPassed " + this.score + " pipes"
        : "Game Over\nScore: " + this.score;
      this.messageLabel.node.color = won ? cc.Color.GREEN : cc.Color.RED;
    }
    this._handoff = true;
    this.scheduleOnce(() => (won ? GameFlow.win() : GameFlow.lose()), 1.2);
  },

  updateScore() {
    if (this.scoreLabel)
      this.scoreLabel.string = this.score + " / " + this.winThreshold;
  },

  randRange(a, b) {
    return a + Math.random() * (b - a);
  },
});
