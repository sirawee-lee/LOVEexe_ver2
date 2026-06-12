'use strict';

var NPNiuPaiControl = cc.Class({
    name: 'NPNiuPaiControl',

    ctor: function (game) {
        this.game = game;
        this.path = [];
        this.pathTimer = 0;
        this.waitingForPlayer = false;
        this.following = false;
        this.heldItem = null;
    },

    createNiuPai: function () {
        var game = this.game;
        if (!game._playerNode) return;

        var niuPai = new cc.Node('NiuPaiCompanion');
        niuPai.setAnchorPoint(0.5, 0.5);
        niuPai.setContentSize(game.niuPaiFrameW, game.niuPaiFrameH);
        niuPai.setPosition(this.getSpawnPosition());
        game._world.addChild(niuPai, 19);

        niuPai.addComponent(cc.Sprite);
        var animator = null;
        if (game.niuPaiSheet) {
            animator = niuPai.addComponent('PlayerAnimator');
            animator.spritesheet = game.niuPaiSheet;
            animator.frameWidth = game.niuPaiFrameW;
            animator.frameHeight = game.niuPaiFrameH;
            animator._buildFrames();
            animator.setDirection('down');
            animator.setMoving(false);
        } else {
            this._drawFallback(niuPai);
        }

        var body = niuPai.addComponent(cc.RigidBody);
        body.type = cc.RigidBodyType.Dynamic;
        body.gravityScale = 0;
        body.fixedRotation = true;
        body.allowSleep = false;
        body.linearDamping = game.niuPaiLinearDamping;

        var collider = niuPai.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(
            game.niuPaiFrameW * game.niuPaiColliderWidthRatio,
            game.niuPaiFrameH * game.niuPaiColliderHeightRatio
        );
        collider.offset = cc.v2(0, game.niuPaiFrameH * game.niuPaiColliderYOffsetRatio);
        collider.friction = 0;
        collider.restitution = 0;
        collider.sensor = true;
        collider.apply();
        game._addActorCollisionFilter(niuPai, 'niupai');

        game._niuPaiNode = niuPai;
        game._niuPaiAnimator = animator;
        game._niuPaiBody = body;
        cc.log('[NiuPai] Companion spawned at ' + niuPai.x + ', ' + niuPai.y);
    },

    update: function (dt) {
        var game = this.game;
        if (!game._active || !game._niuPaiNode || !game._playerNode) return;
        if (dt <= 0) return;
        if (this.waitingForPlayer) {
            this._updateWaitingForPlayer();
            return;
        }
        if (game._orderOpen || game._niuPaiInQueue) {
            this.stop();
            return;
        }

        var playerDx = game._playerNode.x - game._niuPaiNode.x;
        var playerDy = game._playerNode.y - game._niuPaiNode.y;
        var playerDistance = Math.sqrt(playerDx * playerDx + playerDy * playerDy);
        if (playerDistance > game.niuPaiFollowDistance) {
            this.following = true;
        } else if (playerDistance <= game.niuPaiStopDistance) {
            this.following = false;
            this.path = [];
            this.pathTimer = 0;
        }

        var moving = this.following;
        var dir = null;
        var velocity = cc.v2(0, 0);

        if (moving) {
            var target = this._getFollowTarget(dt, playerDistance);
            var dx = target.x - game._niuPaiNode.x;
            var dy = target.y - game._niuPaiNode.y;
            var distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= game.niuPaiWaypointReachDistance) {
                moving = false;
                this.path = [];
                this.pathTimer = 0;
            } else {
                var speedRatio = Math.min(1, (playerDistance - game.niuPaiStopDistance) / game.niuPaiFollowDistance);
                var followSpeed = game._getNiuPaiFollowSpeed ? game._getNiuPaiFollowSpeed() : game.niuPaiFollowSpeed;
                var speed = followSpeed * Math.max(0.35, speedRatio);
                velocity.x = dx / distance * speed;
                velocity.y = dy / distance * speed;
                velocity = game._filterNodeMapBoundaryVelocity(
                    game._niuPaiNode,
                    game.niuPaiFrameW,
                    game.niuPaiFrameH,
                    velocity.x,
                    velocity.y
                );
                dir = Math.abs(velocity.x) > Math.abs(velocity.y)
                    ? (velocity.x < 0 ? 'left' : 'right')
                    : (velocity.y < 0 ? 'down' : 'up');
            }
        }

        if (game._niuPaiBody) game._niuPaiBody.linearVelocity = cc.v2(0, 0);
        var moved = false;
        if (moving) {
            moved = game._moveActorWithCollision(
                game._niuPaiNode,
                game.niuPaiFrameW,
                game.niuPaiFrameH,
                game.niuPaiColliderWidthRatio,
                game.niuPaiColliderHeightRatio,
                game.niuPaiColliderYOffsetRatio,
                velocity.x,
                velocity.y,
                dt,
                game._niuPaiBody,
                'niupai',
                game._currentSection
            );
        }

        if (game._niuPaiAnimator) {
            if (moved && dir) game._niuPaiAnimator.setDirection(dir);
            game._niuPaiAnimator.setMoving(moved);
        }
        if (game._setRunParticleActive) game._setRunParticleActive('niupai', game._niuPaiNode, moved);

        this.clampToMap();
    },

    stop: function () {
        var game = this.game;
        if (game._niuPaiBody) {
            game._niuPaiBody.linearVelocity = cc.v2(0, 0);
        }
        if (game._niuPaiAnimator) {
            game._niuPaiAnimator.setMoving(false);
        }
        if (game._setRunParticleActive) game._setRunParticleActive('niupai', game._niuPaiNode, false);
    },

    setHeldItem: function(item) {
        this.heldItem = item;
    },

    waitForPlayerPickup: function () {
        this.waitingForPlayer = true;
        this.following = false;
        this.path = [];
        this.pathTimer = 0;
        this.stop();
    },

    isWaitingForPlayer: function () {
        return this.waitingForPlayer;
    },

    moveNearPlayer: function () {
        var game = this.game;
        if (!game._niuPaiNode || !game._playerNode) return;

        var target = this.getSpawnPosition();
        game._niuPaiNode.setPosition(target);
        if (game._niuPaiBody) {
            game._niuPaiBody.linearVelocity = cc.v2(0, 0);
            game._niuPaiBody.syncPosition(true);
        }
        this.path = [];
        this.pathTimer = 0;
        this.waitingForPlayer = false;
        this.following = false;
        if (game._niuPaiAnimator) {
            game._niuPaiAnimator.setMoving(false);
        }
        if (game._setRunParticleActive) game._setRunParticleActive('niupai', game._niuPaiNode, false);
    },

    getSpawnPosition: function () {
        var game = this.game;
        var base = game._playerNode
            ? game._playerNode.getPosition()
            : game._getPlayerSpawnPosition();
        return game._clampPositionToCurrentMap(
            cc.v2(base.x + game.niuPaiSpawnOffset.x, base.y + game.niuPaiSpawnOffset.y),
            game.niuPaiFrameW,
            game.niuPaiFrameH
        );
    },

    clampToMap: function () {
        var game = this.game;
        if (!game.clampPlayerToMap || !game._niuPaiNode) return;

        var clamped = game._clampPositionToCurrentMap(
            game._niuPaiNode.getPosition(),
            game.niuPaiFrameW,
            game.niuPaiFrameH
        );

        if (clamped.x !== game._niuPaiNode.x || clamped.y !== game._niuPaiNode.y) {
            game._niuPaiNode.setPosition(clamped);
            if (game._niuPaiBody) {
                game._niuPaiBody.linearVelocity = cc.v2(0, 0);
                game._niuPaiBody.syncPosition(true);
            }
        }
    },

    _getFollowTarget: function (dt, playerDistance) {
        var game = this.game;
        if (playerDistance <= game.niuPaiFollowDistance) {
            return game._playerNode.getPosition();
        }

        return this._getPathTarget(dt);
    },

    _getPathTarget: function (dt) {
        var game = this.game;
        var directTarget = game._playerNode.getPosition();
        var grid = game._pathGrid ? game._pathGrid.getCurrentGrid() : null;
        if (!grid) return directTarget;

        this.pathTimer -= dt;
        if (this.pathTimer <= 0 || !this.path || this.path.length === 0) {
            this.pathTimer = game.niuPaiPathRefreshInterval;
            this.path = game._pathGrid.findPathBetweenNodes(game._niuPaiNode, game._playerNode, grid);
        }

        if (!this.path || this.path.length === 0) return directTarget;

        while (this.path.length > 1) {
            var first = game._pathGrid.gridTileToWorldCenter(grid, this.path[0]);
            var dx = first.x - game._niuPaiNode.x;
            var dy = first.y - game._niuPaiNode.y;
            if (Math.sqrt(dx * dx + dy * dy) > game.niuPaiWaypointReachDistance) break;
            this.path.shift();
        }

        return game._pathGrid.gridTileToWorldCenter(grid, this.path[0]);
    },

    _updateWaitingForPlayer: function () {
        var game = this.game;
        this.stop();

        var dx = game._playerNode.x - game._niuPaiNode.x;
        var dy = game._playerNode.y - game._niuPaiNode.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > game.niuPaiRestoreFollowDistance) return;

        this.waitingForPlayer = false;
        game.niuPaiHandItemToPlayer(this.heldItem);
        this.heldItem = null;
        this.path = [];
        this.pathTimer = 0;
        cc.log('[NiuPai] NiuPai restored follow after player approached.');
    },

    _drawFallback: function (node) {
        var game = this.game;
        var gfx = node.addComponent(cc.Graphics);
        var w = game.niuPaiFrameW;
        var h = game.niuPaiFrameH;

        gfx.fillColor = cc.color(235, 216, 180);
        gfx.rect(-w / 2 + 5, -h / 2 + 6, w - 10, h - 12);
        gfx.fill();

        gfx.fillColor = cc.color(85, 62, 42);
        gfx.rect(-w / 2 + 8, h / 2 - 13, 5, 5);
        gfx.rect(w / 2 - 13, h / 2 - 13, 5, 5);
        gfx.fill();

        gfx.fillColor = cc.color(45, 35, 30);
        gfx.rect(-5, 0, 3, 3);
        gfx.rect(3, 0, 3, 3);
        gfx.rect(-2, -6, 4, 3);
        gfx.fill();
    },
});

module.exports = NPNiuPaiControl;
