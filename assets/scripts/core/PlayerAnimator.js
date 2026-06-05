'use strict';

// PlayerAnimator — cuts a 3-column × 4-row spritesheet into walk frames.
//
// Spritesheet layout (set by user):
//   Row 0 = facing DOWN  (toward player)
//   Row 1 = facing LEFT
//   Row 2 = facing RIGHT
//   Row 3 = facing UP    (away from player)
//   Cols 0,1,2 = walk frame 1, 2, 3

cc.Class({
    extends: cc.Component,

    properties: {
        spritesheet: { default: null,  type: cc.Texture2D },
        frameWidth:  { default: 48,    type: cc.Integer   },  // px per frame
        frameHeight: { default: 64,    type: cc.Integer   },
        fps:         { default: 8,     type: cc.Integer   },  // walk cycle speed
    },

    onLoad: function () {
        this._frames     = null;
        this._dir        = 'down';
        this._moving     = false;
        this._frameIdx   = 0;   // idle uses first frame (column 0)
        this._frameTimer = 0;

        if (this.spritesheet) this._buildFrames();
    },

    // Call this if the texture is set after onLoad
    _buildFrames: function () {
        // Defensive: tolerate being called before onLoad ran (e.g. on a node
        // that was just attached) so _apply() never reads undefined indices.
        if (this._dir == null)      this._dir = 'down';
        if (this._frameIdx == null) this._frameIdx = 0;
        if (this._moving == null)   this._moving = false;

        var tex = this.spritesheet;
        var fw  = this.frameWidth;
        var fh  = this.frameHeight;

        var rowNames = ['down', 'left', 'right', 'up'];
        this._frames = {};

        for (var row = 0; row < 4; row++) {
            var arr = [];
            for (var col = 0; col < 3; col++) {
                var sf = new cc.SpriteFrame(tex,
                    cc.rect(col * fw, row * fh, fw, fh));
                arr.push(sf);
            }
            this._frames[rowNames[row]] = arr;
        }

        // Resize node to single frame
        this.node.setContentSize(fw, fh);
        this._apply();
    },

    // ── Public API (called by MainGame) ───────────────────────
    setDirection: function (dir) {
        // dir: 'up' | 'down' | 'left' | 'right'
        if (this._dir !== dir) {
            this._dir = dir;
            this._apply();
        }
    },

    setMoving: function (moving) {
        if (this._moving !== moving) {
            this._moving = moving;
            if (!moving) {
                this._frameIdx   = 0;   // reset to idle (column 0)
                this._frameTimer = 0;
                this._apply();
            }
        }
    },

    // ── CC update ─────────────────────────────────────────────
    update: function (dt) {
        if (!this._frames || !this._moving) return;

        this._frameTimer += dt;
        var frameTime = 1 / this.fps;
        if (this._frameTimer >= frameTime) {
            this._frameTimer -= frameTime;
            this._frameIdx    = (this._frameIdx + 1) % 3;
            this._apply();
        }
    },

    _apply: function () {
        if (!this._frames) return;
        var spr = this.node.getComponent(cc.Sprite);
        if (spr) spr.spriteFrame = this._frames[this._dir][this._frameIdx];
    },
});
