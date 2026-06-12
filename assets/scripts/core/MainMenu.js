"use strict";

// MainMenu.js — the title screen. Shows main_menu.png + a START button and plays
// a title BGM. START begins a fresh playthrough (loads MainScene); the pause
// menu's "Main Menu" returns here. All UI is built in code, so the scene only
// needs this one component on a node centred under the Canvas.

var PixelFont = require("PixelFont");
var StoryState = require("StoryState");
var Account = require("Account"); // login / cloud save / global leaderboard
require("PauseMenu"); // applies the saved volume + gives ESC sound options on the title too

var COL_PINK = cc.color(232, 90, 140);
var COL_PINK2 = cc.color(255, 130, 175);

cc.Class({
  extends: cc.Component,

  onLoad: function () {
    var self = this;
    var vs = cc.view.getVisibleSize();
    var W = vs.width,
      H = vs.height;

    // ── full-screen background art (main_menu.png from resources) ──
    var bgNode = new cc.Node("bg");
    bgNode.parent = this.node;
    bgNode.setPosition(0, 0);
    bgNode.zIndex = 0;
    var spr = bgNode.addComponent(cc.Sprite);
    spr.sizeMode = cc.Sprite.SizeMode.CUSTOM;
    spr.trim = false;
    bgNode.setContentSize(W, H);
    this._loadImage("endings/main_menu", function (sf) {
      if (sf && cc.isValid(bgNode)) spr.spriteFrame = sf;
    });

    // ── falling sakura petals (opening particle effect) ──
    this._sakura(W, H);

    // ── typed tagline in the top-right corner (opening animation) ──
    // (the game title already lives in main_menu.png, so we don't repeat it here)
    var taglineStr = "❤ A campus love story ❤";
    var tagline = this._label("", 26, cc.color(255, 235, 245), 0, 0);
    tagline.horizontalAlign = cc.Label.HorizontalAlign.RIGHT;
    tagline.node.anchorX = 1; // pin the right edge so it grows leftward
    tagline.node.anchorY = 1; // pin the top edge
    tagline.node.setPosition(W / 2 - 30, H / 2 - 26); // top-right, small margin
    this.scheduleOnce(function () {
      // type the whole sentence over ~5 seconds
      self._typewriter(tagline, taglineStr, 5 / taglineStr.length);
    }, 0.6);

    // ── START button + hint (fade in after the opening reveal) ──
    var btn = this._button(
      "▶  START GAME",
      0,
      -H / 2 + 72,
      322,
      72,
      COL_PINK,
      COL_PINK2,
      function () {
        self._start();
      },
      26,
    );
    // ── Hero Mode toggle — no heart loss, run is not ranked ──
    var hero = this._heroToggle(0, -H / 2 + 140);
    // small hint
    var hint = this._label(
      "press  Esc  for sound options",
      16,
      cc.color(235, 230, 240),
      0,
      -H / 2 + 20,
    );
    btn.opacity = 0;
    hero.opacity = 0;
    hint.node.opacity = 0;
    cc.tween(btn).delay(0.6).to(0.5, { opacity: 255 }).start();
    cc.tween(hero).delay(0.7).to(0.5, { opacity: 255 }).start();
    cc.tween(hint.node).delay(0.8).to(0.5, { opacity: 255 }).start();

    // ── account row: LOGIN / player name + global RANKS (+ CONTINUE) ──
    Account.init();
    this._buildAccountUI(true);
    if (Account.isLoggedIn()) {
      // pull the cloud save so CONTINUE appears even on a fresh device
      Account.refreshSave(function () {
        if (self.isValid) self._buildAccountUI(false);
      });
    }

    // ── opening fade-in: a black overlay that dissolves away on load ──
    var overlay = new cc.Node("intro_fade");
    overlay.parent = this.node;
    overlay.zIndex = 100;
    var ov = overlay.addComponent(cc.Sprite);
    ov.sizeMode = cc.Sprite.SizeMode.CUSTOM;
    ov.trim = false;
    ov.spriteFrame = this._solidSF();
    overlay.setContentSize(W + 4, H + 4);
    overlay.color = cc.color(0, 0, 0);
    cc.tween(overlay)
      .to(0.85, { opacity: 0 })
      .call(function () {
        if (cc.isValid(overlay)) overlay.destroy();
      })
      .start();

    // ── title music (master volume from the pause menu applies via setMusicVolume) ──
    cc.resources.load("audio/bgm_title", cc.AudioClip, function (err, clip) {
      if (!err && clip) {
        try {
          cc.audioEngine.playMusic(clip, true);
        } catch (e) {}
      }
    });
  },

  onDestroy: function () {
    try {
      cc.audioEngine.stopMusic();
    } catch (e) {}
    // remove any login <input> overlays still in the DOM (e.g. on scene change)
    try {
      var els = document.querySelectorAll(".loveexe-eb");
      for (var i = 0; i < els.length; i++) els[i].parentNode.removeChild(els[i]);
    } catch (e) {}
  },

  // ── Hero Mode toggle button (persisted via StoryState.setHeroMode) ──
  _heroToggle: function (x, y) {
    var node = new cc.Node("heroBtn");
    node.parent = this.node;
    node.setPosition(x, y);
    var w = 322,
      h = 52;
    node.setContentSize(w, h);
    var g = node.addComponent(cc.Graphics);
    var lblNode = new cc.Node("lbl");
    lblNode.parent = node;
    var l = lblNode.addComponent(cc.Label);
    l.fontSize = 20;
    l.lineHeight = 24;
    lblNode.color = cc.color(255, 255, 255);
    PixelFont.apply(l);
    var redraw = function () {
      var on = StoryState.heroMode;
      g.clear();
      g.fillColor = on ? cc.color(90, 200, 130) : cc.color(70, 70, 90);
      g.roundRect(-w / 2, -h / 2, w, h, 12);
      g.fill();
      g.lineWidth = 3;
      g.strokeColor = cc.color(255, 255, 255, 70);
      g.roundRect(-w / 2, -h / 2, w, h, 12);
      g.stroke();
      l.string = "HERO MODE:  " + (on ? "ON" : "OFF");
    };
    redraw();
    node.on(
      cc.Node.EventType.TOUCH_END,
      function () {
        StoryState.setHeroMode(!StoryState.heroMode);
        redraw();
      },
      this,
    );
    return node;
  },

  _start: function () {
    if (this._navigating) return; // a CONTINUE is already in flight
    this._navigating = true;
    try {
      cc.audioEngine.stopMusic();
    } catch (e) {}
    StoryState.reset(); // every Start from the title = a fresh playthrough
    cc.director.loadScene("MainScene");
  },

  // ── account / login / leaderboard UI ─────────────────────
  // (Re)build the bottom account row. fadeIn = stagger in with the opening.
  _buildAccountUI: function (fadeIn) {
    var self = this;
    var H = cc.view.getVisibleSize().height;

    if (this._accRow && cc.isValid(this._accRow)) this._accRow.destroy();
    var row = new cc.Node("accountRow");
    row.parent = this.node;
    this._accRow = row;

    // left: LOGIN — or the player's name (tap to log out)
    var accLabel = Account.isLoggedIn()
      ? "👤  " + (Account.name || Account.user)
      : "👤  LOGIN";
    var acc = this._button(
      accLabel,
      -84,
      -H / 2 + 202,
      156,
      52,
      cc.color(70, 90, 140),
      cc.color(100, 125, 185),
      function () {
        if (Account.isLoggedIn()) {
          Account.logout();
          self._buildAccountUI(false);
        } else self._showLogin();
      },
      25,
    );
    acc.parent = row;

    // right: the global leaderboard
    var ranks = this._button(
      "🏆  RANKS",
      84,
      -H / 2 + 202,
      156,
      52,
      cc.color(140, 110, 50),
      cc.color(185, 150, 80),
      function () {
        self._showRanks();
      },
      25,
    );
    ranks.parent = row;

    // CONTINUE — only when the current player has a run to resume
    if (Account.hasSave()) {
      var cont = this._button(
        "▶  CONTINUE",
        0,
        -H / 2 + 262,
        322,
        52,
        cc.color(90, 170, 110),
        cc.color(120, 210, 145),
        function () {
          if (self._navigating) return; // ignore double clicks
          self._navigating = true;
          Account.loadProgress(function (ok) {
            if (!self.isValid) return; // menu already left (e.g. START won the race)
            if (ok) {
              cc.director.loadScene("MainScene"); // resume where you left off
            } else {
              self._navigating = false;
              Account.clearSave(); // corrupt/empty — drop it
              self._buildAccountUI(false);
            }
          });
        },
        25,
      );
      cont.parent = row;
    }

    if (fadeIn) {
      row.opacity = 0;
      cc.tween(row).delay(0.75).to(0.5, { opacity: 255 }).start();
    }
  },

  // login / first-time sign-up overlay
  _showLogin: function () {
    var self = this;
    if (this._loginRoot && cc.isValid(this._loginRoot))
      this._loginRoot.destroy();
    var root = this._overlayPanel(560, 420);
    this._loginRoot = root;

    this._labelOn(
      root,
      "LOGIN  /  SIGN UP",
      32,
      cc.color(255, 220, 240),
      0,
      150,
    );
    this._labelOn(
      root,
      "new username = creates the account",
      16,
      cc.color(180, 180, 200),
      0,
      112,
    );

    var status = this._labelOn(root, "", 18, cc.color(255, 120, 120), 0, -62);
    var userField, passField;
    var closeFields = function () {
      if (userField) userField.destroy();
      if (passField) passField.destroy();
    };

    var busy = false;
    var submit = function () {
      if (busy) return;
      busy = true;
      status.node.color = cc.color(220, 220, 230);
      status.string = "Connecting…";
      Account.login(userField.getValue(), passField.getValue(), function (err) {
        busy = false;
        if (!cc.isValid(root)) return;
        if (err) {
          status.node.color = cc.color(255, 120, 120);
          status.string = err;
          return;
        }
        closeFields();
        root.destroy();
        self._loginRoot = null;
        self._buildAccountUI(false); // name shows up; CONTINUE too if a save exists
      });
    };

    userField = this._textField(root, 64, "username", false, function () {
      passField.focus();
    });
    passField = this._textField(root, -8, "password", true, submit);
    userField.focus();

    this._buttonOn(
      root,
      "✔  OK",
      -110,
      -130,
      200,
      56,
      COL_PINK,
      COL_PINK2,
      submit,
    );
    this._buttonOn(
      root,
      "✖  Cancel",
      110,
      -130,
      200,
      56,
      cc.color(95, 95, 110),
      cc.color(135, 135, 150),
      function () {
        closeFields();
        root.destroy();
        self._loginRoot = null;
      },
    );
  },

  // global leaderboard overlay (everyone's best combined total)
  _showRanks: function () {
    var self = this;
    if (this._ranksRoot && cc.isValid(this._ranksRoot))
      this._ranksRoot.destroy();
    var root = this._overlayPanel(620, 520);
    this._ranksRoot = root;

    this._labelOn(
      root,
      "🏆  GLOBAL LEADERBOARD",
      30,
      cc.color(255, 210, 120),
      0,
      205,
    );
    this._labelOn(
      root,
      "best combined total across every game",
      16,
      cc.color(180, 180, 200),
      0,
      168,
    );
    var status = this._labelOn(
      root,
      "Loading…",
      22,
      cc.color(220, 220, 230),
      0,
      20,
    );

    Account.fetchLeaderboard(function (err, rows) {
      if (!cc.isValid(root)) return;
      if (err) {
        status.string = "Could not reach the server.";
        return;
      }
      if (!rows.length) {
        status.string = "No scores yet — be the first!";
        return;
      }
      status.node.destroy();
      var top = 130;
      for (var i = 0; i < rows.length && i < 8; i++) {
        var e = rows[i];
        var col = i === 0 ? cc.color(255, 210, 120) : cc.color(235, 235, 245);
        if (Account.user && String(e.name).toLowerCase() === Account.user)
          col = cc.color(140, 255, 170);
        self._labelOn(
          root,
          i + 1 + ".  " + e.name + "   —   " + e.total,
          24,
          col,
          0,
          top - i * 42,
        );
      }
    });

    this._buttonOn(
      root,
      "✖  Close",
      0,
      -215,
      220,
      56,
      cc.color(95, 95, 110),
      cc.color(135, 135, 150),
      function () {
        root.destroy();
        self._ranksRoot = null;
      },
    );
  },

  // dim full-screen overlay + centred panel (login / ranks share this)
  _overlayPanel: function (w, h) {
    var vs = cc.view.getVisibleSize();
    var root = new cc.Node("menuOverlay");
    root.parent = this.node;
    root.zIndex = 300; // above the sakura (10) and intro fade (100)
    root.setContentSize(vs.width, vs.height);
    var dim = root.addComponent(cc.Graphics);
    dim.fillColor = cc.color(0, 0, 0, 185);
    dim.rect(-vs.width / 2, -vs.height / 2, vs.width, vs.height);
    dim.fill();
    root.on(cc.Node.EventType.TOUCH_START, function () {}, this); // eat taps underneath

    var panel = new cc.Node("panel");
    panel.parent = root;
    panel.setContentSize(w, h);
    var g = panel.addComponent(cc.Graphics);
    g.fillColor = cc.color(24, 20, 34, 250);
    g.roundRect(-w / 2, -h / 2, w, h, 18);
    g.fill();
    g.lineWidth = 3;
    g.strokeColor = cc.color(255, 255, 255, 80);
    g.roundRect(-w / 2, -h / 2, w, h, 18);
    g.stroke();
    return root;
  },

  // _label/_button variants that land on an overlay instead of the menu root
  _labelOn: function (parent, str, size, color, x, y) {
    var l = this._label(str, size, color, x, y);
    l.node.parent = parent;
    return l;
  },

  _buttonOn: function (parent, str, x, y, w, h, color, hiColor, cb) {
    var n = this._button(str, x, y, w, h, color, hiColor, cb);
    n.parent = parent;
    return n;
  },

  // A login text field built on a real DOM <input> overlaid on the canvas. We do
  // NOT use cc.EditBox — its 2.4 web build reuses one shared <input> and blanks
  // fields on blur (the "username disappears" bug). A native input we own always
  // shows its own value (it can never vanish), masks passwords natively, and keeps
  // the menu's colour theme via the cc box drawn behind it.
  // Returns { node, getValue, focus, destroy }.
  _textField: function (parent, y, placeholder, isPassword, onReturn) {
    var self = this;
    var w = 380,
      h = 54,
      pad = 26;

    // themed frame: dark box + faint border (same colours as before)
    var n = new cc.Node("eb_" + placeholder);
    n.parent = parent;
    n.setPosition(0, y);
    n.setContentSize(w, h);
    var g = n.addComponent(cc.Graphics);
    g.fillColor = cc.color(12, 10, 20, 255);
    g.roundRect(-w / 2, -h / 2, w, h, 10);
    g.fill();
    g.lineWidth = 2;
    g.strokeColor = cc.color(255, 255, 255, 90);
    g.roundRect(-w / 2, -h / 2, w, h, 10);
    g.stroke();

    if (typeof document === "undefined") {
      // headless / non-web fallback: no DOM input available
      return {
        node: n,
        getValue: function () {
          return "";
        },
        focus: function () {},
        destroy: function () {},
      };
    }

    // placeholder colour (inject the rule once)
    if (!document.getElementById("loveexe-eb-style")) {
      var st = document.createElement("style");
      st.id = "loveexe-eb-style";
      st.textContent = ".loveexe-eb::placeholder{color:#9691ae;opacity:1;}";
      document.head.appendChild(st);
    }

    // the real <input>, styled to match the menu theme
    var input = document.createElement("input");
    input.className = "loveexe-eb";
    input.type = isPassword ? "password" : "text";
    input.maxLength = isPassword ? 32 : 16;
    input.placeholder = placeholder;
    input.setAttribute("autocomplete", isPassword ? "new-password" : "off");
    input.setAttribute("autocapitalize", "off");
    input.setAttribute("autocorrect", "off");
    input.spellcheck = false;
    var s = input.style;
    s.position = "fixed";
    s.margin = "0";
    s.border = "0";
    s.outline = "none";
    s.background = "transparent";
    s.color = "#fff5fa";
    s.caretColor = "#ff9ac8";
    s.fontFamily = 'VT323, "Courier New", monospace';
    s.letterSpacing = "1px";
    s.boxSizing = "border-box";
    s.zIndex = "99999";
    document.body.appendChild(input);
    // upgrade the typed font to the real 8-bit VT323 once its @font-face is ready
    PixelFont.domFamily(function (fam) {
      if (fam && input && input.style) {
        input.style.fontFamily = '"' + fam + '", VT323, "Courier New", monospace';
      }
    });
    if (onReturn) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.keyCode === 13) {
          e.preventDefault();
          onReturn();
        }
      });
    }

    var cleanedUp = false;
    var cleanup = function () {
      if (cleanedUp) return;
      cleanedUp = true;
      self.unschedule(reposition);
      try {
        window.removeEventListener("resize", reposition);
      } catch (e) {}
      if (input && input.parentNode) input.parentNode.removeChild(input);
    };

    // keep the DOM input glued exactly over the cc box (handles scale + resize),
    // and auto-clean when the overlay node is destroyed.
    var reposition = function () {
      if (!cc.isValid(n)) {
        cleanup();
        return;
      }
      var canvas = cc.game.canvas;
      if (!canvas) return;
      var r = canvas.getBoundingClientRect();
      var vis = cc.view.getVisibleSize();
      var sx = r.width / vis.width,
        sy = r.height / vis.height;
      var wp = n.convertToWorldSpaceAR(cc.v2(0, 0)); // design coords, bottom-left origin
      var cw = w * sx,
        ch = h * sy;
      var cx = r.left + wp.x * sx;
      var cy = r.top + (vis.height - wp.y) * sy; // flip Y for the DOM
      s.left = cx - cw / 2 + "px";
      s.top = cy - ch / 2 + "px";
      s.width = cw + "px";
      s.height = ch + "px";
      s.padding = "0 " + pad * sx + "px";
      s.fontSize = Math.round(26 * sy) + "px";
    };

    reposition();
    self.scheduleOnce(reposition, 0); // again once layout has settled
    self.schedule(reposition, 0.2); // stay aligned + auto-cleanup when the node dies
    window.addEventListener("resize", reposition);

    return {
      node: n,
      getValue: function () {
        return input.value || "";
      },
      focus: function () {
        try {
          input.focus();
        } catch (e) {}
      },
      destroy: cleanup,
    };
  },

  // ── helpers ───────────────────────────────────────────────
  _loadImage: function (name, onDone) {
    var res = cc.resources;
    if (!res) {
      onDone(null);
      return;
    }
    res.load(name, cc.SpriteFrame, function (err, sf) {
      if (!err && sf) {
        onDone(sf);
        return;
      }
      res.load(name, cc.Texture2D, function (e2, tex) {
        onDone(!e2 && tex ? new cc.SpriteFrame(tex) : null);
      });
    });
  },

  _label: function (str, size, color, x, y) {
    var node = new cc.Node("lbl");
    node.parent = this.node;
    node.setPosition(x, y);
    var l = node.addComponent(cc.Label);
    l.fontSize = size;
    l.lineHeight = size + 4;
    l.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
    l.string = str;
    node.color = color;
    PixelFont.apply(l);
    return l;
  },

  _button: function (str, x, y, w, h, color, hiColor, cb, fontSize) {
    var node = new cc.Node("btn");
    node.parent = this.node;
    node.setPosition(x, y);
    node.setContentSize(w, h);
    var g = node.addComponent(cc.Graphics);
    var draw = function (c) {
      g.clear();
      g.fillColor = c;
      g.roundRect(-w / 2, -h / 2, w, h, 14);
      g.fill();
      g.lineWidth = 3;
      g.strokeColor = cc.color(255, 255, 255, 70);
      g.roundRect(-w / 2, -h / 2, w, h, 14);
      g.stroke();
    };
    draw(color);
    var ln = new cc.Node("lbl");
    ln.parent = node;
    var l = ln.addComponent(cc.Label);
    l.fontSize = fontSize || 30;
    l.lineHeight = (fontSize || 30) + 4;
    l.string = str;
    ln.color = cc.color(255, 255, 255);
    PixelFont.apply(l);
    node.on(
      cc.Node.EventType.MOUSE_ENTER,
      function () {
        draw(hiColor);
      },
      this,
    );
    node.on(
      cc.Node.EventType.MOUSE_LEAVE,
      function () {
        draw(color);
      },
      this,
    );
    node.on(
      cc.Node.EventType.TOUCH_END,
      function () {
        if (typeof cb === "function") cb();
      },
      this,
    );
    return node;
  },

  // ── opening particle effect: cherry-blossom petals drifting down ─────
  _sakura: function (W, H) {
    var node = new cc.Node("Sakura");
    node.parent = this.node;
    node.setPosition(0, H / 2 + 24); // emit just above the top edge
    node.zIndex = 10;
    var ps = node.addComponent(cc.ParticleSystem);
    ps.custom = true; // configure by code, not a .plist
    ps.spriteFrame = this._petalSF();
    ps.srcBlendFactor = cc.macro.BlendFactor.SRC_ALPHA; // soft alpha blend
    ps.dstBlendFactor = cc.macro.BlendFactor.ONE_MINUS_SRC_ALPHA;
    ps.duration = cc.ParticleSystem.DURATION_INFINITY;
    ps.emitterMode = cc.ParticleSystem.EmitterMode.GRAVITY;
    ps.positionType = cc.ParticleSystem.PositionType.FREE;
    ps.totalParticles = 130; // more on screen since each falls longer
    ps.emissionRate = 12;
    ps.life = 10;
    ps.lifeVar = 3; // longer life so slow petals still reach the bottom
    ps.posVar = cc.v2(W / 2 + 40, 8); // spread across the whole width
    ps.angle = 270;
    ps.angleVar = 20; // fall downward
    ps.speed = 33;
    ps.speedVar = 13; // 40% slower descent
    ps.gravity = cc.v2(0, -12); // 40% less downward pull
    ps.tangentialAccel = 10;
    ps.tangentialAccelVar = 20; // gentle side-to-side sway
    ps.radialAccel = 0;
    ps.radialAccelVar = 0;
    ps.startSize = 18;
    ps.startSizeVar = 6;
    ps.endSize = 12;
    ps.endSizeVar = 4;
    ps.startSpin = 0;
    ps.startSpinVar = 180; // tumble as they fall
    ps.endSpin = 360;
    ps.endSpinVar = 200;
    ps.startColor = cc.color(255, 188, 214, 255);
    ps.startColorVar = cc.color(16, 24, 16, 0);
    ps.endColor = cc.color(255, 150, 192, 90);
    ps.endColorVar = cc.color(16, 16, 16, 40);
    return ps;
  },

  // reveal a label one character at a time (typewriter)
  _typewriter: function (label, fullStr, interval) {
    if (!label || !cc.isValid(label.node)) return;
    var i = 0,
      n = fullStr.length;
    label.string = "";
    this.schedule(
      function () {
        i++;
        if (cc.isValid(label.node)) label.string = fullStr.substr(0, i);
      },
      interval,
      n - 1,
    );
  },

  // a soft white petal texture, generated at runtime (tinted via particle colour)
  _petalSF: function () {
    var S = 24,
      data = new Uint8Array(S * S * 4);
    var cx = (S - 1) / 2,
      cy = (S - 1) / 2;
    for (var y = 0; y < S; y++) {
      for (var x = 0; x < S; x++) {
        var dx = (x - cx) / (S * 0.46); // wide ellipse → petal-ish
        var dy = (y - cy) / (S * 0.3);
        var d = dx * dx + dy * dy;
        var a = d < 1 ? Math.round(235 * Math.pow(1 - d, 0.85)) : 0;
        var i = (y * S + x) * 4;
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = a;
      }
    }
    var tex = new cc.Texture2D();
    tex.initWithData(data, cc.Texture2D.PixelFormat.RGBA8888, S, S);
    return new cc.SpriteFrame(tex);
  },

  // a 4×4 solid-white texture, reused for the black fade overlay
  _solidSF: function () {
    var S = 4,
      n = S * S * 4,
      data = new Uint8Array(n);
    for (var i = 0; i < n; i++) data[i] = 255;
    var tex = new cc.Texture2D();
    tex.initWithData(data, cc.Texture2D.PixelFormat.RGBA8888, S, S);
    return new cc.SpriteFrame(tex);
  },
});
