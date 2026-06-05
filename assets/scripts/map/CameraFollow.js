// CameraFollow.js — กล้องติดตาม Player พร้อม clamp ไม่ให้เกินขอบแผนที่
cc.Class({
    extends: cc.Component,

    properties: {
        target: {
            type: cc.Node,
            default: null,
        },
        smoothing: 5,       // ความนุ่มนวล (สูง = ตามเร็ว)
        tiledMap: {
            type: cc.TiledMap,
            default: null,
        },
    },

    onLoad() {
        this._mapBounds = null;
    },

    start() {
        if (this.tiledMap) {
            const mapSize  = this.tiledMap.getMapSize();
            const tileSize = this.tiledMap.getTileSize();
            const w = mapSize.width  * tileSize.width;
            const h = mapSize.height * tileSize.height;
            // TiledMap origin = top-left center of map node
            this._mapBounds = { w, h };
        }
    },

    lateUpdate(dt) {
        if (!this.target) return;

        const canvas = cc.Canvas.instance;
        const hw = canvas.node.width  / 2;
        const hh = canvas.node.height / 2;

        let tx = this.target.x;
        let ty = this.target.y;

        // clamp inside map
        if (this._mapBounds) {
            const { w, h } = this._mapBounds;
            tx = cc.misc.clampf(tx, -(w / 2) + hw,  (w / 2) - hw);
            ty = cc.misc.clampf(ty, -(h / 2) + hh,  (h / 2) - hh);
        }

        const cur = this.node.position;
        const nx  = cc.misc.lerp(cur.x, tx, this.smoothing * dt);
        const ny  = cc.misc.lerp(cur.y, ty, this.smoothing * dt);
        this.node.setPosition(nx, ny);
    },
});
