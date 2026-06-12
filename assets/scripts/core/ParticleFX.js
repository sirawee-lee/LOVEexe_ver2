// ParticleFX.js  -  reusable cc.ParticleSystem effects (Cocos Creator 2.4.8)
//
// No art assets needed: the particle textures (a soft dot and a heart) are
// generated at runtime and cached. Every effect creates its own node and
// removes itself when finished, so any script can fire one in a single line:
//
//   const FX = require('ParticleFX');
//   FX.confetti(parent, W, H);   // celebration rain from the top  (ending win screen)
//   FX.sparkle(parent, x, y);    // gold additive pop               (Osu PERFECT/GOOD hit)
//   FX.hearts(parent, x, y);     // pink hearts floating up         (dialogue affinity gain)
//   FX.dust(parent, x, y);       // grey kick-back puff             (Race footstep)
//   FX.debris(parent, x, y);     // chunks blasting outward         (Flappy crash)

var _dotSF = null;
var _heartSF = null;

// soft round white dot (tinted per-effect via startColor)
function dotSF() {
    if (_dotSF && cc.isValid(_dotSF)) return _dotSF;
    var S = 16, data = new Uint8Array(S * S * 4), c = (S - 1) / 2;
    for (var y = 0; y < S; y++) {
        for (var x = 0; x < S; x++) {
            var dx = (x - c) / (S * 0.46), dy = (y - c) / (S * 0.46);
            var d = dx * dx + dy * dy;
            var a = d < 1 ? Math.round(255 * Math.pow(1 - d, 0.7)) : 0;
            var i = (y * S + x) * 4;
            data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = a;
        }
    }
    var tex = new cc.Texture2D();
    tex.initWithData(data, cc.Texture2D.PixelFormat.RGBA8888, S, S);
    _dotSF = new cc.SpriteFrame(tex);
    return _dotSF;
}

// white heart silhouette (implicit heart curve), tinted via startColor
function heartSF() {
    if (_heartSF && cc.isValid(_heartSF)) return _heartSF;
    var S = 20, data = new Uint8Array(S * S * 4), c = (S - 1) / 2;
    for (var py = 0; py < S; py++) {
        for (var px = 0; px < S; px++) {
            var x = (px - c) / (S * 0.34);
            var y = (c - py) / (S * 0.34) + 0.55;
            var v = Math.pow(x * x + y * y - 1, 3) - x * x * y * y * y;
            var a = v < 0 ? 255 : 0;
            var i = (py * S + px) * 4;
            data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = a;
        }
    }
    var tex = new cc.Texture2D();
    tex.initWithData(data, cc.Texture2D.PixelFormat.RGBA8888, S, S);
    _heartSF = new cc.SpriteFrame(tex);
    return _heartSF;
}

var _petalSF = null;
var _boneSF = null;

// soft white cherry-blossom petal (wide ellipse), tinted via startColor
function petalSF() {
    if (_petalSF && cc.isValid(_petalSF)) return _petalSF;
    var S = 24, data = new Uint8Array(S * S * 4), c = (S - 1) / 2;
    for (var y = 0; y < S; y++) {
        for (var x = 0; x < S; x++) {
            var dx = (x - c) / (S * 0.46), dy = (y - c) / (S * 0.30);
            var d = dx * dx + dy * dy;
            var a = d < 1 ? Math.round(235 * Math.pow(1 - d, 0.85)) : 0;
            var i = (y * S + x) * 4;
            data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = a;
        }
    }
    var tex = new cc.Texture2D();
    tex.initWithData(data, cc.Texture2D.PixelFormat.RGBA8888, S, S);
    _petalSF = new cc.SpriteFrame(tex);
    return _petalSF;
}

// classic dog bone (a shaft with two knobs at each end), tinted via startColor
function boneSF() {
    if (_boneSF && cc.isValid(_boneSF)) return _boneSF;
    var S = 28, Sh = 16, data = new Uint8Array(S * Sh * 4);
    var cx = (S - 1) / 2, cy = (Sh - 1) / 2;
    var shaftHX = 8, shaftHY = 2.4, knobR2 = 3.5 * 3.5, knobDX = 8, knobDY = 2.9;
    for (var py = 0; py < Sh; py++) {
        for (var px = 0; px < S; px++) {
            var dx = px - cx, dy = py - cy, on = false;
            if (Math.abs(dx) <= shaftHX && Math.abs(dy) <= shaftHY) on = true;
            for (var sx = -1; sx <= 1 && !on; sx += 2) {
                for (var sy = -1; sy <= 1 && !on; sy += 2) {
                    var kx = dx - sx * knobDX, ky = dy - sy * knobDY;
                    if (kx * kx + ky * ky <= knobR2) on = true;
                }
            }
            var i = (py * S + px) * 4;
            data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = on ? 255 : 0;
        }
    }
    var tex = new cc.Texture2D();
    tex.initWithData(data, cc.Texture2D.PixelFormat.RGBA8888, S, Sh);
    _boneSF = new cc.SpriteFrame(tex);
    return _boneSF;
}

// shared setup: spawn a node + configured ParticleSystem in GRAVITY mode
function make(parent, x, y, z, sf) {
    var n = new cc.Node('fx');
    n.parent = parent;
    n.setPosition(x, y);
    n.zIndex = (z == null) ? 20000 : z;
    var ps = n.addComponent(cc.ParticleSystem);
    ps.custom = true;
    ps.spriteFrame = sf || dotSF();
    ps.emitterMode = cc.ParticleSystem.EmitterMode.GRAVITY;
    ps.positionType = cc.ParticleSystem.PositionType.FREE;
    ps.srcBlendFactor = cc.macro.BlendFactor.SRC_ALPHA;
    ps.dstBlendFactor = cc.macro.BlendFactor.ONE_MINUS_SRC_ALPHA;
    ps.autoRemoveOnFinish = true;
    return ps;
}

// continuous, slow "rain" of a given sprite from the top edge — ambient endings
function rain(parent, W, H, sf, startColor, o) {
    o = o || {};
    var sp = o.speed || 33;
    var sz = o.size || 20;
    var ps = make(parent, 0, H / 2 + 24, o.z || 200000, sf);
    ps.duration = cc.ParticleSystem.DURATION_INFINITY;
    ps.autoRemoveOnFinish = false;        // ambient; dies with the overlay/scene
    ps.totalParticles = o.total || 90;
    ps.emissionRate = o.rate || 11;
    ps.life = o.life || 10; ps.lifeVar = o.lifeVar || 2.5;
    ps.posVar = cc.v2(W / 2 + 40, 8);
    ps.angle = 270; ps.angleVar = 18;
    ps.speed = sp; ps.speedVar = sp * 0.4;
    ps.gravity = cc.v2(0, o.grav || -12);
    ps.tangentialAccel = 0; ps.tangentialAccelVar = o.sway || 18;
    ps.startSize = sz; ps.startSizeVar = sz * 0.25;
    ps.endSize = sz * 0.75; ps.endSizeVar = sz * 0.2;
    ps.startSpin = 0; ps.startSpinVar = o.spin || 180;
    ps.endSpin = 360; ps.endSpinVar = (o.spin || 180) + 40;
    ps.startColor = startColor;
    ps.startColorVar = o.colorVar || cc.color(16, 22, 16, 0);
    ps.endColor = cc.color(startColor.r, startColor.g, startColor.b, o.endA == null ? 110 : o.endA);
    return ps;
}

var ParticleFX = {

    // multicolor confetti bursting down from the top of the screen
    confetti: function (parent, W, H) {
        if (!parent || !cc.isValid(parent)) return null;
        var ps = make(parent, 0, H / 2 + 20, 200000);
        ps.duration = 2.5;                 // emit for 2.5s; particles keep falling after
        ps.totalParticles = 160;
        ps.emissionRate = 60;
        ps.life = 3.2; ps.lifeVar = 1;
        ps.posVar = cc.v2(W / 2, 6);
        ps.angle = 270; ps.angleVar = 25;
        ps.speed = 120; ps.speedVar = 50;
        ps.gravity = cc.v2(0, -90);
        ps.tangentialAccel = 0; ps.tangentialAccelVar = 70;
        ps.radialAccel = 0; ps.radialAccelVar = 0;
        ps.startSize = 14; ps.startSizeVar = 5;
        ps.endSize = 11; ps.endSizeVar = 3;
        ps.startSpin = 0; ps.startSpinVar = 220; ps.endSpin = 360; ps.endSpinVar = 320;
        ps.startColor = cc.color(180, 160, 200, 255);
        ps.startColorVar = cc.color(120, 120, 120, 0);   // wide spread -> many colors
        ps.endColor = cc.color(180, 160, 200, 150);
        ps.endColorVar = cc.color(120, 120, 120, 60);
        return ps;
    },

    // a quick gold sparkle pop (additive glow) — great for a clean hit
    sparkle: function (parent, x, y) {
        if (!parent || !cc.isValid(parent)) return null;
        var ps = make(parent, x, y);
        ps.dstBlendFactor = cc.macro.BlendFactor.ONE;   // additive -> bright sparkle
        ps.duration = 0.12;
        ps.totalParticles = 20;
        ps.emissionRate = 200;
        ps.life = 0.45; ps.lifeVar = 0.15;
        ps.angle = 90; ps.angleVar = 180;
        ps.speed = 150; ps.speedVar = 70;
        ps.gravity = cc.v2(0, -120);
        ps.startSize = 12; ps.startSizeVar = 4;
        ps.endSize = 1;
        ps.startColor = cc.color(255, 240, 150, 255);
        ps.startColorVar = cc.color(25, 30, 70, 0);
        ps.endColor = cc.color(255, 170, 60, 0);
        return ps;
    },

    // pink hearts drifting upward — love / affinity feedback
    hearts: function (parent, x, y) {
        if (!parent || !cc.isValid(parent)) return null;
        var ps = make(parent, x, y, 20000, heartSF());
        ps.duration = 0.4;
        ps.totalParticles = 14;
        ps.emissionRate = 30;
        ps.life = 1.1; ps.lifeVar = 0.3;
        ps.posVar = cc.v2(24, 6);
        ps.angle = 90; ps.angleVar = 22;     // float up
        ps.speed = 70; ps.speedVar = 25;
        ps.gravity = cc.v2(0, 40);
        ps.tangentialAccel = 0; ps.tangentialAccelVar = 30;
        ps.startSize = 22; ps.startSizeVar = 6;
        ps.endSize = 16; ps.endSizeVar = 4;
        ps.startSpin = 0; ps.startSpinVar = 18; ps.endSpin = 0; ps.endSpinVar = 18;
        ps.startColor = cc.color(255, 110, 165, 255);
        ps.startColorVar = cc.color(20, 30, 30, 0);
        ps.endColor = cc.color(255, 150, 195, 0);
        return ps;
    },

    // a low grey puff that expands and fades — footsteps / speed
    dust: function (parent, x, y) {
        if (!parent || !cc.isValid(parent)) return null;
        var ps = make(parent, x, y);
        ps.duration = 0.1;
        ps.totalParticles = 10;
        ps.emissionRate = 120;
        ps.life = 0.4; ps.lifeVar = 0.15;
        ps.angle = 150; ps.angleVar = 40;    // kick up-and-back
        ps.speed = 55; ps.speedVar = 25;
        ps.gravity = cc.v2(0, 20);
        ps.startSize = 10; ps.startSizeVar = 4;
        ps.endSize = 20; ps.endSizeVar = 6;  // expand like smoke
        ps.startColor = cc.color(205, 198, 185, 190);
        ps.startColorVar = cc.color(15, 15, 15, 30);
        ps.endColor = cc.color(205, 198, 185, 0);
        return ps;
    },

    // chunks blasting outward with strong gravity — impact / crash
    debris: function (parent, x, y) {
        if (!parent || !cc.isValid(parent)) return null;
        var ps = make(parent, x, y);
        ps.duration = 0.1;
        ps.totalParticles = 22;
        ps.emissionRate = 300;
        ps.life = 0.6; ps.lifeVar = 0.2;
        ps.angle = 90; ps.angleVar = 75;     // upward fan
        ps.speed = 200; ps.speedVar = 90;
        ps.gravity = cc.v2(0, -720);
        ps.startSize = 12; ps.startSizeVar = 6;
        ps.endSize = 4; ps.endSizeVar = 2;
        ps.startSpin = 0; ps.startSpinVar = 220; ps.endSpin = 320; ps.endSpinVar = 320;
        ps.startColor = cc.color(225, 160, 90, 255);
        ps.startColorVar = cc.color(35, 30, 20, 0);
        ps.endColor = cc.color(150, 95, 50, 70);
        ps.endColorVar = cc.color(20, 20, 20, 40);
        return ps;
    },

    // 🌸 cute cherry blossoms drifting down — the TRUE-LOVE (Mei) happy ending,
    // matching the slow petals on the main menu
    sakura: function (parent, W, H) {
        if (!parent || !cc.isValid(parent)) return null;
        return rain(parent, W, H, petalSF(), cc.color(255, 188, 214, 255), {
            total: 130, rate: 12, life: 10, lifeVar: 3,
            speed: 33, grav: -12, size: 20, sway: 20, spin: 180, endA: 90,
            colorVar: cc.color(16, 24, 16, 0),
        });
    },

    // 🦴 + 💗 bones tumbling down among pink hearts — the NIU PAI (dog) ending
    niupaiEnding: function (parent, W, H) {
        if (!parent || !cc.isValid(parent)) return null;
        // cream-white bones, heavier and tumbling
        rain(parent, W, H, boneSF(), cc.color(245, 240, 222, 255), {
            total: 70, rate: 7, life: 9, lifeVar: 2,
            speed: 38, grav: -18, size: 26, sway: 14, spin: 260, endA: 130, z: 200000,
            colorVar: cc.color(10, 10, 16, 0),
        });
        // pink hearts floating gently among them
        rain(parent, W, H, heartSF(), cc.color(255, 120, 170, 255), {
            total: 45, rate: 5, life: 10, lifeVar: 2.5,
            speed: 30, grav: -10, size: 20, sway: 22, spin: 26, endA: 80, z: 200001,
            colorVar: cc.color(20, 25, 25, 0),
        });
        return true;
    },
};

module.exports = ParticleFX;
