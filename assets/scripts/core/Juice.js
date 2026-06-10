// Juice.js  -  reusable "game feel" helpers (Cocos Creator 2.4.8)
//
// All effects are built in code (no art assets needed) and clean themselves up,
// so any script can call them: const Juice = require('Juice');
//   Juice.shake(node)                          // screen / node shake
//   Juice.floatText(parent, '+100', color, x, y)  // rising, fading number
//   Juice.burst(parent, x, y, color)           // little particle pop

const PixelFont = require('PixelFont');

const Juice = {
    // Quick positional shake. Pass the Canvas for a "screen shake".
    // Restores the node to its original position when done.
    shake(node, intensity, duration) {
        if (!node || !cc.isValid(node)) return;
        intensity = intensity || 12;
        duration = duration || 0.3;

        const ox = node.x, oy = node.y;
        cc.Tween.stopAllByTarget(node);   // safe on Canvas (no gameplay tweens there)

        const steps = 6;
        let t = cc.tween(node);
        for (let i = 0; i < steps; i++) {
            const falloff = 1 - i / steps;                 // decay over time
            const dx = (Math.random() * 2 - 1) * intensity * falloff;
            const dy = (Math.random() * 2 - 1) * intensity * falloff;
            t = t.to(duration / (steps + 1), { x: ox + dx, y: oy + dy });
        }
        t.to(duration / (steps + 1), { x: ox, y: oy }).start();
    },

    // A number that floats up a little and fades out, then deletes itself.
    floatText(parent, str, color, x, y, size) {
        if (!parent || !cc.isValid(parent)) return;

        const node = new cc.Node('float');
        node.parent = parent;
        node.setPosition(x, y);
        node.zIndex = 12000;

        const l = node.addComponent(cc.Label);
        l.fontSize = size || 30;
        l.lineHeight = (size || 30) + 4;
        l.string = str;
        node.color = color || cc.color(255, 255, 255);
        PixelFont.apply(l);

        cc.tween(node).by(0.7, { y: 64 }, { easing: 'quadOut' }).start();
        cc.tween(node)
            .delay(0.18)
            .to(0.5, { opacity: 0 })
            .call(() => { if (cc.isValid(node)) node.destroy(); })
            .start();
    },

    // A small pop of colored dots flying outward (used on heart loss, big hits, etc.).
    burst(parent, x, y, color, count) {
        if (!parent || !cc.isValid(parent)) return;
        count = count || 10;
        color = color || cc.color(255, 255, 255);

        for (let i = 0; i < count; i++) {
            const dot = new cc.Node('p');
            dot.parent = parent;
            dot.setPosition(x, y);
            dot.zIndex = 12000;

            const g = dot.addComponent(cc.Graphics);
            g.fillColor = color;
            g.circle(0, 0, 3 + Math.random() * 4);
            g.fill();

            const ang = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 70;
            const tx = x + Math.cos(ang) * dist;
            const ty = y + Math.sin(ang) * dist;

            cc.tween(dot)
                .to(0.5, { x: tx, y: ty, scale: 0 }, { easing: 'quadOut' })
                .call(() => { if (cc.isValid(dot)) dot.destroy(); })
                .start();
            cc.tween(dot).delay(0.15).to(0.35, { opacity: 0 }).start();
        }
    },
};

module.exports = Juice;
