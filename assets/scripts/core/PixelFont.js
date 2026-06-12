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

    // Resolve a CSS font-family the DOM can use for VT323 (for native <input>s on
    // the login screen). Canvas Labels get the cc.Font directly, but a DOM element
    // needs a real @font-face — so we load the .ttf as a FontFace once. cb(family)
    // is called with the family name to use (or null if it couldn't be loaded).
    domFamily(cb) {
        if (PixelFont._domFamily) { cb(PixelFont._domFamily); return; }
        cc.resources.load(FONT_PATH, cc.Font, (err, font) => {
            if (err || !font) { cb(null); return; }
            if (!_font) { _font = font; _flush(); }
            const fallback = font._fontFamily || 'VT323';
            try {
                const url = font.nativeUrl;
                if (url && typeof FontFace !== 'undefined' &&
                    typeof document !== 'undefined' && document.fonts) {
                    const ff = new FontFace('LoveEXEPixel', 'url("' + url + '")');
                    ff.load().then((loaded) => {
                        document.fonts.add(loaded);
                        PixelFont._domFamily = 'LoveEXEPixel';
                        cb(PixelFont._domFamily);
                    }).catch(() => {
                        PixelFont._domFamily = fallback;
                        cb(fallback);
                    });
                    return;
                }
            } catch (e) {}
            PixelFont._domFamily = fallback;
            cb(fallback);
        });
    },
};

module.exports = PixelFont;
