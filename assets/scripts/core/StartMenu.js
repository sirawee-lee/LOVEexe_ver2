// StartMenu.js  -  Title screen shown before the boss stage (Cocos Creator 2.4.8)
//
// Two buttons (built in code so no extra wiring is needed):
//   Start            -> begins the boss stage at the first game (needle)
//   Back to Main Map -> loads the main-map scene (name set in the Inspector)
//
// You can add a background Sprite to this scene in the editor later; this script
// only draws the title + buttons, it never touches the background.

const GameFlow = require('GameFlow');
const PixelFont = require('PixelFont');

const COL_START = cc.color(70, 160, 255);
const COL_BACK  = cc.color(120, 120, 130);

cc.Class({
    extends: cc.Component,

    properties: {
        mainMapSceneName: {
            default: 'map',
            tooltip: 'Scene name that "Back to Main Map" loads. Set this once the map scene exists.',
        },
        title: {
            default: 'Rush! Quick Mini-Games',
            tooltip: 'Big title text shown on the start screen.',
        },
    },

    onLoad() {
        const canvas = cc.director.getScene().getChildByName('Canvas')
            || (cc.Canvas.instance && cc.Canvas.instance.node);
        this._root = canvas || this.node;

        this._makeLabel(this._root, this.title, 60, cc.color(255, 255, 255), 0, 150);

        this._makeButton(this._root, 'Start', 0, 0, 300, 90, COL_START, () => {
            GameFlow.startBoss();
        });
        this._makeButton(this._root, 'Back to Main Map', 0, -120, 380, 80, COL_BACK, () => {
            if (!cc.director.loadScene(this.mainMapSceneName)) {
                cc.warn('[StartMenu] Scene "' + this.mainMapSceneName +
                    '" not found yet. Set "mainMapSceneName" in the Inspector.');
            }
        });
    },

    // ---- tiny UI builders ----------------------------------------------------
    _makeLabel(parent, str, size, color, x, y) {
        const node = new cc.Node('lbl');
        node.parent = parent;
        node.setPosition(x, y);
        node.zIndex = 10;
        const l = node.addComponent(cc.Label);
        l.fontSize = size;
        l.lineHeight = size + 6;
        l.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        l.string = str;
        node.color = color;
        PixelFont.apply(l);
        return l;
    },

    _makeButton(parent, str, x, y, w, h, bgColor, cb) {
        const node = new cc.Node('btn');
        node.parent = parent;
        node.setPosition(x, y);
        node.zIndex = 10;
        node.setContentSize(w, h);

        const g = node.addComponent(cc.Graphics);
        g.fillColor = bgColor;
        g.roundRect(-w / 2, -h / 2, w, h, 18);
        g.fill();

        this._makeLabel(node, str, 36, cc.color(255, 255, 255), 0, 0);

        node.on(cc.Node.EventType.TOUCH_END, () => {
            if (typeof cb === 'function') cb();
        }, this);
        return node;
    },
});
