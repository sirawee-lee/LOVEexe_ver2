// =============================================================
//  RaceGame.js  -  2D Sprite Racing Game for Cocos Creator 2.4.8
// -------------------------------------------------------------
//  GOAL DESIGN  (single knob: targetBpm)
//    - Each alternating LEFT/RIGHT tap moves you a fixed distance.
//    - It takes <tapsToWin> taps to reach the finish (default 360).
//    - You must average <targetBpm> BPM to win (default 720 = 12 taps/sec).
//    - The CPU pace is derived automatically:
//          winning BPM bar = tapsToWin * 60 / cpuFinishSeconds
//      so changing targetBpm is all you need.
//    - Game duration = tapsToWin / (targetBpm / 60) seconds.
//    - A live BPM meter is shown on screen. Press R or SPACE to restart.
//
//  YOU ONLY SUPPLY: the two sets of walk sprite frames.
//  (Hero -> Player Frames, Mario -> Cpu Frames.)
// =============================================================

const GameFlow = require('GameFlow');
const PixelFont = require('PixelFont');
const ParticleFX = require('ParticleFX');   // dust kicked up behind the runner on each tap

const PT_CHECKPOINT = 250;   // live points per quarter-track checkpoint (3 total)

cc.Class({
    extends: cc.Component,

    properties: {
        // ---- CHARACTER SPRITES ----
        playerFrames: { default: [], type: cc.SpriteFrame, tooltip: "Hero walk frames." },
        cpuFrames: { default: [], type: cc.SpriteFrame, tooltip: "Mario walk frames." },
        playerScale: { default: 3, tooltip: "Hero sprite scale (3 = 3x)." },
        cpuScale: { default: 3, tooltip: "Mario sprite scale (3 = 3x)." },
        flipPlayer: { default: false, tooltip: "Tick if the hero faces LEFT by default." },
        flipCpu: { default: false, tooltip: "Tick if Mario faces LEFT by default." },
        animSpeedScale: { default: 1, tooltip: "CPU walk-cycle speed multiplier." },

        // ---- AUDIO (optional) ----
        bgm: { default: null, type: cc.AudioClip, tooltip: "Background music for this game (loops)." },
        bgmVolume: { default: 0.6, tooltip: "Music volume 0..1." },
        footstepSfx: { default: null, type: cc.AudioClip, tooltip: "Plays on each footstep/tap." },
        countdownSfx: { default: null, type: cc.AudioClip, tooltip: "Plays on 3 / 2 / 1." },
        goSfx: { default: null, type: cc.AudioClip, tooltip: "Plays on GO!" },
        finishSfx: { default: null, type: cc.AudioClip, tooltip: "Plays when the race ends." },

        // ---- RACE TUNING ----
        raceDistance: { default: 300, tooltip: "Total race length (units). Only affects visual scale, not the BPM bar." },
        targetBpm: { default: 710, tooltip: "BPM (taps/min) you must average to win. 710 = ~11.8 taps/sec." },
        tapsToWin: { default: 360, tooltip: "Alternating taps to reach the finish. Duration = tapsToWin / (targetBpm/60) sec." },
        cpuHandicapSeconds: { default: 1, tooltip: "CPU is this many seconds slower than the exact pace (your win margin)." },
        cpuSpeedVariation: { default: 0.18, tooltip: "How much the CPU speeds up / slows down (0..1)." },
        pixelsPerUnit: { default: 70, tooltip: "World pixels per unit (visual speed / track length)." },
        moveEase: { default: 12, tooltip: "Player movement smoothing (higher = snappier)." },
        idleResetTime: { default: 0.3, tooltip: "Seconds without a tap before returning to standing pose." }
    },

    // ---------------------------------------------------------
    //  LIFECYCLE
    // ---------------------------------------------------------
    onLoad() {
        this._buildLayout();
        this._buildNodes();
        this._drawTrack();
        this._registerInput();

        this.playerAnim = { index: 0, timer: 0, sndT: -1 };
        this.cpuAnim = { index: 0, timer: 0, sndT: -1 };
        this._clock = 0;
        this.tapTimes = [];

        if (!this.playerFrames || this.playerFrames.length === 0)
            cc.warn("[RaceGame] No Player Frames assigned - showing a placeholder box.");
        if (!this.cpuFrames || this.cpuFrames.length === 0)
            cc.warn("[RaceGame] No Cpu Frames assigned - showing a placeholder box.");

        this._handoff = false;
        GameFlow.onEnterGame('runner', this.node);
        this._playBgm();

        this._resetGame();
    },

    // Play this game's music (only if a clip was dragged into `bgm`)
    _playBgm() {
        if (!this.bgm) return;
        cc.audioEngine.stopMusic();
        cc.audioEngine.playMusic(this.bgm, true);
        cc.audioEngine.setMusicVolume(this.bgmVolume);
    },

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    },

    // ---------------------------------------------------------
    //  SETUP
    // ---------------------------------------------------------
    _buildLayout() {
        const ws = cc.winSize;
        this.W = ws.width || 960;
        this.H = ws.height || 640;

        this.distancePerTap = this.raceDistance / Math.max(1, this.tapsToWin);
        // Winning BPM bar = tapsToWin * 60 / cpuFinishSeconds.
        // Derive the CPU pace from targetBpm so there is one knob to tune.
        this.cpuFinishSeconds = this.tapsToWin * 60 / Math.max(1, this.targetBpm) + this.cpuHandicapSeconds;
        this.cpuBaseVel = this.raceDistance / Math.max(0.1, this.cpuFinishSeconds);

        this.trackLength = this.raceDistance * this.pixelsPerUnit;

        this.playerLaneY = this.H * 0.02;
        this.cpuLaneY = -this.H * 0.24;

        this.leftPad = this.W * 0.22;
        this.rightPad = this.W * 0.22;
        this.offsetMax = -this.W / 2 + this.leftPad;
        this.offsetMin = this.W / 2 - this.rightPad - this.trackLength;
        if (this.offsetMin > this.offsetMax) this.offsetMin = this.offsetMax;

        this.colPlayer = cc.color(70, 160, 255);
        this.colCpu = cc.color(255, 95, 95);
        this.colGood = cc.color(120, 230, 130);
        this.colWarn = cc.color(255, 210, 90);
    },

    _makeGfx(parent, name, z) {
        const n = new cc.Node(name);
        n.parent = parent;
        n.zIndex = z || 0;
        return { node: n, g: n.addComponent(cc.Graphics) };
    },

    _makeSpriteRunner(name, z, frames, scale, flip, color) {
        const n = new cc.Node(name);
        n.parent = this.world;
        n.zIndex = z;
        n.anchorY = 0;

        const sp = n.addComponent(cc.Sprite);
        sp.trim = false;
        sp.sizeMode = cc.Sprite.SizeMode.RAW;

        const s = Math.abs(scale) || 1;
        n.scaleY = s;
        n.scaleX = flip ? -s : s;

        if (frames && frames.length > 0) {
            sp.spriteFrame = frames[0];
        } else {
            const fb = n.addComponent(cc.Graphics);
            fb.fillColor = color;
            fb.rect(-16, 0, 32, 64);
            fb.fill();
        }
        const rawH = (n.height && n.height > 1) ? n.height : 80;
        return { node: n, sprite: sp, charH: rawH * s };
    },

    _makeLabel(parent, name, fontSize, color, x, y, z, hAlign) {
        const n = new cc.Node(name);
        n.parent = parent;
        n.setPosition(x, y);
        n.zIndex = z || 20;
        const l = n.addComponent(cc.Label);
        l.fontSize = fontSize;
        l.lineHeight = fontSize + 6;
        l.horizontalAlign = hAlign || cc.Label.HorizontalAlign.CENTER;
        n.color = color;
        PixelFont.apply(l);
        return { node: n, label: l };
    },

    _buildNodes() {
        this.world = new cc.Node("World");
        this.world.parent = this.node;
        this.world.zIndex = 0;

        this.track = this._makeGfx(this.world, "Track", 0);

        this.player = this._makeSpriteRunner("Player", 10,
            this.playerFrames, this.playerScale, this.flipPlayer, this.colPlayer);
        this.cpu = this._makeSpriteRunner("CPU_Mario", 10,
            this.cpuFrames, this.cpuScale, this.flipCpu, this.colCpu);

        this.playerTag = this._makeLabel(this.world, "YouTag", 26, this.colPlayer,
            0, this.playerLaneY + this.player.charH + 16, 15);
        this.playerTag.label.string = "YOU";
        this.cpuTag = this._makeLabel(this.world, "CpuTag", 26, this.colCpu,
            0, this.cpuLaneY + this.cpu.charH + 16, 15);
        this.cpuTag.label.string = "MARIO";

        this.statusUI = this._makeLabel(this.node, "Status", 64, cc.color(255, 240, 120),
            0, this.H * 0.18, 20);
        this.meterUI = this._makeLabel(this.node, "Meter", 30, cc.color(255, 255, 255),
            0, this.H * 0.32, 20);
        this.hintUI = this._makeLabel(this.node, "Hint", 20, cc.color(225, 225, 235),
            0, -this.H * 0.42, 20);
        this.hudBar = this._makeGfx(this.node, "HudBar", 21);

        this._statusStr = null;
        this._hintStr = null;
        this._meterStr = null;
    },

    _registerInput() {
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    },

    _resetGame() {
        this.state = "countdown";
        this.cdTime = 3.0;
        this.goFlash = 0;
        this.elapsed = 0;
        this.winner = null;
        this._finishPlayed = false;
        this._lastCount = -1;

        this.targetProgress = 0;   // where taps have "earned" the player to
        this.playerProgress = 0;   // smoothed visual position
        this.playerVel = 0;        // derived, for animation/feel
        this.cpuProgress = 0;
        this.cpuVel = this.cpuBaseVel;

        this.tapCount = 0;
        this.tapTimes.length = 0;
        this.lastTapTime = -10;
        this._cpAwarded = 0;       // quarter-track checkpoints awarded this race

        this.lastDir = null;
        this.leftDown = false;
        this.rightDown = false;

        if (this.playerAnim) { this.playerAnim.index = 0; this.playerAnim.timer = 0; }
        if (this.cpuAnim) { this.cpuAnim.index = 0; this.cpuAnim.timer = 0; }
        if (this.playerFrames && this.playerFrames.length > 0)
            this.player.sprite.spriteFrame = this.playerFrames[0];

        this.cpuNoise = 1;
        this.cpuTimer = 0;

        this.worldX = this.offsetMax;
        this.world.setPosition(this.worldX, 0);

        this._setHint("Tap  LEFT / RIGHT  alternately - keep ~" + this.targetBpm + " BPM to win!   |   R / SPACE to restart");
        this._setMeter("");
        this._setStatus("3");
        this._updateRunners(0);
        this._drawHud();
    },

    // ---------------------------------------------------------
    //  INPUT
    // ---------------------------------------------------------
    onKeyDown(e) {
        if (this._handoff) return;          // flow is taking over -> ignore keys
        const K = cc.macro.KEY;
        switch (e.keyCode) {
            case K.left:
            case K.a:
                if (!this.leftDown) { this.leftDown = true; this._step("L"); }
                break;
            case K.right:
            case K.d:
                if (!this.rightDown) { this.rightDown = true; this._step("R"); }
                break;
            case K.r:
            case K.space:
                if (this.state === "finished") this._resetGame();
                break;
        }
    },

    onKeyUp(e) {
        const K = cc.macro.KEY;
        if (e.keyCode === K.left || e.keyCode === K.a) this.leftDown = false;
        if (e.keyCode === K.right || e.keyCode === K.d) this.rightDown = false;
    },

    // A valid step happens only when direction ALTERNATES.
    _step(dir) {
        if (this.state !== "racing") return;
        if (dir === this.lastDir) return;
        this.lastDir = dir;

        // Move a fixed distance per tap -> 300 taps reaches the finish.
        this.targetProgress = Math.min(this.raceDistance, this.targetProgress + this.distancePerTap);

        // Live +points crossing each quarter (1/4, 2/4, 3/4); the finish is the clear bonus.
        while (this._cpAwarded < 3 &&
               this.targetProgress >= this.raceDistance * (this._cpAwarded + 1) * 0.25) {
            this._cpAwarded++;
            GameFlow.addScore(PT_CHECKPOINT);
        }

        this.tapCount++;
        this.lastTapTime = this._clock;
        this.tapTimes.push(this._clock);

        // Advance one walk frame PER TAP (each tap = one step).
        const f = this.playerFrames;
        if (f && f.length > 0) {
            this.playerAnim.index = (this.playerAnim.index + 1) % f.length;
            this.player.sprite.spriteFrame = f[this.playerAnim.index];
        }
        this._playSfx(this.footstepSfx, 1);

        // 💨 dust kicked up behind the runner's feet
        if (this.player && this.player.node) {
            ParticleFX.dust(this.world, this.player.node.x - 18, this.player.node.y + 16);
        }
    },

    // ---------------------------------------------------------
    //  UPDATE LOOP
    // ---------------------------------------------------------
    update(dt) {
        if (dt > 0.05) dt = 0.05;
        this._clock += dt;

        if (this.state === "countdown") {
            this.cdTime -= dt;
            if (this.cdTime > 0) {
                const c = Math.ceil(this.cdTime);
                if (c !== this._lastCount) {
                    this._lastCount = c;
                    this._setStatus(String(c));
                    this._playSfx(this.countdownSfx, 1);
                }
            } else {
                this._setStatus("GO!");
                this._playSfx(this.goSfx, 1);
                this.state = "racing";
                this.goFlash = 0.6;
                this.lastDir = null;
            }

        } else if (this.state === "racing") {
            this.elapsed += dt;
            if (this.goFlash > 0) {
                this.goFlash -= dt;
                if (this.goFlash <= 0) this._setStatus("");
            }

            // --- Player: smooth toward the tap-earned target position ---
            const prev = this.playerProgress;
            this.playerProgress += (this.targetProgress - this.playerProgress) * Math.min(1, dt * this.moveEase);
            this.playerVel = (this.playerProgress - prev) / Math.max(dt, 1e-4);

            // Return to standing pose if the player stops tapping.
            if (this._clock - this.lastTapTime > this.idleResetTime &&
                this.playerFrames && this.playerFrames.length > 0 && this.playerAnim.index !== 0) {
                this.playerAnim.index = 0;
                this.player.sprite.spriteFrame = this.playerFrames[0];
            }

            // --- CPU: paced to finish in cpuFinishSeconds, with lively variation ---
            this.cpuTimer -= dt;
            if (this.cpuTimer <= 0) {
                this.cpuTimer = 0.4 + Math.random() * 0.6;
                this.cpuNoise = 1 + (Math.random() * 2 - 1) * this.cpuSpeedVariation;
            }
            const cpuTarget = this.cpuBaseVel * this.cpuNoise;
            this.cpuVel += (cpuTarget - this.cpuVel) * Math.min(1, dt * 3);
            this.cpuProgress += this.cpuVel * dt;

            // --- Finish (300th tap decides the player; CPU on its own pace) ---
            if (this.targetProgress >= this.raceDistance) {
                this._endRace("player");
            } else if (this.cpuProgress >= this.raceDistance) {
                this.cpuProgress = this.raceDistance;
                this._endRace("cpu");
            }

            this._updateMeter();

        } else if (this.state === "finished") {
            // Let the player slide into the line, then settle.
            this.playerProgress += (this.targetProgress - this.playerProgress) * Math.min(1, dt * this.moveEase);
            this.playerVel = 0;
        }

        this._updateCamera(dt);
        this._updateRunners(dt);
        this._drawHud();
    },

    _endRace(who) {
        if (this.state === "finished") return;
        this.state = "finished";
        this.winner = who;
        if (who === "player") {
            this.playerProgress = this.targetProgress = this.raceDistance;
        }
        this._setStatus(who === "player" ? "YOU WIN!" : "YOU LOSE!");

        const t = this.elapsed;
        const avg = t > 0 ? Math.round(this.tapCount / t * 60) : 0;
        this._setMeter("");
        this._setHint(this.tapCount + " taps  ·  " + t.toFixed(1) + "s  ·  avg " +
            avg + " BPM      |      R / SPACE to restart");
        if (!this._finishPlayed) { this._finishPlayed = true; this._playSfx(this.finishSfx, 1); }

        this._handoff = true;
        this.scheduleOnce(() => (who === "player" ? GameFlow.win() : GameFlow.lose()), 1.6);
    },

    // ---------------------------------------------------------
    //  CAMERA
    // ---------------------------------------------------------
    _updateCamera(dt) {
        const pwx = this.playerProgress * this.pixelsPerUnit;
        // กล้องตามตัวผู้เล่นอย่างเดียว (ไม่สนตำแหน่ง CPU) ตลอดจนเข้าเส้นชัย
        let target = -pwx;
        if (target > this.offsetMax) target = this.offsetMax;
        if (target < this.offsetMin) target = this.offsetMin;
        this.worldX += (target - this.worldX) * Math.min(1, dt * 6);
        this.world.setPosition(this.worldX, 0);
    },

    // ---------------------------------------------------------
    //  RENDER / ANIMATION
    // ---------------------------------------------------------
    _updateRunners(dt) {
        const ppu = this.pixelsPerUnit;
        const pwx = this.playerProgress * ppu;
        const cwx = this.cpuProgress * ppu;

        this.player.node.setPosition(pwx, this.playerLaneY);
        this.cpu.node.setPosition(cwx, this.cpuLaneY);
        this.playerTag.node.x = pwx;
        this.cpuTag.node.x = cwx;

        // Player frames are driven per-tap in _step(); only the CPU auto-animates.
        this._animateCpu(dt);
    },

    _animateCpu(dt) {
        const frames = this.cpuFrames;
        const anim = this.cpuAnim;
        if (!frames || frames.length === 0) return;
        const speed = this.cpuVel;

        if (speed > 0.5 && this.state !== "countdown") {
            let fps = (3 + speed * 0.7) * this.animSpeedScale;
            if (fps < 2) fps = 2;
            if (fps > 22) fps = 22;
            const interval = 1 / fps;
            anim.timer += dt;
            while (anim.timer >= interval) {
                anim.timer -= interval;
                anim.index = (anim.index + 1) % frames.length;
                if (this.state === "racing" && this.footstepSfx && (this._clock - anim.sndT) > 0.05) {
                    anim.sndT = this._clock;
                    this._playSfx(this.footstepSfx, 0.5);
                }
            }
        } else {
            anim.index = 0;
            anim.timer = 0;
        }
        const sf = frames[anim.index];
        if (this.cpu.sprite.spriteFrame !== sf) this.cpu.sprite.spriteFrame = sf;
    },

    _drawTrack() {
        const g = this.track.g;
        g.clear();
        const L = this.trackLength;
        const topY = this.playerLaneY + Math.max(220, this.player.charH + 40);
        const botY = this.cpuLaneY - 30;

        g.fillColor = cc.color(34, 38, 54);
        g.rect(-this.W, botY, L + this.W * 2, topY - botY);
        g.fill();

        g.strokeColor = cc.color(255, 255, 255, 90);
        g.lineWidth = 3;
        g.moveTo(-this.W, this.playerLaneY); g.lineTo(L + this.W, this.playerLaneY); g.stroke();
        g.moveTo(-this.W, this.cpuLaneY); g.lineTo(L + this.W, this.cpuLaneY); g.stroke();

        g.strokeColor = cc.color(255, 255, 255, 45);
        g.lineWidth = 2;
        for (let x = 0; x <= L; x += 120) {
            g.moveTo(x, this.playerLaneY); g.lineTo(x, this.playerLaneY - 12); g.stroke();
            g.moveTo(x, this.cpuLaneY); g.lineTo(x, this.cpuLaneY - 12); g.stroke();
        }

        g.strokeColor = cc.color(120, 200, 255, 120);
        g.lineWidth = 3;
        for (let q = 1; q <= 3; q++) {
            const x = L * (q / 4);
            g.moveTo(x, botY); g.lineTo(x, topY); g.stroke();
        }

        g.strokeColor = cc.color(120, 220, 120, 220);
        g.lineWidth = 5;
        g.moveTo(0, botY + 6); g.lineTo(0, topY - 6); g.stroke();

        const sq = 16;
        let y = botY, row = 0;
        while (y < topY) {
            for (let c = 0; c < 2; c++) {
                const dark = ((row + c) % 2) === 0;
                g.fillColor = dark ? cc.color(20, 20, 20) : cc.color(245, 245, 245);
                g.rect(L + c * sq, y, sq, sq);
                g.fill();
            }
            y += sq; row++;
        }
    },

    _drawHud() {
        const g = this.hudBar.g;
        g.clear();
        const x0 = -this.W * 0.38, x1 = this.W * 0.38, by = this.H * 0.40;

        g.strokeColor = cc.color(255, 255, 255, 120);
        g.lineWidth = 4;
        g.moveTo(x0, by); g.lineTo(x1, by); g.stroke();

        g.fillColor = cc.color(120, 220, 120);
        g.rect(x0 - 4, by - 8, 4, 16); g.fill();
        g.fillColor = cc.color(245, 245, 245); g.rect(x1, by - 8, 8, 8); g.fill();
        g.fillColor = cc.color(20, 20, 20); g.rect(x1, by, 8, 8); g.fill();

        const pt = this._clamp(this.playerProgress / this.raceDistance, 0, 1);
        const ct = this._clamp(this.cpuProgress / this.raceDistance, 0, 1);
        g.fillColor = this.colPlayer; g.circle(x0 + (x1 - x0) * pt, by + 9, 6); g.fill();
        g.fillColor = this.colCpu; g.circle(x0 + (x1 - x0) * ct, by - 9, 6); g.fill();
    },

    _updateMeter() {
        const now = this._clock;
        const win = 2.0;
        while (this.tapTimes.length && this.tapTimes[0] < now - win) this.tapTimes.shift();
        const bpm = Math.round(this.tapTimes.length / win * 60);
        this.meterUI.node.color = bpm >= this.targetBpm ? this.colGood : this.colWarn;
        this._setMeter("BPM " + bpm + " / " + this.targetBpm + "     Taps " + this.tapCount);
    },

    // ---------------------------------------------------------
    //  HELPERS
    // ---------------------------------------------------------
    _playSfx(clip, volume) {
        if (!clip) return;
        const id = cc.audioEngine.playEffect(clip, false);
        if (volume !== undefined) cc.audioEngine.setVolume(id, volume);
    },

    _setStatus(s) { if (this._statusStr !== s) { this._statusStr = s; this.statusUI.label.string = s; } },
    _setHint(s) { if (this._hintStr !== s) { this._hintStr = s; this.hintUI.label.string = s; } },
    _setMeter(s) { if (this._meterStr !== s) { this._meterStr = s; this.meterUI.label.string = s; } },

    _clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
});
