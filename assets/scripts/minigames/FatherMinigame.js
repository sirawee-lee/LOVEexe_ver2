'use strict';

// ── Drop schedule ─────────────────────────────────────────────────────────────
// Each clothing type drops exactly TWICE. Miss both of the same type = FAIL.
var CLOTH_DROPS = [
    { type: 'shirt', t: 2.0 },
    { type: 'pants', t: 3.8 },
    { type: 'shoes', t: 5.6 },
    { type: 'shirt', t: 9.5 },
    { type: 'pants', t: 11.2 },
    { type: 'shoes', t: 13.0 },
];
var GAME_DURATION   = 20;    // seconds — win/lose checked at the end
var CLOTH_SPEED     = 260;   // CC units / second
var COIN_SPEED      = 310;   // CC units / second
var GOOMBA_SPEED    = 290;   // CC units / second
var CATCHER_HALF_W  = 52;    // horizontal catch radius
var CATCH_Y_RANGE   = 55;    // vertical window above catcher centre
var CATCHER_SPEED   = 370;   // keyboard movement speed (CC units / second)
var MAX_HEARTS      = 3;

cc.Class({
    extends: cc.Component,

    properties: {
        // ── Audio ──────────────────────────────────────────────
        bgm:       { default: null, type: cc.AudioClip },
        sfxCatch:  { default: null, type: cc.AudioClip },
        sfxCoin:   { default: null, type: cc.AudioClip },
        sfxWrong:  { default: null, type: cc.AudioClip },
        sfxWin:    { default: null, type: cc.AudioClip },

        // ── Catcher sprites (8 states) ─────────────────────────
        catcherNaked:      { default: null, type: cc.SpriteFrame },
        catcherShirt:      { default: null, type: cc.SpriteFrame },
        catcherPants:      { default: null, type: cc.SpriteFrame },
        catcherShoes:      { default: null, type: cc.SpriteFrame },
        catcherShirtPants: { default: null, type: cc.SpriteFrame },
        catcherShirtShoes: { default: null, type: cc.SpriteFrame },
        catcherPantsShoes: { default: null, type: cc.SpriteFrame },
        catcherFull:       { default: null, type: cc.SpriteFrame },

        // ── Falling item sprites ───────────────────────────────
        sprShirt:  { default: null, type: cc.SpriteFrame },
        sprPants:  { default: null, type: cc.SpriteFrame },
        sprShoes:  { default: null, type: cc.SpriteFrame },
        sprCoin:   { default: null, type: cc.SpriteFrame },
        sprGoomba: { default: null, type: cc.SpriteFrame },
    },

    // ── CC lifecycle ──────────────────────────────────────────────
    onLoad: function () {
        var self = this;
        // Hard-code design resolution — node.height can be 0 at onLoad if Widget hasn't run yet
        self._W  = 700;
        self._H  = 400;
        cc.log('[Father] W=' + self._W + ' H=' + self._H + ' nodeW=' + self.node.width + ' nodeH=' + self.node.height);

        // cc.Graphics — redrawn each frame (background, glow, HUD graphics)
        self._gfx = self.node.addComponent(cc.Graphics);

        // Catcher sprite node
        var cn = new cc.Node('Catcher');
        cn.addComponent(cc.Sprite);
        cn.setContentSize(80, 130);
        self._catcherY = -self._H / 2 + 90;
        cn.setPosition(0, self._catcherY);
        self.node.addChild(cn, 3);
        self._catcherNode = cn;
        self._catcherX    = 0;

        // HUD labels
        self._titleLbl  = self._mkLabel('DRESS UP!', cc.v2(0, self._H / 2 - 18), 15, cc.color(255, 180, 80));
        self._heartsLbl = self._mkLabel('♥  ♥  ♥', cc.v2(0, self._H / 2 - 38), 17, cc.color(255, 60, 80));
        self._scoreLbl  = self._mkLabel('Coins: 0', cc.v2(self._W / 2 - 70, self._H / 2 - 20), 13, cc.color(255, 221, 68));
        self._timerLbl  = self._mkLabel('', cc.v2(-self._W / 2 + 55, self._H / 2 - 20), 13, cc.color(200, 200, 200));
        self._hintLbl   = self._mkLabel('[Mouse] or [← →] to move', cc.v2(0, -self._H / 2 + 10), 10, cc.color(255, 255, 255, 40));

        // Clothing status indicators
        self._clothLbl = {
            shirt: self._mkLabel('SHIRT ?', cc.v2(-100, -self._H / 2 + 58), 11, cc.color(200, 200, 200)),
            pants: self._mkLabel('PANTS ?', cc.v2(0,    -self._H / 2 + 58), 11, cc.color(200, 200, 200)),
            shoes: self._mkLabel('SHOES ?', cc.v2(100,  -self._H / 2 + 58), 11, cc.color(200, 200, 200)),
        };

        // Floating feedback text
        self._popNode         = self._mkLabel('', cc.v2(0, 0), 20, cc.Color.WHITE);
        self._popNode.opacity = 0;
        self._popTimer        = 0;
        self._popX = 0; self._popY = 0;

        // "LAST CHANCE!" warning
        self._warnNode         = self._mkLabel('', cc.v2(0, 30), 18, cc.color(255, 80, 80));
        self._warnNode.opacity = 0;
        self._warnTimer        = 0;

        // Mouse tracking — e.getLocation() returns (0→W, 0→H) from bottom-left
        // Subtract half-size to get center-origin CC local coords
        self._mouseX = 0;
        var cvs = cc.find('Canvas');
        cvs.on(cc.Node.EventType.MOUSE_MOVE, function (e) {
            var loc = e.getLocation();
            var mx  = loc.x - self._W / 2;
            self._mouseX = Math.max(-self._W / 2 + 60, Math.min(self._W / 2 - 60, mx));
        }, self);

        // Keyboard
        self._keys = {};
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, self._onKeyDown, self);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP,   self._onKeyUp,   self);

        self._active   = false;
        self._bgmId    = -1;
        self._items    = [];
        self._timers   = [];
        self._gameTime = 0;
        self._score    = 0;
        self._frame    = 0;
    },

    onDestroy: function () {
        var cvs = cc.find('Canvas');
        if (cvs) cvs.off(cc.Node.EventType.MOUSE_MOVE, null, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP,   this._onKeyUp,   this);
        this._clearTimers();
        this._stopBgm();
    },

    // ── Helper: create a cc.Label child ───────────────────────────
    _mkLabel: function (str, pos, size, color) {
        var n = new cc.Node();
        var l = n.addComponent(cc.Label);
        l.string          = str;
        l.fontSize        = size;
        l.lineHeight      = size + 2;
        l.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        n.color = color || cc.Color.WHITE;
        n.setPosition(pos);
        this.node.addChild(n, 5);
        return n;
    },

    // ── Public API ────────────────────────────────────────────────
    startGame: function (onResult) {
        this._onResult = onResult || null;
        this._initGame();
    },

    // ── Game init ─────────────────────────────────────────────────
    _initGame: function () {
        var self      = this;
        self._score   = 0;
        self._gameTime = 0;
        self._frame   = 0;
        self._active  = true;
        self._items   = [];
        self._timers  = [];

        // Caught flags and miss counters per clothing type
        self._caught  = { shirt: false, pants: false, shoes: false };
        self._missed  = { shirt: 0,     pants: 0,     shoes: 0     };
        self._hearts  = MAX_HEARTS;

        self._updateCatcherSprite();
        self._updateClothLabels();
        self._updateHeartsLabel();

        if (self.bgm) self._bgmId = cc.audioEngine.play(self.bgm, true, 0.7);

        // Schedule clothing drops
        CLOTH_DROPS.forEach(function (drop) {
            var t = setTimeout(function () {
                if (self._active) self._spawnCloth(drop.type);
            }, drop.t * 1000);
            self._timers.push(t);
        });

        // Schedule Goombas at random intervals (every 3-5 seconds)
        var gt = 3.0 + Math.random() * 2;
        while (gt < GAME_DURATION - 2) {
            (function (spawnAt) {
                var t = setTimeout(function () {
                    if (self._active) self._spawnGoomba();
                }, spawnAt * 1000);
                self._timers.push(t);
            })(gt);
            gt += 3.0 + Math.random() * 2.0;
        }

        // Schedule coins at random intervals throughout the game
        var ct = 1.0;
        while (ct < GAME_DURATION - 2) {
            (function (spawnAt) {
                var t = setTimeout(function () {
                    if (self._active) self._spawnCoin();
                }, spawnAt * 1000);
                self._timers.push(t);
            })(ct);
            ct += 1.2 + Math.random() * 1.6;
        }

        // End-of-game timer
        var endT = setTimeout(function () {
            if (self._active) self._endGame();
        }, GAME_DURATION * 1000);
        self._timers.push(endT);
    },

    _clearTimers: function () {
        this._timers.forEach(function (t) { clearTimeout(t); });
        this._timers = [];
    },

    _stopBgm: function () {
        if (this._bgmId >= 0) { cc.audioEngine.stop(this._bgmId); this._bgmId = -1; }
    },

    // ── Spawning ──────────────────────────────────────────────────
    _spawnCloth: function (type) {
        var self   = this;
        var margin = 70;
        var x      = -self._W / 2 + margin + Math.random() * (self._W - margin * 2);

        // If player hasn't caught this type yet and already missed once → LAST CHANCE
        if (!self._caught[type] && self._missed[type] > 0) {
            self._warnNode.getComponent(cc.Label).string = 'LAST CHANCE: ' + type.toUpperCase() + '!';
            self._warnNode.opacity = 255;
            self._warnTimer = 90;
        }

        var itemNode = new cc.Node('cloth_' + type);
        var spr      = itemNode.addComponent(cc.Sprite);
        spr.spriteFrame = self['spr' + type.charAt(0).toUpperCase() + type.slice(1)];
        itemNode.setContentSize(64, 64);
        itemNode.setPosition(x, self._H / 2);
        self.node.addChild(itemNode, 2);

        cc.log('[Father] spawned ' + type + ' at x=' + Math.round(x));
        self._items.push({
            type:  type,
            x:     x,
            y:     self._H / 2,
            speed: CLOTH_SPEED + Math.random() * 30,
            halfW: 32,
            node:  itemNode,
            isCoin: false,
        });
    },

    _spawnCoin: function () {
        var self   = this;
        var margin = 60;
        var x      = -self._W / 2 + margin + Math.random() * (self._W - margin * 2);

        var itemNode = new cc.Node('coin');
        var spr      = itemNode.addComponent(cc.Sprite);
        spr.spriteFrame = self.sprCoin;
        itemNode.setContentSize(64, 64);
        itemNode.setPosition(x, self._H / 2);
        self.node.addChild(itemNode, 2);

        self._items.push({
            type:   'coin',
            x:      x,
            y:      self._H / 2,
            speed:  COIN_SPEED + Math.random() * 50,
            halfW:  32,
            node:   itemNode,
            isCoin: true,
        });
    },

    _spawnGoomba: function () {
        var self   = this;
        var margin = 60;
        var x      = -self._W / 2 + margin + Math.random() * (self._W - margin * 2);

        var itemNode = new cc.Node('goomba');
        var spr      = itemNode.addComponent(cc.Sprite);
        spr.spriteFrame = self.sprGoomba;
        itemNode.setContentSize(64, 64);
        itemNode.setPosition(x, self._H / 2);
        self.node.addChild(itemNode, 2);

        self._items.push({
            type:    'goomba',
            x:       x,
            y:       self._H / 2,
            speed:   GOOMBA_SPEED + Math.random() * 40,
            halfW:   32,
            node:    itemNode,
            isCoin:  false,
            isGoomba: true,
        });
    },

    // ── Hearts label ──────────────────────────────────────────────
    _updateHeartsLabel: function () {
        var str = '';
        for (var i = 0; i < MAX_HEARTS; i++) {
            str += i < this._hearts ? '♥ ' : '♡ ';
        }
        var lbl = this._heartsLbl.getComponent(cc.Label);
        lbl.string = str.trim();
        this._heartsLbl.color = this._hearts > 1
            ? cc.color(255, 60, 80)
            : cc.color(255, 140, 50); // orange warning when 1 heart left
    },

    // ── Catcher sprite state ──────────────────────────────────────
    _updateCatcherSprite: function () {
        var spr = this._catcherNode.getComponent(cc.Sprite);
        if (!spr) return;
        var h = this._caught && this._caught.shirt;
        var p = this._caught && this._caught.pants;
        var s = this._caught && this._caught.shoes;
        if      (h && p && s) spr.spriteFrame = this.catcherFull;
        else if (h && p)      spr.spriteFrame = this.catcherShirtPants;
        else if (h && s)      spr.spriteFrame = this.catcherShirtShoes;
        else if (p && s)      spr.spriteFrame = this.catcherPantsShoes;
        else if (h)           spr.spriteFrame = this.catcherShirt;
        else if (p)           spr.spriteFrame = this.catcherPants;
        else if (s)           spr.spriteFrame = this.catcherShoes;
        else                  spr.spriteFrame = this.catcherNaked;
    },

    _updateClothLabels: function () {
        var types = ['shirt', 'pants', 'shoes'];
        for (var i = 0; i < types.length; i++) {
            var t   = types[i];
            var lbl = this._clothLbl[t];
            if (!lbl) continue;
            var l = lbl.getComponent(cc.Label);
            if (this._caught && this._caught[t]) {
                l.string = t.toUpperCase() + ' OK';
                lbl.color = cc.color(80, 255, 120);
            } else if (this._missed && this._missed[t] >= 2) {
                l.string = t.toUpperCase() + ' X';
                lbl.color = cc.color(255, 80, 80);
            } else if (this._missed && this._missed[t] === 1) {
                l.string = t.toUpperCase() + ' !';
                lbl.color = cc.color(255, 180, 50);
            } else {
                l.string = t.toUpperCase() + ' ?';
                lbl.color = cc.color(180, 180, 180);
            }
        }
    },

    // ── Input ─────────────────────────────────────────────────────
    _onKeyDown: function (e) {
        this._keys[e.keyCode] = true;
    },
    _onKeyUp: function (e) {
        this._keys[e.keyCode] = false;
    },

    // ── Catch / Miss ──────────────────────────────────────────────
    _catchItem: function (item, idx) {
        item.node.destroy();
        this._items.splice(idx, 1);

        cc.log('[Father] catch ' + item.type + ' y=' + Math.round(item.y) + ' catcherY=' + Math.round(this._catcherY));
        if (item.isGoomba) {
            this._hearts--;
            if (this.sfxWrong) cc.audioEngine.play(this.sfxWrong, false, 0.9);
            this._popFlash('OUCH! -1 ♥', cc.color(255, 80, 80), item.x, item.y);
            this._updateHeartsLabel();
            if (this._hearts <= 0) {
                this._failGame('No hearts left!');
            }
            return;
        }

        if (item.isCoin) {
            this._score++;
            if (this.sfxCoin) cc.audioEngine.play(this.sfxCoin, false, 0.8);
            this._popFlash('+1', cc.color(255, 221, 68), item.x, item.y);
        } else {
            if (!this._caught[item.type]) {
                this._caught[item.type] = true;
                if (this.sfxCatch) cc.audioEngine.play(this.sfxCatch, false, 1);
                this._popFlash('GOT ' + item.type.toUpperCase() + '!', cc.color(80, 255, 150), item.x, item.y);
                this._updateCatcherSprite();
                this._updateClothLabels();
            }
        }
    },

    _missItem: function (item, idx) {
        item.node.destroy();
        this._items.splice(idx, 1);

        // Goomba or coin falling off the bottom is fine — no penalty
        if (item.isCoin || item.isGoomba) return;

        if (!this._caught[item.type]) {
            this._missed[item.type]++;
            this._updateClothLabels();
            if (this._missed[item.type] >= 2) {
                this._failGame(item.type.toUpperCase() + ' missed!');
            }
        }
    },

    _popFlash: function (text, color, x, y) {
        var n = this._popNode;
        n.getComponent(cc.Label).string = text;
        n.color   = color;
        n.opacity = 255;
        n.setPosition(x, y + 40);
        this._popTimer = 45;
        this._popX = x; this._popY = y + 40;
    },

    // ── End states ────────────────────────────────────────────────
    _endGame: function () {
        var self = this;
        self._active = false;
        self._clearTimers();
        self._stopBgm();

        var won = self._caught.shirt && self._caught.pants && self._caught.shoes;
        if (won) {
            if (self.sfxWin) cc.audioEngine.play(self.sfxWin, false, 1);
            self._titleLbl.getComponent(cc.Label).string = 'FULLY DRESSED! ✓';
            self._titleLbl.color = cc.color(80, 255, 120);
        } else {
            if (self.sfxWrong) cc.audioEngine.play(self.sfxWrong, false, 1);
            self._titleLbl.getComponent(cc.Label).string = 'NOT DRESSED...';
            self._titleLbl.color = cc.color(255, 80, 80);
        }
        self._scoreLbl.getComponent(cc.Label).string = 'Coins: ' + self._score;

        setTimeout(function () {
            self._items.forEach(function (it) { if (it.node && it.node.isValid) it.node.destroy(); });
            self._items = [];
            if (self._onResult) self._onResult(won, self._score);
        }, 2500);
    },

    _failGame: function (reason) {
        if (!this._active) return;
        var self = this;
        self._active = false;
        self._clearTimers();
        self._stopBgm();
        if (self.sfxWrong) cc.audioEngine.play(self.sfxWrong, false, 1);
        self._titleLbl.getComponent(cc.Label).string = 'FAILED! ' + reason;
        self._titleLbl.color = cc.color(255, 80, 80);

        setTimeout(function () {
            self._items.forEach(function (it) { if (it.node && it.node.isValid) it.node.destroy(); });
            self._items = [];
            if (self._onResult) self._onResult(false, self._score);
        }, 2500);
    },

    // ── Update / Render ───────────────────────────────────────────
    update: function (_dt) {
        var self = this;
        var gfx  = self._gfx;
        var W = self._W, H = self._H;

        gfx.clear();

        // ── Background ────────────────────────────────────────────
        gfx.fillColor = cc.color(15, 10, 30);
        gfx.rect(-W / 2, -H / 2, W, H);
        gfx.fill();

        // Ground line
        var groundY = self._catcherY - 55;
        gfx.fillColor = cc.color(40, 30, 60);
        gfx.rect(-W / 2, -H / 2, W, groundY + H / 2 + 1);
        gfx.fill();
        gfx.strokeColor = cc.color(255, 180, 80, 60);
        gfx.lineWidth   = 2;
        gfx.moveTo(-W / 2, groundY);
        gfx.lineTo(W / 2, groundY);
        gfx.stroke();

        if (self._active) {
            self._gameTime += _dt;
            self._frame++;

            // ── Move catcher (mouse + keyboard) ───────────────────
            var maxX = W / 2 - 65;
            // Keyboard movement
            var left  = self._keys[cc.macro.KEY.left]  || self._keys[cc.macro.KEY.a];
            var right = self._keys[cc.macro.KEY.right] || self._keys[cc.macro.KEY.d];
            if (left)  self._catcherX -= CATCHER_SPEED * _dt;
            if (right) self._catcherX += CATCHER_SPEED * _dt;
            // Smooth mouse following (blended with keyboard)
            self._catcherX += (self._mouseX - self._catcherX) * 0.14;
            self._catcherX = Math.max(-maxX, Math.min(maxX, self._catcherX));
            self._catcherNode.setPositionX(self._catcherX);

            // Timer label
            var left_ = Math.max(0, GAME_DURATION - self._gameTime);
            self._timerLbl.getComponent(cc.Label).string = Math.ceil(left_) + 's';

            // ── Process falling items ──────────────────────────────
            for (var i = self._items.length - 1; i >= 0; i--) {
                var item = self._items[i];
                item.y  -= item.speed * _dt;
                item.node.setPositionY(item.y);

                // Solid fallback shape — always visible even without a sprite assigned
                if (item.isCoin) {
                    gfx.fillColor = cc.color(255, 210, 0, 220);
                    gfx.circle(item.x, item.y, 28);
                    gfx.fill();
                } else if (item.isGoomba) {
                    gfx.fillColor = cc.color(60, 180, 60, 200);
                    gfx.circle(item.x, item.y, 28);
                    gfx.fill();
                } else {
                    gfx.fillColor = cc.color(255, 255, 255, 160);
                    gfx.rect(item.x - 28, item.y - 28, 56, 56);
                    gfx.fill();
                }

                // Glow — gold for clothing, red for Goomba
                if (item.isGoomba) {
                    var gPulse = Math.sin(self._gameTime * 9 + i) * 0.4 + 0.6;
                    gfx.fillColor   = cc.color(255, 40, 40, Math.floor(gPulse * 90));
                    gfx.circle(item.x, item.y, 40);
                    gfx.fill();
                    gfx.strokeColor = cc.color(255, 80, 80, Math.floor(gPulse * 50));
                    gfx.lineWidth   = 4;
                    gfx.circle(item.x, item.y, 50);
                    gfx.stroke();
                } else if (!item.isCoin) {
                    var pulse = Math.sin(self._gameTime * 7 + i * 1.3) * 0.35 + 0.65;
                    gfx.fillColor = cc.color(255, 230, 60, Math.floor(pulse * 85));
                    gfx.circle(item.x, item.y, 42);
                    gfx.fill();
                    gfx.strokeColor = cc.color(255, 200, 50, Math.floor(pulse * 45));
                    gfx.lineWidth   = 4;
                    gfx.circle(item.x, item.y, 52);
                    gfx.stroke();
                }

                // Catch check
                var inYRange = item.y <= self._catcherY + CATCH_Y_RANGE &&
                               item.y >= self._catcherY - 25;
                if (inYRange && Math.abs(item.x - self._catcherX) < CATCHER_HALF_W + item.halfW) {
                    self._catchItem(item, i);
                    continue;
                }

                // Fell off bottom
                if (item.y < -H / 2 - 70) {
                    self._missItem(item, i);
                    continue;
                }
            }

            self._updateClothLabels();
        }

        // ── Clothing progress bar ─────────────────────────────────
        var caughtN = (self._caught && self._caught.shirt ? 1 : 0) +
                      (self._caught && self._caught.pants ? 1 : 0) +
                      (self._caught && self._caught.shoes ? 1 : 0);
        var barW = 180, barY = -H / 2 + 45;
        gfx.fillColor = cc.color(255, 255, 255, 15);
        gfx.rect(-barW / 2, barY, barW, 7);
        gfx.fill();
        if (caughtN > 0) {
            gfx.fillColor = cc.color(80, 255, 120);
            gfx.rect(-barW / 2, barY, barW * caughtN / 3, 7);
            gfx.fill();
        }

        // ── Score + timer labels ──────────────────────────────────
        self._scoreLbl.getComponent(cc.Label).string = 'Coins: ' + self._score;

        // ── Floating pop text ─────────────────────────────────────
        if (self._popTimer > 0) {
            self._popTimer--;
            self._popY += 0.45;
            self._popNode.setPosition(self._popX, self._popY);
            self._popNode.opacity = Math.floor((self._popTimer / 45) * 255);
        } else {
            self._popNode.opacity = 0;
        }

        // ── Last-chance warning ───────────────────────────────────
        if (self._warnTimer > 0) {
            self._warnTimer--;
            self._warnNode.opacity = Math.floor(
                Math.min(1, self._warnTimer / 20) * 255 *
                (0.6 + 0.4 * Math.sin(self._frame * 0.3))
            );
        } else {
            self._warnNode.opacity = 0;
        }
    },
});
