"use strict";

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

var StoryState = require("StoryState");
var PixelFont = require("PixelFont"); // VT323 8-bit font (matches the rest of the game)
var ParticleFX = require("ParticleFX"); // celebration confetti on the win screens
var Account = require("Account"); // global leaderboard + cloud-save lifecycle

// ── palette ───────────────────────────────────────────────
var COL_BLACK = cc.color(8, 6, 12, 255);
var COL_DIM = cc.color(0, 0, 0, 170);
var COL_PINK = cc.color(232, 90, 140);
var COL_PINK_HI = cc.color(255, 130, 175);
var COL_GREY = cc.color(95, 95, 110);
var COL_GREY_HI = cc.color(135, 135, 150);
var COL_GOLD = cc.color(255, 210, 120);
var COL_TEXT = cc.color(245, 240, 245);

var LB_KEY = "loveexe_leaderboard";

var EndingScreen = {
  // ── public entry points ───────────────────────────────
  // 3 hearts gone in the overworld (osu / typing / niupai failures).
  showGameOver: function () {
    StoryState.dialogueActive = true; // freeze the overworld underneath
    this._playBgm("bgm_tense", true); // somber game-over music
    Account.clearSave(); // the run is dead — nothing to CONTINUE
    var self = this;
    this._imageScreen({
      image: "game_over_screen",
      fallbackColor: cc.color(30, 10, 16),
      fallbackTitle: "GAME OVER",
      subtitle: "Your heart couldn't take it...",
      buttons: [
        {
          text: "Try Again",
          color: COL_PINK,
          hi: COL_PINK_HI,
          onClick: function () {
            self._restart();
          },
        },
        {
          text: "Main Menu",
          color: COL_GREY,
          hi: COL_GREY_HI,
          onClick: function () {
            self._exit();
          },
        },
      ],
    });
  },

  // Lost the final boss (boss love meter hit 0) -> EECS overload ending.
  showBossLose: function () {
    cc.audioEngine.stopMusic(); // stop the boss BGM so it doesn't bleed into the ending
    this._playBgm("bgm_tense", true); // tense "EECS overload" ending music
    StoryState.dialogueActive = true;
    var self = this;
    this._imageScreen({
      image: "ending_eecs_overload_2",
      fallbackColor: cc.color(10, 22, 12),
      fallbackTitle: "EECS OVERLOAD",
      subtitle: "Achievement unlocked: still single.",
      buttons: [
        // Keep your 3 cleared challenges — just walk back to Mei and retry the boss.
        {
          text: "Try Again",
          color: COL_PINK,
          hi: COL_PINK_HI,
          onClick: function () {
            self._toOverworld();
          },
        },
        {
          text: "Main Menu",
          color: COL_GREY,
          hi: COL_GREY_HI,
          onClick: function () {
            self._exit();
          },
        },
      ],
    });
  },

  // Beat the final boss -> black "who do you choose?" screen.
  showBossWin: function () {
    cc.audioEngine.stopMusic(); // stop the boss BGM so it doesn't bleed into the finale
    StoryState.dialogueActive = true;
    this._recorded = false; // let this playthrough's win be recorded once
    this._showChoice();
  },

  // Play an ending BGM by name from resources/audio (loops). `force` restarts
  // even if it's the same track; without it, re-entering a screen (e.g. back
  // from Leaderboard/Credits) keeps the music playing instead of restarting it.
  _playBgm: function (name, force) {
    if (!force && this._bgmName === name) return;
    this._bgmName = name;
    var self = this;
    cc.resources.load("audio/" + name, cc.AudioClip, function (err, clip) {
      if (err || !clip || self._bgmName !== name) return; // superseded / failed
      try {
        cc.audioEngine.stopMusic();
        cc.audioEngine.playMusic(clip, true);
      } catch (e) {}
    });
  },

  // Puppy "yips" sprinkled on a ~3s rhythm over the dog-ending music. Tied to
  // the current overlay node, so it stops automatically when the screen changes.
  _startBarkRhythm: function () {
    var node = this._overlay;
    if (!node || !cc.isValid(node)) return;
    cc.resources.load(
      "audio/sfx_puppy_bark",
      cc.AudioClip,
      function (err, clip) {
        if (err || !clip || !cc.isValid(node)) return;
        var yip = function () {
          if (!cc.isValid(node)) return;
          var id = cc.audioEngine.playEffect(clip, false);
          try {
            cc.audioEngine.setVolume(id, 0.55);
          } catch (e) {}
        };
        // bark 3 times, well spaced (the clip is ~6s), then stop — no endless barking
        yip();
        cc.tween(node).delay(9).call(yip).delay(9).call(yip).start();
      },
    );
  },

  // Big white "THANKS FOR PLAYING!" typed across the centre of the ending art,
  // finishing in ~8s. A dark drop-shadow copy keeps it readable over any artwork.
  _typeThanks: function (str) {
    var root = this._overlay;
    if (!root || !cc.isValid(root)) return;
    var W = cc.view.getVisibleSize().width;

    var mk = function (color, dx, dy, z) {
      var n = new cc.Node("thanks");
      n.parent = root;
      n.zIndex = z;
      n.setPosition(dx, 30 + dy);
      var l = n.addComponent(cc.Label);
      l.fontSize = 58;
      l.lineHeight = 70;
      l.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
      l.overflow = cc.Label.Overflow.RESIZE_HEIGHT;
      l.enableWrapText = true;
      n.width = W - 120;
      n.color = color;
      PixelFont.apply(l);
      return l;
    };
    var shadow = mk(cc.color(0, 0, 0), 4, -4, 249999);
    var main = mk(cc.color(255, 255, 255), 0, 0, 250000);

    var interval = 8 / Math.max(1, str.length);
    shadow.string = "";
    main.string = "";
    var t = cc.tween(main.node);
    for (var i = 1; i <= str.length; i++) {
      (function (n) {
        t = t.delay(interval).call(function () {
          var s = str.substr(0, n);
          if (cc.isValid(main.node)) main.string = s;
          if (cc.isValid(shadow.node)) shadow.string = s;
        });
      })(i);
    }
    t.start();
  },

  // ── the girl / dog choice (full-screen choice artwork) ──
  _showChoice: function () {
    var self = this;
    this._playBgm("joyfulness2", true); // upbeat track for the girl / dog choice screen
    var root = this._root(COL_BLACK);
    var vs = cc.view.getVisibleSize();
    var W = vs.width,
      H = vs.height;

    // The choice art (girl asking you out on the left, dog with the ultimate
    // puppy eyes on the right) carries its own situation text, so nothing is
    // drawn over it. 4:3 picture, contain-fit (canvas is Fit-Height).
    var AR = 1448 / 1086;
    var artW = Math.min(W, H * AR);
    var artNode = new cc.Node("art");
    artNode.parent = root;
    var spr = artNode.addComponent(cc.Sprite);
    spr.sizeMode = cc.Sprite.SizeMode.CUSTOM;
    spr.trim = false;
    artNode.setContentSize(artW, artW / AR);
    artNode.setPosition(0, 0);
    this._loadImage("ending_niupai_3", function (sf) {
      if (!cc.isValid(artNode)) return;
      if (sf) {
        spr.spriteFrame = sf;
        return;
      }
      // art missing → fall back to the old text-only choice screen
      if (!cc.isValid(root)) return;
      self._label(root, "YOU DID IT!", 56, COL_GOLD, 0, H / 2 - 130);
      self._label(
        root,
        "Your campus days are over. Who will you\nspend the rest of them with?",
        26,
        COL_TEXT,
        0,
        H / 2 - 215,
      );
      self._label(
        root,
        "Total score   " + StoryState.totalScore(),
        24,
        cc.color(180, 200, 255),
        0,
        60,
      );
    });

    // choice buttons sit on the empty wooden strip along the art's bottom
    // edge (the space left in the picture), so they never cover the scene
    this._button(
      root,
      "💛  Mei",
      -170,
      -H / 2 + 36,
      300,
      52,
      COL_PINK,
      COL_PINK_HI,
      function () {
        StoryState.endingRoute = "true_love";
        self._showFinale("true_love");
      },
    );
    this._button(
      root,
      "🐾  Niu Pai",
      170,
      -H / 2 + 36,
      300,
      52,
      cc.color(150, 110, 70),
      cc.color(195, 150, 100),
      function () {
        StoryState.endingRoute = "niupai";
        self._showFinale("niupai");
      },
    );

    ParticleFX.confetti(this._overlay, vs.width, vs.height); // 🎉 "YOU DID IT!" celebration
  },

  // ── the chosen finale: ending art + Leaderboard / Credits / Exit ──
  _showFinale: function (route) {
    var self = this;
    var image = route === "niupai" ? "ending_niupai_1" : "ending_true_love_1";
    var title = route === "niupai" ? "NIU PAI ENDING" : "TRUE LOVE ENDING";

    // record this winning run exactly once — never for a run that used Hero Mode
    if (!this._recorded) {
      this._recorded = true;
      if (!StoryState.heroMode && !StoryState.usedHero) {
        if (Account.isLoggedIn())
          Account.submitScore(route); // global board (combined total, best run kept)
        else this._addBoard(StoryState.totalScore(), route); // guest → this device only
      }
      Account.clearSave(); // the run is finished — nothing left to CONTINUE
    }

    this._imageScreen({
      image: image,
      fallbackColor:
        route === "niupai" ? cc.color(20, 16, 30) : cc.color(40, 16, 26),
      fallbackTitle: title,
      subtitle:
        StoryState.heroMode || StoryState.usedHero
          ? "HERO MODE — not ranked"
          : "Final score   " + StoryState.totalScore(),
      buttons: [
        {
          text: "Leaderboard",
          color: COL_PINK,
          hi: COL_PINK_HI,
          onClick: function () {
            self._showLeaderboard(function () {
              self._showFinale(route);
            });
          },
        },
        {
          text: "Credits",
          color: COL_GREY,
          hi: COL_GREY_HI,
          onClick: function () {
            self._showCredits(function () {
              self._showFinale(route);
            });
          },
        },
        {
          text: "Main Menu",
          color: COL_GREY,
          hi: COL_GREY_HI,
          onClick: function () {
            self._exit();
          },
        },
      ],
    });

    var vs = cc.view.getVisibleSize();
    if (route === "niupai") {
      ParticleFX.niupaiEnding(this._overlay, vs.width, vs.height); // 🦴 bones + 💗 hearts
      this._playBgm("bgm_niupai"); // gentle ukulele bed
      this._startBarkRhythm(); // 🐶 3 spaced puppy yips, then quiet
    } else {
      ParticleFX.sakura(this._overlay, vs.width, vs.height); // 🌸 cute sakura (happy ending)
      this._playBgm("youdiantian_cut"); // happy true-love ending track
    }

    // big white "THANKS FOR PLAYING!" typed across the centre (~8s)
    this._typeThanks(
      route === "niupai"
        ? "THANKS FOR PLAYING!  (EASTER EGG!)"
        : "THANKS FOR PLAYING!",
    );
  },

  // ── leaderboard screen (global top-10, Back returns to caller) ───────
  _showLeaderboard: function (backFn) {
    var self = this;
    var root = this._root(cc.color(14, 12, 22, 255));
    var vs = cc.view.getVisibleSize();
    var H = vs.height;

    this._label(root, "🏆  LEADERBOARD", 44, COL_GOLD, 0, H / 2 - 90);
    var loading = this._label(root, "Loading…", 24, COL_TEXT, 0, 20);

    var renderRows = function (rows, isGlobal) {
      if (!cc.isValid(root) || root !== self._overlay) return; // screen already changed
      if (cc.isValid(loading.node)) loading.node.destroy();
      if (!rows.length) {
        self._label(root, "No scores yet — be the first!", 26, COL_TEXT, 0, 20);
      } else {
        var top = H / 2 - 175;
        for (var i = 0; i < rows.length && i < 8; i++) {
          var e = rows[i];
          var tag = e.route === "niupai" ? "🐾" : "💛";
          var row = i + 1 + ".  " + e.name + "   " + e.total + "   " + tag;
          var col = i === 0 ? COL_GOLD : COL_TEXT;
          if (Account.user && String(e.name).toLowerCase() === Account.user)
            col = cc.color(140, 255, 170);
          self._label(root, row, 26, col, 0, top - i * 44);
        }
      }
      if (!isGlobal)
        self._label(
          root,
          "(offline — scores on this device only)",
          16,
          COL_GREY_HI,
          0,
          -H / 2 + 130,
        );
    };

    // global board: every player's best COMBINED total (all games summed).
    // If the server is unreachable, fall back to this device's local list.
    Account.fetchLeaderboard(function (err, rows) {
      if (!err) {
        renderRows(rows, true);
        return;
      }
      var local = self._loadBoard().map(function (e) {
        return { name: "YOU", total: e.score, route: e.route };
      });
      renderRows(local, false);
    });

    this._button(
      root,
      "◀ Back",
      0,
      -H / 2 + 70,
      220,
      76,
      COL_GREY,
      COL_GREY_HI,
      backFn,
    );
  },

  // ── cinema-style end credits: content scrolls up over a black screen ──
  _showCredits: function (backFn) {
    var self = this;
    var root = this._root(cc.color(6, 5, 10, 255)); // cinema black
    if (!root) return;
    var vs = cc.view.getVisibleSize();
    var H = vs.height;

    // a tall container we slide upward; everything is laid out top-to-bottom
    var roll = new cc.Node("roll");
    roll.parent = root;

    var y = 0; // cursor: each item is stacked going downward (negative y)
    var add = function (str, size, color, gapAfter) {
      var lines = (String(str).match(/\n/g) || []).length + 1;
      var hgt = lines * (size + 8); // matches _label lineHeight
      self._label(roll, str, size, color, 0, y - hgt / 2);
      y -= hgt + (gapAfter == null ? 14 : gapAfter);
    };
    var space = function (px) {
      y -= px;
    };

    // ── header ──
    add("LOVE.EXE", 64, COL_PINK, 6);
    add("— A campus love story —", 24, COL_TEXT, 54);
    add("★   THE  TEAM   ★", 34, COL_GOLD, 44);

    // ── team ──
    var member = function (name, id, roles) {
      add(name, 36, COL_PINK_HI, 2);
      add(id, 20, COL_GREY_HI, 12);
      for (var i = 0; i < roles.length; i++) add(roles[i], 22, COL_TEXT, 4);
      space(50);
    };
    member("張淑芬", "109006229", [
      "Pixel art · Tile maps",
      "Opening & ending scenes · In-game graphics",
      "QA & bug-fixing",
      "Demo-day rep · Oral presentation · Slides",
    ]);
    member("許夏綠", "109006258", [
      "Pixel art · Tile maps",
      "Opening & ending scenes · In-game graphics",
      "QA & bug-fixing",
      "Demo-day rep · Oral presentation · Slides",
    ]);
    member("Sirawee  李意如", "110006226", [
      "5-game boss rush · Typing minigame",
      "Scene animations · Overall game feel",
      "Music / SFX & aesthetic curation",
      "Story & narrative design · Coordination",
      "QA & bug-fixing · Demo-day rep · Slides",
    ]);
    member("蘇昱銓", "111062119", [
      "XiaoChiBu (Niu Pai) minigame",
      "XiaoChiBu pixel art & sound effects",
      "QA & bug-fixing",
      "Demo-day presentation lead · Oral presentation",
      "Google-form · Chinese→English translation",
    ]);
    member("Anan  盧阿男", "113006230", [
      "Overall game design · Main map · Map collision",
      "Git pull-request management",
      "Osu (music) minigame · Firebase admin",
    ]);

    // ── github + course ──
    space(16);
    add("GitHub", 26, COL_GOLD, 4);
    add("github.com/sirawee-lee/LOVEexe_ver2", 20, COL_TEXT, 54);
    add("軟體設計與實驗", 26, COL_TEXT, 2);
    add("Software Studio --- 11420CS241002", 22, COL_TEXT, 2);
    add("National Tsing Hua University", 22, COL_TEXT, 40);

    // ── logos side by side ──
    var logoH = 120;
    var logoCY = y - logoH / 2;
    this._creditLogo(roll, "nthu_logo", -150, logoCY, logoH);
    this._creditLogo(roll, "cocos_logo", 150, logoCY, logoH);
    y -= logoH + 60;

    add("THANKS FOR PLAYING ♥", 32, COL_PINK_HI, 0);

    var totalH = -y; // full height of the content

    // roll it: start just below the screen, scroll up until it clears the top, loop
    var startY = -H / 2 - 80;
    var endY = H / 2 + totalH + 60;
    var dur = (endY - startY) / 95; // ~95 px/sec reading pace
    roll.setPosition(0, startY);
    cc.tween(roll)
      .repeatForever(
        cc
          .tween()
          .set({ position: cc.v2(0, startY) })
          .to(dur, { position: cc.v2(0, endY) }),
      )
      .start();

    // Back stays pinned (doesn't scroll) so you can leave any time
    this._button(
      root,
      "◀ Back",
      0,
      -H / 2 + 56,
      200,
      64,
      COL_GREY,
      COL_GREY_HI,
      backFn,
    );
  },

  // a logo sprite for the credit roll; width derives from the art's aspect ratio
  _creditLogo: function (parent, name, x, y, targetH) {
    var node = new cc.Node("logo_" + name);
    node.parent = parent;
    node.setPosition(x, y);
    var spr = node.addComponent(cc.Sprite);
    spr.sizeMode = cc.Sprite.SizeMode.CUSTOM;
    spr.trim = false;
    node.setContentSize(targetH, targetH); // square placeholder until it loads
    this._loadImage(name, function (sf) {
      if (!cc.isValid(node) || !sf) return;
      spr.spriteFrame = sf;
      var os = sf.getOriginalSize ? sf.getOriginalSize() : sf.getRect();
      var w = os && os.height > 0 ? targetH * (os.width / os.height) : targetH;
      node.setContentSize(w, targetH);
    });
    return node;
  },

  // ── generic image + buttons screen ────────────────────
  // opt = { image, fallbackColor, fallbackTitle, subtitle, buttons:[{text,color,hi,onClick}] }
  _imageScreen: function (opt) {
    var self = this;
    var root = this._root(opt.fallbackColor || COL_BLACK);
    if (!root) return;
    var vs = cc.view.getVisibleSize();
    var W = vs.width,
      H = vs.height;

    // Full-screen art node, created NOW so its sibling order is correct:
    // above the opaque background (added by _root) but below the bar/buttons
    // added just after. The texture is filled in once it loads async.
    var imgNode = new cc.Node("art");
    imgNode.parent = root;
    var spr = imgNode.addComponent(cc.Sprite);
    spr.sizeMode = cc.Sprite.SizeMode.CUSTOM;
    spr.trim = false;
    imgNode.setContentSize(W, H); // stretch to fill the visible area
    imgNode.setPosition(0, 0);
    this._loadImage(opt.image, function (sf) {
      if (!cc.isValid(imgNode)) return;
      if (sf) {
        spr.spriteFrame = sf;
      } else if (cc.isValid(root)) {
        // no art available -> show the fallback title in the middle
        self._label(root, opt.fallbackTitle || "", 60, COL_TEXT, 0, 40);
      }
    });

    // a soft bar behind the buttons so text stays readable over any art
    var bar = new cc.Node("bar");
    bar.parent = root;
    bar.setPosition(0, -H / 2 + 64);
    var bg = bar.addComponent(cc.Graphics);
    bg.fillColor = COL_DIM;
    bg.rect(-W / 2, -64, W, 128);
    bg.fill();

    if (opt.subtitle)
      this._label(root, opt.subtitle, 24, COL_TEXT, 0, -H / 2 + 118);

    // lay the buttons out in a centred row
    var btns = opt.buttons || [];
    var bw = 230,
      gap = 28;
    var totalW = btns.length * bw + (btns.length - 1) * gap;
    var startX = -totalW / 2 + bw / 2;
    for (var i = 0; i < btns.length; i++) {
      var b = btns[i];
      this._button(
        root,
        b.text,
        startX + i * (bw + gap),
        -H / 2 + 64,
        bw,
        76,
        b.color,
        b.hi,
        b.onClick,
      );
    }
  },

  // ── overlay root (clears any previous overlay) ────────
  _root: function (bgColor) {
    var canvas = this._getCanvas();
    if (!canvas) return null;
    this._clear();

    var root = new cc.Node("__EndingOverlay");
    root.parent = canvas;
    root.zIndex = 100000;
    this._overlay = root;

    var vs = cc.view.getVisibleSize();
    var W = vs.width,
      H = vs.height;

    // opaque background that also swallows touches on the scene underneath
    var bgN = new cc.Node("bg");
    bgN.parent = root;
    bgN.setContentSize(W, H);
    var g = bgN.addComponent(cc.Graphics);
    g.fillColor = bgColor || COL_BLACK;
    g.rect(-W / 2, -H / 2, W, H);
    g.fill();
    bgN.on(cc.Node.EventType.TOUCH_START, function () {}, this); // eat taps

    return root;
  },

  _clear: function () {
    if (this._overlay && cc.isValid(this._overlay)) this._overlay.destroy();
    this._overlay = null;
  },

  _getCanvas: function () {
    var scene = cc.director.getScene();
    if (!scene) return null;
    var canvas = scene.getChildByName("Canvas");
    if (!canvas) {
      var c = cc.Canvas.instance;
      canvas = c ? c.node : null;
    }
    return canvas;
  },

  // ── tiny UI builders ──────────────────────────────────
  _label: function (parent, str, size, color, x, y) {
    var node = new cc.Node("lbl");
    node.parent = parent;
    node.setPosition(x, y);
    var l = node.addComponent(cc.Label);
    l.fontSize = size;
    l.lineHeight = size + 8;
    l.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
    l.verticalAlign = cc.Label.VerticalAlign.CENTER;
    l.string = str;
    node.color = color;
    PixelFont.apply(l); // emoji still fall back to the system font on web canvas
    return l;
  },

  _button: function (parent, str, x, y, w, h, bgColor, hiColor, cb) {
    var node = new cc.Node("btn");
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
    node.on(
      cc.Node.EventType.MOUSE_ENTER,
      function () {
        draw(hiColor || bgColor);
        node.scale = 1.04;
      },
      this,
    );
    node.on(
      cc.Node.EventType.MOUSE_LEAVE,
      function () {
        draw(bgColor);
        node.scale = 1.0;
      },
      this,
    );
    node.on(
      cc.Node.EventType.TOUCH_END,
      function () {
        node.scale = 1.0;
        if (typeof cb === "function") cb();
      },
      this,
    );
    return node;
  },

  // ── ending art loader (SpriteFrame, falling back to Texture2D) ──
  _loadImage: function (name, onDone) {
    var res = cc.resources;
    if (!res) {
      onDone(null);
      return;
    }
    res.load("endings/" + name, cc.SpriteFrame, function (err, sf) {
      if (!err && sf) {
        onDone(sf);
        return;
      }
      res.load("endings/" + name, cc.Texture2D, function (err2, tex) {
        if (!err2 && tex) {
          onDone(new cc.SpriteFrame(tex));
          return;
        }
        cc.warn(
          "[EndingScreen] could not load endings/" +
            name +
            " — showing fallback",
        );
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
    } catch (e) {
      return [];
    }
  },

  _addBoard: function (score, route) {
    var list = this._loadBoard();
    list.push({ score: score || 0, route: route, date: Date.now() });
    list.sort(function (a, b) {
      return b.score - a.score;
    });
    list = list.slice(0, 10);
    try {
      cc.sys.localStorage.setItem(LB_KEY, JSON.stringify(list));
    } catch (e) {}
    return list;
  },

  // ── navigation actions ────────────────────────────────
  _restart: function () {
    this._clear();
    StoryState.reset(); // fresh hearts, scores, progress
    cc.director.loadScene("MainScene");
  },

  _toOverworld: function () {
    // return to the campus WITHOUT wiping progress (cleared challenges remain,
    // hearts remain) so the player can walk back to Mei and retry the boss.
    this._clear();
    StoryState.dialogueActive = false;
    cc.director.loadScene("MainScene");
  },

  // "Main Menu" — end the run and return to the title screen (first page)
  _exit: function () {
    this._clear();
    StoryState.reset(); // run is over → clean slate for the next playthrough
    StoryState.dialogueActive = false;
    cc.director.loadScene("MainMenu");
  },
};

module.exports = EndingScreen;
