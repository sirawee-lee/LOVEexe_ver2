'use strict';

var NPBlackDogControl = cc.Class({
    name: 'NPBlackDogControl',

    ctor: function (game) {
        this.game = game;
        this.dogs = [];
        this.tunnelSpawnTimer = 0;
        this.tunnelSpawned = false;
        this.robbingNiuPai = false;
    },

    createBlackDogs: function () {
        var game = this.game;
        this.dogs = [];
        if (!game._world || game.blackDogCount <= 0) return;

        var grid = game._pathGrid ? game._pathGrid.getGrid('main') : null;
        for (var i = 0; i < game.blackDogCount; i++) {
            this._createDogAt(this._getSpawnPosition(i, grid), 'main');
        }
    },

    update: function (dt) {
        var game = this.game;
        if (!game._active || !this.dogs || !game._playerNode) return;
        if (dt <= 0) return;

        this._updateTunnelSpawner(dt);
        this._updateRobbing(dt);

        for (var i = 0; i < this.dogs.length; i++) {
            this._updateDog(this.dogs[i], dt);
        }
    },

    stopAll: function () {
        for (var i = 0; i < this.dogs.length; i++) {
            this._stopDog(this.dogs[i]);
        }
    },

    onEnterTunnel: function () {
        this._destroyDogsInSection('tunnel');
        this.tunnelSpawnTimer = this.game.tunnelBlackDogSpawnDelay;
        this.tunnelSpawned = false;
    },

    onExitTunnel: function () {
        this._destroyDogsInSection('tunnel');
        this.tunnelSpawnTimer = 0;
        this.tunnelSpawned = false;
    },

    startRobbingNiuPai: function () {
        this.robbingNiuPai = true;
        this._clearDogPaths();
        cc.log('[NiuPai] Black dogs robbing NiuPai.');
    },

    stopRobbingNiuPai: function (message) {
        if (!this.robbingNiuPai) return;
        this._cancelRobbing(message);
    },

    _updateRobbing: function (dt) {
        if (this.robbingNiuPai && this._shouldCancelRobbing()) {
            this._cancelRobbing('[NiuPai] Black dog ambush cancelled.');
        }
    },

    _shouldCancelRobbing: function () {
        return this._hasActiveBigMacBait() || this._niuPaiMovedAfterOrder();
    },

    _cancelRobbing: function (message) {
        this.robbingNiuPai = false;
        this._clearDogPaths();
        if (message) cc.log(message);
    },

    _updateTunnelSpawner: function (dt) {
        var game = this.game;
        if (game._currentSection !== 'tunnel' || this.tunnelSpawned) return;

        this.tunnelSpawnTimer -= dt;
        if (this.tunnelSpawnTimer > 0) return;

        this.tunnelSpawned = true;
        this._summonTunnelDogs();
    },

    _summonTunnelDogs: function () {
        var game = this.game;
        var count = Math.max(0, game.tunnelBlackDogSpawnCount || 0);
        if (count <= 0) return;

        var entrance = game._getTunnelReturnEntranceCenter();
        var exit = game._getTunnelExitCenter();

        for (var i = 0; i < count; i++) {
            if (entrance) this._createDogAt(this._jitterPosition(entrance, i), 'tunnel');
            if (exit) this._createDogAt(this._jitterPosition(exit, i + count), 'tunnel');
        }

        cc.log('[NiuPai] Tunnel black dogs summoned. countPerPoint=' + count);
    },

    _updateDog: function (dog, dt) {
        var game = this.game;
        if (!dog || !dog.node || !dog.node.isValid) return;

        if (dog.section !== game._currentSection || game._orderOpen) {
            this._stopDog(dog);
            return;
        }

        var grid = game._pathGrid ? game._pathGrid.getGrid(dog.section) : null;
        if (!grid) {
            this._stopDog(dog);
            return;
        }

        if (this._updateStun(dog, dt)) return;

        var bait = game._getActiveBigMacBaitTarget
            ? game._getActiveBigMacBaitTarget(dog.node.getPosition())
            : null;
        var baiting = !!bait;
        var robbing = !baiting && this.robbingNiuPai && game._niuPaiNode && game._currentSection === 'main';
        var patrolling = !robbing && game._playerInQueue && game._currentSection === 'main';
        var initialChasing = dog.section === 'main' && dog.initialChaseTimer > 0;
        if (dog.initialChaseTimer > 0) {
            dog.initialChaseTimer = Math.max(0, dog.initialChaseTimer - dt);
        }

        var chasing = false;
        if (!baiting && !robbing && !patrolling) {
            if (initialChasing) {
                chasing = true;
            } else {
                var dxToPlayer = game._playerNode.x - dog.node.x;
                var dyToPlayer = game._playerNode.y - dog.node.y;
                var distanceToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);
                chasing = distanceToPlayer <= game.blackDogChaseRadius;
            }
        }
        var mode = baiting ? 'bait' : (robbing ? 'rob' : (patrolling ? 'patrol' : (chasing ? 'chase' : 'wander')));
        if (game._setBlackDogFollowingStatusIcon) {
            game._setBlackDogFollowingStatusIcon(dog.node, mode === 'rob');
        }

        if (dog.mode !== mode) {
            dog.mode = mode;
            dog.path = [];
            dog.pathTimer = 0;
            if (mode === 'bait' && game._playBlackDogBaitAlert) {
                game._playBlackDogBaitAlert(dog.node);
            }
        }

        var target = baiting
            ? this._getBaitTarget(dog, bait, grid, dt)
            : (robbing
            ? this._getRobTarget(dog, grid, dt)
            : (patrolling
                ? this._getPatrolTarget(dog, grid, dt)
                : (chasing
                ? this._getChaseTarget(dog, grid, dt)
                : this._getWanderTarget(dog, grid, dt))));

        this._moveToward(dog, target, (chasing || robbing || baiting) ? game.blackDogChaseSpeed : game.blackDogWanderSpeed, dt);
        this._updateAttack(dog, dt);
    },

    _createDogAt: function (position, section) {
        var game = this.game;
        var index = this.dogs.length + 1;
        position = this._resolveSpawnPosition(position, section || 'main');
        var dog = new cc.Node('BlackDog_' + index);
        dog.setAnchorPoint(0.5, 0.5);
        dog.setContentSize(game.blackDogFrameW, game.blackDogFrameH);
        dog.setPosition(position);
        game._world.addChild(dog, 18);

        dog.addComponent(cc.Sprite);
        var animator = null;
        if (game.blackDogSheet) {
            animator = dog.addComponent('PlayerAnimator');
            animator.spritesheet = game.blackDogSheet;
            animator.frameWidth = game.blackDogFrameW;
            animator.frameHeight = game.blackDogFrameH;
            animator._buildFrames();
            animator.setDirection('down');
            animator.setMoving(false);
        } else {
            this._drawFallback(dog);
        }

        var body = dog.addComponent(cc.RigidBody);
        body.type = cc.RigidBodyType.Dynamic;
        body.gravityScale = 0;
        body.fixedRotation = true;
        body.allowSleep = false;
        body.linearDamping = game.blackDogLinearDamping;

        var collider = dog.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(
            game.blackDogFrameW * game.blackDogColliderWidthRatio,
            game.blackDogFrameH * game.blackDogColliderHeightRatio
        );
        collider.offset = cc.v2(0, game.blackDogFrameH * game.blackDogColliderYOffsetRatio);
        collider.friction = 0;
        collider.restitution = 0;
        collider.sensor = true;
        collider.apply();
        game._addActorCollisionFilter(dog, 'blackdog');
        game._clampBlackDogToMap({
            node: dog,
            body: body,
            section: section,
        });

        this.dogs.push({
            node: dog,
            body: body,
            animator: animator,
            section: section,
            mode: 'wander',
            path: [],
            pathTimer: 0,
            attackTimer: 0,
            stunTimer: 0,
            initialChaseTimer: section === 'main'
                ? Math.max(0, game.blackDogInitialChaseSeconds || 0)
                : 0,
            wanderTimer: 0,
            wanderTarget: null,
        });
        if (game._playSfx) game._playSfx(game.sfxBlackDogSpawn, 0.75);
        cc.log('[NiuPai] Black dog spawned in ' + section + ' at ' + dog.x + ', ' + dog.y);
    },

    _updateAttack: function (dog, dt) {
        var game = this.game;
        if (!game._active) return;

        dog.attackTimer = Math.max(0, (dog.attackTimer || 0) - dt);
        if (dog.attackTimer > 0) return;

        var dogRect = game._getBlackDogTriggerRect(dog.node);
        var hitPlayer = !game._playerInQueue && game._rectsOverlap(dogRect, game._getPlayerTriggerRect());
        var hitNiuPai = !game._niuPaiInQueue &&
            (game._rectsOverlap(dogRect, game._getNiuPaiTriggerRect()) ||
            this._isRobbingDogNearNiuPai(dog));
        var bait = game._getActiveBigMacBaitTarget
            ? game._getActiveBigMacBaitTarget(dog.node.getPosition())
            : null;
        var hitBait = bait && game._rectsOverlap(dogRect, game._getBigMacBaitRect(bait));
        if (!hitPlayer && !hitNiuPai && !hitBait) return;

        dog.attackTimer = game.blackDogAttackInterval;
        if (game._playSfx) game._playSfx(game.sfxBlackDogAttack);
        if (hitBait) game._damageBigMacBait(bait, game.blackDogDamageHp);
        if (hitPlayer) game._damagePlayer(game.blackDogDamageHp);
        if (hitNiuPai) {
            game._damageNiuPai(game.blackDogDamageHp);
            this._stunDogFromNiuPaiCounter(dog);
        }
    },

    _updateStun: function (dog, dt) {
        dog.stunTimer = Math.max(0, dog.stunTimer || 0);
        if (dog.stunTimer <= 0) return false;

        dog.stunTimer = Math.max(0, dog.stunTimer - dt);
        this._stopDog(dog);
        if (dog.stunTimer <= 0) this._clearMcFlurryStunSprite(dog);
        return true;
    },

    _stunDogFromNiuPaiCounter: function (dog) {
        var stunSeconds = Math.max(0, this.game.blackDogStunAfterNiuPaiHit || 0);
        if (stunSeconds <= 0) return;

        this._stunDog(dog, stunSeconds, false);
    },

    _stunDog: function (dog, stunSeconds, useMcFlurryStaticSprite) {
        if (!dog || stunSeconds <= 0) return;
        if (this.game._flashDamageTarget) this.game._flashDamageTarget(dog.node);
        if (useMcFlurryStaticSprite && this.game._addBlackDogDamageScore) {
            this.game._addBlackDogDamageScore();
        }
        if (this.game._playSfx) this.game._playSfx(this.game.sfxBlackDogStun);
        dog.stunTimer = Math.max(dog.stunTimer || 0, stunSeconds);
        if (useMcFlurryStaticSprite) this._applyMcFlurryStunSprite(dog);
        dog.path = [];
        dog.pathTimer = 0;
        this._stopDog(dog);
    },

    stunDogsInMcFlurryExplosion: function (center, rangeTiles, stunSeconds) {
        if (!center || stunSeconds <= 0) return;

        var stunned = 0;
        for (var i = 0; i < this.dogs.length; i++) {
            var dog = this.dogs[i];
            if (!dog || !dog.node || !dog.node.isValid) continue;
            if (dog.section !== this.game._currentSection) continue;
            if (!this._isInPlusExplosion(dog.node.getPosition(), center, rangeTiles)) continue;

            this._stunDog(dog, stunSeconds, true);
            stunned++;
        }

        cc.log('[NiuPai] McFlurry stunned black dogs: ' + stunned);
    },

    _isInPlusExplosion: function (position, center, rangeTiles) {
        var tileSize = this.game.mapTileSize || 32;
        var tileX = Math.round((position.x - center.x) / tileSize);
        var tileY = Math.round((position.y - center.y) / tileSize);
        return Math.abs(tileX) + Math.abs(tileY) <= Math.max(0, rangeTiles || 0);
    },

    _niuPaiMovedAfterOrder: function () {
        var game = this.game;
        if (!game._niuPaiNode || !game._niuPaiControl) return true;
        if (!game._niuPaiControl.isWaitingForPlayer) return false;
        return !game._niuPaiControl.isWaitingForPlayer();
    },

    _hasActiveBigMacBait: function () {
        var baits = this.game._bigMacBaits;
        if (!baits || baits.length === 0) return false;

        for (var i = 0; i < baits.length; i++) {
            var bait = baits[i];
            if (bait && bait.hp > 0 && bait.node && bait.node.isValid) return true;
        }

        return false;
    },

    _isRobbingDogNearNiuPai: function (dog) {
        var game = this.game;
        if (!this.robbingNiuPai || !dog || dog.section !== 'main' || !game._niuPaiNode) return false;

        var reachDistance = Math.max(0, game.blackDogRobReachDistance || 0);
        var dx = dog.node.x - game._niuPaiNode.x;
        var dy = dog.node.y - game._niuPaiNode.y;
        return Math.sqrt(dx * dx + dy * dy) <= reachDistance;
    },

    _hasDogReachedNiuPai: function () {
        var game = this.game;
        if (!game._niuPaiNode) return true;

        var reachDistance = Math.max(0, game.blackDogRobReachDistance || 0);
        var niuPaiRect = game._getNiuPaiTriggerRect();
        for (var i = 0; i < this.dogs.length; i++) {
            var dog = this.dogs[i];
            if (!dog || dog.section !== 'main' || !dog.node || !dog.node.isValid) continue;

            var dx = dog.node.x - game._niuPaiNode.x;
            var dy = dog.node.y - game._niuPaiNode.y;
            if (Math.sqrt(dx * dx + dy * dy) <= reachDistance) return true;

            if (game._rectsOverlap(game._getBlackDogTriggerRect(dog.node), niuPaiRect)) return true;
        }

        return false;
    },

    _getPatrolTarget: function (dog, grid, dt) {
        var game = this.game;
        var patrolPosition = this._getMcDonaldPatrolPosition();
        dog.pathTimer -= dt;
        if (dog.pathTimer <= 0 || !dog.path || dog.path.length === 0) {
            dog.pathTimer = game.blackDogPathRefreshInterval;
            dog.path = game._pathGrid.findPathBetweenPositions(
                dog.node.getPosition(),
                patrolPosition,
                grid
            );
        }

        return this._getPathWaypointTarget(dog, grid, game.blackDogWaypointReachDistance) ||
            patrolPosition;
    },

    _getMcDonaldPatrolPosition: function () {
        var game = this.game;
        return cc.v2(
            game.mainTilemapOffset.x + (game.blackDogPatrolX + 0.5) * game.mapTileSize,
            game.mainTilemapOffset.y + (game.blackDogPatrolY + 0.5) * game.mapTileSize
        );
    },

    _getChaseTarget: function (dog, grid, dt) {
        var game = this.game;
        dog.pathTimer -= dt;
        if (dog.pathTimer <= 0 || !dog.path || dog.path.length === 0) {
            dog.pathTimer = game.blackDogPathRefreshInterval;
            dog.path = game._pathGrid.findPathBetweenPositions(
                dog.node.getPosition(),
                game._playerNode.getPosition(),
                grid
            );
        }

        return this._getPathWaypointTarget(dog, grid, game.blackDogWaypointReachDistance) ||
            game._playerNode.getPosition();
    },

    _getBaitTarget: function (dog, bait, grid, dt) {
        var game = this.game;
        var target = bait && bait.node && bait.node.isValid
            ? bait.node.getPosition()
            : game._playerNode.getPosition();
        dog.pathTimer -= dt;
        if (dog.pathTimer <= 0 || !dog.path || dog.path.length === 0) {
            dog.pathTimer = game.blackDogPathRefreshInterval;
            dog.path = game._pathGrid.findPathBetweenPositions(
                dog.node.getPosition(),
                target,
                grid
            );
        }

        return this._getPathWaypointTarget(dog, grid, game.blackDogWaypointReachDistance) ||
            target;
    },

    _getRobTarget: function (dog, grid, dt) {
        var game = this.game;
        var target = game._niuPaiNode ? game._niuPaiNode.getPosition() : game._playerNode.getPosition();
        dog.pathTimer -= dt;
        if (dog.pathTimer <= 0 || !dog.path || dog.path.length === 0) {
            dog.pathTimer = game.blackDogPathRefreshInterval;
            dog.path = game._pathGrid.findPathBetweenPositions(
                dog.node.getPosition(),
                target,
                grid
            );
        }

        return this._getPathWaypointTarget(dog, grid, game.blackDogWaypointReachDistance) ||
            target;
    },

    _getWanderTarget: function (dog, grid, dt) {
        var game = this.game;
        dog.wanderTimer -= dt;

        var reached = false;
        if (dog.wanderTarget) {
            var dx = dog.wanderTarget.x - dog.node.x;
            var dy = dog.wanderTarget.y - dog.node.y;
            reached = Math.sqrt(dx * dx + dy * dy) <= game.blackDogWaypointReachDistance;
        }

        if (dog.wanderTimer <= 0 || !dog.wanderTarget || reached) {
            dog.wanderTimer = game.blackDogWanderRefreshInterval;
            var tile = game._pathGrid.getRandomWalkableTile(grid);
            dog.wanderTarget = tile ? game._pathGrid.gridTileToWorldCenter(grid, tile) : dog.node.getPosition();
            dog.path = game._pathGrid.findPathBetweenPositions(dog.node.getPosition(), dog.wanderTarget, grid);
            dog.pathTimer = game.blackDogPathRefreshInterval;
        }

        return this._getPathWaypointTarget(dog, grid, game.blackDogWaypointReachDistance) ||
            dog.wanderTarget ||
            dog.node.getPosition();
    },

    _getPathWaypointTarget: function (agent, grid, reachDistance) {
        var game = this.game;
        if (!agent.path || agent.path.length === 0) return null;

        while (agent.path.length > 1) {
            var first = game._pathGrid.gridTileToWorldCenter(grid, agent.path[0]);
            var dx = first.x - agent.node.x;
            var dy = first.y - agent.node.y;
            if (Math.sqrt(dx * dx + dy * dy) > reachDistance) break;
            agent.path.shift();
        }

        return game._pathGrid.gridTileToWorldCenter(grid, agent.path[0]);
    },

    _moveToward: function (dog, target, speed, dt) {
        var game = this.game;
        if (!target) {
            this._stopDog(dog);
            return;
        }

        var dx = target.x - dog.node.x;
        var dy = target.y - dog.node.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        var velocity = cc.v2(0, 0);
        var dir = null;

        if (distance > game.blackDogWaypointReachDistance) {
            velocity.x = dx / distance * speed;
            velocity.y = dy / distance * speed;
            velocity = game._filterNodeMapBoundaryVelocity(
                dog.node,
                game.blackDogFrameW,
                game.blackDogFrameH,
                velocity.x,
                velocity.y
            );
            dir = Math.abs(velocity.x) > Math.abs(velocity.y)
                ? (velocity.x < 0 ? 'left' : 'right')
                : (velocity.y < 0 ? 'down' : 'up');
        }

        if (dog.body) dog.body.linearVelocity = cc.v2(0, 0);
        var moved = false;
        if (velocity.x !== 0 || velocity.y !== 0) {
            moved = game._moveActorWithCollision(
                dog.node,
                game.blackDogFrameW,
                game.blackDogFrameH,
                game.blackDogColliderWidthRatio,
                game.blackDogColliderHeightRatio,
                game.blackDogColliderYOffsetRatio,
                velocity.x,
                velocity.y,
                dt,
                dog.body,
                'blackdog',
                dog.section
            );
        }

        if (dog.animator) {
            if (dir) dog.animator.setDirection(dir);
            dog.animator.setMoving(moved);
        }
        if (game._setRunParticleActive) game._setRunParticleActive('blackdog', dog.node, moved);

        game._clampBlackDogToMap(dog);
    },

    _applyMcFlurryStunSprite: function (dog) {
        var frame = this.game.blackDogMcFlurryStunSprite;
        if (!dog || !dog.node || !dog.node.isValid || !frame) return;

        var sprite = dog.node.getComponent(cc.Sprite);
        if (!sprite) return;
        if (!dog.mcFlurryStunSpriteActive) {
            dog.mcFlurryStunOriginalFrame = sprite.spriteFrame;
            dog.mcFlurryStunAnimatorEnabled = dog.animator ? dog.animator.enabled : true;
        }
        dog.mcFlurryStunSpriteActive = true;
        if (dog.animator) {
            dog.animator.setMoving(false);
            dog.animator.enabled = false;
        }
        sprite.spriteFrame = frame;
    },

    _clearMcFlurryStunSprite: function (dog) {
        if (!dog || !dog.mcFlurryStunSpriteActive || !dog.node || !dog.node.isValid) return;

        var sprite = dog.node.getComponent(cc.Sprite);
        if (sprite && dog.mcFlurryStunOriginalFrame) {
            sprite.spriteFrame = dog.mcFlurryStunOriginalFrame;
        }
        if (dog.animator) {
            dog.animator.enabled = dog.mcFlurryStunAnimatorEnabled !== false;
            dog.animator.setMoving(false);
        }
        dog.mcFlurryStunSpriteActive = false;
        dog.mcFlurryStunOriginalFrame = null;
    },

    _stopDog: function (dog) {
        if (!dog) return;
        if (dog.body) dog.body.linearVelocity = cc.v2(0, 0);
        if (dog.animator) dog.animator.setMoving(false);
        if (this.game._setRunParticleActive) this.game._setRunParticleActive('blackdog', dog.node, false);
        if (this.game._setBlackDogFollowingStatusIcon) {
            this.game._setBlackDogFollowingStatusIcon(dog.node, false);
        }
    },

    _destroyDogsInSection: function (section) {
        var kept = [];
        for (var i = 0; i < this.dogs.length; i++) {
            var dog = this.dogs[i];
            if (dog.section !== section) {
                kept.push(dog);
                continue;
            }

            this._stopDog(dog);
            if (dog.node && dog.node.isValid) dog.node.destroy();
        }

        this.dogs = kept;
    },

    _clearDogPaths: function () {
        for (var i = 0; i < this.dogs.length; i++) {
            this.dogs[i].path = [];
            this.dogs[i].pathTimer = 0;
        }
    },

    _jitterPosition: function (center, index) {
        var jitter = this.game.tunnelBlackDogSpawnJitter || 0;
        if (jitter <= 0) return center;

        var offsets = [
            cc.v2(0, 0),
            cc.v2(jitter, 0),
            cc.v2(-jitter, 0),
            cc.v2(0, jitter),
            cc.v2(0, -jitter),
            cc.v2(jitter, jitter),
            cc.v2(-jitter, jitter),
            cc.v2(jitter, -jitter),
            cc.v2(-jitter, -jitter),
        ];
        var offset = offsets[index % offsets.length];
        return cc.v2(center.x + offset.x, center.y + offset.y);
    },

    _getSpawnPosition: function (index, grid) {
        var tile = this._getRandomSpawnTileNearPlayer(grid);
        if (grid && tile) {
            return this._resolveSpawnPosition(this.game._pathGrid.gridTileToWorldCenter(grid, tile), 'main');
        }

        return cc.v2(
            this.game.mainTilemapOffset.x + this.game.mapTileSize * (2 + index),
            this.game.mainTilemapOffset.y + this.game.mapTileSize * 2
        );
    },

    _resolveSpawnPosition: function (position, section) {
        var game = this.game;
        section = section || 'main';
        if (!game._isActorSpawnPositionBlocked(
            position,
            game.blackDogFrameW,
            game.blackDogFrameH,
            game.blackDogColliderWidthRatio,
            game.blackDogColliderHeightRatio,
            game.blackDogColliderYOffsetRatio,
            section
        )) {
            return position;
        }

        var grid = game._pathGrid ? game._pathGrid.getGrid(section) : null;
        if (!grid) {
            cc.warn('[NiuPai] Black dog spawn is blocked and no grid is available. section=' + section);
            return position;
        }

        var originTile = game._pathGrid.worldToGridTile(grid, position) ||
            game._pathGrid.findNearestWalkableTile(grid, this._worldToLooseGridTile(grid, position));
        var maxRadius = Math.max(grid.cols, grid.rows);

        for (var radius = 0; radius <= maxRadius; radius++) {
            var candidate = this._findValidSpawnInRing(grid, originTile, radius, section);
            if (candidate) {
                cc.log('[NiuPai] Black dog spawn adjusted from ' +
                    Math.round(position.x) + ',' + Math.round(position.y) + ' to ' +
                    Math.round(candidate.x) + ',' + Math.round(candidate.y));
                return candidate;
            }
        }

        cc.warn('[NiuPai] Could not find non-blocked black dog spawn. section=' + section);
        return position;
    },

    _findValidSpawnInRing: function (grid, originTile, radius, section) {
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
                    game.blackDogFrameW,
                    game.blackDogFrameH,
                    game.blackDogColliderWidthRatio,
                    game.blackDogColliderHeightRatio,
                    game.blackDogColliderYOffsetRatio,
                    section
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

    _getRandomSpawnTileNearPlayer: function (grid) {
        var game = this.game;
        if (!grid || !game._pathGrid) return null;

        var centerTile = this._getPlayerSpawnTile(grid);
        var radius = Math.max(0, game.blackDogSpawnRadiusTiles || 0);
        var minRadius = Math.max(0, game.blackDogSpawnMinRadiusTiles || 0);
        minRadius = Math.min(minRadius, radius);
        var candidates = [];

        for (var y = centerTile.y - radius; y <= centerTile.y + radius; y++) {
            for (var x = centerTile.x - radius; x <= centerTile.x + radius; x++) {
                if (!game._pathGrid.isWalkableTile(grid, x, y)) continue;
                var dx = Math.abs(x - centerTile.x);
                var dy = Math.abs(y - centerTile.y);
                var tileDistance = Math.max(dx, dy);
                if (tileDistance > radius || tileDistance < minRadius) continue;
                candidates.push({ x: x, y: y });
            }
        }

        if (candidates.length > 0) {
            return candidates[Math.floor(Math.random() * candidates.length)];
        }

        return game._pathGrid.getRandomWalkableTile(grid);
    },

    _getPlayerSpawnTile: function (grid) {
        var game = this.game;
        if (!game._mainTiledMap) {
            return game._pathGrid.worldToGridTile(grid, game.playerStartPosition) || { x: 0, y: 0 };
        }

        var props = game._mainTiledMap.getProperties() || {};
        var tileX = game._readOptionalNumberProperty(props, 'playerSpawnX');
        var tileY = game._readOptionalNumberProperty(props, 'playerSpawnY');

        if (tileX !== null && tileY !== null) {
            return { x: Math.floor(tileX), y: Math.floor(tileY) };
        }

        return game._pathGrid.worldToGridTile(grid, game.playerStartPosition) || { x: 0, y: 0 };
    },

    _drawFallback: function (node) {
        var game = this.game;
        var gfx = node.addComponent(cc.Graphics);
        var w = game.blackDogFrameW;
        var h = game.blackDogFrameH;

        gfx.fillColor = cc.color(18, 18, 24);
        gfx.rect(-w / 2 + 4, -h / 2 + 8, w - 8, h - 14);
        gfx.fill();

        gfx.fillColor = cc.color(8, 8, 12);
        gfx.rect(-w / 2 + 7, h / 2 - 13, 6, 6);
        gfx.rect(w / 2 - 13, h / 2 - 13, 6, 6);
        gfx.fill();

        gfx.fillColor = cc.color(240, 65, 65);
        gfx.rect(-6, 0, 3, 3);
        gfx.rect(3, 0, 3, 3);
        gfx.fill();

        gfx.fillColor = cc.color(245, 245, 245);
        gfx.rect(-2, -7, 2, 3);
        gfx.rect(2, -7, 2, 3);
        gfx.fill();
    },
});

module.exports = NPBlackDogControl;
