// Gamepad.js  -  controller support for all 5 mini-games (Cocos Creator 2.4.8)
//
// The games already drive everything from keyboard events (Space / Left / Right).
// Instead of touching each game, this module polls the browser Gamepad API every
// frame and RE-EMITS the same cc.systemEvent KEY_DOWN / KEY_UP events. So a gamepad
// "just works" everywhere: A/B/X/Y/Start = Space (flap / press / submit / confirm),
// D-pad or left stick = Left / Right (the Race game's alternating taps).
//
// Call Gamepad.ensureStarted() once (GameFlow does this on every game enter, and it
// is idempotent). cc.director persists across scenes, so one hook covers the whole game.

const KEY = cc.macro.KEY;

// logical action -> the keyCode the games already handle
const ACTIONS = {
    confirm: KEY.space,
    left:    KEY.left,
    right:   KEY.right,
};

let _started = false;
let _prev = { confirm: false, left: false, right: false };

function _emit(type, keyCode) {
    // The game handlers only read event.keyCode, so a tiny stub event is enough.
    cc.systemEvent.emit(type, { keyCode: keyCode });
}

function _firstPad() {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
    const pads = navigator.getGamepads();
    if (!pads) return null;
    for (let i = 0; i < pads.length; i++) {
        if (pads[i] && pads[i].connected !== false) return pads[i];
    }
    return null;
}

function _poll() {
    const pad = _firstPad();
    if (!pad) return;

    const down = (i) => !!(pad.buttons[i] && pad.buttons[i].pressed);
    const axisX = (pad.axes && pad.axes.length > 0) ? pad.axes[0] : 0;

    const state = {
        // face buttons (A/B/X/Y) + Start -> confirm/Space
        confirm: down(0) || down(1) || down(2) || down(3) || down(9),
        left:    down(14) || axisX < -0.5,    // d-pad left / left stick
        right:   down(15) || axisX > 0.5,     // d-pad right / left stick
    };

    for (const a in ACTIONS) {
        if (state[a] && !_prev[a])      _emit(cc.SystemEvent.EventType.KEY_DOWN, ACTIONS[a]);
        else if (!state[a] && _prev[a]) _emit(cc.SystemEvent.EventType.KEY_UP, ACTIONS[a]);
    }
    _prev = state;
}

const Gamepad = {
    // Safe to call many times; only the first call actually hooks the update loop.
    ensureStarted() {
        if (_started) return;
        if (typeof navigator === 'undefined' || !navigator.getGamepads) return;  // no API -> no-op
        _started = true;
        // EVENT_AFTER_UPDATE fires once per frame and the director survives loadScene.
        cc.director.on(cc.Director.EVENT_AFTER_UPDATE, _poll);
    },
};

module.exports = Gamepad;
