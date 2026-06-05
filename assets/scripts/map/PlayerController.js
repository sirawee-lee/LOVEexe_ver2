// PlayerController.js — 4-direction movement + animation + collision via TiledMap
cc.Class({
    extends: cc.Component,

    properties: {
        moveSpeed: 120,
        tiledMap: {
            type: cc.TiledMap,
            default: null,
        },
        collisionLayerName: 'collision',
    },

    onLoad() {
        this._dir = cc.v2(0, 0);
        this._facing = 'down'; // up / down / left / right
        this._isMoving = false;
        this._anim = this.getComponent(cc.Animation);

        // keyboard state
        this._keys = {};
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP,   this._onKeyUp,   this);

        this._collisionLayer = this.tiledMap
            ? this.tiledMap.getLayer(this.collisionLayerName)
            : null;

        if (this._collisionLayer) {
            this._collisionLayer.node.active = false; // hide collision layer
        }
    },

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP,   this._onKeyUp,   this);
    },

    _onKeyDown(e) { this._keys[e.keyCode] = true; },
    _onKeyUp(e)   { this._keys[e.keyCode] = false; },

    update(dt) {
        const K = cc.macro.KEY;
        let dx = 0, dy = 0;

        if (this._keys[K.left]  || this._keys[K.a]) dx = -1;
        if (this._keys[K.right] || this._keys[K.d]) dx =  1;
        if (this._keys[K.up]    || this._keys[K.w]) dy =  1;
        if (this._keys[K.down]  || this._keys[K.s]) dy = -1;

        // normalize diagonal
        if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

        const moving = dx !== 0 || dy !== 0;

        if (moving) {
            const next = this.node.position.add(cc.v3(dx * this.moveSpeed * dt, dy * this.moveSpeed * dt, 0));

            if (!this._isBlocked(next)) {
                this.node.setPosition(next);
            }

            // facing direction (prefer horizontal)
            if      (dx < 0) this._facing = 'left';
            else if (dx > 0) this._facing = 'right';
            else if (dy > 0) this._facing = 'up';
            else             this._facing = 'down';
        }

        this._updateAnim(moving);
        this._isMoving = moving;
    },

    _updateAnim(moving) {
        if (!this._anim) return;
        const clip = moving ? `walk_${this._facing}` : `idle_${this._facing}`;
        const state = this._anim.getAnimationState(clip);
        if (state && !state.isPlaying) {
            this._anim.play(clip);
        }
    },

    // Convert world pos → tile coord, check if that tile has a value (blocked)
    _isBlocked(worldPos) {
        if (!this._collisionLayer) return false;

        const mapNode  = this.tiledMap.node;
        const mapSize  = this.tiledMap.getMapSize();      // in tiles
        const tileSize = this.tiledMap.getTileSize();     // in px

        // world → local map space
        const local = mapNode.convertToNodeSpaceAR(cc.v2(worldPos.x, worldPos.y));

        // Cocos TiledMap origin is top-left; y is flipped
        const col = Math.floor( local.x / tileSize.width);
        const row = Math.floor(-local.y / tileSize.height);

        if (col < 0 || row < 0 || col >= mapSize.width || row >= mapSize.height) {
            return true; // outside map = blocked
        }

        const tile = this._collisionLayer.getTiledTileAt(col, row, false);
        return tile !== null && tile.grid !== 0;
    },
});
