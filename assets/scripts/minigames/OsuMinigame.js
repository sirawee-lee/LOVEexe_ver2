'use strict';

// BPM 100-120 (CPR compression rhythm)
var TOTAL_NOTES   = 25;
var NOTE_RADIUS   = 38;    // CC units
var APPROACH_DUR  = 1100;  // ms — 2 beats at 109 BPM
var APPROACH_R0   = 115;   // starting approach ring radius
var PERFECT_WIN   = 13;    // CC units tolerance
var GOOD_WIN      = 28;
var WIN_THRESHOLD = 23;
var NOTE_INTERVAL = 550;   // ms ≈ 109 BPM (CPR rate: 100-120/min)
var NOTE_MARGIN   = 80;    // keep notes away from canvas edges

var PixelFont = require('PixelFont');   // VT323 8-bit font for all the game's text
var ParticleFX = require('ParticleFX'); // gold sparkle pop on a clean hit

cc.Class({
    extends: cc.Component,

    properties: {
        bgm:      { default: null, type: cc.AudioClip },
        sfxHeart: { default: null, type: cc.AudioClip },
        sfxWrong: { default: null, type: cc.AudioClip },
    },

    // ── CC lifecycle ──────────────────────────────────────────────
    onLoad: function () {
        var self  = this;
        var size  = cc.winSize;
        self._W   = size.width;
        self._H   = size.height;

        // Single cc.Graphics node — cleared and redrawn every frame
        self._gfx = self.node.addComponent(cc.Graphics);

        // Label pool — one per note for the number inside the circle
        self._numLabels = [];
        for (var i = 0; i < TOTAL_NOTES; i++) {
            var ln  = new cc.Node('NL' + i);
            var lb  = ln.addComponent(cc.Label);
            lb.string           = '';
            lb.fontSize         = 20;
            lb.lineHeight       = 22;
            lb.horizontalAlign  = cc.Label.HorizontalAlign.CENTER;
            lb.verticalAlign    = cc.Label.VerticalAlign.CENTER;
            PixelFont.apply(lb);
            ln.color  = cc.Color.WHITE;
            ln.active = false;
            self.node.addChild(ln, 2);
            self._numLabels.push(ln);
        }

        // HUD labels (CC Label nodes, always rendered on top)
        self._titleNode = self._mkLabel('HEART CPR ♥', cc.v2(0, self._H / 2 - 18), 14, cc.color(255, 105, 180));
        self._scoreNode = self._mkLabel('0', cc.v2(self._W / 2 - 60, self._H / 2 - 20), 16, cc.color(255, 105, 180));
        self._statsNode = self._mkLabel('', cc.v2(-self._W / 2 + 10, self._H / 2 - 20), 11, cc.color(180, 180, 180));
        self._hintNode  = self._mkLabel('[CLICK circle when ring = edge]  [SPACE]',
                            cc.v2(0, -self._H / 2 + 10), 10, cc.color(255, 255, 255, 45));

        // Floating judge text
        self._judgeNode         = self._mkLabel('', cc.v2(0, 0), 20, cc.Color.WHITE);
        self._judgeNode.opacity = 0;
        self._jTimer            = 0;
        self._jX = 0; self._jY = 0;

        // Mouse tracking
        self._mouseX = 0;
        self._mouseY = 0;
        var cvs = cc.find('Canvas');
        cvs.on(cc.Node.EventType.MOUSE_MOVE, self._onMove, self);
        cvs.on(cc.Node.EventType.MOUSE_DOWN, self._onDown, self);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, self._onKey, self);

        self._active = false;
        self._bgmId  = -1;
        self._notes  = [];
        self._bursts = [];
        self._frame  = 0;
    },

    onDestroy: function () {
        var cvs = cc.find('Canvas');
        if (cvs) {
            cvs.off(cc.Node.EventType.MOUSE_MOVE, this._onMove, this);
            cvs.off(cc.Node.EventType.MOUSE_DOWN, this._onDown, this);
        }
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKey, this);
        this._stopBgm();
        if (this._ntimer) clearTimeout(this._ntimer);
    },

    // ── Helper: make a cc.Label child node ────────────────────────
    _mkLabel: function (str, pos, size, color) {
        var n = new cc.Node();
        var l = n.addComponent(cc.Label);
        l.string           = str;
        l.fontSize         = size;
        l.lineHeight       = size + 2;
        l.horizontalAlign  = cc.Label.HorizontalAlign.CENTER;
        PixelFont.apply(l);
        n.color = color || cc.Color.WHITE;
        n.setPosition(pos);
        this.node.addChild(n, 3);
        return n;
    },

    // ── Public API ────────────────────────────────────────────────
    // onResult(win, score) is called when the minigame ends
    startGame: function (onResult) {
        this._onResult = onResult || null;
        this._initGame();
    },

    // ── Game init ─────────────────────────────────────────────────
    _initGame: function () {
        var self    = this;
        self._hits  = 0; self._misses = 0; self._score = 0; self._combo = 0;
        self._frame = 0;
        self._notes = []; self._bursts = [];
        self._noteIdx = 0;
        self._notePos = self._genPositions();
        self._active  = true;

        self._titleNode.getComponent(cc.Label).string = 'HEART CPR ♥';
        self._titleNode.color = cc.color(255, 105, 180);

        if (self.bgm) self._bgmId = cc.audioEngine.play(self.bgm, true, 0.7);
        self._schedNext();
    },

    _stopBgm: function () {
        if (this._bgmId >= 0) { cc.audioEngine.stop(this._bgmId); this._bgmId = -1; }
    },

    _schedNext: function () {
        var self = this;
        if (!self._active) return;
        if (self._noteIdx < TOTAL_NOTES) {
            self._spawnNote();
            self._ntimer = setTimeout(function () { self._schedNext(); }, NOTE_INTERVAL);
        } else {
            self._ntimer = setTimeout(function () { self._checkEnd(); },
                NOTE_INTERVAL + APPROACH_DUR + 700);
        }
    },

    // ── Note placement: directional walk ─────────────────────────
    // Notes flow in varying directions — not circular, not random scatter.
    _genPositions: function () {
        var W  = this._W, H = this._H;
        var mX = W / 2 - NOTE_MARGIN, mY = H / 2 - NOTE_MARGIN;
        var pos = [];
        var x   = (Math.random() - 0.5) * W * 0.4;
        var y   = (Math.random() - 0.5) * H * 0.4;
        var ang = Math.random() * Math.PI * 2;

        for (var i = 0; i < TOTAL_NOTES; i++) {
            ang += (i % 3 === 0)
                ? (Math.random() - 0.5) * Math.PI * 1.4
                : (Math.random() - 0.5) * Math.PI * 0.4;
            var step = 80 + Math.random() * 110;
            x += Math.cos(ang) * step;
            y += Math.sin(ang) * step;
            if (x < -mX) { x = -mX; ang = Math.PI - ang; }
            if (x >  mX) { x =  mX; ang = Math.PI - ang; }
            if (y < -mY) { y = -mY; ang = -ang; }
            if (y >  mY) { y =  mY; ang = -ang; }
            pos.push({ x: x, y: y });
        }
        return pos;
    },

    _spawnNote: function () {
        var p = this._notePos[this._noteIdx];
        this._notes.push({
            x: p.x, y: p.y,
            spawnTime: performance.now(),
            approachR: APPROACH_R0,
            judged: false,
            id: this._noteIdx,
        });
        this._noteIdx++;
    },

    // ── Input ─────────────────────────────────────────────────────
    _onMove: function (e) {
        // e.getLocation() returns world/view coords; convert to this node's local space
        var lp = this.node.convertToNodeSpaceAR(e.getLocation());
        this._mouseX = lp.x;
        this._mouseY = lp.y;
    },

    _onDown: function (e) {
        if (!this._active) return;
        var lp = this.node.convertToNodeSpaceAR(e.getLocation());
        this._tryHit(lp.x, lp.y);
    },

    _onKey: function (e) {
        if (!this._active) return;
        if (e.keyCode === cc.macro.KEY.space) {
            var first = this._notes.filter(function (n) { return !n.judged; })
                            .sort(function (a, b) { return a.id - b.id; })[0];
            if (first) this._judgeNote(first);
        }
    },

    _tryHit: function (mx, my) {
        var self = this;
        var hit  = self._notes
            .filter(function (n) {
                return !n.judged && Math.hypot(mx - n.x, my - n.y) <= NOTE_RADIUS + 18;
            })
            .sort(function (a, b) { return a.id - b.id; })[0];
        if (hit) self._judgeNote(hit);
    },

    // ── Judgement ─────────────────────────────────────────────────
    _judgeNote: function (note) {
        if (note.judged) return;
        note.judged = true;
        var self = this;
        var diff = Math.abs(note.approachR - NOTE_RADIUS);

        if (diff <= PERFECT_WIN) {
            self._hits++; self._combo++;
            self._score += 300 * Math.max(1, Math.floor(self._combo / 5));
            self._flashJudge('♥ PERFECT!', cc.color(255, 105, 180), note.x, note.y);
            ParticleFX.sparkle(self.node, note.x, note.y);   // ✨ on a clean hit
        } else if (diff <= GOOD_WIN) {
            self._hits++; self._combo++;
            self._score += 150 * Math.max(1, Math.floor(self._combo / 5));
            self._flashJudge('GOOD', cc.color(255, 221, 68), note.x, note.y);
            ParticleFX.sparkle(self.node, note.x, note.y);   // ✨ on a clean hit
        } else {
            self._misses++; self._combo = 0;
            self._flashJudge('MISS', cc.color(204, 68, 68), note.x, note.y);
        }
        self._bursts.push({ x: note.x, y: note.y, life: 20 });

        var ref = note;
        setTimeout(function () {
            var idx = self._notes.indexOf(ref);
            if (idx !== -1) self._notes.splice(idx, 1);
        }, 350);
    },

    _flashJudge: function (text, color, nx, ny) {
        var jn = this._judgeNode;
        jn.getComponent(cc.Label).string = text;
        jn.color   = color;
        jn.opacity = 255;
        jn.setPosition(nx, ny + 52);
        this._jTimer = 50;
        this._jX = nx; this._jY = ny + 52;
    },

    _checkEnd: function () {
        if (!this._active) return;
        var self = this;
        self._notes.filter(function (n) { return !n.judged; }).forEach(function (n) {
            n.judged = true; self._misses++; self._combo = 0;
        });
        self._active = false;
        setTimeout(function () {
            self._hits >= WIN_THRESHOLD ? self._onWin() : self._onLose();
        }, 600);
    },

    // ── Win / Lose ────────────────────────────────────────────────
    _onWin: function () {
        var self = this;
        self._stopBgm();
        if (self.sfxHeart) cc.audioEngine.play(self.sfxHeart, false, 1);
        self._titleNode.getComponent(cc.Label).string = 'IN SYNC! ♡';
        self._titleNode.color = cc.color(136, 255, 136);
        self._statsNode.getComponent(cc.Label).string =
            'Score: ' + self._score + '    ' + self._hits + '/' + TOTAL_NOTES + ' hits';
        setTimeout(function () {
            if (self._onResult) self._onResult(true, self._score);
        }, 2500);
    },

    _onLose: function () {
        var self = this;
        self._stopBgm();
        if (self.sfxWrong) cc.audioEngine.play(self.sfxWrong, false, 1);
        self._titleNode.getComponent(cc.Label).string = 'NOT IN SYNC...';
        self._titleNode.color = cc.color(255, 68, 68);
        self._statsNode.getComponent(cc.Label).string =
            'Score: ' + self._score + '    ' + self._hits + '/' + TOTAL_NOTES + ' hits';
        setTimeout(function () {
            if (self._onResult) self._onResult(false, self._score);
        }, 2500);
    },

    // ── Update / Render (runs every frame via CC's engine) ────────
    update: function (_dt) {
        var self = this;
        var gfx  = self._gfx;
        var W = self._W, H = self._H;
        var now = performance.now();

        gfx.clear();

        // Background
        gfx.fillColor = cc.color(18, 5, 18);
        gfx.rect(-W / 2, -H / 2, W, H);
        gfx.fill();

        if (self._active) {
            self._frame++;

            // Auto-miss expired notes
            self._notes.forEach(function (note) {
                if (!note.judged && now - note.spawnTime > APPROACH_DUR + 350) {
                    note.judged = true; self._misses++; self._combo = 0;
                    self._flashJudge('MISS', cc.color(204, 68, 68), note.x, note.y);
                    var ref = note;
                    setTimeout(function () {
                        var idx = self._notes.indexOf(ref);
                        if (idx !== -1) self._notes.splice(idx, 1);
                    }, 300);
                }
            });

            // Update approach ring radii
            self._notes.forEach(function (note) {
                if (!note.judged) {
                    var p = Math.min((now - note.spawnTime) / APPROACH_DUR, 1);
                    note.approachR = APPROACH_R0 + (NOTE_RADIUS - APPROACH_R0) * p;
                }
            });

            // Dashed connection lines between consecutive unjudged notes
            var unjudged = self._notes.filter(function (n) { return !n.judged; })
                                      .sort(function (a, b) { return a.id - b.id; });
            gfx.lineWidth   = 1.5;
            gfx.strokeColor = cc.color(255, 150, 200, 30);
            for (var j = 0; j < unjudged.length - 1; j++) {
                var na = unjudged[j], nb = unjudged[j + 1];
                var dx = nb.x - na.x, dy = nb.y - na.y;
                var len = Math.hypot(dx, dy);
                if (len < 1) continue;
                var ux = dx / len, uy = dy / len;
                for (var t = 0; t < len; t += 14) {
                    var te = Math.min(t + 6, len);
                    gfx.moveTo(na.x + ux * t,  na.y + uy * t);
                    gfx.lineTo(na.x + ux * te, na.y + uy * te);
                }
                gfx.stroke();
            }
        }

        // Draw notes — later ids behind, earlier ids on top
        var sorted  = self._notes.slice().sort(function (a, b) { return b.id - a.id; });
        var lblIdx  = 0;
        sorted.forEach(function (note) {
            if (note.judged) return;

            // Approach ring
            var ringP = Math.min((APPROACH_R0 - note.approachR) / (APPROACH_R0 - NOTE_RADIUS), 1);
            var ringA = Math.floor((0.3 + 0.7 * ringP) * 255);
            gfx.strokeColor = cc.color(255, 180, 220, ringA);
            gfx.lineWidth   = 3;
            gfx.circle(note.x, note.y, Math.max(note.approachR, NOTE_RADIUS + 1));
            gfx.stroke();

            // Hit circle — fill then border (circle() called twice: fill consumes path)
            gfx.fillColor = cc.color(255, 105, 180, 38);
            gfx.circle(note.x, note.y, NOTE_RADIUS);
            gfx.fill();
            gfx.strokeColor = cc.color(255, 105, 180, 220);
            gfx.lineWidth   = 3;
            gfx.circle(note.x, note.y, NOTE_RADIUS);
            gfx.stroke();

            // Position the number label for this note
            if (lblIdx < self._numLabels.length) {
                self._numLabels[lblIdx].active = true;
                self._numLabels[lblIdx].setPosition(note.x, note.y);
                self._numLabels[lblIdx].getComponent(cc.Label).string = '' + (note.id + 1);
                lblIdx++;
            }
        });
        // Hide unused number labels
        for (var li = lblIdx; li < self._numLabels.length; li++) {
            self._numLabels[li].active = false;
        }

        // Hit burst animations
        for (var bi = self._bursts.length - 1; bi >= 0; bi--) {
            var burst = self._bursts[bi];
            burst.life--;
            var bp = 1 - burst.life / 20;
            var ba = Math.floor((burst.life / 20) * 200);
            gfx.strokeColor = cc.color(255, 105, 180, ba);
            gfx.lineWidth   = 2.5;
            gfx.circle(burst.x, burst.y, NOTE_RADIUS + bp * 26);
            gfx.stroke();
            if (burst.life <= 0) self._bursts.splice(bi, 1);
        }

        // Cursor dot
        gfx.fillColor = cc.color(255, 255, 255, 200);
        gfx.circle(self._mouseX, self._mouseY, 5);
        gfx.fill();
        gfx.strokeColor = cc.color(255, 105, 180, 220);
        gfx.lineWidth   = 1.5;
        gfx.circle(self._mouseX, self._mouseY, 10);
        gfx.stroke();

        // Top progress bar
        var prog = Math.min(self._hits + self._misses, TOTAL_NOTES) / TOTAL_NOTES;
        gfx.fillColor = cc.color(255, 255, 255, 15);
        gfx.rect(-W / 2 + 20, H / 2 - 8, W - 40, 5);
        gfx.fill();
        if (prog > 0) {
            gfx.fillColor = cc.color(255, 105, 180);
            gfx.rect(-W / 2 + 20, H / 2 - 8, (W - 40) * prog, 5);
            gfx.fill();
        }

        // Bottom note track dots
        var dotSpacing = (W - 120) / TOTAL_NOTES;
        for (var di = 0; di < TOTAL_NOTES; di++) {
            var dotX = -W / 2 + 60 + di * dotSpacing;
            var dotY = -H / 2 + 16;
            var isLive = self._notes.some(function (n) { return n.id === di && !n.judged; });
            gfx.fillColor = isLive              ? cc.color(255, 221, 68)
                          : di < self._noteIdx  ? cc.color(255, 105, 180)
                          :                       cc.color(51, 51, 51);
            gfx.circle(dotX, dotY, 5);
            gfx.fill();
            gfx.strokeColor = cc.color(255, 105, 180, 68);
            gfx.lineWidth   = 1;
            gfx.circle(dotX, dotY, 5);
            gfx.stroke();
        }

        // Combo display (when combo ≥ 5)
        if (self._combo >= 5) {
            // Draw a subtle combo badge behind the combo label using graphics
            gfx.fillColor = cc.color(255, 105, 180, Math.floor(
                (0.15 + 0.08 * Math.sin(self._frame * 0.15)) * 255));
            gfx.rect(-60, H / 2 - 50, 120, 24);
            gfx.fill();
        }

        // HUD text updates
        self._scoreNode.getComponent(cc.Label).string = '' + self._score;
        var statsStr = self._hits + ' hits  ' + self._misses + ' miss';
        if (self._combo >= 5) statsStr += '   ' + self._combo + 'x COMBO';
        self._statsNode.getComponent(cc.Label).string = statsStr;

        // Floating judge text (fades and floats up)
        if (self._jTimer > 0) {
            self._jTimer--;
            self._jY += 0.4;
            self._judgeNode.setPosition(self._jX, self._jY);
            self._judgeNode.opacity = Math.floor((self._jTimer / 50) * 255);
        } else {
            self._judgeNode.opacity = 0;
        }
    },
});
