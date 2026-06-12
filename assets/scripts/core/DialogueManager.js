'use strict';

// DialogueManager — the story dialogue overlay. Put this on an empty node
// "DialogueManager" under Canvas (centered, 0,0). It builds its own UI
// programmatically (frame + speaker + typewriter text + choice buttons).
//
// Public API (call from NPCs / GameController / endings):
//     var dm = canvas.getComponentInChildren('DialogueManager');
//     dm.play('intro_girl', function () { ...runs when the dialogue ends... });
//
// Quick test: set "Auto Play Id" = intro_girl in the Inspector → it plays on start.

var StoryState   = require('StoryState');
var DialogueData = require('DialogueData');
var PixelFont    = require('PixelFont');   // VT323 8-bit font for all dialogue text
var ParticleFX   = require('ParticleFX');  // floating hearts when a choice raises affinity

var ST = { IDLE: 0, TYPING: 1, WAIT_ADVANCE: 2, WAIT_CHOICE: 3 };

cc.Class({
    extends: cc.Component,

    properties: {
        frameSprite:   { default: null, type: cc.SpriteFrame },  // dialogue_frame.png
        btnPinkNormal: { default: null, type: cc.SpriteFrame },  // button_choice_pink1
        btnPinkHover:  { default: null, type: cc.SpriteFrame },  // btn_choice_pink2
        btnGreyNormal: { default: null, type: cc.SpriteFrame },  // button_choice_grey1
        btnGreyHover:  { default: null, type: cc.SpriteFrame },  // button_choice_grey2
        typeSpeed:     { default: 45, type: cc.Integer },         // characters / second
        sfxBlip:       { default: null, type: cc.AudioClip },
        sfxChoice:     { default: null, type: cc.AudioClip },
        autoPlayId:    { default: '', tooltip: 'For testing: dialogue id to auto-play on start. Leave blank in real builds.' },
    },

    // ── Lifecycle ─────────────────────────────────────────────
    onLoad: function () {
        var self = this;
        self.node.zIndex = 1000;            // draw above overworld + minigames

        self._st       = ST.IDLE;
        self._onDone   = null;
        self._lines    = null;
        self._lineIdx  = 0;
        self._curId    = '';
        self._fullText = '';
        self._revealed = 0;
        self._choiceBtns = [];

        var vis = cc.view.getVisibleSize();
        self._W = vis.width;
        self._H = vis.height;

        self._buildUI();
        self._layer.active = false;

        self._advanceKeyHeld = false;
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, self._onKeyDown, self);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP,   self._onKeyUp,   self);

        if (self.autoPlayId) {
            self.scheduleOnce(function () { self.play(self.autoPlayId); }, 0.4);
        }
    },

    onDestroy: function () {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP,   this._onKeyUp,   this);
    },

    // ── Build overlay UI ──────────────────────────────────────
    _buildUI: function () {
        var self = this;
        var W = self._W, H = self._H;

        var layer = new cc.Node('DialogueLayer');
        self.node.addChild(layer, 100);
        self._layer = layer;

        // Full-screen click catcher to advance text (disabled while choices show)
        var catcher = new cc.Node('Catcher');
        catcher.setContentSize(W, H);
        var bc = catcher.addComponent(cc.Button);
        bc.transition = cc.Button.Transition.NONE;
        catcher.on('click', self._onAdvanceClick, self);
        layer.addChild(catcher, 0);
        self._catcher = catcher;

        // Frame panel (bottom)
        var frameH = 152;
        var frameW = Math.min(W - 40, 880);
        var frame  = new cc.Node('Frame');
        var fspr   = frame.addComponent(cc.Sprite);
        fspr.spriteFrame = self.frameSprite;
        fspr.type        = cc.Sprite.Type.SLICED;
        fspr.sizeMode    = cc.Sprite.SizeMode.CUSTOM;
        frame.setContentSize(frameW, frameH);
        frame.setPosition(0, -H / 2 + frameH / 2 + 16);
        layer.addChild(frame, 1);
        self._frame  = frame;
        self._frameW = frameW;
        self._frameH = frameH;

        // Speaker name (top-left)
        var nameNode = new cc.Node('Speaker');
        var nameLbl  = nameNode.addComponent(cc.Label);
        nameLbl.fontSize   = 26;
        nameLbl.lineHeight = 28;
        PixelFont.apply(nameLbl);
        nameNode.color     = cc.color(190, 55, 95);   // deep rose — reads on the light frame
        nameNode.anchorX   = 0;
        nameNode.setPosition(-frameW / 2 + 34, frameH / 2 - 24);
        frame.addChild(nameNode, 1);
        self._nameLbl = nameLbl;

        // Body text (wraps within the frame)
        var bodyNode = new cc.Node('Body');
        var bodyLbl  = bodyNode.addComponent(cc.Label);
        bodyLbl.fontSize      = 22;
        bodyLbl.lineHeight    = 30;
        bodyLbl.overflow      = cc.Label.Overflow.RESIZE_HEIGHT;
        bodyLbl.enableWrapText = true;
        PixelFont.apply(bodyLbl);
        bodyNode.color   = cc.color(62, 48, 46);      // dark warm brown for readability
        bodyNode.anchorX = 0;
        bodyNode.anchorY = 1;
        bodyNode.setContentSize(frameW - 68, 0);
        bodyNode.setPosition(-frameW / 2 + 34, frameH / 2 - 52);
        frame.addChild(bodyNode, 1);
        self._bodyLbl = bodyLbl;

        // Advance indicator ▼
        var arrow = new cc.Node('Arrow');
        var aLbl  = arrow.addComponent(cc.Label);
        aLbl.string   = '▼ space';
        aLbl.fontSize = 16;
        PixelFont.apply(aLbl);
        arrow.color   = cc.color(150, 90, 110);
        arrow.opacity = 0;
        arrow.setPosition(frameW / 2 - 56, -frameH / 2 + 16);
        frame.addChild(arrow, 1);
        self._arrow = arrow;

        // Choice button container (sits above the frame)
        var choiceBox = new cc.Node('Choices');
        choiceBox.setPosition(0, -H / 2 + frameH + 86);
        layer.addChild(choiceBox, 2);
        self._choiceBox = choiceBox;
    },

    // ── Public API ────────────────────────────────────────────
    play: function (dialogueId, onDone) {
        if (this._st !== ST.IDLE) {
            // Already mid-dialogue — ignore so the active dialogue's onDone is
            // not clobbered. Callers should retry once isPlaying() is false.
            cc.warn('[Dialogue] play() ignored — already playing: ' + dialogueId);
            return;
        }
        if (!DialogueData.dialogues[dialogueId]) {
            cc.warn('[Dialogue] unknown id: ' + dialogueId);
            if (onDone) onDone();
            return;
        }
        this._onDone = onDone || null;
        this._layer.active = true;
        StoryState.dialogueActive = true;     // freeze overworld input
        this._startDialogue(dialogueId);
    },

    isPlaying: function () {
        return this._st !== ST.IDLE;
    },

    // ── Flow ──────────────────────────────────────────────────
    _startDialogue: function (id) {
        var d = DialogueData.dialogues[id];
        if (!d || !d.lines || !d.lines.length) { this._endDialogue(); return; }
        StoryState.seen[id] = true;
        this._curId   = id;
        this._lines   = d.lines;
        this._lineIdx = 0;
        this._showLine();
    },

    _showLine: function () {
        var line = this._lines[this._lineIdx];
        this._clearChoices();
        this._arrow.opacity = 0;
        this._nameLbl.string = line.speaker || '';
        this._fullText = line.text || '';
        this._revealed = 0;
        this._bodyLbl.string = '';
        this._catcher.active = true;
        this._st = ST.TYPING;
    },

    update: function (dt) {
        if (this._st !== ST.TYPING) return;
        this._revealed += this.typeSpeed * dt;
        var n = Math.floor(this._revealed);
        if (n >= this._fullText.length) {
            this._bodyLbl.string = this._fullText;
            this._finishTyping();
        } else {
            this._bodyLbl.string = this._fullText.substring(0, n);
        }
    },

    _finishTyping: function () {
        var line = this._lines[this._lineIdx];
        if (line.choices && line.choices.length) {
            this._showChoices(line.choices);
            this._catcher.active = false;     // force a choice, no click-through
            this._st = ST.WAIT_CHOICE;
        } else {
            this._arrow.opacity = 255;
            this._st = ST.WAIT_ADVANCE;
        }
    },

    // ── Input ─────────────────────────────────────────────────
    _onKeyDown: function (e) {
        if (this._st === ST.IDLE) return;
        var K = cc.macro.KEY;
        // ── choice navigation: Up/PageUp = prev, Down/PageDown = next, Enter = pick ──
        if (this._st === ST.WAIT_CHOICE) {
            if (e.keyCode === K.up   || e.keyCode === K.pageup   || e.keyCode === K.w) { this._moveChoice(-1); return; }
            if (e.keyCode === K.down || e.keyCode === K.pagedown || e.keyCode === K.s) { this._moveChoice(1);  return; }
            if (e.keyCode === K.enter || e.keyCode === K.space) {
                if (this._advanceKeyHeld) return;   // ignore auto-repeat
                this._advanceKeyHeld = true;
                this._confirmChoice();
            }
            return;   // swallow other keys while choosing
        }
        // ── normal advance (TYPING / WAIT_ADVANCE) ──
        if (e.keyCode !== K.space && e.keyCode !== K.enter) return;
        if (this._advanceKeyHeld) return;       // ignore OS key auto-repeat
        this._advanceKeyHeld = true;
        this._advance();
    },

    _onKeyUp: function (e) {
        if (e.keyCode === cc.macro.KEY.space || e.keyCode === cc.macro.KEY.enter) {
            this._advanceKeyHeld = false;
        }
    },

    _onAdvanceClick: function () {
        if (this._st === ST.IDLE) return;
        this._advance();
    },

    _advance: function () {
        if (this._st === ST.TYPING) {
            this._revealed = this._fullText.length;
            this._bodyLbl.string = this._fullText;
            this._finishTyping();
        } else if (this._st === ST.WAIT_ADVANCE) {
            if (this.sfxBlip) cc.audioEngine.play(this.sfxBlip, false, 0.5);
            this._lineIdx++;
            if (this._lineIdx < this._lines.length) this._showLine();
            else this._endDialogue();
        }
    },

    // ── Choices ───────────────────────────────────────────────
    _showChoices: function (choices) {
        var self = this;
        self._clearChoices();
        var BW = 380, BH = 48, GAP = 12;
        var totalH = choices.length * BH + (choices.length - 1) * GAP;
        var startY = totalH / 2 - BH / 2;

        choices.forEach(function (choice, i) {
            var pink = (choice.tone === 'pink') ||
                       (choice.tone == null && (choice.affinityDelta || 0) >= 0);
            var normalSF = pink ? self.btnPinkNormal : self.btnGreyNormal;
            var hoverSF  = pink ? self.btnPinkHover  : self.btnGreyHover;

            var bn  = new cc.Node('choice_' + i);
            var spr = bn.addComponent(cc.Sprite);
            spr.spriteFrame = normalSF;
            spr.type        = cc.Sprite.Type.SLICED;
            spr.sizeMode    = cc.Sprite.SizeMode.CUSTOM;
            bn.setContentSize(BW, BH);
            bn.setPosition(0, startY - i * (BH + GAP));

            var btn = bn.addComponent(cc.Button);
            btn.transition     = cc.Button.Transition.SPRITE;
            btn.normalSprite   = normalSF;
            btn.hoverSprite    = hoverSF;
            btn.pressedSprite  = hoverSF;
            btn.disabledSprite = normalSF;
            btn.target         = bn;

            var tn = new cc.Node('txt');
            var tl = tn.addComponent(cc.Label);
            tl.string     = choice.text;
            tl.fontSize   = 20;
            tl.lineHeight = 23;
            tl.overflow   = cc.Label.Overflow.SHRINK;
            tl.enableWrapText = true;
            PixelFont.apply(tl);
            tn.setContentSize(BW - 40, BH - 12);
            tn.color = pink ? cc.color(95, 30, 55) : cc.color(45, 45, 50);
            bn.addChild(tn, 1);

            bn.on('click', function () { self._onChoice(choice, i); }, self);
            // stash highlight data + sync the keyboard highlight on mouse hover
            bn._dmNormalSF = normalSF;
            bn._dmHoverSF  = hoverSF;
            bn._dmBtn      = btn;
            bn._dmChoice   = choice;
            bn.on(cc.Node.EventType.MOUSE_ENTER, function () { self._highlightChoice(i); }, self);
            self._choiceBox.addChild(bn, 1);
            self._choiceBtns.push(bn);
        });
        // start with the first choice highlighted (keyboard + visual)
        self._highlightChoice(0);
    },

    // Visually emphasise choice i; persists regardless of the Button's hover state.
    _highlightChoice: function (i) {
        var n = this._choiceBtns.length;
        if (n === 0) return;
        if (i < 0) i = 0; else if (i >= n) i = n - 1;
        this._choiceIndex = i;
        for (var k = 0; k < n; k++) {
            var bn = this._choiceBtns[k];
            if (!bn || !bn.isValid) continue;
            var on = (k === i);
            var sf = on ? bn._dmHoverSF : bn._dmNormalSF;
            var spr = bn.getComponent(cc.Sprite);
            if (spr) spr.spriteFrame = sf;
            if (bn._dmBtn) bn._dmBtn.normalSprite = sf;   // keep the Button's resting frame in sync
            bn.setScale(on ? 1.06 : 1.0);
            bn.opacity = on ? 255 : 205;
        }
    },

    // Move the highlight (wraps around); called by Up/Down / PageUp/PageDown.
    _moveChoice: function (delta) {
        var n = this._choiceBtns.length;
        if (n === 0) return;
        var i = (this._choiceIndex < 0 ? 0 : this._choiceIndex) + delta;
        i = ((i % n) + n) % n;
        if (this.sfxBlip) cc.audioEngine.play(this.sfxBlip, false, 0.4);
        this._highlightChoice(i);
    },

    // Confirm the highlighted choice — same path as a mouse click.
    _confirmChoice: function () {
        if (this._st !== ST.WAIT_CHOICE) return;
        var bn = this._choiceBtns[this._choiceIndex];
        if (!bn || !bn.isValid || !bn._dmChoice) return;
        this._onChoice(bn._dmChoice, this._choiceIndex);
    },

    _clearChoices: function () {
        this._choiceBtns.forEach(function (b) { if (b && b.isValid) b.destroy(); });
        this._choiceBtns = [];
        this._choiceIndex = -1;
    },

    _onChoice: function (choice, idx) {
        if (this.sfxChoice) cc.audioEngine.play(this.sfxChoice, false, 0.7);
        StoryState.addAffinity(choice.affinityDelta || 0);
        if ((choice.affinityDelta || 0) > 0) {
            ParticleFX.hearts(this.node, 0, 40);   // 💗 affinity went up
        }
        StoryState.choices[this._curId] = (choice.index != null) ? choice.index : idx;
        this._clearChoices();
        this._catcher.active = true;

        if (choice.jumpTo) {
            this._startDialogue(choice.jumpTo);
        } else {
            this._lineIdx++;
            if (this._lineIdx < this._lines.length) this._showLine();
            else this._endDialogue();
        }
    },

    _endDialogue: function () {
        this._st = ST.IDLE;
        StoryState.dialogueActive = false;
        this._clearChoices();
        this._layer.active = false;
        var cb = this._onDone;
        this._onDone = null;
        if (cb) cb();
    },
});
