'use strict';

// InteractZone — attach to an empty node to mark a rectangular area that
// launches a minigame when the player stands inside it. Same idea as
// CollisionZone, but it triggers a minigame instead of blocking movement.
//
// How to use in CC editor:
//   1. Create an empty node "InteractZones" under World (sibling of Colliders)
//   2. Add a child node inside it, rename it (e.g. "Zone_XiaoChiBu")
//   3. Set its Position (x, y) and Size (W, H) to cover the entrance
//   4. Add Component → Custom Component → InteractZone
//   5. Fill in:
//        Game  — niupai | professor | father | finalboss
//        Label — display name, e.g. "Xiao Chi Bu"
//   6. Drag the "InteractZones" node into MainGame's "Interact Zones Node" slot
//
// MainGame reads all children of the InteractZones node at startup. The player
// can press [E] / [Space] while standing inside the rectangle to enter.

cc.Class({
    extends: cc.Component,

    properties: {
        game: {
            default: '',
            tooltip: 'Minigame id: niupai / professor / father / finalboss',
        },
        label: {
            default: '',
            tooltip: 'Display name shown in the hint, e.g. Xiao Chi Bu',
        },
        debugVisible: {
            default: true,
            tooltip: 'Show gold debug overlay in game. Uncheck before final build.',
        },
    },

    onLoad: function () {
        if (!this.debugVisible) return;

        // Gold semi-transparent box so the zone is visible at runtime.
        // abs() so a stray negative Size from editor dragging still draws right.
        var gfx = this.node.addComponent(cc.Graphics);
        var w   = Math.abs(this.node.width);
        var h   = Math.abs(this.node.height);
        var hw  = w / 2;
        var hh  = h / 2;

        gfx.fillColor   = cc.color(255, 220, 60, 40);
        gfx.rect(-hw, -hh, w, h);
        gfx.fill();

        gfx.strokeColor = cc.color(255, 230, 90, 200);
        gfx.lineWidth   = 2;
        gfx.rect(-hw, -hh, w, h);
        gfx.stroke();

        // Label (game label, or node name as fallback) shown above the box
        var lblNode = new cc.Node('_lbl');
        var lbl     = lblNode.addComponent(cc.Label);
        lbl.string  = this.label || this.node.name;
        lbl.fontSize = 10;
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        lblNode.color = cc.color(255, 235, 120);
        lblNode.setPosition(0, hh + 8);
        this.node.addChild(lblNode);
    },
});
