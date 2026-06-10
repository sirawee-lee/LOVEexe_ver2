// PixelFont.js  -  shared loader for the VT323 8-bit font (Cocos Creator 2.4.8)
//
// Scene/prefab Labels reference the VT323 cc.Font asset directly in the editor.
// Labels that are built in code (StartMenu, RaceGame, GameFlow overlays) can't be
// wired in the Inspector, so they call PixelFont.apply(label) instead.
//
// The font lives at assets/resources/fonts/VT323.ttf so it loads by path at runtime.
// Loading is async: the first label is shown in the default font for a frame, then
// every pending label is upgraded to VT323 once the asset arrives.

const FONT_PATH = 'fonts/VT323';

let _font = null;       // cached cc.Font once loaded
let _loading = false;
const _pending = [];    // labels waiting for the load to finish

function _flush() {
    while (_pending.length) {
        const l = _pending.shift();
        if (l && l.isValid) l.font = _font;
    }
}

const PixelFont = {
    // Apply the VT323 font to a runtime-created cc.Label.
    apply(label) {
        if (!label) return;
        if (_font) { label.font = _font; return; }

        _pending.push(label);
        if (_loading) return;
        _loading = true;

        cc.resources.load(FONT_PATH, cc.Font, (err, font) => {
            _loading = false;
            if (err || !font) {
                cc.warn('[PixelFont] failed to load ' + FONT_PATH, err);
                _pending.length = 0;
                return;
            }
            _font = font;
            _flush();
        });
    },
};

module.exports = PixelFont;
