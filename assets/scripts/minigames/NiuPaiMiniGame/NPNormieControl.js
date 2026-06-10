'use strict';

var NPNormieControl = cc.Class({
    name: 'NPNormieControl',

    ctor: function (game) {
        this.game = game;
        this.root = null;
        this.normies = [];
        this.nextId = 1;
        this.validSpawnTiles = null;
    },

    createNormies: function (count) {
        var game = this.game;
        this.normies = [];
        this.nextId = 1;
        this.validSpawnTiles = null;
        if (!game._world || !game._pathGrid) return;

        if (this.root && this.root.isValid) this.root.destroy();
        this.root = new cc.Node('RoamingNormies');
        this.root.zIndex = 16;
        game._world.addChild(this.root, 16);

        var total = Math.max(0, count || 0);
        for (var i = 0; i < total; i++) {
            this._createRoamingNormie(this._getDistributedSpawnPosition());
        }

        cc.log('[NiuPai] Roaming normies created. count=' + this.normies.length);
    },

    update: function (dt) {
        var game = this.game;
        if (!game._active || game._currentSection !== 'main' || !this.root) return;
        if (dt <= 0) return;

        for (var i = 0; i < this.normies.length; i++) {
            this._updateNormie(this.normies[i], dt);
        }
    },

    stopAll: function () {
        for (var i = 0; i < this.normies.length; i++) {
            var normie = this.normies[i];
            if (!normie) continue;
            if (normie.body) normie.body.linearVelocity = cc.v2(0, 0);
            if (normie.animator) normie.animator.setMoving(false);
        }
    },

    releaseQueueNormie: function (node) {
        if (!node || !node.isValid || !this.root) return;

        node.removeFromParent(false);
        this.root.addChild(node, 0);
        this._prepareNormieNode(node);
        var normie = this._makeNormieState(node);
        this._assignDistributionTarget(normie);
        this._markCurrentTileVisited(normie);
        this.normies.push(normie);
    },

    onQueueNormieAdded: function () {
        this.removeOffscreenNormie();
    },

    removeOffscreenNormie: function () {
        if (!this.normies || this.normies.length === 0) return false;

        var index = this._findOffscreenNormieIndex();
        if (index < 0) index = this._findFarthestNormieIndex();

        var normie = this.normies.splice(index, 1)[0];
        if (normie && normie.node && normie.node.isValid) normie.node.destroy();
        return true;
    },

    getCount: function () {
        return this.normies ? this.normies.length : 0;
    },

    _createRoamingNormie: function (position) {
        var node = this._createNormieNode('RoamingNormie_' + this.nextId++, position);
        this.normies.push(this._makeNormieState(node));
    },

    _createNormieNode: function (name, position) {
        var game = this.game;
        position = this._resolveSpawnPosition(position);
        var node = new cc.Node(name);
        node.setAnchorPoint(0.5, 0.5);
        node.setContentSize(game.normieFrameW, game.normieFrameH);
        node.setPosition(position);
        this.root.addChild(node, 0);

        node.addComponent(cc.Sprite);
        this._applyAppearance(node);
        this._prepareNormieNode(node);
        return node;
    },

    _prepareNormieNode: function (node) {
        var game = this.game;
        var body = node.getComponent(cc.RigidBody);
        if (!body) body = node.addComponent(cc.RigidBody);
        body.type = cc.RigidBodyType.Dynamic;
        body.gravityScale = 0;
        body.fixedRotation = true;
        body.allowSleep = false;
        body.linearDamping = game.normieLinearDamping;
        body.enabledContactListener = true;

        var collider = node.getComponent(cc.PhysicsBoxCollider);
        if (!collider) collider = node.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(
            game.normieFrameW * game.normieColliderWidthRatio,
            game.normieFrameH * game.normieColliderHeightRatio
        );
        collider.offset = cc.v2(0, game.normieFrameH * game.normieColliderYOffsetRatio);
        collider.friction = 0;
        collider.restitution = 0;
        collider.sensor = true;
        collider.apply();
        game._addActorCollisionFilter(node, 'normie');
    },

    _makeNormieState: function (node) {
        var anim = node.getComponent('PlayerAnimator');
        var normie = {
            node: node,
            body: node.getComponent(cc.RigidBody),
            animator: anim,
            direction: this._getRandomDirection(),
            directionTimer: this._randomFloat(this.game.normieDirectionMinSeconds, this.game.normieDirectionMaxSeconds),
            visited: {},
            path: [],
            targetTile: null,
            distributionTargetTile: null,
            retargetTimer: 0,
        };
        this._markCurrentTileVisited(normie);
        return normie;
    },

    _updateNormie: function (normie, dt) {
        if (!normie || !normie.node || !normie.node.isValid) return;

        var game = this.game;
        this._markCurrentTileVisited(normie);

        var velocity = game.normieCoverageEnabled
            ? this._getCoverageVelocity(normie, dt)
            : this._getRandomWanderVelocity(normie, dt);
        velocity = game._filterNodeMapBoundaryVelocity(
            normie.node,
            game.normieFrameW,
            game.normieFrameH,
            velocity.x,
            velocity.y
        );

        if (velocity.x === 0 && velocity.y === 0) {
            this._forceRetarget(normie);
        }

        if (normie.body) normie.body.linearVelocity = cc.v2(0, 0);
        var moved = false;
        if (velocity.x !== 0 || velocity.y !== 0) {
            moved = game._moveActorWithCollision(
                normie.node,
                game.normieFrameW,
                game.normieFrameH,
                game.normieColliderWidthRatio,
                game.normieColliderHeightRatio,
                game.normieColliderYOffsetRatio,
                velocity.x,
                velocity.y,
                dt,
                normie.body,
                'normie',
                'main'
            );
        }
        if ((velocity.x !== 0 || velocity.y !== 0) && !moved) {
            this._forceRetarget(normie);
        }
        if (normie.animator) {
            this._updateAnimator(normie.animator, moved ? velocity : cc.v2(0, 0));
        }
        game._clampNormieToMap(normie);
    },

    _getRandomWanderVelocity: function (normie, dt) {
        normie.directionTimer -= dt;
        if (normie.directionTimer <= 0) {
            normie.direction = this._getRandomDirection();
            normie.directionTimer = this._randomFloat(this.game.normieDirectionMinSeconds, this.game.normieDirectionMaxSeconds);
        }

        return cc.v2(
            normie.direction.x * this.game.normieWalkSpeed,
            normie.direction.y * this.game.normieWalkSpeed
        );
    },

    _getCoverageVelocity: function (normie, dt) {
        var game = this.game;
        var grid = game._pathGrid ? game._pathGrid.getGrid('main') : null;
        if (!grid) return this._getRandomWanderVelocity(normie, dt);

        normie.retargetTimer = Math.max(0, (normie.retargetTimer || 0) - dt);
        var waypoint = this._getCurrentWaypoint(normie, grid);
        if (!waypoint || this._isAtWaypoint(normie, waypoint)) {
            if (waypoint) this._consumeReachedWaypoint(normie, grid);
            if ((!normie.path || normie.path.length === 0) && normie.retargetTimer <= 0) {
                this._assignCoverageTarget(normie, grid);
            }
            waypoint = this._getCurrentWaypoint(normie, grid);
        }

        if (!waypoint) return this._getRandomWanderVelocity(normie, dt);

        var dx = waypoint.x - normie.node.x;
        var dy = waypoint.y - normie.node.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= 0) return cc.v2(0, 0);

        normie.direction = cc.v2(dx / distance, dy / distance);
        normie.directionTimer = this._randomFloat(game.normieDirectionMinSeconds, game.normieDirectionMaxSeconds);
        return cc.v2(
            normie.direction.x * game.normieWalkSpeed,
            normie.direction.y * game.normieWalkSpeed
        );
    },

    _getCurrentWaypoint: function (normie, grid) {
        if (!normie.path || normie.path.length === 0) return null;
        return this.game._pathGrid.gridTileToWorldCenter(grid, normie.path[0]);
    },

    _isAtWaypoint: function (normie, waypoint) {
        var dx = waypoint.x - normie.node.x;
        var dy = waypoint.y - normie.node.y;
        return Math.sqrt(dx * dx + dy * dy) <= this.game.normieWaypointReachDistance;
    },

    _consumeReachedWaypoint: function (normie, grid) {
        if (!normie.path || normie.path.length === 0) return;
        var reached = normie.path.shift();
        this._markTileVisited(normie, reached);
        if (normie.targetTile && reached.x === normie.targetTile.x && reached.y === normie.targetTile.y) {
            normie.targetTile = null;
        }
        if (normie.distributionTargetTile &&
            reached.x === normie.distributionTargetTile.x &&
            reached.y === normie.distributionTargetTile.y) {
            normie.distributionTargetTile = null;
        }
    },

    _assignCoverageTarget: function (normie, grid) {
        var tile = normie.distributionTargetTile || this._selectCoverageTarget(normie, grid);
        if (!tile) {
            this._resetVisitedIfFullyCovered(normie, grid);
            tile = this._selectCoverageTarget(normie, grid);
        }
        if (!tile) {
            normie.path = [];
            normie.targetTile = null;
            normie.retargetTimer = this.game.normieRetargetCooldown;
            return;
        }

        var path = this.game._pathGrid.findPathBetweenPositions(
            normie.node.getPosition(),
            this.game._pathGrid.gridTileToWorldCenter(grid, tile),
            grid
        );
        normie.path = path && path.length > 0 ? path : [tile];
        normie.targetTile = tile;
        normie.retargetTimer = this.game.normieRetargetCooldown;
    },

    _selectCoverageTarget: function (normie, grid) {
        var current = this.game._pathGrid.worldToGridTile(grid, normie.node.getPosition());
        current = current || this.game._pathGrid.findNearestWalkableTile(grid, this._worldToLooseGridTile(grid, normie.node.getPosition()));
        if (!current) return null;

        var neighbor = this._selectUnvisitedNeighbor(normie, grid, current);
        if (neighbor) return neighbor;

        return this._findNearestFrontier(normie, grid, current);
    },

    _selectUnvisitedNeighbor: function (normie, grid, current) {
        var dirs = this._shuffleDirections([
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
        ]);

        for (var i = 0; i < dirs.length; i++) {
            var tile = { x: current.x + dirs[i].x, y: current.y + dirs[i].y };
            if (!this._isValidCoverageTile(grid, tile)) continue;
            if (this._hasVisited(normie, tile)) continue;
            return tile;
        }

        return null;
    },

    _findNearestFrontier: function (normie, grid, start) {
        var maxRadius = Math.max(1, this.game.normieFrontierSearchRadius || 1);
        var queue = [{ x: start.x, y: start.y, d: 0 }];
        var seen = {};
        seen[start.x + ',' + start.y] = true;

        while (queue.length > 0) {
            var current = queue.shift();
            if (current.d > 0 && !this._hasVisited(normie, current)) return { x: current.x, y: current.y };
            if (current.d >= maxRadius) continue;

            var dirs = this._shuffleDirections([
                { x: 1, y: 0 },
                { x: -1, y: 0 },
                { x: 0, y: 1 },
                { x: 0, y: -1 },
            ]);
            for (var i = 0; i < dirs.length; i++) {
                var next = { x: current.x + dirs[i].x, y: current.y + dirs[i].y, d: current.d + 1 };
                var key = next.x + ',' + next.y;
                if (seen[key] || !this._isValidCoverageTile(grid, next)) continue;
                seen[key] = true;
                queue.push(next);
            }
        }

        return null;
    },

    _isValidCoverageTile: function (grid, tile) {
        if (!grid || !tile || !this.game._pathGrid.isWalkableTile(grid, tile.x, tile.y)) return false;
        var pos = this.game._pathGrid.gridTileToWorldCenter(grid, tile);
        return !this.game._isActorSpawnPositionBlocked(
            pos,
            this.game.normieFrameW,
            this.game.normieFrameH,
            this.game.normieColliderWidthRatio,
            this.game.normieColliderHeightRatio,
            this.game.normieColliderYOffsetRatio,
            'main'
        );
    },

    _markCurrentTileVisited: function (normie) {
        var grid = this.game._pathGrid ? this.game._pathGrid.getGrid('main') : null;
        var tile = grid ? this.game._pathGrid.worldToGridTile(grid, normie.node.getPosition()) : null;
        if (tile) this._markTileVisited(normie, tile);
    },

    _markTileVisited: function (normie, tile) {
        if (!normie || !tile) return;
        if (!normie.visited) normie.visited = {};
        normie.visited[tile.x + ',' + tile.y] = true;
    },

    _hasVisited: function (normie, tile) {
        return !!(normie && normie.visited && tile && normie.visited[tile.x + ',' + tile.y]);
    },

    _resetVisitedIfFullyCovered: function (normie, grid) {
        if (!normie || !grid) return;
        for (var y = 0; y < grid.rows; y++) {
            for (var x = 0; x < grid.cols; x++) {
                var tile = { x: x, y: y };
                if (this._isValidCoverageTile(grid, tile) && !this._hasVisited(normie, tile)) return;
            }
        }
        normie.visited = {};
        this._markCurrentTileVisited(normie);
    },

    _forceRetarget: function (normie) {
        normie.path = [];
        normie.targetTile = null;
        normie.distributionTargetTile = null;
        normie.retargetTimer = 0;
        normie.direction = this._getRandomDirection();
        normie.directionTimer = 0;
    },

    _shuffleDirections: function (dirs) {
        for (var i = dirs.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = dirs[i];
            dirs[i] = dirs[j];
            dirs[j] = tmp;
        }
        return dirs;
    },

    _updateAnimator: function (animator, velocity) {
        var moving = velocity.x !== 0 || velocity.y !== 0;
        if (moving) {
            var dir = Math.abs(velocity.x) > Math.abs(velocity.y)
                ? (velocity.x < 0 ? 'left' : 'right')
                : (velocity.y < 0 ? 'down' : 'up');
            animator.setDirection(dir);
        }
        animator.setMoving(moving);
    },

    _getRandomSpawnPosition: function () {
        var game = this.game;
        var grid = game._pathGrid ? game._pathGrid.getGrid('main') : null;
        var tile = grid ? game._pathGrid.getRandomWalkableTile(grid) : null;
        if (grid && tile) return this._resolveSpawnPosition(game._pathGrid.gridTileToWorldCenter(grid, tile));

        return this._resolveSpawnPosition(cc.v2(
            game.mainTilemapOffset.x + game.mapTileSize * 2,
            game.mainTilemapOffset.y + game.mapTileSize * 2
        ));
    },

    _getDistributedSpawnPosition: function () {
        var tile = this._selectLeastCrowdedTile(null, 24);
        if (tile) return this.game._pathGrid.gridTileToWorldCenter(this.game._pathGrid.getGrid('main'), tile);
        return this._getRandomSpawnPosition();
    },

    _assignDistributionTarget: function (normie) {
        var grid = this.game._pathGrid ? this.game._pathGrid.getGrid('main') : null;
        if (!grid || !normie || !normie.node) {
            if (normie && normie.node) {
                normie.direction = this._getDirectionAwayFromMcDonald(normie.node.getPosition());
                normie.directionTimer = this.game.normieDirectionMinSeconds;
            }
            return;
        }

        var target = this._selectLeastCrowdedTile(normie, 36);
        if (!target) {
            normie.direction = this._getDirectionAwayFromMcDonald(normie.node.getPosition());
            normie.directionTimer = this.game.normieDirectionMinSeconds;
            return;
        }

        var path = this.game._pathGrid.findPathBetweenPositions(
            normie.node.getPosition(),
            this.game._pathGrid.gridTileToWorldCenter(grid, target),
            grid
        );
        if (!path || path.length === 0) {
            normie.direction = this._getDirectionAwayFromMcDonald(normie.node.getPosition());
            normie.directionTimer = this.game.normieDirectionMinSeconds;
            return;
        }

        normie.path = path;
        normie.targetTile = target;
        normie.distributionTargetTile = target;
        normie.retargetTimer = this.game.normieRetargetCooldown;
        normie.directionTimer = this.game.normieDirectionMinSeconds;
    },

    _selectLeastCrowdedTile: function (selfNormie, sampleCount) {
        var tiles = this._getValidSpawnTiles();
        if (!tiles || tiles.length === 0) return null;

        sampleCount = Math.max(1, Math.min(sampleCount || 1, tiles.length));
        var bestTile = null;
        var bestScore = -Infinity;
        for (var i = 0; i < sampleCount; i++) {
            var tile = tiles[Math.floor(Math.random() * tiles.length)];
            var score = this._scoreDistributionTile(tile, selfNormie);
            if (score <= bestScore) continue;
            bestScore = score;
            bestTile = tile;
        }

        return bestTile;
    },

    _scoreDistributionTile: function (tile, selfNormie) {
        var nearestDistSq = Infinity;
        var densityPenalty = 0;

        for (var i = 0; i < this.normies.length; i++) {
            var normie = this.normies[i];
            if (!normie || normie === selfNormie || !normie.node || !normie.node.isValid) continue;

            var otherTile = this._getNormieDistributionTile(normie);
            if (!otherTile) continue;
            var dx = tile.x - otherTile.x;
            var dy = tile.y - otherTile.y;
            var distSq = dx * dx + dy * dy;
            nearestDistSq = Math.min(nearestDistSq, distSq);
            if (distSq <= 16) densityPenalty += (16 - distSq);
        }

        if (nearestDistSq === Infinity) nearestDistSq = 9999;
        return nearestDistSq - densityPenalty * 2;
    },

    _getNormieDistributionTile: function (normie) {
        if (normie.distributionTargetTile) return normie.distributionTargetTile;
        var grid = this.game._pathGrid ? this.game._pathGrid.getGrid('main') : null;
        return grid && normie.node ? this.game._pathGrid.worldToGridTile(grid, normie.node.getPosition()) : null;
    },

    _getValidSpawnTiles: function () {
        if (this.validSpawnTiles) return this.validSpawnTiles;

        var grid = this.game._pathGrid ? this.game._pathGrid.getGrid('main') : null;
        var tiles = [];
        if (!grid) {
            this.validSpawnTiles = tiles;
            return tiles;
        }

        for (var y = 0; y < grid.rows; y++) {
            for (var x = 0; x < grid.cols; x++) {
                var tile = { x: x, y: y };
                if (this._isValidCoverageTile(grid, tile)) tiles.push(tile);
            }
        }

        this.validSpawnTiles = tiles;
        return tiles;
    },

    _resolveSpawnPosition: function (position) {
        var game = this.game;
        if (!game._isActorSpawnPositionBlocked(
            position,
            game.normieFrameW,
            game.normieFrameH,
            game.normieColliderWidthRatio,
            game.normieColliderHeightRatio,
            game.normieColliderYOffsetRatio,
            'main'
        )) {
            return position;
        }

        var grid = game._pathGrid ? game._pathGrid.getGrid('main') : null;
        if (!grid) {
            cc.warn('[NiuPai] Normie spawn is blocked and no grid is available.');
            return position;
        }

        var originTile = game._pathGrid.worldToGridTile(grid, position) ||
            game._pathGrid.findNearestWalkableTile(grid, this._worldToLooseGridTile(grid, position));
        var maxRadius = Math.max(grid.cols, grid.rows);

        for (var radius = 0; radius <= maxRadius; radius++) {
            var candidate = this._findValidSpawnInRing(grid, originTile, radius);
            if (candidate) {
                cc.log('[NiuPai] Normie spawn adjusted from ' +
                    Math.round(position.x) + ',' + Math.round(position.y) + ' to ' +
                    Math.round(candidate.x) + ',' + Math.round(candidate.y));
                return candidate;
            }
        }

        cc.warn('[NiuPai] Could not find non-blocked normie spawn.');
        return position;
    },

    _findValidSpawnInRing: function (grid, originTile, radius) {
        if (!grid || !originTile) return null;

        var game = this.game;
        for (var y = originTile.y - radius; y <= originTile.y + radius; y++) {
            for (var x = originTile.x - radius; x <= originTile.x + radius; x++) {
                if (radius > 0 && Math.abs(x - originTile.x) !== radius && Math.abs(y - originTile.y) !== radius) {
                    continue;
                }
                if (!game._pathGrid.isWalkableTile(grid, x, y)) continue;

                var pos = game._pathGrid.gridTileToWorldCenter(grid, { x: x, y: y });
                if (!game._isActorSpawnPositionBlocked(
                    pos,
                    game.normieFrameW,
                    game.normieFrameH,
                    game.normieColliderWidthRatio,
                    game.normieColliderHeightRatio,
                    game.normieColliderYOffsetRatio,
                    'main'
                )) {
                    return pos;
                }
            }
        }

        return null;
    },

    _worldToLooseGridTile: function (grid, position) {
        var game = this.game;
        return {
            x: Math.max(0, Math.min(grid.cols - 1, Math.floor((position.x - grid.offset.x) / game.mapTileSize))),
            y: Math.max(0, Math.min(grid.rows - 1, Math.floor((position.y - grid.offset.y) / game.mapTileSize))),
        };
    },

    _getRandomDirection: function () {
        if (Math.random() < this.game.normieIdleChance) return cc.v2(0, 0);

        var angle = Math.random() * Math.PI * 2;
        return cc.v2(Math.cos(angle), Math.sin(angle));
    },

    _getDirectionAwayFromMcDonald: function (position) {
        var rect = this.game._getMcOrderTriggerRect ? this.game._getMcOrderTriggerRect() : null;
        if (!rect) return this._getRandomDirection();

        var cx = (rect.minX + rect.maxX) / 2;
        var cy = (rect.minY + rect.maxY) / 2;
        var dx = position.x - cx;
        var dy = position.y - cy;
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len <= 0) return this._getRandomDirection();
        return cc.v2(dx / len, dy / len);
    },

    _findOffscreenNormieIndex: function () {
        for (var i = 0; i < this.normies.length; i++) {
            if (!this.game._isNodeVisibleToCamera(this.normies[i].node)) return i;
        }
        return -1;
    },

    _findFarthestNormieIndex: function () {
        var player = this.game._playerNode;
        if (!player) return this.normies.length - 1;

        var bestIndex = 0;
        var bestDistance = -1;
        for (var i = 0; i < this.normies.length; i++) {
            var node = this.normies[i].node;
            if (!node || !node.isValid) continue;
            var dx = node.x - player.x;
            var dy = node.y - player.y;
            var distSq = dx * dx + dy * dy;
            if (distSq <= bestDistance) continue;
            bestDistance = distSq;
            bestIndex = i;
        }
        return bestIndex;
    },

    _applyAppearance: function (node) {
        var game = this.game;
        if (game.normieSheet) {
            var anim = node.getComponent('PlayerAnimator') || node.addComponent('PlayerAnimator');
            anim.spritesheet = game.normieSheet;
            anim.frameWidth = game.normieFrameW;
            anim.frameHeight = game.normieFrameH;
            anim._buildFrames();
            anim.setDirection('down');
            anim.setMoving(false);
            return;
        }

        this._drawFallback(node);
    },

    _drawFallback: function (node) {
        var gfx = node.getComponent(cc.Graphics) || node.addComponent(cc.Graphics);
        var w = this.game.normieFrameW;
        var h = this.game.normieFrameH;
        var colors = [
            cc.color(92, 160, 220),
            cc.color(210, 130, 180),
            cc.color(110, 190, 135),
            cc.color(230, 170, 80),
        ];
        var c = colors[Math.floor(Math.random() * colors.length)];

        gfx.clear();
        gfx.fillColor = c;
        gfx.rect(-w / 2 + 6, -h / 2 + 6, w - 12, h - 13);
        gfx.fill();

        gfx.fillColor = cc.color(236, 198, 160);
        gfx.rect(-w / 2 + 9, h / 2 - 13, w - 18, 8);
        gfx.fill();

        gfx.fillColor = cc.color(35, 35, 42);
        gfx.rect(-5, h / 2 - 10, 3, 3);
        gfx.rect(3, h / 2 - 10, 3, 3);
        gfx.fill();
    },

    _randomFloat: function (min, max) {
        if (max < min) max = min;
        return min + Math.random() * (max - min);
    },
});

module.exports = NPNormieControl;
