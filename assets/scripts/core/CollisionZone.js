'use strict';

// CollisionZone — attach to any empty node to mark it as a solid collision area.
//
// RECTANGLE zone (most colliders):
//   1. Create an empty child node inside the "Colliders" node (under World)
//   2. Rename it (e.g. "Col_Building_Delta")
//   3. Set its Position (x, y) and Size (W, H) in the Properties panel
//      to cover the area you want blocked
//   4. Add Component → Custom Component → CollisionZone
//   5. The red debug box disappears automatically when debugVisible = false
//
// POLYGON zone (irregular shapes like the lake):
//   1. Create the node under "Colliders" and add CollisionZone (as above)
//   2. Add Component → Collider → Polygon Collider (built-in cc.PolygonCollider)
//   3. Click "Editing" on the Polygon Collider and click/drag points in the
//      Scene view to trace the outline (trace a touch INSIDE the shore edge)
//   4. The debug overlay is drawn in BLUE for polygon zones
//
// MainGame reads all children of the Colliders node at startup: a node with a
// Polygon Collider is treated as a polygon, otherwise as a rectangle.

// Master switch for the collision-zone debug overlays (red/blue boxes + name labels).
// Keep false for builds; flip to true while editing to see the zones again.
var SHOW_DEBUG = false;

cc.Class({
    extends: cc.Component,

    properties: {
        debugVisible: {
            default: true,
            tooltip: 'Show red debug overlay in game. Uncheck before final build.',
        },
    },

    onLoad: function () {
        if (!SHOW_DEBUG || !this.debugVisible) return;

        var gfx  = this.node.addComponent(cc.Graphics);
        var poly = this.node.getComponent(cc.PolygonCollider);
        var labelY;

        if (poly && poly.points && poly.points.length >= 3) {
            // ── Traced polygon (e.g. the lake) — draw in blue ──
            var pts = poly.points;
            var ox  = poly.offset.x, oy = poly.offset.y;
            var maxY = -Infinity;

            function tracePoly() {
                gfx.moveTo(ox + pts[0].x, oy + pts[0].y);
                for (var i = 1; i < pts.length; i++) {
                    gfx.lineTo(ox + pts[i].x, oy + pts[i].y);
                }
                gfx.close();
            }

            for (var k = 0; k < pts.length; k++) {
                if (oy + pts[k].y > maxY) maxY = oy + pts[k].y;
            }

            gfx.fillColor = cc.color(50, 120, 255, 45);
            tracePoly();
            gfx.fill();

            gfx.strokeColor = cc.color(80, 160, 255, 200);
            gfx.lineWidth   = 2;
            tracePoly();
            gfx.stroke();

            labelY = maxY + 8;
        } else {
            // ── Rectangle zone — draw a semi-transparent red box ──
            var hw = this.node.width  / 2;
            var hh = this.node.height / 2;

            gfx.fillColor = cc.color(255, 50, 50, 45);
            gfx.rect(-hw, -hh, this.node.width, this.node.height);
            gfx.fill();

            gfx.strokeColor = cc.color(255, 80, 80, 200);
            gfx.lineWidth   = 2;
            gfx.rect(-hw, -hh, this.node.width, this.node.height);
            gfx.stroke();

            labelY = hh + 8;
        }

        // Label (node name shown above the zone)
        var lblNode = new cc.Node('_lbl');
        var lbl     = lblNode.addComponent(cc.Label);
        lbl.string  = this.node.name;
        lbl.fontSize = 9;
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        lblNode.color = cc.color(255, 120, 120);
        lblNode.setPosition(0, labelY);
        this.node.addChild(lblNode);
    },
});
