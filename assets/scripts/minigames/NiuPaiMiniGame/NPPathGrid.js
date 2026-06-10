'use strict';

var NPPathGrid = cc.Class({
    name: 'NPPathGrid',

    ctor: function (game) {
        this.game = game;
        this.grids = {};
        this.debugNode = null;
    },

    build: function () {
        var game = this.game;
        this.grids = {};

        this.grids.main = this._buildForSection(
            game._mainTiledMap,
            game.mainTilemapOffset,
            game.mapCols,
            game.mapRows,
            'main'
        );
        this.grids.tunnel = this._buildForSection(
            game._tunnelTiledMap,
            game.tunnelTilemapOffset,
            game.tunnelMapCols,
            game.tunnelMapRows,
            'tunnel'
        );

        return this.grids;
    },

    getCurrentGrid: function () {
        return this.grids[this.game._currentSection] || null;
    },

    getGrid: function (section) {
        return this.grids[section] || null;
    },

    findPathBetweenNodes: function (fromNode, toNode, grid) {
        return this.findPathBetweenPositions(fromNode.getPosition(), toNode.getPosition(), grid);
    },

    findPathBetweenPositions: function (fromPos, toPos, grid) {
        var start = this.worldToGridTile(grid, fromPos);
        var goal = this.worldToGridTile(grid, toPos);
        if (!start || !goal) return [];

        start = this.findNearestWalkableTile(grid, start) || start;
        goal = this.findNearestWalkableTile(grid, goal) || goal;
        if (!this.isWalkableTile(grid, start.x, start.y) || !this.isWalkableTile(grid, goal.x, goal.y)) {
            return [];
        }

        return this._findGridPath(grid, start, goal);
    },

    getRandomWalkableTile: function (grid) {
        if (!grid) return null;

        for (var attempt = 0; attempt < 80; attempt++) {
            var x = Math.floor(Math.random() * grid.cols);
            var y = Math.floor(Math.random() * grid.rows);
            if (this.isWalkableTile(grid, x, y)) return { x: x, y: y };
        }

        for (var row = 0; row < grid.rows; row++) {
            for (var col = 0; col < grid.cols; col++) {
                if (this.isWalkableTile(grid, col, row)) return { x: col, y: row };
            }
        }

        return null;
    },

    isWalkableTile: function (grid, x, y) {
        return !!grid &&
            x >= 0 && x < grid.cols &&
            y >= 0 && y < grid.rows &&
            grid.cells[y] &&
            grid.cells[y][x] === true;
    },

    findNearestWalkableTile: function (grid, tile) {
        if (this.isWalkableTile(grid, tile.x, tile.y)) return tile;

        var maxRadius = Math.max(grid.cols, grid.rows);
        for (var radius = 1; radius <= maxRadius; radius++) {
            for (var y = tile.y - radius; y <= tile.y + radius; y++) {
                for (var x = tile.x - radius; x <= tile.x + radius; x++) {
                    if (Math.abs(x - tile.x) !== radius && Math.abs(y - tile.y) !== radius) continue;
                    if (this.isWalkableTile(grid, x, y)) return { x: x, y: y };
                }
            }
        }

        return null;
    },

    worldToGridTile: function (grid, pos) {
        if (!grid || !pos) return null;

        var x = Math.floor((pos.x - grid.offset.x) / this.game.mapTileSize);
        var y = Math.floor((pos.y - grid.offset.y) / this.game.mapTileSize);
        if (x < 0 || x >= grid.cols || y < 0 || y >= grid.rows) return null;
        return { x: x, y: y };
    },

    gridTileToWorldCenter: function (grid, tile) {
        return cc.v2(
            grid.offset.x + (tile.x + 0.5) * this.game.mapTileSize,
            grid.offset.y + (tile.y + 0.5) * this.game.mapTileSize
        );
    },

    drawDebug: function () {
        var game = this.game;
        if (game.showPathGridDebug === false || !game._world || !this.grids) return;

        if (this.debugNode && this.debugNode.isValid) {
            this.debugNode.destroy();
        }

        var root = new cc.Node('PathGridDebug');
        root.zIndex = 998;
        game._world.addChild(root, 998);
        this.debugNode = root;

        this._drawSingleDebug(root, this.grids.main);
        this._drawSingleDebug(root, this.grids.tunnel);
    },

    _buildForSection: function (tiledMap, offset, cols, rows, name) {
        var game = this.game;
        if (!tiledMap) return null;

        var mapSize = tiledMap.getMapSize ? tiledMap.getMapSize() : null;
        cols = mapSize ? mapSize.width : cols;
        rows = mapSize ? mapSize.height : rows;

        var grid = {
            name: name,
            offset: offset || cc.v2(0, 0),
            cols: cols,
            rows: rows,
            cells: [],
        };

        for (var y = 0; y < rows; y++) {
            grid.cells[y] = [];
            for (var x = 0; x < cols; x++) {
                grid.cells[y][x] = true;
            }
        }

        var group = tiledMap.getObjectGroup(game.colliderLayerName);
        if (group) {
            var objects = group.getObjects() || [];
            for (var i = 0; i < objects.length; i++) {
                this._markColliderObjectBlocked(grid, objects[i]);
            }
        }

        if (game._markInitialObstaclesBlockedOnGrid) {
            game._markInitialObstaclesBlockedOnGrid(grid, name);
        }

        cc.log('[NiuPai] Path grid built for ' + name + ': ' + cols + 'x' + rows);
        return grid;
    },

    _markColliderObjectBlocked: function (grid, obj) {
        var bounds = this._getColliderObjectBounds(obj);
        if (!bounds) return;

        var edgeEpsilon = 0.001;
        var minTile = this._worldToGridTileUnclamped(grid, cc.v2(
            grid.offset.x + bounds.minX,
            grid.offset.y + bounds.minY
        ));
        var maxTile = this._worldToGridTileUnclamped(grid, cc.v2(
            grid.offset.x + bounds.maxX - edgeEpsilon,
            grid.offset.y + bounds.maxY - edgeEpsilon
        ));

        var minX = Math.max(0, Math.min(minTile.x, maxTile.x));
        var maxX = Math.min(grid.cols - 1, Math.max(minTile.x, maxTile.x));
        var minY = Math.max(0, Math.min(minTile.y, maxTile.y));
        var maxY = Math.min(grid.rows - 1, Math.max(minTile.y, maxTile.y));

        for (var y = minY; y <= maxY; y++) {
            for (var x = minX; x <= maxX; x++) {
                grid.cells[y][x] = false;
            }
        }
    },

    _getColliderObjectBounds: function (obj) {
        var ox = obj.x || 0;
        var oy = obj.y || 0;

        if (obj.polygon && obj.polygon.length > 0) {
            return this._getPointObjectBounds(ox, oy, obj.polygon);
        }

        if (obj.polyline && obj.polyline.length > 0) {
            return this._getPointObjectBounds(ox, oy, obj.polyline);
        }

        if (obj.ellipse) {
            return {
                minX: ox,
                maxX: ox + (obj.width || 0),
                minY: oy - (obj.height || 0),
                maxY: oy,
            };
        }

        if ((obj.width || 0) > 0 && (obj.height || 0) > 0) {
            return {
                minX: ox,
                maxX: ox + obj.width,
                minY: oy - obj.height,
                maxY: oy,
            };
        }

        return null;
    },

    _getPointObjectBounds: function (originX, originY, points) {
        var minX = Infinity;
        var maxX = -Infinity;
        var minY = Infinity;
        var maxY = -Infinity;

        for (var i = 0; i < points.length; i++) {
            var px = originX + (points[i].x || 0);
            var py = originY - (points[i].y || 0);
            minX = Math.min(minX, px);
            maxX = Math.max(maxX, px);
            minY = Math.min(minY, py);
            maxY = Math.max(maxY, py);
        }

        if (!isFinite(minX) || !isFinite(minY)) return null;
        return {
            minX: minX,
            maxX: maxX,
            minY: minY,
            maxY: maxY,
        };
    },

    _findGridPath: function (grid, start, goal) {
        var open = [{ x: start.x, y: start.y, g: 0, f: this._gridDistance(start, goal), parent: null }];
        var best = {};
        var closed = {};
        best[start.x + ',' + start.y] = 0;

        while (open.length > 0) {
            var bestIndex = 0;
            for (var i = 1; i < open.length; i++) {
                if (open[i].f < open[bestIndex].f) bestIndex = i;
            }

            var current = open.splice(bestIndex, 1)[0];
            var key = current.x + ',' + current.y;
            if (closed[key]) continue;
            closed[key] = true;

            if (current.x === goal.x && current.y === goal.y) {
                return this._reconstructGridPath(current);
            }

            var dirs = [
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 },
            ];

            for (var d = 0; d < dirs.length; d++) {
                var nx = current.x + dirs[d].x;
                var ny = current.y + dirs[d].y;
                if (!this.isWalkableTile(grid, nx, ny)) continue;

                var nKey = nx + ',' + ny;
                if (closed[nKey]) continue;

                var g = current.g + 1;
                if (best[nKey] !== undefined && g >= best[nKey]) continue;

                best[nKey] = g;
                open.push({
                    x: nx,
                    y: ny,
                    g: g,
                    f: g + this._gridDistance({ x: nx, y: ny }, goal),
                    parent: current,
                });
            }
        }

        return [];
    },

    _reconstructGridPath: function (node) {
        var path = [];
        while (node) {
            path.unshift({ x: node.x, y: node.y });
            node = node.parent;
        }
        if (path.length > 1) path.shift();
        return path;
    },

    _gridDistance: function (a, b) {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    },

    _worldToGridTileUnclamped: function (grid, pos) {
        return {
            x: Math.floor((pos.x - grid.offset.x) / this.game.mapTileSize),
            y: Math.floor((pos.y - grid.offset.y) / this.game.mapTileSize),
        };
    },

    _drawSingleDebug: function (parent, grid) {
        if (!grid) return;

        var node = new cc.Node('PathGridDebug_' + grid.name);
        node.setPosition(0, 0);
        parent.addChild(node, 0);

        var gfx = node.addComponent(cc.Graphics);
        var size = this.game.mapTileSize;

        gfx.strokeColor = cc.color(110, 255, 170, 120);
        gfx.lineWidth = 1;
        gfx.rect(grid.offset.x, grid.offset.y, grid.cols * size, grid.rows * size);
        gfx.stroke();

        gfx.fillColor = cc.color(255, 40, 40, 95);
        gfx.strokeColor = cc.color(255, 90, 90, 170);
        gfx.lineWidth = 1;

        for (var y = 0; y < grid.rows; y++) {
            for (var x = 0; x < grid.cols; x++) {
                if (grid.cells[y][x]) continue;

                gfx.rect(
                    grid.offset.x + x * size,
                    grid.offset.y + y * size,
                    size,
                    size
                );
            }
        }

        gfx.fill();
        gfx.stroke();
        cc.log('[NiuPai] Path grid debug drawn for ' + grid.name);
    },
});

module.exports = NPPathGrid;
