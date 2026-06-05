'use strict';

// RoamingMei — put on the SAME node as the Mei NPC (npcId 'mei'). While the
// final boss is locked (not all 3 challenges won), Mei strolls a loop of
// waypoints along the walkway. Once unlocked, she walks to her "home" spot by
// the library and waits there for the finale. Drives the node's PlayerAnimator
// for 4-direction walking, and freezes while a dialogue is on screen.
//
// Setup:
//   - Mei node: NPC (npcId 'mei', girl_spritesheet) + RoamingMei
//   - "MeiWaypoints" node under World at (0,0): add empty child nodes along the
//     walkway → assign to "Waypoints Node"
//   - one empty node near the library at (0,0) under World → assign to "Home Node"
//   (Mei's parent, MeiWaypoints and Home should all sit at (0,0) under World so
//    every position is in the player's coordinate space.)

var StoryState = require('StoryState');

cc.Class({
    extends: cc.Component,

    properties: {
        waypointsNode: { default: null, type: cc.Node },
        homeNode:      { default: null, type: cc.Node },
        speed:         { default: 55, type: cc.Integer },   // CC units / second
        arriveDist:    { default: 6,  type: cc.Integer },
    },

    onLoad: function () {
        this._wps = [];
        if (this.waypointsNode) {
            this.waypointsNode.children.forEach(function (c) {
                this._wps.push(cc.v2(c.x, c.y));
            }, this);
        }
        this._wi = 0;
        this._arrivedHome = false;
        this._anim = null;
    },

    update: function (dt) {
        // Grab the animator lazily (NPC.js adds it; component order is unknown)
        if (!this._anim) this._anim = this.node.getComponent('PlayerAnimator');

        if (StoryState.dialogueActive) { if (this._anim) this._anim.setMoving(false); return; }

        var unlocked = StoryState.isFinalUnlocked();
        var target;
        if (unlocked) {
            if (this._arrivedHome || !this.homeNode) { if (this._anim) this._anim.setMoving(false); return; }
            target = cc.v2(this.homeNode.x, this.homeNode.y);
        } else {
            if (!this._wps.length) { if (this._anim) this._anim.setMoving(false); return; }
            target = this._wps[this._wi];
        }

        var px = this.node.x, py = this.node.y;
        var dx = target.x - px, dy = target.y - py;
        var dist = Math.hypot(dx, dy);

        if (dist <= this.arriveDist) {
            if (unlocked) { this._arrivedHome = true; if (this._anim) this._anim.setMoving(false); }
            else          { this._wi = (this._wi + 1) % this._wps.length; }
            return;
        }

        var step = Math.min(dist, this.speed * dt);
        this.node.setPosition(px + (dx / dist) * step, py + (dy / dist) * step);

        if (this._anim) {
            if (Math.abs(dx) > Math.abs(dy)) this._anim.setDirection(dx > 0 ? 'right' : 'left');
            else                              this._anim.setDirection(dy > 0 ? 'up' : 'down');
            this._anim.setMoving(true);
        }
    },
});
