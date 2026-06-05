'use strict';

// NPC — a story character standing on the overworld map. It renders an idle
// character (reusing PlayerAnimator's idle frame) and defines a rectangular
// "talk zone". MainGame detects the player entering the zone and runs the
// matching story flow (auto on first approach, press E to talk again).
//
// Editor setup:
//   1. Create an empty node "NPCs" under World (sibling of Colliders), at (0,0)
//   2. Add a child node per character, e.g. "NPC_Father"
//   3. Add Component -> Custom Component -> NPC
//   4. Set Npc Id (father | professor | niupai | mei), assign the Spritesheet
//      (father_spritesheet / professor_spritesheet / girl_spritesheet / niupai_spritesheet),
//      and pick Facing
//   5. Position it by the building entrance; tune Trigger W/H for the talk range
//   6. Drag the "NPCs" node into MainGame's "Npcs Node" slot

var FACING = cc.Enum({ down: 0, up: 1, left: 2, right: 3 });

cc.Class({
    extends: cc.Component,

    properties: {
        npcId:       { default: '',  tooltip: 'father | professor | niupai | mei (lowercase!)' },
        spritesheet: { default: null, type: cc.Texture2D },
        frameW:      { default: 32,  type: cc.Integer },
        frameH:      { default: 32,  type: cc.Integer },
        facing:      { default: FACING.down, type: FACING },
        triggerW:    { default: 120, type: cc.Integer, tooltip: 'Talk-zone width'  },
        triggerH:    { default: 120, type: cc.Integer, tooltip: 'Talk-zone height' },
        showZone:    { default: true, tooltip: 'Cyan debug overlay for the talk zone' },
    },

    onLoad: function () {
        var self = this;

        // Idle character — reuse PlayerAnimator, frozen on the idle frame
        self.node.addComponent(cc.Sprite);
        var anim = self.node.addComponent('PlayerAnimator');
        anim.spritesheet = self.spritesheet;
        anim.frameWidth  = self.frameW;
        anim.frameHeight = self.frameH;
        if (self.spritesheet) anim._buildFrames();
        anim.setDirection(['down', 'up', 'left', 'right'][self.facing]);
        anim.setMoving(false);
        self._anim = anim;

        if (self.showZone) self._drawZone();
    },

    _drawZone: function () {
        var zn = new cc.Node('_zone');
        var g  = zn.addComponent(cc.Graphics);
        var hw = this.triggerW / 2, hh = this.triggerH / 2;
        g.fillColor   = cc.color(120, 220, 255, 30);
        g.rect(-hw, -hh, this.triggerW, this.triggerH);
        g.fill();
        g.strokeColor = cc.color(120, 220, 255, 150);
        g.lineWidth   = 2;
        g.rect(-hw, -hh, this.triggerW, this.triggerH);
        g.stroke();
        this.node.addChild(zn, -1);
    },
});
