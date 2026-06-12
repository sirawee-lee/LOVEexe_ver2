'use strict';

var NPPathGrid = require('NPPathGrid');
var NPBlackDogControl = require('NPBlackDogControl');
var NPNiuPaiControl = require('NPNiuPaiControl');
var NPActorCollisionFilter = require('NPActorCollisionFilter');
var NPMcDonaldControl = require('NPMcDonaldControl');
var NPNormieControl = require('NPNormieControl');
var NPNotification = require('NPNotification');
var NPDialogue = require('NPDialogue');
var GameProperties = require('GameProperties');
var PauseMenu = require('PauseMenu');

var DebugImmediateResultType = cc.Enum({
    Win: 0,
    WrongFood: 1,
    Lose: 2,
});

// Xiao Chi Bu minigame shell.
// This file owns only the minigame lifecycle for now; gameplay systems will be
// added in the next TODOs.
// @ts-check

cc.Class({
    extends: cc.Component,

    properties: {
        bgm:        { default: null, type: cc.AudioClip },
        tunnelBgm:  { default: null, type: cc.AudioClip },
        debugImmediateResult: { default: false },
        debugImmediateResultType: { default: DebugImmediateResultType.Win, type: DebugImmediateResultType },
        debugDisableInitialObstacles: { default: false },
        sfxCorrect: { default: null, type: cc.AudioClip },
        sfxWrong:   { default: null, type: cc.AudioClip },
        sfxNotification: { default: null, type: cc.AudioClip },
        sfxDialogueConfirm: { default: null, type: cc.AudioClip },
        sfxOrderConfirm: { default: null, type: cc.AudioClip },
        sfxOrderComplete: { default: null, type: cc.AudioClip },
        sfxItemPickup: { default: null, type: cc.AudioClip },
        sfxItemUse: { default: null, type: cc.AudioClip },
        sfxFoodSpoil: { default: null, type: cc.AudioClip },
        sfxHeal: { default: null, type: cc.AudioClip },
        sfxBigMacBait: { default: null, type: cc.AudioClip },
        sfxMcFlurryArm: { default: null, type: cc.AudioClip },
        sfxMcFlurryExplosion: { default: null, type: cc.AudioClip },
        sfxObstacleBreak: { default: null, type: cc.AudioClip },
        sfxObstacleBump: { default: null, type: cc.AudioClip },
        sfxNormieBump: { default: null, type: cc.AudioClip },
        sfxNormieSlow: { default: null, type: cc.AudioClip },
        sfxWalletDrop: { default: null, type: cc.AudioClip },
        sfxWalletPickup: { default: null, type: cc.AudioClip },
        sfxWalletNotice: { default: null, type: cc.AudioClip },
        sfxTeleport: { default: null, type: cc.AudioClip },
        sfxTunnelExitBlocked: { default: null, type: cc.AudioClip },
        sfxPlayerDamage: { default: null, type: cc.AudioClip },
        sfxNiuPaiDamage: { default: null, type: cc.AudioClip },
        sfxPlayerDeath: { default: null, type: cc.AudioClip },
        sfxNiuPaiDeath: { default: null, type: cc.AudioClip },
        sfxBlackDogSpawn: { default: null, type: cc.AudioClip },
        sfxBlackDogAttack: { default: null, type: cc.AudioClip },
        sfxBlackDogStun: { default: null, type: cc.AudioClip },
        sfxBlackDogBaitAlert: { default: null, type: cc.AudioClip },
        walletSprite: { default: null, type: cc.SpriteFrame },
        itemDropShadowSprite: { default: null, type: cc.SpriteFrame },
        walletDropShadowSprite: { default: null, type: cc.SpriteFrame },
        bigMacDropShadowSprite: { default: null, type: cc.SpriteFrame },
        mcFlurryDropShadowSprite: { default: null, type: cc.SpriteFrame },
        playerSheet: { default: null, type: cc.Texture2D },
        niuPaiSheet: { default: null, type: cc.Texture2D },
        blackDogSheet: { default: null, type: cc.Texture2D },
        mainTilemap:   { default: null, type: cc.TiledMapAsset },
        tunnelTilemap: { default: null, type: cc.TiledMapAsset },
        initialObstacleSprite: { default: null, type: cc.SpriteFrame },
        gameCamera: { default: null, type: cc.Camera },
        mcDonaldRegionSprite: { default: null, type: cc.SpriteFrame },
        notificationFrameSprite: { default: null, type: cc.SpriteFrame },
        dialoguePanelSprite: { default: null, type: cc.SpriteFrame },
        dialogueButtonSprite: { default: null, type: cc.SpriteFrame },
        hudPanelSprite: { default: null, type: cc.SpriteFrame },
        hudItemFrameSprite: { default: null, type: cc.SpriteFrame },
        guiShadowSprite: { default: null, type: cc.SpriteFrame },
        orderingStatusSprite: { default: null, type: cc.SpriteFrame },
        orderingStatusFrames: { default: [], type: [cc.SpriteFrame] },
        orderingStatusSheet: { default: null, type: cc.Texture2D },
        blackDogFollowingStatusSprite: { default: null, type: cc.SpriteFrame },
        blackDogRobStatusFrames: { default: [], type: [cc.SpriteFrame] },
        blackDogRobStatusSheet: { default: null, type: cc.Texture2D },
        blackDogBaitStatusFrames: { default: [], type: [cc.SpriteFrame] },
        blackDogBaitStatusSheet: { default: null, type: cc.Texture2D },
        normieSheet: { default: null, type: cc.Texture2D },
        normieSheets: { default: [], type: [cc.Texture2D] },
        applePieSprite: { default: null, type: cc.SpriteFrame },
        bigMacSprite: { default: null, type: cc.SpriteFrame },
        mcFlurrySprite: { default: null, type: cc.SpriteFrame },
        bigMacSmellParticleSprite: { default: null, type: cc.SpriteFrame },
        blackDogBaitAlertSprite: { default: null, type: cc.SpriteFrame },
        mcFlurryExplosionFrames: { default: [], type: [cc.SpriteFrame] },
        mcFlurryExplosionSheet: { default: null, type: cc.Texture2D },
        obstacleDestroyFrames: { default: [], type: [cc.SpriteFrame] },
        obstacleDestroySheet: { default: null, type: cc.Texture2D },
        healParticleSprite: { default: null, type: cc.SpriteFrame },
        healEffectFrames: { default: [], type: [cc.SpriteFrame] },
        healEffectSheet: { default: null, type: cc.Texture2D },
        playerMoveEffectFrames: { default: [], type: [cc.SpriteFrame] },
        playerMoveEffectSheet: { default: null, type: cc.Texture2D },
        blackDogMoveEffectFrames: { default: [], type: [cc.SpriteFrame] },
        blackDogMoveEffectSheet: { default: null, type: cc.Texture2D },
        playerRunParticleSprite: { default: null, type: cc.SpriteFrame },
        blackDogRunParticleSprite: { default: null, type: cc.SpriteFrame },
        normieCollisionEffectFrames: { default: [], type: [cc.SpriteFrame] },
        normieCollisionEffectSheet: { default: null, type: cc.Texture2D },
        normieScaredEffectFrames: { default: [], type: [cc.SpriteFrame] },
        normieScaredEffectSheet: { default: null, type: cc.Texture2D },
        blackDogMcFlurryStunSprite: { default: null, type: cc.SpriteFrame },
        labelFont: { default: null, type: cc.Font },
        damageEffectShader: {default: null, type: cc.EffectAsset},
    },

    onLoad: function () {
        GameProperties.applyTo(this);
        this._onResult = null;
        this._active = false;
        this._deathSequenceActive = false;
        this._deathScreenFadeNode = null;
        this._deathScreenFadeDelay = 0;
        this._deathScreenFadeTimer = 0;
        this._deathScreenFadeDuration = 0;
        this._exitTransitionActive = false;
        this._exitTransitionTimer = 0;
        this._exitTransitionDuration = 0;
        this._pendingExitResult = null;
        this._tunnelOverlayFade = 1;
        this._bgmId = -1;
        this._currentBgmClip = null;
        this._bgmPausedByGlobalPause = false;
        this._runtimeScore = 0;
        this._elapsedGameSeconds = 0;
        this._debugImmediateResultTriggered = false;
        this._walletDropTimer = 0;
        this._walletPlayerDropCooldownTimer = 0;
        this._wallets = [];
        this._walletPickupCount = 0;
        this._walletNoticeCooldown = 0;
        this._shownWalletPickupNotification = false;
        this._walletPickupCount = 0;
        this._obstacleBumpSfxCooldownTimer = 0;
        this._world = null;
        this._mainTiledMap = null;
        this._tunnelTiledMap = null;
        this._playerNode = null;
        this._playerAnimator = null;
        this._playerBody = null;
        this._niuPaiNode = null;
        this._niuPaiAnimator = null;
        this._niuPaiBody = null;
        this._niuPaiControl = null;
        this._pathGrid = null;
        this._pathGrids = {};
        this._blackDogControl = null;
        this._mcDonaldControl = null;
        this._normieControl = null;
        this._blackDogs = [];
        this._mainBlackDogSpawnTimer = -1;
        this._mainBlackDogsSpawned = false;
        this._keys = {};
        this._loadedTilemaps = 0;
        this._colliderCount = 0;
        this._staticCollisionRects = [];
        this._initialObstacles = [];
        this._nextObstacleId = 1;
        this._camera = null;
        this._cameraOriginalPosition = null;
        this._cameraOriginalZoomRatio = 1;
        this._cameraStateSaved = false;
        this._cameraShakeTimer = 0;
        this._cameraShakeDuration = 0;
        this._cameraShakeStrength = 0;
        this._currentSection = 'main';
        this._teleportCooldown = 0;
        this._teleportNeedsExit = false;
        this._teleportExitHoldRect = null;
        this._teleportPromptNode = null;
        this._orderAreaPromptNode = null;
        this._orderPromptNode = null;
        this._orderDialogNode = null;
        this._orderState = null;
        this._orderHistory = [];
        this._orderSelectedIndex = 0;
        this._pendingOrderActor = 'player';
        this._pendingOrderMode = 'wait';
        this._playerInQueue = false;
        this._niuPaiInQueue = false;
        this._orderBackHeld = false;
        this._heldItem = null;
        this._foodSpoilTime = 0;
        this._bigMacBaits = [];
        this._mcFlurryExplosions = [];
        this._mcHp = this.mcMaxHp;
        this._niuPaiHp = this.niuPaiMaxHp;
        this._hudRoot = null;
        this._hudBg = null;
        this._hudItemSprite = null;
        this._hudItemVisual = null;
        this._hudItemFallback = null;
        this._hudHoldingLabel = null;
        this._hudSpoilLabel = null;
        this._hudScoreLabel = null;
        this._hudElapsedLabel = null;
        this._hudHpLabel = null;
        this._objectiveRoot = null;
        this._objectiveBg = null;
        this._objectiveLabel = null;
        this._objectiveArrow = null;
        this._playerHpBar = null;
        this._niuPaiHpBar = null;
        this._criticalHpOverlayNode = null;
        this._tunnelVisionOverlayNode = null;
        this._notificationControl = null;
        this._dialogueControl = null;
        this._dialogueHidesHud = false;
        this._introDialogOpen = false;
        this._shownTunnelIntroDialogue = false;
        this._hasEnteredTunnelSection = false;
        this._shownItemNotifications = {};
        this._shownNormieBumpNotification = false;
        this._shownObstacleBumpNotification = false;
        this._canOrder = false;
        this._orderOpen = false;
        this._playerMovingCarefully = false;
        this._playerNormieSlowTimer = 0;
        this._pendingOrderActor = 'player';
        this._pendingOrderMode = 'wait';
        this._playerInQueue = false;
        this._niuPaiInQueue = false;

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp, this);
        if (PauseMenu && PauseMenu.registerAudioClient) PauseMenu.registerAudioClient(this);
    },

    onDisable: function () {
        this._stopPlayerBody();
        if (this._niuPaiControl) this._niuPaiControl.stop();
        if (this._blackDogControl) this._blackDogControl.stopAll();
        if (this._normieControl) this._normieControl.stopAll();
        if (this._notificationControl) this._notificationControl.clear();
        if (this._dialogueControl) this._dialogueControl.close();
        if (this._criticalHpOverlayNode) this._criticalHpOverlayNode.active = false;
        if (this._tunnelVisionOverlayNode) this._tunnelVisionOverlayNode.active = false;
        if (this._objectiveRoot) this._objectiveRoot.active = false;
        this._introDialogOpen = false;
        this._restoreCamera();
    },

    onDestroy: function () {
        if (PauseMenu && PauseMenu.unregisterAudioClient) PauseMenu.unregisterAudioClient(this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp, this);
        this._stopPlayerBody();
        if (this._niuPaiControl) this._niuPaiControl.stop();
        if (this._blackDogControl) this._blackDogControl.stopAll();
        if (this._normieControl) this._normieControl.stopAll();
        if (this._notificationControl) this._notificationControl.clear();
        if (this._dialogueControl) this._dialogueControl.close();
        if (this._criticalHpOverlayNode) this._criticalHpOverlayNode.active = false;
        if (this._tunnelVisionOverlayNode) this._tunnelVisionOverlayNode.active = false;
        if (this._objectiveRoot) this._objectiveRoot.active = false;
        this._introDialogOpen = false;
        this._restoreCamera();
        this._stopBgm();
    },

    start: function () {
        if (this._active || this._onResult) return;
        this.startGame(function (win, score, reason) {
            var StoryState = require('StoryState');
            StoryState.lastResult = { key: 'niupai', win: !!win, score: score || 0, reason: reason || '' };
            cc.director.loadScene('MainScene');
        });
    },

    startGame: function (onResult) {
        this._onResult = onResult || null;
        this._initGame();
    },

    _initGame: function () {
        this._active = true;
        this._deathSequenceActive = false;
        this._resetDeathScreenFade();
        this._exitTransitionActive = false;
        this._exitTransitionTimer = 0;
        this._exitTransitionDuration = 0;
        this._pendingExitResult = null;
        this._tunnelOverlayFade = 1;
        this._keys = {};
        this._runtimeScore = 0;
        this._elapsedGameSeconds = 0;
        this._debugImmediateResultTriggered = false;
        this._walletDropTimer = Math.max(0.01, this.walletDropIntervalSeconds || 5);
        this._walletPlayerDropCooldownTimer = 0;
        this._walletNoticeCooldown = 0;
        this._walletPickupCount = 0;
        this._obstacleBumpSfxCooldownTimer = 0;
        this._wallets = [];
        this._shownWalletPickupNotification = false;
        this._currentSection = 'main';
        this._teleportCooldown = 0;
        this._teleportNeedsExit = false;
        this._teleportExitHoldRect = null;
        this._canOrder = false;
        this._orderOpen = false;
        this._orderBackHeld = false;
        this._introDialogOpen = false;
        this._playerNormieSlowTimer = 0;
        this._shownTunnelIntroDialogue = false;
        this._heldItem = null;
        this._foodSpoilTime = this.spoilDuration;
        this._shownItemNotifications = {};
        this._shownNormieBumpNotification = false;
        this._shownObstacleBumpNotification = false;
        this._clearWorldItems();
        this._hasEnteredTunnelSection = false;
        this._mcHp = this.mcMaxHp;
        this._niuPaiHp = this.niuPaiMaxHp;
        this._enablePhysics();
        this._ensureHud();
        this._ensureNotificationControl();
        if (this._notificationControl) this._notificationControl.clear();
        this._buildWorld();
        this._setupCamera();
        this._ensureHudRootParent();
        this._updateHud(0);
        this._showIntroDialogue();
        this._playSectionBgm('main');

    },

    _enablePhysics: function () {
        var physicsManager = cc.director.getPhysicsManager();
        cc.PhysicsManager.FIXED_TIMESTEP = 1 / 100;
        cc.PhysicsManager.MAX_ACCUMULATOR = 1 / 5;
        /** @type {{physicsManager: cc.PhysicsManager}}*/
        physicsManager.enabled = true;
        physicsManager.enabledAccumulator = true;
        physicsManager.debugDrawFlags = 0;
    },

    _buildWorld: function () {
        if (this._world && this._world.isValid) {
            this._world.destroy();
        }

        this._loadedTilemaps = 0;
        this._colliderCount = 0;
        this._staticCollisionRects = [];
        this._initialObstacles = [];
        this._nextObstacleId = 1;
        this._pathGrids = {};
        this._playerHpBar = null;
        this._niuPaiHpBar = null;
        this._niuPaiControl = new NPNiuPaiControl(this);
        this._pathGrid = new NPPathGrid(this);
        this._blackDogControl = new NPBlackDogControl(this);
        this._mcDonaldControl = new NPMcDonaldControl(this);
        this._normieControl = new NPNormieControl(this);
        this._blackDogs = [];

        var world = new cc.Node('World');
        this.node.addChild(world, 1);
        this._world = world;

        this._loadedTilemaps += this._addTilemap('MainTilemap', this.mainTilemap, this.mainTilemapOffset);
        this._loadedTilemaps += this._addTilemap('TunnelTilemap', this.tunnelTilemap, this.tunnelTilemapOffset);
        this._pathGrids = this._pathGrid.build();
        this._createPlayer();
        this._niuPaiControl.createNiuPai();
        this._ensureActorHpBars();
        this._mcDonaldControl.createQueue();
        this._normieControl.createNormies(this._getInitialRoamingNormieCount());
        this._drawTeleportPrompts();
        this._drawOrderAreaPrompt();
    },

    _addTilemap: function (name, asset, offset) {
        if (!asset) return 0;

        var mapNode = new cc.Node(name);
        mapNode.setAnchorPoint(0, 0);
        mapNode.setPosition(offset || cc.v2(0, 0));
        this._world.addChild(mapNode, 0);

        var tiledMap = mapNode.addComponent(cc.TiledMap);
        tiledMap.tmxAsset = asset;
        if (name === 'MainTilemap') {
            this._mainTiledMap = tiledMap;
        } else if (name === 'TunnelTilemap') {
            this._tunnelTiledMap = tiledMap;
        }
        this._addObjectColliders(tiledMap, name, offset || cc.v2(0, 0));
        this._addInitialObstacles(tiledMap, name, offset || cc.v2(0, 0));

        cc.log('[NiuPai] Loaded tilemap: ' + name);
        return 1;
    },

    _addInitialObstacles: function (tiledMap, mapName, mapOffset) {
        if (this.debugDisableInitialObstacles) {
            cc.log('[NiuPai] Debug disabled initial obstacles for ' + mapName);
            return;
        }

        var group = tiledMap.getObjectGroup(this.initialObstacleLayerName);
        if (!group) return;

        var objects = group.getObjects() || [];
        if (objects.length === 0) return;

        var obstacleRoot = new cc.Node('InitialObstacles_' + mapName);
        obstacleRoot.setPosition(0, 0);
        this._world.addChild(obstacleRoot, 15);

        var section = mapName === 'TunnelTilemap' ? 'tunnel' : 'main';
        for (var i = 0; i < objects.length; i++) {
            this._createInitialObstacle(obstacleRoot, objects[i], i, mapOffset || cc.v2(0, 0), section);
        }

        cc.log('[NiuPai] Added ' + objects.length + ' initial obstacles from ' + mapName);
    },

    _createInitialObstacle: function (parent, obj, index, mapOffset, section) {
        var size = Math.max(1, this.initialObstacleSize || 32);
        var width = obj.width || size;
        var height = obj.height || size;
        var center = cc.v2(
            mapOffset.x + (obj.x || 0) + width / 2,
            mapOffset.y + (obj.y || 0) - height / 2
        );
        var id = this._nextObstacleId++;

        var node = new cc.Node(obj.name || ('InitialObstacle_' + index));
        node.setAnchorPoint(0.5, 0.5);
        node.setContentSize(size, size);
        node.setPosition(center);
        parent.addChild(node, 0);

        var sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = this.initialObstacleSprite;
        if (!this.initialObstacleSprite) {
            var gfx = node.addComponent(cc.Graphics);
            gfx.fillColor = cc.color(92, 70, 105, 235);
            gfx.strokeColor = cc.color(210, 190, 235, 230);
            gfx.lineWidth = 2;
            gfx.rect(-size / 2, -size / 2, size, size);
            gfx.fill();
            gfx.stroke();
        }

        var rect = {
            minX: center.x - size / 2,
            maxX: center.x + size / 2,
            minY: center.y - size / 2,
            maxY: center.y + size / 2,
            section: section || 'main',
            source: 'initialObstacle',
            obstacleId: id,
        };
        this._staticCollisionRects.push(rect);
        this._initialObstacles.push({
            id: id,
            node: node,
            rect: rect,
            section: section || 'main',
        });
    },

    _addObjectColliders: function (tiledMap, mapName, mapOffset) {
        var group = tiledMap.getObjectGroup(this.colliderLayerName);
        if (!group) {
            cc.warn('[NiuPai] Missing object layer "' + this.colliderLayerName + '" in ' + mapName);
            return;
        }

        var objects = group.getObjects() || [];
        var colliderRoot = new cc.Node('Colliders_' + mapName);
        colliderRoot.setPosition(0, 0);
        this._world.addChild(colliderRoot, 10);

        for (var i = 0; i < objects.length; i++) {
            if (this._createColliderFromObject(colliderRoot, objects[i], i, mapOffset, mapName)) {
                this._colliderCount++;
            }
        }

        cc.log('[NiuPai] Added ' + objects.length + ' collider objects from ' + mapName);
    },

    _createColliderFromObject: function (parent, obj, index, mapOffset, mapName) {
        var name = obj.name || obj.type || ('Collider_' + index);
        var node = new cc.Node(name);
        parent.addChild(node, 0);
        this._addStaticRigidBody(node);
        mapOffset = mapOffset || cc.v2(0, 0);
        var section = mapName === 'TunnelTilemap' ? 'tunnel' : 'main';

        if (obj.polygon && obj.polygon.length > 0) {
            node.setPosition(mapOffset.x + (obj.x || 0), mapOffset.y + (obj.y || 0));
            var poly = node.addComponent(cc.PhysicsPolygonCollider);
            poly.points = obj.polygon.map(function (pt) {
                return cc.v2(pt.x || 0, -(pt.y || 0));
            });
            poly.apply();
            this._recordStaticCollisionRect(this._getPointObjectWorldBounds(obj, obj.polygon, mapOffset), section);
            return true;
        }

        if (obj.polyline && obj.polyline.length > 0) {
            node.setPosition(mapOffset.x + (obj.x || 0), mapOffset.y + (obj.y || 0));
            var line = node.addComponent(cc.PhysicsPolygonCollider);
            line.points = obj.polyline.map(function (pt) {
                return cc.v2(pt.x || 0, -(pt.y || 0));
            });
            line.apply();
            this._recordStaticCollisionRect(this._getPointObjectWorldBounds(obj, obj.polyline, mapOffset), section);
            return true;
        }

        if (obj.ellipse) {
            var radius = Math.max(obj.width || 0, obj.height || 0) / 2;
            node.setPosition(mapOffset.x + (obj.x || 0) + radius, mapOffset.y + (obj.y || 0) + radius);
            var circle = node.addComponent(cc.PhysicsCircleCollider);
            circle.radius = radius;
            circle.apply();
            this._recordStaticCollisionRect({
                minX: mapOffset.x + (obj.x || 0),
                maxX: mapOffset.x + (obj.x || 0) + (obj.width || 0),
                minY: mapOffset.y + (obj.y || 0) - (obj.height || 0),
                maxY: mapOffset.y + (obj.y || 0),
            }, section);
            return true;
        }

        if ((obj.width || 0) > 0 && (obj.height || 0) > 0) {
            node.setPosition(
                mapOffset.x + (obj.x || 0) + obj.width / 2,
                mapOffset.y + (obj.y || 0) - obj.height / 2
            );
            var box = node.addComponent(cc.PhysicsBoxCollider);
            box.size = cc.size(obj.width, obj.height);
            box.apply();
            this._recordStaticCollisionRect({
                minX: mapOffset.x + (obj.x || 0),
                maxX: mapOffset.x + (obj.x || 0) + obj.width,
                minY: mapOffset.y + (obj.y || 0) - obj.height,
                maxY: mapOffset.y + (obj.y || 0),
            }, section);
            return true;
        }

        node.destroy();
        cc.warn('[NiuPai] Unsupported collider object: ' + name);
        return false;
    },

    _recordStaticCollisionRect: function (rect, section) {
        if (!rect) return;
        if (!this._staticCollisionRects) this._staticCollisionRects = [];
        rect.section = section || 'main';
        this._staticCollisionRects.push(rect);
    },

    _getPointObjectWorldBounds: function (obj, points, mapOffset) {
        var ox = mapOffset.x + (obj.x || 0);
        var oy = mapOffset.y + (obj.y || 0);
        var minX = Infinity;
        var maxX = -Infinity;
        var minY = Infinity;
        var maxY = -Infinity;

        for (var i = 0; i < points.length; i++) {
            var px = ox + (points[i].x || 0);
            var py = oy - (points[i].y || 0);
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

    _addStaticRigidBody: function (node) {
        var body = node.addComponent(cc.RigidBody);
        body.type = cc.RigidBodyType.Static;
        return body;
    },

    _createPlayer: function () {
        var player = new cc.Node('Player');
        player.setAnchorPoint(0.5, 0.5);
        player.setContentSize(this.playerFrameW, this.playerFrameH);
        player.setPosition(this._getPlayerSpawnPosition());
        this._world.addChild(player, 20);

        var sprite = player.addComponent(cc.Sprite);
        if (this.playerSheet) {
            var anim = player.addComponent('PlayerAnimator');
            anim.spritesheet = this.playerSheet;
            anim.frameWidth = this.playerFrameW;
            anim.frameHeight = this.playerFrameH;
            anim._buildFrames();
            anim.setDirection(this.playerStartDirection);
            anim.setMoving(false);
            this._playerAnimator = anim;
        } else {
            this._drawPlayerFallback(player);
        }

        var body = player.addComponent(cc.RigidBody);
        body.type = cc.RigidBodyType.Dynamic;
        body.gravityScale = 0;
        body.fixedRotation = true;
        // body.allowSleep = false;
        body.linearDamping = this.playerLinearDamping;
        this._playerBody = body;

        var collider = player.addComponent(cc.PhysicsBoxCollider);
        collider.size = cc.size(
            this.playerFrameW * this.playerColliderWidthRatio,
            this.playerFrameH * this.playerColliderHeightRatio
        );
        collider.offset = cc.v2(0, this.playerFrameH * this.playerColliderYOffsetRatio);
        collider.friction = 0;
        collider.restitution = 0;
        collider.sensor = true;
        collider.apply();
        this._addActorCollisionFilter(player, 'player');

        this._playerNode = player;
        cc.log('[NiuPai] Player spawned at ' + player.x + ', ' + player.y);
    },

    _ensureActorHpBars: function () {
        this._playerHpBar = this._createActorHpBar(this._playerNode, this.playerFrameH);
        this._niuPaiHpBar = this._createActorHpBar(this._niuPaiNode, this.niuPaiFrameH);
        this._refreshActorHpBars();
    },

    _createActorHpBar: function (actorNode, frameH) {
        if (!actorNode || !actorNode.isValid) return null;

        var existing = actorNode.getChildByName('ActorHpBar');
        if (existing && existing.isValid) existing.destroy();

        var bar = new cc.Node('ActorHpBar');
        bar.setAnchorPoint(0.5, 0.5);
        bar.setPosition(0, frameH / 2 + this.actorHpBarYOffset);
        bar.setContentSize(this.actorHpBarWidth, this.actorHpBarHeight);
        actorNode.addChild(bar, 50);

        bar.addComponent(cc.Graphics);
        return bar;
    },

    _refreshActorHpBars: function () {
        this._drawActorHpBar(this._playerHpBar, this._mcHp, this.mcMaxHp);
        this._drawActorHpBar(this._niuPaiHpBar, this._niuPaiHp, this.niuPaiMaxHp);
    },

    _drawActorHpBar: function (bar, hp, maxHp) {
        if (!bar || !bar.isValid) return;

        var gfx = bar.getComponent(cc.Graphics);
        if (!gfx) return;
        gfx.clear();

        var width = Math.max(1, this.actorHpBarWidth || 30);
        var height = Math.max(1, this.actorHpBarHeight || 4);
        var ratio = maxHp > 0 ? Math.max(0, Math.min(1, hp / maxHp)) : 0;

        gfx.fillColor = cc.color(38, 24, 34, 220);
        gfx.rect(-width / 2, -height / 2, width, height);
        gfx.fill();

        var fillW = Math.floor(width * ratio);
        if (fillW > 0) {
            gfx.fillColor = ratio <= this.criticalHpRatio
                ? cc.color(255, 70, 70, 240)
                : cc.color(85, 230, 115, 240);
            gfx.rect(-width / 2, -height / 2, fillW, height);
            gfx.fill();
        }

        gfx.strokeColor = cc.color(255, 245, 225, 220);
        gfx.lineWidth = 1;
        gfx.rect(-width / 2, -height / 2, width, height);
        gfx.stroke();
    },

    _addActorCollisionFilter: function (node, actorType) {
        var tag = this._getActorColliderTag(actorType);
        var body = node.getComponent(cc.RigidBody);
        if (body) body.enabledContactListener = true;

        var colliders = node.getComponents(cc.PhysicsCollider);
        for (var i = 0; i < colliders.length; i++) {
            colliders[i].tag = tag;
            colliders[i].apply();
        }

        var filter = node.getComponent('NPActorCollisionFilter') ||
            node.addComponent(NPActorCollisionFilter);
        filter.actorType = actorType;
        filter.game = this;
        return filter;
    },

    _getActorColliderTag: function (actorType) {
        if (actorType === 'player') return NPActorCollisionFilter.Tag.Player;
        if (actorType === 'niupai') return NPActorCollisionFilter.Tag.NiuPai;
        if (actorType === 'blackdog') return NPActorCollisionFilter.Tag.BlackDog;
        if (actorType === 'normie') return NPActorCollisionFilter.Tag.Normie;
        return 0;
    },

    _getPlayerSpawnPosition: function () {
        return this._getMapSpawnPosition(this._mainTiledMap, this.mainTilemapOffset, this.playerStartPosition);
    },

    _getNiuPaiOrderWaitPosition: function () {
        if (!this._mainTiledMap) return this._getNiuPaiOrderWaitFallbackPosition();

        var props = this._mainTiledMap.getProperties() || {};
        var tileX = this._readOptionalNumberProperty(props, 'niuPaiOrderWaitX');
        var tileY = this._readOptionalNumberProperty(props, 'niuPaiOrderWaitY');
        if (tileX === null || tileY === null) {
            cc.warn('[NiuPai] Missing niuPaiOrderWaitX/niuPaiOrderWaitY; using fallback wait position.');
            return this._getNiuPaiOrderWaitFallbackPosition();
        }

        return cc.v2(
            this.mainTilemapOffset.x + (tileX + 0.5) * this.mapPropertyTileSize,
            this.mainTilemapOffset.y + (tileY + 0.5) * this.mapPropertyTileSize
        );
    },

    _getNiuPaiOrderWaitFallbackPosition: function () {
        if (this._niuPaiNode && this._niuPaiNode.isValid) {
            return this._niuPaiNode.getPosition();
        }
        if (this._niuPaiControl && this._niuPaiControl.getSpawnPosition) {
            return this._niuPaiControl.getSpawnPosition();
        }
        return this._getPlayerSpawnPosition();
    },

    _getMapSpawnPosition: function (tiledMap, offset, fallback) {
        if (!tiledMap) return fallback;

        var props = tiledMap.getProperties() || {};
        var tileX = this._readNumberProperty(props, 'playerSpawnX');
        var tileY = this._readNumberProperty(props, 'playerSpawnY');

        if (tileX === null || tileY === null) {
            return fallback;
        }

        var x = offset.x + (tileX + 0.5) * this.mapPropertyTileSize;
        var y = offset.y + (tileY + 0.5) * this.mapPropertyTileSize;
        return cc.v2(x, y);
    },

    _readNumberProperty: function (props, name) {
        var value = props[name];
        if (value === undefined || value === null || value === '') {
            cc.warn('[NiuPai] Property "' + name + '" is missing or empty.');
            return null;
        }

        var numberValue = Number(value);
        return isNaN(numberValue) ? null : numberValue;
    },

    _readOptionalNumberProperty: function (props, name) {
        var value = props[name];
        if (value === undefined || value === null || value === '') return null;

        var numberValue = Number(value);
        return isNaN(numberValue) ? null : numberValue;
    },

    _setupCamera: function () {
        var camera = this.gameCamera || cc.Camera.main;
        if (!camera || !camera.node) {
            cc.warn('[NiuPai] No camera assigned and cc.Camera.main is missing.');
            return;
        }

        this._camera = camera;
        if (!this._cameraStateSaved) {
            this._cameraOriginalPosition = camera.node.getPosition();
            this._cameraOriginalZoomRatio = camera.zoomRatio;
            this._cameraStateSaved = true;
        }

        camera.zoomRatio = this.cameraZoomRatio;
        this._ensureHudRootParent();
        this._updateCameraFollow();
    },

    _restoreCamera: function () {
        if (!this._camera || !this._camera.node || !this._cameraStateSaved) return;

        this._camera.node.setPosition(this._cameraOriginalPosition);
        this._camera.zoomRatio = this._cameraOriginalZoomRatio;
        this._camera = null;
        this._cameraStateSaved = false;
    },

    _updateCameraFollow: function () {
        if (!this._camera || !this._camera.node || !this._playerNode) return;

        var worldPos = this._playerNode.parent.convertToWorldSpaceAR(this._playerNode.getPosition());
        var cameraParent = this._camera.node.parent;
        var cameraLocal = cameraParent
            ? cameraParent.convertToNodeSpaceAR(worldPos)
            : worldPos;

        cameraLocal.x += this.cameraFollowOffset.x;
        cameraLocal.y += this.cameraFollowOffset.y;
        cameraLocal = this._clampCameraToMap(cameraLocal);
        cameraLocal = this._applyCameraShake(cameraLocal);

        this._camera.node.setPosition(cameraLocal);
    },

    _applyCameraShake: function (cameraLocal) {
        if (this._cameraShakeTimer <= 0 || this._cameraShakeStrength <= 0) return cameraLocal;

        var progress = this._cameraShakeDuration > 0
            ? this._cameraShakeTimer / this._cameraShakeDuration
            : 1;
        var strength = this._cameraShakeStrength * Math.max(0, Math.min(1, progress));
        cameraLocal.x += (Math.random() * 2 - 1) * strength;
        cameraLocal.y += (Math.random() * 2 - 1) * strength;
        return cameraLocal;
    },

    _startCameraShake: function (duration, strength) {
        duration = Math.max(0, duration || 0);
        strength = Math.max(0, strength || 0);
        if (duration <= 0 || strength <= 0) return;

        this._cameraShakeDuration = duration;
        this._cameraShakeTimer = duration;
        this._cameraShakeStrength = strength;
    },

    _clampCameraToMap: function (cameraLocal) {
        if (!this.boundCameraToMap || !this._camera || !this._camera.node) return cameraLocal;

        var bounds = this._getCameraMapBounds();
        var viewSize = cc.winSize;
        var zoom = this._camera.zoomRatio || 1;
        var halfW = viewSize.width / (2 * zoom);
        var halfH = viewSize.height / (2 * zoom);

        var minX = bounds.minX + halfW;
        var maxX = bounds.maxX - halfW;
        var minY = bounds.minY + halfH;
        var maxY = bounds.maxY - halfH;

        if (minX > maxX) cameraLocal.x = (bounds.minX + bounds.maxX) / 2;
        else cameraLocal.x = Math.max(minX, Math.min(maxX, cameraLocal.x));

        if (minY > maxY) cameraLocal.y = (bounds.minY + bounds.maxY) / 2;
        else cameraLocal.y = Math.max(minY, Math.min(maxY, cameraLocal.y));

        return cameraLocal;
    },

    _getCameraMapBounds: function () {
        return this._getSectionCameraBounds(this._getCurrentSectionInfo());
    },

    _getSectionCameraBounds: function (section) {
        var mapW = section.cols * this.mapTileSize;
        var mapH = section.rows * this.mapTileSize;
        var minLocal = cc.v2(section.offset.x, section.offset.y);
        var maxLocal = cc.v2(section.offset.x + mapW, section.offset.y + mapH);
        var cameraParent = this._camera.node.parent;

        if (!this._world || !cameraParent) {
            return {
                minX: minLocal.x,
                maxX: maxLocal.x,
                minY: minLocal.y,
                maxY: maxLocal.y,
            };
        }

        var minWorld = this._world.convertToWorldSpaceAR(minLocal);
        var maxWorld = this._world.convertToWorldSpaceAR(maxLocal);
        var minCameraLocal = cameraParent.convertToNodeSpaceAR(minWorld);
        var maxCameraLocal = cameraParent.convertToNodeSpaceAR(maxWorld);

        return {
            minX: Math.min(minCameraLocal.x, maxCameraLocal.x),
            maxX: Math.max(minCameraLocal.x, maxCameraLocal.x),
            minY: Math.min(minCameraLocal.y, maxCameraLocal.y),
            maxY: Math.max(minCameraLocal.y, maxCameraLocal.y),
        };
    },

    _getCurrentSectionInfo: function () {
        if (this._currentSection === 'tunnel') {
            return {
                name: 'tunnel',
                offset: this.tunnelTilemapOffset,
                cols: this.tunnelMapCols,
                rows: this.tunnelMapRows,
                tiledMap: this._tunnelTiledMap,
            };
        }

        return {
            name: 'main',
            offset: this.mainTilemapOffset,
            cols: this.mapCols,
            rows: this.mapRows,
            tiledMap: this._mainTiledMap,
        };
    },

    _onKeyDown: function (e) {
        if (PauseMenu && PauseMenu.isOpen && PauseMenu.isOpen()) return;

        if (!this._orderOpen && this._dialogueControl && this._dialogueControl.isSimpleOpen()) {
            if (e.keyCode === cc.macro.KEY.e || e.keyCode === cc.macro.KEY.enter) {
                this._playSfx(this.sfxDialogueConfirm, 0.8);
                this._dialogueControl.confirm();
            }
            return;
        }

        if (this._orderOpen) {
            this._handleOrderKey(e.keyCode);
            return;
        }

        this._keys[e.keyCode] = true;
        if (e.keyCode === cc.macro.KEY.e && this._canOrder && !this._orderOpen) {
            this._startOrderDialog();
            return;
        }

        if (e.keyCode === cc.macro.KEY.e) {
            this._useHeldItem();
        }
    },

    _onKeyUp: function (e) {
        this._keys[e.keyCode] = false;
        if (e.keyCode === cc.macro.KEY.r) this._orderBackHeld = false;
    },

    _stopAllActorMovement: function () {
        this._stopPlayerBody();
        if (this._niuPaiControl) this._niuPaiControl.stop();
        if (this._blackDogControl) this._blackDogControl.stopAll();
        if (this._normieControl) this._normieControl.stopAll();
    },

    _updatePlayerMovement: function (dt) {
        if (!this._active || !this._playerNode) return;
        if (dt <= 0) return;
        this._playerNormieSlowTimer = Math.max(0, (this._playerNormieSlowTimer || 0) - dt);
        this._playerMovingCarefully = !!this._keys[cc.macro.KEY.shift];
        if (this._orderOpen || this._playerInQueue) {
            this._stopPlayerBody();
            return;
        }
        if (this._teleportCooldown > 0) {
            this._teleportCooldown = Math.max(0, this._teleportCooldown - dt);
        }

        var up = this._keys[cc.macro.KEY.w] || this._keys[cc.macro.KEY.up];
        var down = this._keys[cc.macro.KEY.s] || this._keys[cc.macro.KEY.down];
        var left = this._keys[cc.macro.KEY.a] || this._keys[cc.macro.KEY.left];
        var right = this._keys[cc.macro.KEY.d] || this._keys[cc.macro.KEY.right];
        var careful = this._playerMovingCarefully;
        var speed = careful ? this.playerCarefulSpeed : this._getPlayerWalkSpeed();
        if (!careful && this._playerNormieSlowTimer > 0) {
            speed *= Math.max(0, Math.min(1, this.normiePlayerSlowMultiplier || 0.9));
        }

        var dx = 0;
        var dy = 0;
        var dir = null;

        if (up) {
            dy = speed;
            dir = 'up';
        } else if (down) {
            dy = -speed;
            dir = 'down';
        } else if (left) {
            dx = -speed;
            dir = 'left';
        } else if (right) {
            dx = speed;
            dir = 'right';
        }

        var moving = dx !== 0 || dy !== 0;
        var moved = false;
        if (moving) {
            var filtered = this._filterMapBoundaryVelocity(dx, dy);
            moved = this._moveActorWithCollision(
                this._playerNode,
                this.playerFrameW,
                this.playerFrameH,
                this.playerColliderWidthRatio,
                this.playerColliderHeightRatio,
                this.playerColliderYOffsetRatio,
                filtered.x,
                filtered.y,
                dt,
                this._playerBody,
                'player',
                this._currentSection
            );
        } else if (this._playerBody) {
            this._playerBody.linearVelocity = cc.v2(0, 0);
        }

        if (this._playerAnimator) {
            if (dir) this._playerAnimator.setDirection(dir);
            this._playerAnimator.setMoving(moved);
        }
        this._setRunParticleActive('player', this._playerNode, moved);

        this._clampPlayerToMap();
        this._checkTunnelEntrance();
        this._checkTunnelReturnEntrance();
        this._checkTunnelExit();
        this._updateOrderTrigger();
    },

    _getPlayerWalkSpeed: function () {
        if (this._currentSection === 'tunnel') {
            return Math.max(0, this.tunnelActorSpeed || this.blackDogChaseSpeed || this.playerWalkSpeed || 0);
        }
        return Math.max(0, this.playerWalkSpeed || 0);
    },

    _getNiuPaiFollowSpeed: function () {
        if (this._currentSection === 'tunnel') {
            return Math.max(0, this.tunnelActorSpeed || this.blackDogChaseSpeed || this.niuPaiFollowSpeed || 0);
        }
        return Math.max(0, this.niuPaiFollowSpeed || 0);
    },

    _getBlackDogChaseSpeed: function () {
        if (this._currentSection === 'tunnel') {
            return Math.max(0, this.tunnelActorSpeed || this.blackDogChaseSpeed || 0);
        }
        return Math.max(0, this.blackDogChaseSpeed || 0);
    },

    _updateOrderTrigger: function () {
        if (this._currentSection !== 'main' || !this._playerNode || this._orderOpen || this._hasActiveQueuedOrder()) {
            this._setOrderPromptVisible(false);
            this._canOrder = false;
            return;
        }

        var triggerRect = this._getMcOrderTriggerRect();
        if (!triggerRect) {
            this._setOrderPromptVisible(false);
            this._canOrder = false;
            return;
        }

        var touching = this._rectsOverlap(this._getPlayerTriggerRect(), triggerRect);
        this._canOrder = touching;
        this._setOrderPromptVisible(touching);
    },

    _getMcOrderTriggerRect: function () {
        if (!this._mainTiledMap) return null;

        var props = this._mainTiledMap.getProperties() || {};
        var cxTile = this._readNumberProperty(props, 'mcOrderX');
        var cyTile = this._readNumberProperty(props, 'mcOrderY');
        var wTiles = this._readNumberProperty(props, 'mcOrderW');
        var hTiles = this._readNumberProperty(props, 'mcOrderH');

        if (cxTile === null || cyTile === null || wTiles === null || hTiles === null) {
            cc.warn('[NiuPai] Missing mcOrderX/mcOrderY/mcOrderW/mcOrderH in main tilemap properties.');
            return null;
        }

        var cx = this.mainTilemapOffset.x + cxTile * this.mapPropertyTileSize;
        var cy = this.mainTilemapOffset.y + cyTile * this.mapPropertyTileSize;
        var halfW = wTiles * this.mapPropertyTileSize / 2;
        var halfH = hTiles * this.mapPropertyTileSize / 2;

        return {
            minX: cx - halfW,
            maxX: cx + halfW,
            minY: cy - halfH,
            maxY: cy + halfH,
        };
    },

    _setOrderPromptVisible: function (visible) {
        if (!this._playerNode) return;

        if (!this._orderPromptNode) {
            this._orderPromptNode = this._mkFloatingLabel(
                'OrderPrompt',
                this.orderPromptText,
                cc.v2(0, this.playerFrameH / 2 + 18),
                11,
                cc.color(255, 238, 120)
            );
            this._playerNode.addChild(this._orderPromptNode, 10);
        }

        this._orderPromptNode.active = visible;
    },

    _startOrderDialog: function () {
        this._orderOpen = true;
        this._orderBackHeld = false;
        this._setOrderPromptVisible(false);
        this._stopPlayerBody();
        this._pendingOrderActor = 'player';
        this._pendingOrderMode = 'wait';
        this._orderState = 'askOrder';
        this._orderHistory = [];
        this._orderSelectedIndex = 0;
        this._renderOrderOverlay();
        cc.log('[NiuPai] Order dialog started.');
    },

    _closeOrderDialog: function () {
        this._orderOpen = false;
        this._orderBackHeld = false;
        this._stopPlayerBody();

        if (this._dialogueControl) this._dialogueControl.closeOrder();

        this._updateOrderTrigger();
        cc.log('[NiuPai] Order dialog closed.');
    },

    _handleOrderKey: function (keyCode) {
        if (keyCode === cc.macro.KEY.r) {
            if (this._orderBackHeld) return;
            this._orderBackHeld = true;
            this._closeOrderDialog();
            return;
        }

        if (keyCode === cc.macro.KEY.up || keyCode === cc.macro.KEY.w) {
            this._moveOrderSelection(-1);
            return;
        }

        if (keyCode === cc.macro.KEY.down || keyCode === cc.macro.KEY.s) {
            this._moveOrderSelection(1);
            return;
        }

        if (keyCode === cc.macro.KEY.e || keyCode === cc.macro.KEY.enter) {
            this._confirmOrderSelection();
        }
    },

    _getOrderFlow: function () {
        this._ensureDialogueControl();
        return this._dialogueControl ? this._dialogueControl.getOrderFlow() : {};
    },

    _moveOrderSelection: function (delta) {
        var state = this._getOrderFlow()[this._orderState];
        if (!state || !state.choices || state.choices.length === 0) {
            cc.warn('[NiuPai] Invalid order selection state: ' + this._orderState + '; closing order dialogue.');
            this._closeOrderDialog();
            return;
        }

        this._orderSelectedIndex =
            (this._orderSelectedIndex + delta + state.choices.length) % state.choices.length;
        this._renderOrderOverlay();
    },

    _confirmOrderSelection: function () {
        var flow = this._getOrderFlow();
        var state = flow[this._orderState];
        if (!state) {
            cc.warn('[NiuPai] Invalid order confirm state: ' + this._orderState + '; closing order dialogue.');
            this._closeOrderDialog();
            return;
        }

        var choice = state.choices[this._orderSelectedIndex];
        if (!choice) {
            cc.warn('[NiuPai] Invalid order choice index: ' + this._orderSelectedIndex + '; closing order dialogue.');
            this._closeOrderDialog();
            return;
        }

        if (choice.actor) {
            this._pendingOrderActor = choice.actor;
        }

        if (choice.mode) {
            this._pendingOrderMode = choice.mode;
        }

        if (choice.item) {
            this._startQueuedOrder(choice.item);
            return;
        }

        if (choice.action === 'close') {
            this._closeOrderDialog();
            return;
        }

        if (choice.next) {
            this._orderHistory.push(this._orderState);
            this._orderState = choice.next;
            this._orderSelectedIndex = 0;
            this._renderOrderOverlay();
        }
    },

    _goBackOrderState: function () {
        if (this._orderHistory.length === 0) {
            this._closeOrderDialog();
            return;
        }

        this._orderState = this._orderHistory.pop();
        this._orderSelectedIndex = 0;
        this._renderOrderOverlay();
    },

    _startQueuedOrder: function (item) {
        if (!this._mcDonaldControl) {
            this._playSfx(this.sfxOrderConfirm, 0.85);
            this._setHeldItem(item);
            this._closeOrderDialog();
            return;
        }

        var started = this._mcDonaldControl.startActorOrder(
            this._pendingOrderActor,
            item,
            this._pendingOrderMode
        );
        if (!started) {
            this._renderOrderOverlay();
            return;
        }

        this._playSfx(this.sfxOrderConfirm, 0.85);
        this._closeOrderDialog();
    },

    _completeQueuedOrder: function (actorType, item) {
        this._addScore(this.scoreOrderPoints, 'order');
        this._playSfx(this.sfxOrderComplete);
        if (actorType === 'player') this._playerInQueue = false;
        if (actorType === 'niupai') this._niuPaiInQueue = false;
        if (actorType === 'niupai') {
            this._moveNiuPaiToOrderWaitPosition();
            if (this._niuPaiControl) {
                this._niuPaiControl.path = [];
                this._niuPaiControl.pathTimer = 0;
                this._niuPaiControl.following = false;
                this._niuPaiControl.waitForPlayerPickup();
                this._niuPaiControl.setHeldItem(item);
            }
            if (this._blackDogControl) this._blackDogControl.startRobbingNiuPai();
            this._clearNotifications();
            this._showPersistentNotification(NPNotification.Type.NiuPaiOrderDone);
        }
        else if(actorType === 'player') {
            this._setHeldItem(item);
        }
        cc.log('[NiuPai] Queued order complete. actor=' + actorType +
            ' item=' + this._formatItemName(item));
    },

    _moveNiuPaiToOrderWaitPosition: function () {
        if (!this._niuPaiNode || !this._niuPaiNode.isValid) return;

        var pos = this._getNiuPaiOrderWaitPosition();
        this._niuPaiNode.setPosition(pos);
        if (this._niuPaiBody) {
            this._niuPaiBody.linearVelocity = cc.v2(0, 0);
            this._niuPaiBody.syncPosition(true);
        }
        if (this._niuPaiAnimator) this._niuPaiAnimator.setMoving(false);
        if (this._setRunParticleActive) this._setRunParticleActive('niupai', this._niuPaiNode, false);
    },

    niuPaiHandItemToPlayer: function (item) {
        if (!item) return;
        if (this._blackDogControl) {
            this._blackDogControl.stopRobbingNiuPai('[NiuPai] Black dog ambush cancelled; NiuPai resumed movement.');
        }
        this._dismissNotification(NPNotification.Type.NiuPaiOrderDone);
        this._setHeldItem(item);
    },

    _hasActiveQueuedOrder: function () {
        return this._playerInQueue || this._niuPaiInQueue;
    },

    _getInitialRoamingNormieCount: function () {
        var queueCount = this._mcDonaldControl && this._mcDonaldControl.queue
            ? this._mcDonaldControl.queue.length
            : 0;
        return Math.max(0, this.normieTotalCount - queueCount);
    },

    _getRandomNormieSheet: function () {
        var sheets = this.normieSheets || [];
        var validSheets = [];
        for (var i = 0; i < sheets.length; i++) {
            if (sheets[i]) validSheets.push(sheets[i]);
        }

        if (validSheets.length > 0) {
            return validSheets[Math.floor(Math.random() * validSheets.length)];
        }

        return this.normieSheet || null;
    },

    _renderOrderOverlay: function () {
        this._ensureDialogueControl();
        if (!this._dialogueControl) {
            cc.warn('[NiuPai] Cannot render order dialogue; closing order state.');
            this._closeOrderDialog();
            return false;
        }

        if (!this._dialogueControl.showOrder(this._orderState, this._orderSelectedIndex, this._heldItem)) {
            cc.warn('[NiuPai] Invalid order state: ' + this._orderState + '; closing order dialogue.');
            this._closeOrderDialog();
            return false;
        }

        return true;
    },

    _updateOrderOverlayPosition: function () {
        if (this._dialogueControl) this._dialogueControl.update();
    },

    _drawPanel: function (node, width, height, fillColor, strokeColor, spriteFrame, drawShadow) {
        if (!node || !node.isValid) return;
        drawShadow = drawShadow !== false;

        node.setContentSize(width, height);

        var sprite = node.getComponent(cc.Sprite);
        var gfx = node.getComponent(cc.Graphics);
        if (spriteFrame) {
            if (!sprite) sprite = node.addComponent(cc.Sprite);
            sprite.spriteFrame = spriteFrame;
            sprite.type = cc.Sprite.Type.SLICED;
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            node.setContentSize(width, height);
            if (gfx) gfx.clear();
            if (drawShadow) this._drawGuiShadow(node, width, height, 0);
            else this._hideGuiShadow(node);
            return;
        }

        if (sprite) sprite.spriteFrame = null;
        if (!gfx) gfx = node.addComponent(cc.Graphics);
        gfx.clear();
        gfx.fillColor = fillColor;
        gfx.strokeColor = strokeColor;
        gfx.lineWidth = 2;
        gfx.rect(-width / 2, -height / 2, width, height);
        gfx.fill();
        gfx.stroke();
        if (drawShadow) this._drawGuiShadow(node, width, height, 0);
        else this._hideGuiShadow(node);
    },

    _hideGuiShadow: function (node) {
        if (!node || !node.isValid || !node.parent) return;
        var childShadow = node.getChildByName('GuiDropShadow');
        if (childShadow && childShadow.isValid) childShadow.active = false;

        var siblingShadow = node.parent.getChildByName(node.name + '_GuiDropShadow');
        if (siblingShadow && siblingShadow.isValid) siblingShadow.active = false;
    },

    _ensureItemDropShadow: function (parent, offsetY, shadowFrame) {
        if (!parent || !parent.isValid) return null;

        var shadow = parent.getChildByName('NPItemDropShadow');
        shadowFrame = arguments.length >= 3 ? shadowFrame : this.itemDropShadowSprite;
        if (!shadowFrame) {
            if (shadow && shadow.isValid) shadow.active = false;
            return null;
        }

        if (!shadow || !shadow.isValid) {
            shadow = new cc.Node('NPItemDropShadow');
            shadow.setAnchorPoint(0.5, 0.5);
            parent.addChild(shadow, -1);
            var sprite = shadow.addComponent(cc.Sprite);
            sprite.sizeMode = cc.Sprite.SizeMode.RAW;
        }

        shadow.zIndex = -1;
        shadow.setPosition(0, typeof offsetY === 'number' ? offsetY : (this.itemDropShadowOffsetY || -3));
        shadow.active = true;
        var shadowSprite = shadow.getComponent(cc.Sprite);
        shadowSprite.spriteFrame = shadowFrame;
        shadowSprite.sizeMode = cc.Sprite.SizeMode.RAW;
        return shadow;
    },

    _drawGuiShadow: function (node, width, height, centerOffsetX) {
        if (!node || !node.isValid || !node.parent) return;

        var oldChildShadow = node.getChildByName('GuiDropShadow');
        if (oldChildShadow && oldChildShadow.isValid) oldChildShadow.destroy();

        var shadowName = node.name + '_GuiDropShadow';
        var shadow = node.parent.getChildByName(shadowName);
        if (!this.guiShadowSprite) {
            if (shadow && shadow.isValid) shadow.active = false;
            return;
        }

        if (!shadow || !shadow.isValid) {
            shadow = new cc.Node(shadowName);
            shadow.setAnchorPoint(0.5, 0.5);
            node.parent.addChild(shadow, (node.zIndex || 0) - 1);
            var sprite = shadow.addComponent(cc.Sprite);
            sprite.type = cc.Sprite.Type.SLICED;
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        }

        shadow.zIndex = (node.zIndex || 0) - 1;
        var shadowSprite = shadow.getComponent(cc.Sprite);
        shadowSprite.spriteFrame = this.guiShadowSprite;
        shadowSprite.type = cc.Sprite.Type.SLICED;
        shadowSprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        shadow.setContentSize(width, height);
        shadow.setPosition(
            node.x + (centerOffsetX || 0) + this._getGuiShadowOffsetX(),
            node.y + this._getGuiShadowOffsetY()
        );
        shadow.active = true;
    },

    _getGuiShadowOffsetX: function () {
        return typeof this.guiShadowOffsetX === 'number' ? this.guiShadowOffsetX : -3;
    },

    _getGuiShadowOffsetY: function () {
        return typeof this.guiShadowOffsetY === 'number' ? this.guiShadowOffsetY : -3;
    },

    _ensureHud: function () {
        if (this._hudRoot && this._hudRoot.isValid) {
            this._hudRoot.active = !this._dialogueHidesHud;
            this._ensureObjectiveUi();
            return;
        }

        var root = new cc.Node('NiuPaiHud');
        root.zIndex = 1500;
        root.active = !this._dialogueHidesHud;
        this.node.addChild(root, 1500);
        this._hudRoot = root;
        this._ensureHudRootParent();

        this._hudBg = new cc.Node('HudPanel');
        this._hudBg.addComponent(cc.Graphics);
        root.addChild(this._hudBg, 0);

        this._hudItemFallback = new cc.Node('HeldItemFallback');
        this._hudItemFallback.addComponent(cc.Graphics);
        root.addChild(this._hudItemFallback, 1);

        var spriteNode = new cc.Node('HeldItemSprite');
        var itemVisual = new cc.Node('HeldItemVisual');
        var sprite = itemVisual.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.TRIMMED;
        spriteNode.setContentSize(this.hudIconSize, this.hudIconSize);
        itemVisual.setContentSize(this.hudIconSize, this.hudIconSize);
        spriteNode.addChild(itemVisual, 1);
        root.addChild(spriteNode, 2);
        this._hudItemSprite = spriteNode;
        this._hudItemVisual = itemVisual;

        this._hudHoldingLabel = this._mkHudLabel('HudHoldingLabel', '', 16, cc.Color.BLACK);
        root.addChild(this._hudHoldingLabel, 2);

        this._hudSpoilLabel = this._mkHudLabel('HudSpoilLabel', '', 16, cc.Color.BLACK);
        root.addChild(this._hudSpoilLabel, 2);

        this._hudScoreLabel = this._mkHudLabel('HudScoreLabel', '', 16, cc.Color.BLACK);
        root.addChild(this._hudScoreLabel, 2);

        this._hudElapsedLabel = this._mkHudLabel('HudElapsedLabel', '', 16, cc.Color.BLACK);
        root.addChild(this._hudElapsedLabel, 2);

        this._hudHpLabel = this._mkHudLabel('HudHpLabel', '', 16, cc.Color.BLACK);
        root.addChild(this._hudHpLabel, 2);

        this._ensureObjectiveUi();
        this._ensureCriticalHpOverlay();
    },

    _setHudHiddenForDialogue: function (hidden) {
        this._dialogueHidesHud = !!hidden;
        if (this._hudRoot && this._hudRoot.isValid) {
            this._hudRoot.active = !this._dialogueHidesHud;
        }
    },

    _ensureHudRootParent: function () {
        if (!this._hudRoot || !this._hudRoot.isValid) return;
        if (!this._camera || !this._camera.node || !this._camera.node.isValid) return;
        if (this._hudRoot.parent === this._camera.node) return;

        this._hudRoot.parent = this._camera.node;
        this._hudRoot.zIndex = 1500;
        this._hudRoot.setPosition(0, 0);
    },

    _ensureCriticalHpOverlayParent: function () {
        if (!this._criticalHpOverlayNode || !this._criticalHpOverlayNode.isValid) return;
        if (!this._camera || !this._camera.node || !this._camera.node.isValid) return;
        if (this._criticalHpOverlayNode.parent === this._camera.node) return;

        this._criticalHpOverlayNode.parent = this._camera.node;
        this._criticalHpOverlayNode.zIndex = 1490;
        this._criticalHpOverlayNode.setPosition(0, 0);
    },

    _ensureObjectiveUi: function () {
        if (this._objectiveRoot && this._objectiveRoot.isValid) return;
        if (!this._hudRoot || !this._hudRoot.isValid) return;

        var root = new cc.Node('ObjectiveUi');
        root.setAnchorPoint(0, 0.5);
        this._hudRoot.addChild(root, 3);
        this._objectiveRoot = root;

        var bg = new cc.Node('ObjectivePanel');
        bg.addComponent(cc.Graphics);
        root.addChild(bg, 0);
        this._objectiveBg = bg;

        var arrow = new cc.Node('ObjectiveArrow');
        arrow.addComponent(cc.Graphics);
        root.addChild(arrow, 1);
        this._objectiveArrow = arrow;

        var labelNode = this._mkHudLabel('ObjectiveLabel', '', this.objectiveFontSize, cc.Color.WHITE);
        var label = labelNode.getComponent(cc.Label);
        label.horizontalAlign = cc.Label.HorizontalAlign.LEFT;
        label.verticalAlign = cc.Label.VerticalAlign.CENTER;
        label.overflow = cc.Label.Overflow.CLAMP;
        root.addChild(labelNode, 2);
        this._objectiveLabel = labelNode;
    },

    _ensureCriticalHpOverlay: function () {
        if (this._criticalHpOverlayNode && this._criticalHpOverlayNode.isValid) {
            this._ensureCriticalHpOverlayParent();
            return;
        }

        var node = new cc.Node('CriticalHpOverlay');
        node.zIndex = 1490;
        node.active = false;
        node.addComponent(cc.Graphics);
        this.node.addChild(node, 1490);
        this._criticalHpOverlayNode = node;
        this._ensureCriticalHpOverlayParent();
    },

    _ensureTunnelVisionOverlay: function () {
        if (this._tunnelVisionOverlayNode && this._tunnelVisionOverlayNode.isValid) return;

        var node = new cc.Node('TunnelVisionOverlay');
        node.zIndex = 1485;
        node.active = false;
        node.addComponent(cc.Graphics);
        this.node.addChild(node, 1485);
        this._tunnelVisionOverlayNode = node;
    },

    _ensureNotificationControl: function () {
        if (this._notificationControl) {
            this._notificationControl.init(this);
            return;
        }

        this._notificationControl = this.node.getComponent('NPNotification');
        if (!this._notificationControl) {
            this._notificationControl = this.node.addComponent(NPNotification);
        }
        this._notificationControl.init(this);
    },

    _ensureDialogueControl: function () {
        if (this._dialogueControl) {
            this._dialogueControl.init(this);
            return;
        }

        this._dialogueControl = this.node.getComponent('NPDialogue');
        if (!this._dialogueControl) {
            this._dialogueControl = this.node.addComponent(NPDialogue);
        }
        this._dialogueControl.init(this);
    },

    _resumeAfterDialogue: function () {
        if (this._dialogueControl && this._dialogueControl.isSimpleOpen()) {
            this._dialogueControl.close();
        }
        this._keys = {};
        this._introDialogOpen = false;
        this._stopPlayerBody();
        this._updateOrderTrigger();
        this._updateHud(0);
        this._scheduleMainBlackDogSpawn();
    },

    _scheduleMainBlackDogSpawn: function () {
        if (this._mainBlackDogsSpawned) return;
        if (!this._blackDogControl) return;
        if (this._mainBlackDogSpawnTimer >= 0) return;

        this._mainBlackDogSpawnTimer = Math.max(0, this.mainBlackDogSpawnDelay || 0);
    },

    _updateMainBlackDogSpawn: function (dt) {
        if (this._mainBlackDogsSpawned) return;
        if (!this._blackDogControl) return;
        if (this._mainBlackDogSpawnTimer < 0) return;

        this._mainBlackDogSpawnTimer = Math.max(0, this._mainBlackDogSpawnTimer - Math.max(0, dt || 0));
        if (this._mainBlackDogSpawnTimer > 0) return;

        this._mainBlackDogsSpawned = true;
        this._mainBlackDogSpawnTimer = -1;
        this._blackDogControl.createBlackDogs();
    },

    _showIntroDialogue: function () {
        var self = this;
        this._ensureDialogueControl();
        this._introDialogOpen = true;
        this._stopAllActorMovement();
        if (this._dialogueControl) {
            if (!this._dialogueControl.show(NPDialogue.Type.IntroControls, function () {
                self._resumeAfterDialogue();
            })) {
                self._resumeAfterDialogue();
            }
        } else {
            this._resumeAfterDialogue();
        }
    },

    _showFirstTunnelIntroDialogue: function () {
        if (this._shownTunnelIntroDialogue) return;

        var self = this;
        this._shownTunnelIntroDialogue = true;
        this._ensureDialogueControl();
        this._keys = {};
        this._stopAllActorMovement();
        if (this._dialogueControl) {
            if (!this._dialogueControl.show(NPDialogue.Type.TunnelIntro, function () {
                self._resumeAfterDialogue();
            })) {
                self._resumeAfterDialogue();
            }
        } else {
            this._resumeAfterDialogue();
        }
    },


    _showNotification: function (type, duration) {
        this._ensureNotificationControl();
        if (this._notificationControl) {
            this._playSfx(this.sfxNotification, 0.75);
            this._notificationControl.showTimed(type, duration || this.notificationDuration);
        }
    },

    _showPersistentNotification: function (type) {
        this._ensureNotificationControl();
        if (this._notificationControl) {
            this._playSfx(this.sfxNotification, 0.75);
            this._notificationControl.showPersistent(type);
        }
    },

    _dismissNotification: function (type) {
        if (this._notificationControl) this._notificationControl.dismissType(type);
    },

    _clearNotifications: function () {
        if (this._notificationControl) this._notificationControl.clear();
    },

    _showFirstItemDialogue: function (item) {
        if (!item) return;
        if (!this._shownItemNotifications) this._shownItemNotifications = {};
        if (this._shownItemNotifications[item]) return;

        this._shownItemNotifications[item] = true;
        var type = this._getFirstItemDialogueType(item);
        if (!type) return;

        this._ensureDialogueControl();
        if (!this._dialogueControl) return;

        this._stopAllActorMovement();
        var self = this;
        if (!this._dialogueControl.show(type, function () {
            self._resumeAfterDialogue();
        })) {
            this._resumeAfterDialogue();
        }
    },

    _showFirstNormieBumpNotification: function () {
        if (this._isNiuPaiWaitingForPickup()) return;
        if (this._shownNormieBumpNotification) return;
        this._shownNormieBumpNotification = true;
        this._showNotification(NPNotification.Type.FirstNormieBump, this.notificationDuration);
    },

    _showFirstObstacleBumpDialogue: function () {
        if (this._shownObstacleBumpNotification) return;
        this._shownObstacleBumpNotification = true;

        this._ensureDialogueControl();
        if (!this._dialogueControl) return;

        this._stopAllActorMovement();
        var self = this;
        if (!this._dialogueControl.show(NPDialogue.Type.FirstObstacleBump, function () {
            self._resumeAfterDialogue();
        })) {
            this._resumeAfterDialogue();
        }
    },

    _playObstacleBumpSfx: function () {
        if (this._obstacleBumpSfxCooldownTimer > 0) return;
        this._obstacleBumpSfxCooldownTimer = Math.max(0, this.obstacleBumpSfxCooldownSeconds || 0.25);
        this._playSfx(this.sfxObstacleBump);
    },

    _getFirstItemDialogueType: function (item) {
        if (item === 'apple_pie') return NPDialogue.Type.FirstApplePie;
        if (item === 'bigmac') return NPDialogue.Type.FirstBigMac;
        if (item === 'mcflurry') return NPDialogue.Type.FirstMcFlurry;
        return null;
    },

    _showNiuPaiHurtNotification: function () {
        if (!this._niuPaiControl || !this._niuPaiControl.isWaitingForPlayer ||
            !this._niuPaiControl.isWaitingForPlayer()) {
            return;
        }
        this._showNotification(NPNotification.Type.NiuPaiHurt, this.notificationDuration);
    },

    _isNiuPaiWaitingForPickup: function () {
        return !!(this._niuPaiControl &&
            this._niuPaiControl.isWaitingForPlayer &&
            this._niuPaiControl.isWaitingForPlayer());
    },

    _mkHudLabel: function (name, text, size, color) {
        var node = new cc.Node(name);
        var label = node.addComponent(cc.Label);
        label.string = text;
        label.fontSize = size;
        label.lineHeight = size + 2;
        label.font = this.labelFont;
        label.horizontalAlign = cc.Label.HorizontalAlign.LEFT;
        label.verticalAlign = cc.Label.VerticalAlign.CENTER;
        node.setAnchorPoint(0, 0.5);
        node.color = color || cc.Color.WHITE;
        return node;
    },

    _updateHud: function (dt) {
        if (!this._hudRoot) return;

        if (this._heldItem && this._foodSpoilTime > 0) {
            this._foodSpoilTime = Math.max(0, this._foodSpoilTime - dt);
            if (this._foodSpoilTime <= 0) {
                this._clearHeldItem();
            }
        }

        this._updateHudPosition();
        this._refreshHudContent();
    },

    _getCameraPositionInGameNode: function () {
        if (!this._camera || !this._camera.node || !this.node) return cc.v2(0, 0);
        var cameraNode = this._camera.node;
        var parent = cameraNode.parent;
        var worldPos = parent
            ? parent.convertToWorldSpaceAR(cameraNode.getPosition())
            : cameraNode.getPosition();
        return this.node.convertToNodeSpaceAR(worldPos);
    },

    _updateHudPosition: function () {
        if (!this._hudRoot) return;

        var zoom = this._camera ? (this._camera.zoomRatio || 1) : 1;
        this._ensureHudRootParent();

        var cameraHud = this._camera && this._camera.node && this._hudRoot.parent === this._camera.node;
        if (cameraHud) {
            this._hudRoot.setPosition(0, 0);
            this._hudRoot.setScale(1 / zoom);
        } else {
            var cameraPos = this._getCameraPositionInGameNode();
            this._hudRoot.setPosition(cameraPos);
            this._hudRoot.setScale(1, 1);
        }

        var viewW = cameraHud ? cc.winSize.width : cc.winSize.width / zoom;
        var viewH = cameraHud ? cc.winSize.height : cc.winSize.height / zoom;
        var hudH = this.hudHeight;
        var hudMargin = Math.max(0, this.hudHorizontalMargin || 0);
        var hudW = Math.max(1, viewW - hudMargin * 2);
        var hudY = -viewH / 2 + hudH / 2 + 10;
        var leftX = -hudW / 2;
        var rightX = hudW / 2;

        this._hudBg.setPosition(0, hudY);
        this._drawPanel(
            this._hudBg,
            hudW,
            hudH,
            cc.color(148, 24, 112, 215),
            cc.color(255, 80, 230, 240),
            this.hudPanelSprite
        );

        var iconX = leftX + 24;
        var textY = hudY;
        this._hudItemFallback.setPosition(iconX, hudY);
        this._hudItemSprite.setPosition(iconX, hudY);
        this._hudHoldingLabel.setPosition(leftX + 48, textY);
        this._hudSpoilLabel.setPosition(leftX + hudW * 0.35, textY);
        this._hudScoreLabel.setPosition(leftX + hudW * 0.52, textY);
        this._hudElapsedLabel.setPosition(leftX + hudW * 0.64, textY);
        this._hudHpLabel.setPosition(leftX + hudW * 0.8, textY);
        this._updateObjectiveUi(0, -viewH / 2, viewW, viewH);
    },

    _refreshHudContent: function () {
        if (!this._hudRoot) return;

        var itemName = this._heldItem ? this._formatItemName(this._heldItem) : 'None';
        this._hudHoldingLabel.getComponent(cc.Label).string = 'Holding: ' + itemName;
        this._hudSpoilLabel.getComponent(cc.Label).string = this._heldItem
            ? 'Spoil: ' + Math.ceil(this._foodSpoilTime) + 's'
            : '';
        this._hudScoreLabel.getComponent(cc.Label).string = 'Score: ' + Math.floor(this._runtimeScore || 0);
        this._hudElapsedLabel.getComponent(cc.Label).string = 'Elapsed: ' + Math.floor(this._elapsedGameSeconds || 0) + 's';
        this._hudHpLabel.getComponent(cc.Label).string =
            'MC HP: ' + this._mcHp + '  NiuPai HP: ' + this._niuPaiHp;

        var spriteNode = this._hudItemVisual || this._hudItemSprite;
        var sprite = spriteNode.getComponent(cc.Sprite);
        var frame = this._getHeldItemSpriteFrame();
        sprite.spriteFrame = frame;
        this._hudItemSprite.active = !!frame;
        this._drawHeldItemFallback(true);
        this._refreshActorHpBars();
        this._updateObjectiveUi();
        this._updateTunnelVisionOverlay();
        this._updateCriticalHpOverlay();
    },

    _updateObjectiveUi: function (leftX, bottomY, viewW, viewH) {
        this._ensureObjectiveUi();
        if (!this._objectiveRoot || !this._objectiveRoot.isValid) return;

        var text = this._getObjectiveText();
        this._objectiveRoot.active = this._active && !!text;
        if (!this._objectiveRoot.active) return;

        var zoom = this._camera ? (this._camera.zoomRatio || 1) : 1;
        var cameraHud = this._camera && this._camera.node &&
            this._hudRoot && this._hudRoot.parent === this._camera.node;
        viewW = viewW || (cameraHud ? cc.winSize.width : cc.winSize.width / zoom);
        viewH = viewH || (cameraHud ? cc.winSize.height : cc.winSize.height / zoom);
        if (typeof leftX !== 'number') {
            var hudMargin = Math.max(0, this.hudHorizontalMargin || 0);
            var hudW = Math.max(1, viewW - hudMargin * 2);
            leftX = -hudW / 2;
        }
        bottomY = typeof bottomY === 'number' ? bottomY : -viewH / 2;

        var panelW = Math.max(120, this.objectivePanelWidth || 210);
        var panelH = Math.max(28, this.objectivePanelHeight || 46);
        var hudTop = bottomY + this.hudHeight;
        var panelX = leftX;
        var panelY = hudTop + 10 + panelH / 2 + 8;
        this._objectiveRoot.setPosition(panelX, panelY);
        this._objectiveRoot.setContentSize(panelW, panelH);

        this._drawObjectivePanel(panelW, panelH);

        var showArrow = this._currentSection === 'main' && !!this._heldItem;
        this._objectiveArrow.active = showArrow;
        var textX = showArrow ? 40 : 12;
        this._objectiveLabel.setPosition(textX, 0);
        this._objectiveLabel.setContentSize(panelW - textX - 10, panelH);
        this._objectiveLabel.getComponent(cc.Label).string = text;

        if (showArrow) this._drawObjectiveArrow();
    },

    _getObjectiveText: function () {
        if (this._currentSection === 'tunnel') {
            return 'get out of here safely!';
        }
        if (this._currentSection === 'main') {
            if (this._heldItem) return 'clean up the obstacles\nand leave here safely!';
            return 'order some food at McDonald!';
        }
        return '';
    },

    _drawObjectivePanel: function (width, height) {
        if (!this._objectiveBg || !this._objectiveBg.isValid) return;

        var gfx = this._objectiveBg.getComponent(cc.Graphics);
        if (!gfx) return;
        gfx.clear();
        gfx.fillColor = cc.color(18, 8, 24, 215);
        gfx.strokeColor = cc.color(0, 0, 0, 255);
        gfx.lineWidth = 2;
        gfx.rect(0, -height / 2, width, height);
        gfx.fill();
        gfx.stroke();
        this._drawObjectiveShadow(width, height);
    },

    _drawObjectiveShadow: function (width, height) {
        if (!this._objectiveBg || !this._objectiveBg.isValid || !this._objectiveBg.parent) return;

        var shadow = this._objectiveBg.parent.getChildByName('ObjectivePanel_RectShadow');
        if (!shadow || !shadow.isValid) {
            shadow = new cc.Node('ObjectivePanel_RectShadow');
            shadow.setAnchorPoint(0, 0.5);
            shadow.zIndex = (this._objectiveBg.zIndex || 0) - 1;
            this._objectiveBg.parent.addChild(shadow, shadow.zIndex);
            shadow.addComponent(cc.Graphics);
        }

        shadow.zIndex = (this._objectiveBg.zIndex || 0) - 1;
        shadow.setContentSize(width, height);
        shadow.setPosition(
            this._objectiveBg.x + this._getGuiShadowOffsetX(),
            this._objectiveBg.y + this._getGuiShadowOffsetY()
        );
        shadow.active = true;

        var gfx = shadow.getComponent(cc.Graphics);
        gfx.clear();
        gfx.fillColor = cc.color(0, 0, 0, 125);
        gfx.rect(0, -height / 2, width, height);
        gfx.fill();
    },

    _drawObjectiveArrow: function () {
        if (!this._objectiveArrow || !this._objectiveArrow.isValid) return;

        var gfx = this._objectiveArrow.getComponent(cc.Graphics);
        if (!gfx) return;
        gfx.clear();
        gfx.fillColor = cc.color(255, 238, 55, 245);
        gfx.strokeColor = cc.color(255, 250, 120, 255);
        gfx.lineWidth = 1;
        gfx.moveTo(12, 0);
        gfx.lineTo(-8, 9);
        gfx.lineTo(-4, 0);
        gfx.lineTo(-8, -9);
        gfx.close();
        gfx.fill();
        gfx.stroke();

        this._objectiveArrow.setPosition(22, 0);
        var center = this._getTunnelEntranceCenter();
        if (!center || !this._playerNode) {
            this._objectiveArrow.rotation = 0;
            return;
        }

        var dx = center.x - this._playerNode.x;
        var dy = center.y - this._playerNode.y;
        this._objectiveArrow.rotation = -Math.atan2(dy, dx) * 180 / Math.PI;
    },

    _updateTunnelVisionOverlay: function () {
        this._ensureTunnelVisionOverlay();
        var node = this._tunnelVisionOverlayNode;
        if (!node || !node.isValid) return;

        var visible = this._active && this._currentSection === 'tunnel' && this._playerNode;
        node.active = visible;
        if (!visible) return;

        var overlayFade = Math.max(0, Math.min(1, typeof this._tunnelOverlayFade === 'number' ? this._tunnelOverlayFade : 1));
        if (overlayFade <= 0) {
            var emptyGfx = node.getComponent(cc.Graphics);
            if (emptyGfx) emptyGfx.clear();
            node.active = false;
            return;
        }

        var cameraPos = this._getCameraPositionInGameNode();
        node.setPosition(cameraPos);

        var zoom = this._camera ? (this._camera.zoomRatio || 1) : 1;
        var viewW = cc.winSize.width / zoom;
        var viewH = cc.winSize.height / zoom;
        var hudH = this.hudHeight;
        var left = -viewW / 2;
        var right = viewW / 2;
        var bottom = -viewH / 2 + hudH;
        var top = viewH / 2;

        var playerX = this._playerNode.x - cameraPos.x;
        var playerY = this._playerNode.y - cameraPos.y;
        var entrance = this._getTunnelReturnEntranceCenter();
        var entranceX = entrance ? entrance.x - cameraPos.x : null;
        var entranceY = entrance ? entrance.y - cameraPos.y : null;
        var radius = Math.max(1, this.tunnelVisionRadius || 1);
        var entranceRadius = Math.max(radius * 0.65, this.tunnelEntranceHeight || 48);
        var bands = Math.max(8, this.tunnelVisionBands || 44);
        var bandH = (top - bottom) / bands;

        var gfx = node.getComponent(cc.Graphics);
        gfx.clear();

        gfx.fillColor = cc.color(0, 0, 0, Math.max(0, Math.min(255, (this.tunnelDarknessOpacity || 0) * overlayFade)));
        gfx.rect(left, bottom, viewW, top - bottom);
        gfx.fill();

        gfx.fillColor = cc.color(0, 0, 0, Math.max(0, Math.min(255, (this.tunnelVisionOuterOpacity || 0) * overlayFade)));
        for (var i = 0; i < bands; i++) {
            var y0 = bottom + i * bandH;
            var y1 = i === bands - 1 ? top : y0 + bandH + 0.5;
            var midY = (y0 + y1) / 2;
            var h = y1 - y0;
            var holes = [];

            this._addTunnelVisionHoleForBand(holes, playerX, playerY, radius, midY);
            if (entrance) this._addTunnelVisionHoleForBand(holes, entranceX, entranceY, entranceRadius, midY);

            if (holes.length === 0) {
                gfx.rect(left, y0, viewW, h);
                continue;
            }

            holes.sort(function (a, b) { return a.left - b.left; });
            var cursor = left;
            for (var j = 0; j < holes.length; j++) {
                var holeLeft = Math.max(left, holes[j].left);
                var holeRight = Math.min(right, holes[j].right);
                if (holeRight <= cursor) continue;
                if (holeLeft > cursor) gfx.rect(cursor, y0, holeLeft - cursor, h);
                cursor = Math.max(cursor, holeRight);
            }
            if (cursor < right) gfx.rect(cursor, y0, right - cursor, h);
        }
        gfx.fill();
    },

    _addTunnelVisionHoleForBand: function (holes, x, y, radius, bandY) {
        if (!holes || typeof x !== 'number' || typeof y !== 'number') return;

        var dy = bandY - y;
        if (Math.abs(dy) >= radius) return;

        var halfVision = Math.sqrt(radius * radius - dy * dy);
        holes.push({
            left: x - halfVision,
            right: x + halfVision,
        });
    },

    _updateCriticalHpOverlay: function () {
        this._ensureCriticalHpOverlay();
        var node = this._criticalHpOverlayNode;
        if (!node || !node.isValid) return;

        var mcCritical = this.mcMaxHp > 0 && this._mcHp / this.mcMaxHp <= this.criticalHpRatio;
        var niuPaiCritical = this.niuPaiMaxHp > 0 && this._niuPaiHp / this.niuPaiMaxHp <= this.criticalHpRatio;
        var visible = this._active && (mcCritical || niuPaiCritical);
        node.active = visible;
        if (!visible) return;

        var zoom = this._camera ? (this._camera.zoomRatio || 1) : 1;
        var cameraOverlay = this._camera && this._camera.node && node.parent === this._camera.node;
        if (cameraOverlay) {
            node.setPosition(0, 0);
            node.setScale(1 / zoom);
        } else {
            var cameraPos = this._getCameraPositionInGameNode();
            node.setPosition(cameraPos);
            node.setScale(1, 1);
        }

        var viewW = cameraOverlay ? cc.winSize.width : cc.winSize.width / zoom;
        var viewH = cameraOverlay ? cc.winSize.height : cc.winSize.height / zoom;
        var hudBottomMargin = 10;
        var overlayH = Math.max(0, viewH);
        var overlayBottom = -viewH / 2;

        var gfx = node.getComponent(cc.Graphics);
        gfx.clear();
        gfx.fillColor = cc.color(255, 0, 0, Math.max(0, Math.min(255, this.criticalHpOverlayOpacity || 0)));
        gfx.rect(-viewW / 2, overlayBottom, viewW, overlayH);
        gfx.fill();
    },

    _drawHeldItemFallback: function (visible) {
        var gfx = this._hudItemFallback.getComponent(cc.Graphics);
        this._hudItemFallback.active = visible;
        if (!visible) {
            if (gfx) gfx.clear();
            return;
        }

        var size = this.hudIconSize;
        this._drawPanel(
            this._hudItemFallback,
            size,
            size,
            cc.color(0, 0, 0, 0),
            cc.color(255, 235, 180, 230),
            this.hudItemFrameSprite,
            false
        );
    },

    _setHeldItem: function (item) {
        this._heldItem = item;
        this._foodSpoilTime = this.spoilDuration;
        this._refreshHudContent();
        this._playSfx(this.sfxItemPickup);
        this._showFirstItemDialogue(item);
    },

    _clearHeldItem: function () {
        if (!this._heldItem) return;

        cc.log('[NiuPai] Held food spoiled: ' + this._formatItemName(this._heldItem));
        this._playSfx(this.sfxFoodSpoil);
        this._heldItem = null;
        this._foodSpoilTime = 0;
        this._refreshHudContent();
    },

    _getHeldItemSpriteFrame: function () {
        if (this._heldItem === 'apple_pie') return this.applePieSprite;
        if (this._heldItem === 'bigmac') return this.bigMacSprite;
        if (this._heldItem === 'mcflurry') return this.mcFlurrySprite;
        return null;
    },

    _getHeldItemDropShadowSpriteFrame: function () {
        if (this._heldItem === 'bigmac') return this.bigMacDropShadowSprite || this.itemDropShadowSprite;
        if (this._heldItem === 'mcflurry') return this.mcFlurryDropShadowSprite || this.itemDropShadowSprite;
        return this.itemDropShadowSprite;
    },

    _formatItemName: function (item) {
        if (item === 'apple_pie') return 'Apple Pie';
        if (item === 'bigmac') return 'Big Mac';
        if (item === 'mcflurry') return 'McFlurry';
        return item || '';
    },

    _useHeldItem: function () {
        if (!this._active || !this._heldItem || !this._playerNode) return;
        if (this._orderOpen || this._playerInQueue) return;

        var item = this._heldItem;
        if (item === 'apple_pie') {
            var oldHp = this._mcHp;
            this._mcHp = this.mcMaxHp;
            this._playSfx(this.sfxItemUse);
            this._consumeHeldItem('[NiuPai] Apple Pie used. MC fully healed.');
            this._refreshHudContent();
            if (oldHp < this._mcHp) this._playHealEffect(this._playerNode);
            return;
        }

        if (item === 'bigmac') {
            this._useBigMac();
            return;
        }

        if (item === 'mcflurry') {
            this._useMcFlurry();
        }
    },

    _useBigMac: function () {
        this._tryHealNiuPaiWithBigMac();
        this._spawnBigMacBait(this._playerNode.getPosition());
        this._playSfx(this.sfxItemUse);
        this._playSfx(this.sfxBigMacBait, 0.8);
        this._consumeHeldItem('[NiuPai] Big Mac placed as bait.');
    },

    _tryHealNiuPaiWithBigMac: function () {
        if (!this._niuPaiNode) return;

        var dx = this._niuPaiNode.x - this._playerNode.x;
        var dy = this._niuPaiNode.y - this._playerNode.y;
        var distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > this.bigMacNiuPaiHealRange) return;

        var oldHp = this._niuPaiHp;
        this._niuPaiHp = this.niuPaiMaxHp;
        this._refreshHudContent();
        if (oldHp < this._niuPaiHp) this._playHealEffect(this._niuPaiNode);
        cc.log('[NiuPai] Big Mac healed NiuPai fully.');
    },

    _spawnBigMacBait: function (position) {
        if (!this._world || !position) return;

        var maxHp = Math.max(1, this.bigMacBaitHp || 1);
        var node = new cc.Node('BigMacBait');
        node.setAnchorPoint(0.5, 0.5);
        node.setContentSize(this.bigMacBaitSize, this.bigMacBaitSize);
        node.setPosition(position);
        this._world.addChild(node, 16);

        if (this.bigMacSprite) {
            this._ensureItemDropShadow(
                node,
                this.itemDropShadowOffsetY || -3,
                this.bigMacDropShadowSprite || this.itemDropShadowSprite
            );
            var visual = new cc.Node('BigMacBaitVisual');
            visual.setContentSize(this.bigMacBaitSize, this.bigMacBaitSize);
            node.addChild(visual, 1);
            var sprite = visual.addComponent(cc.Sprite);
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            sprite.spriteFrame = this.bigMacSprite;
        } else {
            var gfx = node.addComponent(cc.Graphics);
            gfx.fillColor = cc.color(205, 120, 42, 230);
            gfx.circle(0, 0, this.bigMacBaitSize / 2);
            gfx.fill();
            gfx.fillColor = cc.color(255, 220, 80, 230);
            gfx.rect(-this.bigMacBaitSize / 2 + 4, -2, this.bigMacBaitSize - 8, 5);
            gfx.fill();
        }

        var hpBar = this._createActorHpBar(node, this.bigMacBaitSize);
        this._drawActorHpBar(hpBar, maxHp, maxHp);
        this._attachBigMacSmellEffect(node);

        this._bigMacBaits.push({
            node: node,
            hp: maxHp,
            maxHp: maxHp,
            hpBar: hpBar,
        });
    },

    _attachBigMacSmellEffect: function (node) {
        if (!node || !node.isValid) return;

        if (this.bigMacSmellParticleSprite) {
            var particleNode = new cc.Node('BigMacSmellParticle');
            particleNode.setPosition(0, 4);
            node.addChild(particleNode, 4);

            var particle = particleNode.addComponent(cc.ParticleSystem);
            particle.custom = true;
            particle.playOnLoad = true;
            particle.autoRemoveOnFinish = false;
            particle.duration = cc.ParticleSystem.DURATION_INFINITY;
            particle.emitterMode = cc.ParticleSystem.EmitterMode.GRAVITY;
            particle.positionType = cc.ParticleSystem.PositionType.FREE;
            particle.spriteFrame = this.bigMacSmellParticleSprite;
            particle.totalParticles = 18;
            particle.emissionRate = Math.max(1, this.bigMacSmellEmissionRate || 8);
            particle.life = Math.max(0.05, this.bigMacSmellLife || 0.8);
            particle.lifeVar = particle.life * 0.25;
            particle.speed = Math.max(0, this.bigMacSmellSpeed || 18);
            particle.speedVar = particle.speed * 0.45;
            particle.angle = 90;
            particle.angleVar = 32;
            particle.gravity = cc.v2(0, 0);
            particle.radialAccel = 0;
            particle.radialAccelVar = 0;
            particle.tangentialAccel = 0;
            particle.tangentialAccelVar = 0;
            particle.startSize = Math.max(1, this.bigMacSmellStartSize || 8);
            particle.startSizeVar = particle.startSize * 0.3;
            particle.endSize = Math.max(0, this.bigMacSmellEndSize || 2);
            particle.endSizeVar = 0;
            particle.startColor = cc.color(255, 235, 120, 125);
            particle.startColorVar = cc.color(18, 18, 18, 30);
            particle.endColor = cc.color(255, 220, 110, 0);
            particle.endColorVar = cc.color(10, 10, 10, 0);
            particle.posVar = cc.v2(this.bigMacBaitSize / 2, 4);
            particle.sourcePos = cc.v2(0, 0);
            return;
        }

        var smell = new cc.Node('BigMacSmellFallback');
        smell.setPosition(0, 0);
        node.addChild(smell, 3);
        var gfx = smell.addComponent(cc.Graphics);
        var radius = Math.max(10, this.bigMacBaitSize || 28);
        gfx.strokeColor = cc.color(255, 220, 75, 135);
        gfx.lineWidth = 2;
        gfx.circle(0, 0, radius);
        gfx.stroke();
        smell.opacity = 175;
        smell.setScale(0.7);
        smell.runAction(cc.repeatForever(cc.sequence(
            cc.spawn(cc.scaleTo(0.7, 1.35), cc.fadeTo(0.7, 25)),
            cc.callFunc(function () {
                if (smell && smell.isValid) {
                    smell.setScale(0.7);
                    smell.opacity = 175;
                }
            })
        )));
    },

    _useMcFlurry: function () {
        var center = this._playerNode.getPosition();
        this._spawnMcFlurryExplosion(center);
        this._playSfx(this.sfxItemUse);
        this._playSfx(this.sfxMcFlurryArm, 0.85);
        this._consumeHeldItem('[NiuPai] McFlurry armed.');
    },

    _spawnMcFlurryExplosion: function (center) {
        if (!this._world || !center) return;

        var node = new cc.Node('McFlurryExplosion');
        node.setPosition(center);
        this._world.addChild(node, 17);

        var areaNode = new cc.Node('McFlurryExplosionArea');
        node.addChild(areaNode, -1);
        var areaGfx = areaNode.addComponent(cc.Graphics);
        this._drawMcFlurryExplosionFallback(areaGfx, false);

        node.setContentSize(this.mapTileSize, this.mapTileSize);
        if (this.mcFlurrySprite) {
            this._ensureItemDropShadow(
                node,
                this.itemDropShadowOffsetY || -3,
                this.mcFlurryDropShadowSprite || this.itemDropShadowSprite
            );
            var visual = new cc.Node('McFlurryVisual');
            visual.setContentSize(this.mapTileSize, this.mapTileSize);
            node.addChild(visual, 1);
            var sprite = visual.addComponent(cc.Sprite);
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            sprite.spriteFrame = this.mcFlurrySprite;
        }
        var countdownLabel = this._createMcFlurryCountdownLabel(node);
        node.runAction(cc.repeatForever(cc.sequence(
            cc.fadeTo(0.18, 150),
            cc.fadeTo(0.18, 255)
        )));

        this._mcFlurryExplosions.push({
            node: node,
            label: countdownLabel,
            timer: Math.max(0, this.mcFlurryExplosionDelay || 0),
            center: cc.v2(center.x, center.y),
        });
    },

    _createMcFlurryCountdownLabel: function (parent) {
        var labelNode = new cc.Node('McFlurryCountdown');
        labelNode.setPosition(0, this.mapTileSize / 2 + 10);
        parent.addChild(labelNode, 2);

        var label = labelNode.addComponent(cc.Label);
        label.string = '';
        label.font = this.labelFont;
        label.fontSize = 12;
        label.lineHeight = 14;
        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        labelNode.color = cc.color(255, 255, 255);
        return label;
    },

    _updateMcFlurryExplosions: function (dt) {
        if (!this._mcFlurryExplosions || this._mcFlurryExplosions.length === 0) return;
        if (this._isDialogueBlockingGameplayTimer()) return;

        var kept = [];
        for (var i = 0; i < this._mcFlurryExplosions.length; i++) {
            var explosion = this._mcFlurryExplosions[i];
            explosion.timer = Math.max(0, explosion.timer - dt);
            this._updateMcFlurryCountdownLabel(explosion);

            if (explosion.timer > 0) {
                kept.push(explosion);
                continue;
            }

            this._detonateMcFlurry(explosion);
        }

        this._mcFlurryExplosions = kept;
    },

    _isDialogueBlockingGameplayTimer: function () {
        if (this._orderOpen || this._introDialogOpen) return true;
        if (!this._dialogueControl) return false;
        return this._dialogueControl.isSimpleOpen() || this._dialogueControl.isOrderOpen();
    },

    _updateMcFlurryCountdownLabel: function (explosion) {
        if (!explosion || !explosion.label || !explosion.label.node || !explosion.label.node.isValid) return;

        var time = Math.max(0, explosion.timer || 0);
        explosion.label.string = time >= 1
            ? String(Math.ceil(time))
            : time.toFixed(1);
        explosion.label.node.color = time <= 0.75
            ? cc.color(255, 120, 120)
            : cc.color(255, 255, 255);
    },

    _detonateMcFlurry: function (explosion) {
        if (!explosion) return;
        this._startCameraShake(this.mcFlurryScreenShakeSeconds, this.mcFlurryScreenShakeStrength);
        this._playSfx(this.sfxMcFlurryExplosion, 1);

        if (explosion.node && explosion.node.isValid) {
            explosion.node.stopAllActions();
            explosion.node.opacity = 255;
            if (explosion.label && explosion.label.node && explosion.label.node.isValid) {
                explosion.label.node.destroy();
            }
            var visual = explosion.node.getChildByName('McFlurryVisual');
            if (visual && visual.isValid) visual.destroy();
            var shadow = explosion.node.getChildByName('NPItemDropShadow');
            if (shadow && shadow.isValid) shadow.destroy();
            var sprite = explosion.node.getComponent(cc.Sprite);
            if (sprite) {
                sprite.spriteFrame = null;
                sprite.destroy();
            }
            var areaNode = explosion.node.getChildByName('McFlurryExplosionArea');
            var gfx = areaNode && areaNode.isValid
                ? areaNode.getComponent(cc.Graphics)
                : explosion.node.getComponent(cc.Graphics);
            if (gfx) {
                if (this._hasMcFlurryExplosionSpriteAnimation()) gfx.clear();
                else this._drawMcFlurryExplosionFallback(gfx, true);
            }
            this._playMcFlurryExplosionEffect(explosion.node);
            explosion.node.runAction(cc.sequence(
                cc.delayTime(0.42),
                cc.callFunc(function () {
                    if (explosion.node && explosion.node.isValid) explosion.node.destroy();
                })
            ));
        }

        if (this._blackDogControl) {
            this._blackDogControl.stunDogsInMcFlurryExplosion(
                explosion.center,
                Math.max(0, this.mcFlurryExplosionRangeTiles || 0),
                Math.max(0, this.mcFlurryStunSeconds || 0)
            );
        }
        var removed = this._destroyObstaclesInMcFlurryExplosion(explosion.center);
        if (removed > 0) this._rebuildPathGridsAfterObstacleChange();
        cc.log('[NiuPai] McFlurry exploded.');
    },

    _playMcFlurryExplosionEffect: function (root) {
        if (!root || !root.isValid) return;

        var tile = this.mapTileSize || 32;
        var range = Math.max(0, this.mcFlurryExplosionRangeTiles || 0);
        for (var y = -range; y <= range; y++) {
            for (var x = -range; x <= range; x++) {
                if (Math.abs(x) + Math.abs(y) > range) continue;
                this._spawnMcFlurryExplosionCell(root, x, y, tile);
            }
        }
    },

    _spawnMcFlurryExplosionCell: function (root, tileX, tileY, tileSize) {
        var cell = new cc.Node('McFlurryExplosionCell');
        cell.setPosition(tileX * tileSize, tileY * tileSize);
        cell.opacity = 235;
        root.addChild(cell, 3);

        var delay = (Math.abs(tileX) + Math.abs(tileY)) * 0.04;
        if (this._playMcFlurryExplosionSpriteAnimation(cell, tileSize, delay)) return;

        cell.setScale(0.2);
        var gfx = cell.addComponent(cc.Graphics);
        var half = tileSize / 2;
        gfx.fillColor = cc.color(185, 250, 255, 150);
        gfx.strokeColor = cc.color(255, 255, 255, 245);
        gfx.lineWidth = 2;
        gfx.rect(-half, -half, tileSize, tileSize);
        gfx.fill();
        gfx.stroke();

        cell.runAction(cc.sequence(
            cc.delayTime(delay),
            cc.spawn(
                cc.scaleTo(0.16, 1.08),
                cc.fadeTo(0.16, 190)
            ),
            cc.spawn(
                cc.scaleTo(0.18, 1.35),
                cc.fadeOut(0.18)
            ),
            cc.callFunc(function () {
                if (cell && cell.isValid) cell.destroy();
            })
        ));
    },

    _playMcFlurryExplosionSpriteAnimation: function (cell, tileSize, delay) {
        var frames = this._getMcFlurryExplosionSpriteFrames();
        if (!frames || frames.length === 0) return false;

        cell.setContentSize(tileSize, tileSize);
        cell.setScale(tileSize / Math.max(1, this.mcFlurryExplosionFrameW || tileSize));

        var sprite = cell.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frames[0];

        var clip = cc.AnimationClip.createWithSpriteFrames(frames, Math.max(1, this.mcFlurryExplosionFps || 18));
        clip.wrapMode = cc.WrapMode.Normal;
        clip.name = 'McFlurryExplosionOnce';

        var anim = cell.addComponent(cc.Animation);
        anim.addClip(clip);
        cell.runAction(cc.sequence(
            cc.delayTime(delay),
            cc.callFunc(function () {
                if (!cell || !cell.isValid) return;
                anim.play(clip.name);
            }),
            cc.delayTime(frames.length / Math.max(1, this.mcFlurryExplosionFps || 18)),
            cc.fadeOut(0.08),
            cc.callFunc(function () {
                if (cell && cell.isValid) cell.destroy();
            })
        ));
        return true;
    },

    _hasMcFlurryExplosionSpriteAnimation: function () {
        return (this.mcFlurryExplosionFrames && this.mcFlurryExplosionFrames.length > 0) ||
            !!this.mcFlurryExplosionSheet;
    },

    _getMcFlurryExplosionSpriteFrames: function () {
        if (this.mcFlurryExplosionFrames && this.mcFlurryExplosionFrames.length > 0) {
            return this.mcFlurryExplosionFrames;
        }

        if (!this.mcFlurryExplosionSheet) return null;

        var frames = [];
        var fw = Math.max(1, this.mcFlurryExplosionFrameW || 32);
        var fh = Math.max(1, this.mcFlurryExplosionFrameH || 32);
        var count = Math.max(1, this.mcFlurryExplosionFrameCount || 8);
        for (var i = 0; i < count; i++) {
            frames.push(new cc.SpriteFrame(this.mcFlurryExplosionSheet, cc.rect(i * fw, 0, fw, fh)));
        }
        return frames;
    },

    _destroyObstaclesInMcFlurryExplosion: function (center) {
        if (!center || !this._initialObstacles || this._initialObstacles.length === 0) return 0;

        var kept = [];
        var removedIds = {};
        var removed = 0;
        for (var i = 0; i < this._initialObstacles.length; i++) {
            var obstacle = this._initialObstacles[i];
            if (!obstacle || !this._isObstacleInMcFlurryExplosion(obstacle, center)) {
                kept.push(obstacle);
                continue;
            }

            removedIds[obstacle.id] = true;
            removed++;
            this._playObstacleDestroyAnimation(obstacle);
            if (obstacle.node && obstacle.node.isValid) obstacle.node.destroy();
        }

        this._initialObstacles = kept;
        this._removeInitialObstacleCollisionRects(removedIds);
        if (removed > 0) {
            this._playSfx(this.sfxObstacleBreak);
            this._addScore(removed * Math.max(0, this.scoreObstacleRemovePoints || 0), 'obstacle');
        }
        if (removed > 0) cc.log('[NiuPai] McFlurry destroyed obstacles: ' + removed);
        return removed;
    },

    _playObstacleDestroyAnimation: function (obstacle) {
        if (!obstacle || !obstacle.node || !obstacle.node.isValid || !this._world) return false;

        var frames = this._getObstacleDestroySpriteFrames();
        if (!frames || frames.length === 0) return false;

        var effectNode = new cc.Node('ObstacleDestroyEffect');
        effectNode.setAnchorPoint(0.5, 0.5);
        effectNode.setContentSize(this.initialObstacleSize || 32, this.initialObstacleSize || 32);
        effectNode.setPosition(obstacle.node.getPosition());
        this._world.addChild(effectNode, 31);

        var sprite = effectNode.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frames[0];

        var fps = Math.max(1, this.obstacleDestroyFps || 18);
        var frameW = Math.max(1, this.obstacleDestroyFrameW || 32);
        effectNode.setScale((this.initialObstacleSize || 32) / frameW);

        var clip = cc.AnimationClip.createWithSpriteFrames(frames, fps);
        clip.wrapMode = cc.WrapMode.Normal;
        clip.name = 'ObstacleDestroyOnce';

        var anim = effectNode.addComponent(cc.Animation);
        anim.addClip(clip);
        anim.play(clip.name);

        effectNode.runAction(cc.sequence(
            cc.delayTime(frames.length / fps),
            cc.callFunc(function () {
                if (effectNode && effectNode.isValid) effectNode.destroy();
            })
        ));
        return true;
    },

    _getObstacleDestroySpriteFrames: function () {
        if (this.obstacleDestroyFrames && this.obstacleDestroyFrames.length > 0) {
            return this.obstacleDestroyFrames;
        }

        if (!this.obstacleDestroySheet) return null;

        var frames = [];
        var fw = Math.max(1, this.obstacleDestroyFrameW || 32);
        var fh = Math.max(1, this.obstacleDestroyFrameH || 32);
        var count = Math.max(1, this.obstacleDestroyFrameCount || 8);
        for (var i = 0; i < count; i++) {
            frames.push(new cc.SpriteFrame(this.obstacleDestroySheet, cc.rect(i * fw, 0, fw, fh)));
        }
        return frames;
    },

    _playHealEffect: function (actorNode) {
        if (!actorNode || !actorNode.isValid) return false;
        this._playSfx(this.sfxHeal, 0.85);

        if (this._playHealParticleEffect(actorNode)) return true;

        var frames = this._getHealEffectSpriteFrames();
        if (!frames || frames.length === 0) return this._playHealFallbackEffect(actorNode);

        var node = new cc.Node('HealEffect');
        node.setAnchorPoint(0.5, 0.5);
        node.setContentSize(this.healEffectFrameW || 32, this.healEffectFrameH || 32);
        node.setPosition(0, 0);
        actorNode.addChild(node, 60);

        var sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frames[0];

        var fps = Math.max(1, this.healEffectFps || 18);
        var clip = cc.AnimationClip.createWithSpriteFrames(frames, fps);
        clip.wrapMode = cc.WrapMode.Normal;
        clip.name = 'HealEffectOnce';

        var anim = node.addComponent(cc.Animation);
        anim.addClip(clip);
        anim.play(clip.name);

        node.runAction(cc.sequence(
            cc.delayTime(frames.length / fps),
            cc.callFunc(function () {
                if (node && node.isValid) node.destroy();
            })
        ));
        return true;
    },

    _playHealFallbackEffect: function (actorNode) {
        var node = new cc.Node('HealEffectFallback');
        node.setPosition(0, 0);
        actorNode.addChild(node, 60);

        var gfx = node.addComponent(cc.Graphics);
        gfx.fillColor = cc.color(95, 255, 135, 110);
        gfx.strokeColor = cc.color(190, 255, 205, 230);
        gfx.lineWidth = 2;
        gfx.circle(0, 0, 14);
        gfx.fill();
        gfx.stroke();

        node.setScale(0.4);
        node.runAction(cc.sequence(
            cc.spawn(cc.scaleTo(0.22, 1.25), cc.fadeOut(0.22)),
            cc.callFunc(function () {
                if (node && node.isValid) node.destroy();
            })
        ));
        return true;
    },

    _getHealEffectSpriteFrames: function () {
        if (this.healEffectFrames && this.healEffectFrames.length > 0) {
            return this.healEffectFrames;
        }

        if (!this.healEffectSheet) return null;

        var frames = [];
        var fw = Math.max(1, this.healEffectFrameW || 32);
        var fh = Math.max(1, this.healEffectFrameH || 32);
        var count = Math.max(1, this.healEffectFrameCount || 8);
        for (var i = 0; i < count; i++) {
            frames.push(new cc.SpriteFrame(this.healEffectSheet, cc.rect(i * fw, 0, fw, fh)));
        }
        return frames;
    },

    _setRunParticleActive: function (type, actorNode, active) {
        if (!actorNode || !actorNode.isValid) return false;

        var particle = this._ensureRunParticle(type, actorNode);
        if (!particle) return false;

        if (active) {
            if (particle.stopped) particle.resetSystem();
        } else {
            particle.stopSystem();
        }
        return true;
    },

    _ensureRunParticle: function (type, actorNode) {
        var spriteFrame = this._getRunParticleSprite(type);
        if (!spriteFrame) return null;

        var node = actorNode.getChildByName('RunParticle');
        if (!node || !node.isValid) {
            node = new cc.Node('RunParticle');
            node.setPosition(0, this.runParticleYOffset);
            actorNode.addChild(node, -1);
        }

        var particle = node.getComponent(cc.ParticleSystem);
        if (!particle) {
            particle = node.addComponent(cc.ParticleSystem);
            particle.custom = true;
            particle.playOnLoad = false;
            particle.autoRemoveOnFinish = false;
            particle.duration = cc.ParticleSystem.DURATION_INFINITY;
            particle.emitterMode = cc.ParticleSystem.EmitterMode.GRAVITY;
            particle.positionType = cc.ParticleSystem.PositionType.FREE;
            particle.totalParticles = 24;
            particle.angle = 270;
            particle.angleVar = 55;
            particle.gravity = cc.v2(0, 0);
            particle.radialAccel = 0;
            particle.radialAccelVar = 0;
            particle.tangentialAccel = 0;
            particle.tangentialAccelVar = 0;
            particle.startSpin = 0;
            particle.startSpinVar = 0;
            particle.endSpin = 0;
            particle.endSpinVar = 0;
            particle.rotationIsDir = false;
            particle.startColor = cc.color(225, 220, 205, 145);
            particle.startColorVar = cc.color(25, 25, 25, 35);
            particle.endColor = cc.color(190, 180, 165, 0);
            particle.endColorVar = cc.color(10, 10, 10, 0);
            particle.stopSystem();
        }

        node.setPosition(0, this.runParticleYOffset);
        particle.spriteFrame = spriteFrame;
        particle.emissionRate = Math.max(1, this.runParticleEmissionRate || 18);
        particle.life = Math.max(0.01, this.runParticleLife || 0.22);
        particle.lifeVar = particle.life * 0.35;
        particle.speed = Math.max(0, this.runParticleSpeed || 18);
        particle.speedVar = Math.max(0, this.runParticleSpeedVar || 8);
        particle.startSize = Math.max(1, this.runParticleStartSize || 7);
        particle.startSizeVar = Math.max(0, particle.startSize * 0.35);
        particle.endSize = Math.max(0, this.runParticleEndSize || 1);
        particle.endSizeVar = 0;
        particle.posVar = this.runParticlePosVar || cc.v2(8, 2);
        particle.sourcePos = cc.v2(0, 0);
        return particle;
    },

    _getRunParticleSprite: function (type) {
        if (type === 'blackdog') return this.blackDogRunParticleSprite || this.playerRunParticleSprite;
        return this.playerRunParticleSprite;
    },

    _trySpawnMoveEffect: function (type, actorNode) {
        if (!actorNode || !actorNode.isValid) return false;

        var now = Date.now() / 1000;
        if (actorNode._npMoveEffectNextTime && now < actorNode._npMoveEffectNextTime) return false;
        actorNode._npMoveEffectNextTime = now + Math.max(0.01, this.moveEffectInterval || 0.22);

        var frames = type === 'blackdog'
            ? this._getSpriteFramesFromSheet(this.blackDogMoveEffectFrames, this.blackDogMoveEffectSheet, this.moveEffectFrameW, this.moveEffectFrameH, this.moveEffectFrameCount)
            : this._getSpriteFramesFromSheet(this.playerMoveEffectFrames, this.playerMoveEffectSheet, this.moveEffectFrameW, this.moveEffectFrameH, this.moveEffectFrameCount);
        return this._playEffectAtWorldPosition(frames, actorNode.getPosition(), {
            name: 'MoveEffect',
            frameW: this.moveEffectFrameW,
            frameH: this.moveEffectFrameH,
            fps: this.moveEffectFps,
            zIndex: 14,
            fallbackColor: type === 'blackdog' ? cc.color(60, 60, 70, 120) : cc.color(220, 230, 255, 120),
        });
    },

    _playNormieCollisionEffects: function (normieNode, collisionPosition) {
        if (!normieNode || !normieNode.isValid) return;
        var now = Date.now() / 1000;
        if (normieNode._npNormieCollisionEffectNextTime && now < normieNode._npNormieCollisionEffectNextTime) return;
        normieNode._npNormieCollisionEffectNextTime = now + 0.8;

        var collisionFrames = this._getSpriteFramesFromSheet(
            this.normieCollisionEffectFrames,
            this.normieCollisionEffectSheet,
            this.normieEffectFrameW,
            this.normieEffectFrameH,
            this.normieEffectFrameCount
        );
        this._playEffectAtWorldPosition(collisionFrames, collisionPosition || normieNode.getPosition(), {
            name: 'NormieCollisionEffect',
            frameW: this.normieEffectFrameW,
            frameH: this.normieEffectFrameH,
            fps: this.normieEffectFps,
            zIndex: 62,
            fallbackColor: cc.color(255, 230, 120, 150),
        });

        var scaredFrames = this._getSpriteFramesFromSheet(
            this.normieScaredEffectFrames,
            this.normieScaredEffectSheet,
            this.normieEffectFrameW,
            this.normieEffectFrameH,
            this.normieEffectFrameCount
        );
        this._playEffectOnNode(scaredFrames, normieNode, cc.v2(0, this.normieFrameH / 2 + 12), {
            name: 'NormieScaredEffect',
            frameW: this.normieEffectFrameW,
            frameH: this.normieEffectFrameH,
            fps: this.normieEffectFps,
            zIndex: 62,
            fallbackColor: cc.color(255, 255, 255, 160),
        });
    },

    _playEffectAtWorldPosition: function (frames, position, options) {
        if (!this._world || !position) return false;
        var node = new cc.Node(options.name || 'Effect');
        node.setPosition(position);
        this._world.addChild(node, options.zIndex || 60);
        return this._playEffectOnExistingNode(frames, node, options);
    },

    _playEffectOnNode: function (frames, parent, offset, options) {
        if (!parent || !parent.isValid) return false;
        var node = new cc.Node(options.name || 'Effect');
        node.setPosition(offset || cc.v2(0, 0));
        parent.addChild(node, options.zIndex || 60);
        return this._playEffectOnExistingNode(frames, node, options);
    },

    _playEffectOnExistingNode: function (frames, node, options) {
        options = options || {};
        var frameW = Math.max(1, options.frameW || 32);
        var frameH = Math.max(1, options.frameH || 32);
        node.setContentSize(frameW, frameH);

        if (!frames || frames.length === 0) {
            var gfx = node.addComponent(cc.Graphics);
            gfx.fillColor = options.fallbackColor || cc.color(255, 255, 255, 120);
            gfx.circle(0, 0, Math.min(frameW, frameH) / 2);
            gfx.fill();
            node.runAction(cc.sequence(
                cc.spawn(cc.scaleTo(0.16, 1.25), cc.fadeOut(0.16)),
                cc.callFunc(function () {
                    if (node && node.isValid) node.destroy();
                })
            ));
            return false;
        }

        var sprite = node.addComponent(cc.Sprite);
        sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frames[0];

        var fps = Math.max(1, options.fps || 18);
        var clip = cc.AnimationClip.createWithSpriteFrames(frames, fps);
        clip.wrapMode = cc.WrapMode.Normal;
        clip.name = options.name || 'EffectOnce';
        var anim = node.addComponent(cc.Animation);
        anim.addClip(clip);
        anim.play(clip.name);
        node.runAction(cc.sequence(
            cc.delayTime(frames.length / fps),
            cc.callFunc(function () {
                if (node && node.isValid) node.destroy();
            })
        ));
        return true;
    },

    _getSpriteFramesFromSheet: function (frameList, sheet, frameW, frameH, frameCount) {
        if (frameList && frameList.length > 0) return frameList;
        if (!sheet) return null;

        var frames = [];
        var fw = Math.max(1, frameW || 32);
        var fh = Math.max(1, frameH || 32);
        var count = Math.max(1, frameCount || 8);
        for (var i = 0; i < count; i++) {
            frames.push(new cc.SpriteFrame(sheet, cc.rect(i * fw, 0, fw, fh)));
        }
        return frames;
    },

    _isObstacleInMcFlurryExplosion: function (obstacle, center) {
        if (!obstacle || obstacle.section !== this._currentSection || !obstacle.rect) return false;

        var obstacleCenter = cc.v2(
            (obstacle.rect.minX + obstacle.rect.maxX) / 2,
            (obstacle.rect.minY + obstacle.rect.maxY) / 2
        );
        var tileSize = this.mapTileSize || 32;
        var tileX = Math.round((obstacleCenter.x - center.x) / tileSize);
        var tileY = Math.round((obstacleCenter.y - center.y) / tileSize);
        return Math.abs(tileX) + Math.abs(tileY) <= Math.max(0, this.mcFlurryExplosionRangeTiles || 0);
    },

    _removeInitialObstacleCollisionRects: function (removedIds) {
        if (!removedIds || !this._staticCollisionRects) return;

        var kept = [];
        for (var i = 0; i < this._staticCollisionRects.length; i++) {
            var rect = this._staticCollisionRects[i];
            if (rect && rect.source === 'initialObstacle' && removedIds[rect.obstacleId]) continue;
            kept.push(rect);
        }
        this._staticCollisionRects = kept;
    },

    _rebuildPathGridsAfterObstacleChange: function () {
        if (!this._pathGrid) return;

        this._pathGrids = this._pathGrid.build();
        if (this._niuPaiControl) {
            this._niuPaiControl.path = [];
            this._niuPaiControl.pathTimer = 0;
        }
        if (this._blackDogControl && this._blackDogControl._clearDogPaths) {
            this._blackDogControl._clearDogPaths();
        }
        if (this._normieControl) {
            this._normieControl.validSpawnTiles = null;
            for (var i = 0; this._normieControl.normies && i < this._normieControl.normies.length; i++) {
                this._normieControl._forceRetarget(this._normieControl.normies[i]);
            }
        }
    },

    _drawMcFlurryExplosionFallback: function (gfx, detonated) {
        if (!gfx) return;
        gfx.clear();

        var tile = this.mapTileSize;
        var range = Math.max(0, this.mcFlurryExplosionRangeTiles || 0);
        gfx.fillColor = detonated
            ? cc.color(170, 245, 255, 130)
            : cc.color(120, 210, 255, 70);
        gfx.strokeColor = detonated
            ? cc.color(240, 255, 255, 240)
            : cc.color(120, 210, 255, 220);
        gfx.lineWidth = 2;

        for (var y = -range; y <= range; y++) {
            for (var x = -range; x <= range; x++) {
                if (Math.abs(x) + Math.abs(y) > range) continue;
                gfx.rect(x * tile - tile / 2, y * tile - tile / 2, tile, tile);
            }
        }
        gfx.fill();
        for (var sy = -range; sy <= range; sy++) {
            for (var sx = -range; sx <= range; sx++) {
                if (Math.abs(sx) + Math.abs(sy) > range) continue;
                gfx.rect(sx * tile - tile / 2, sy * tile - tile / 2, tile, tile);
            }
        }
        gfx.stroke();
    },

    _consumeHeldItem: function (message) {
        if (message) cc.log(message);
        this._heldItem = null;
        this._foodSpoilTime = 0;
        this._refreshHudContent();
    },

    _getActiveBigMacBaitTarget: function (dogPosition) {
        if (!dogPosition || !this._bigMacBaits) return null;

        var best = null;
        var bestDistance = Infinity;
        var radius = Math.max(0, this.bigMacBaitAttractRadius || 0);
        for (var i = 0; i < this._bigMacBaits.length; i++) {
            var bait = this._bigMacBaits[i];
            if (!bait || bait.hp <= 0 || !bait.node || !bait.node.isValid) continue;

            var dx = bait.node.x - dogPosition.x;
            var dy = bait.node.y - dogPosition.y;
            var distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > radius || distance >= bestDistance) continue;

            best = bait;
            bestDistance = distance;
        }

        return best;
    },

    _getBigMacBaitRect: function (bait) {
        if (!bait || !bait.node) return null;
        var size = this.bigMacBaitSize;
        return {
            minX: bait.node.x - size / 2,
            maxX: bait.node.x + size / 2,
            minY: bait.node.y - size / 2,
            maxY: bait.node.y + size / 2,
        };
    },

    _damageBigMacBait: function (bait, amount) {
        if (!bait || bait.hp <= 0) return;
        var damageTarget = bait.node && bait.node.isValid
            ? (bait.node.getChildByName('BigMacBaitVisual') || bait.node)
            : null;
        this._flashDamageTarget(damageTarget);
        bait.hp = Math.max(0, bait.hp - Math.max(1, amount || 1));
        this._drawActorHpBar(bait.hpBar, bait.hp, bait.maxHp || this.bigMacBaitHp || 1);
        if (bait.hp > 0) return;

        if (bait.node && bait.node.isValid) {
            bait.node.runAction(cc.sequence(
                cc.delayTime(0.09),
                cc.callFunc(function () {
                    if (bait.node && bait.node.isValid) bait.node.destroy();
                })
            ));
        }
        this._cleanupBigMacBaits();
        cc.log('[NiuPai] Big Mac bait was eaten.');
    },

    _playBlackDogBaitAlert: function (dogNode) {
        if (!dogNode || !dogNode.isValid) return false;
        this._playSfx(this.sfxBlackDogBaitAlert, 0.85);

        var duration = Math.max(0.05, this.blackDogBaitAlertDuration || 0.45);
        var offsetY = this.blackDogBaitAlertYOffset || 24;
        var node = new cc.Node('BlackDogBaitAlert');
        node.setPosition(0, offsetY);
        dogNode.addChild(node, 80);

        if (this.blackDogBaitAlertSprite) {
            node.setContentSize(this.blackDogBaitAlertSprite.getRect().width, this.blackDogBaitAlertSprite.getRect().height);
            var sprite = node.addComponent(cc.Sprite);
            sprite.spriteFrame = this.blackDogBaitAlertSprite;
            sprite.sizeMode = cc.Sprite.SizeMode.TRIMMED;
        } else {
            node.setContentSize(14, 14);
            var gfx = node.addComponent(cc.Graphics);
            gfx.fillColor = cc.color(255, 235, 70, 245);
            gfx.strokeColor = cc.color(80, 40, 12, 245);
            gfx.lineWidth = 1;
            gfx.circle(0, 0, 6);
            gfx.fill();
            gfx.stroke();
            gfx.fillColor = cc.color(80, 40, 12, 245);
            gfx.circle(0, -2, 2);
            gfx.fill();
        }

        node.setScale(0.3);
        node.runAction(cc.sequence(
            cc.spawn(cc.scaleTo(duration * 0.35, 1.15), cc.moveBy(duration * 0.35, 0, 5)),
            cc.spawn(cc.scaleTo(duration * 0.65, 0.85), cc.fadeOut(duration * 0.65), cc.moveBy(duration * 0.65, 0, 8)),
            cc.callFunc(function () {
                if (node && node.isValid) node.destroy();
            })
        ));
        return true;
    },

    _setOrderingStatusIcon: function (actorNode, active, frameH) {
        var frames = this._getOrderingStatusFrames();
        return this._setActorStatusIcon(
            actorNode,
            'NPOrderingStatusIcon',
            !!active,
            this.orderingStatusSprite,
            Math.max(6, this.orderingStatusIconSize || 18),
            frameH / 2 + (this.orderingStatusYOffset || 28),
            'ordering',
            frames,
            Math.max(1, this.orderingStatusFps || 8)
        );
    },

    _getOrderingStatusFrames: function () {
        if (this.orderingStatusFrames && this.orderingStatusFrames.length > 0) {
            return this.orderingStatusFrames;
        }

        var frameW = Math.max(1, this.orderingStatusFrameW || 32);
        var frameH = Math.max(1, this.orderingStatusFrameH || 32);
        var frameCount = Math.max(1, this.orderingStatusFrameCount || 8);

        if (this.orderingStatusSheet) {
            return this._getSpriteFramesFromSheet(null, this.orderingStatusSheet, frameW, frameH, frameCount);
        }

        if (this.orderingStatusSprite && this.orderingStatusSprite.getTexture) {
            var texture = this.orderingStatusSprite.getTexture();
            if (texture && texture.width >= frameW * frameCount && texture.height >= frameH) {
                return this._getSpriteFramesFromSheet(null, texture, frameW, frameH, frameCount);
            }
        }

        return null;
    },

    _setBlackDogFollowingStatusIcon: function (dogNode, active) {
        var frames = this._getSpriteFramesFromSheet(
            this.blackDogRobStatusFrames,
            this.blackDogRobStatusSheet,
            this.blackDogRobStatusFrameW,
            this.blackDogRobStatusFrameH,
            this.blackDogRobStatusFrameCount
        );
        return this._setActorStatusIcon(
            dogNode,
            'NPBlackDogFollowingStatusIcon',
            !!active,
            this.blackDogFollowingStatusSprite,
            Math.max(6, this.blackDogFollowingStatusIconSize || 18),
            this.blackDogFrameH / 2 + (this.blackDogFollowingStatusYOffset || 26),
            'following',
            frames,
            Math.max(1, this.blackDogRobStatusFps || 8)
        );
    },

    _setBlackDogBaitStatusIcon: function (dogNode, active) {
        var frames = this._getSpriteFramesFromSheet(
            this.blackDogBaitStatusFrames,
            this.blackDogBaitStatusSheet,
            this.blackDogBaitStatusFrameW,
            this.blackDogBaitStatusFrameH,
            this.blackDogBaitStatusFrameCount
        );
        return this._setActorStatusIcon(
            dogNode,
            'NPBlackDogBaitStatusIcon',
            !!active,
            this.blackDogBaitAlertSprite,
            Math.max(6, this.blackDogFollowingStatusIconSize || 18),
            this.blackDogFrameH / 2 + (this.blackDogFollowingStatusYOffset || 26),
            'bait',
            frames,
            Math.max(1, this.blackDogBaitStatusFps || 8)
        );
    },

    _setActorStatusIcon: function (actorNode, childName, active, spriteFrame, size, y, fallbackType, frames, fps) {
        if (!actorNode || !actorNode.isValid) return false;

        var node = actorNode.getChildByName(childName);
        if (!active) {
            if (node && node.isValid) node.active = false;
            return false;
        }

        if (!node || !node.isValid) {
            node = new cc.Node(childName);
            node.setAnchorPoint(0.5, 0.5);
            actorNode.addChild(node, 90);
        }

        node.active = true;
        node.setPosition(0, y);
        node.setContentSize(size, size);

        var sprite = node.getComponent(cc.Sprite);
        var gfx = node.getComponent(cc.Graphics);
        if (frames && frames.length > 0) {
            if (gfx) {
                gfx.clear();
                gfx.destroy();
            }
            if (!sprite) sprite = node.addComponent(cc.Sprite);
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            this._updateStatusIconAnimation(sprite, frames, fps);
            return true;
        }

        if (spriteFrame) {
            if (gfx) {
                gfx.clear();
                gfx.destroy();
            }
            if (!sprite) sprite = node.addComponent(cc.Sprite);
            sprite.spriteFrame = spriteFrame;
            sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            return true;
        }

        if (sprite) {
            sprite.spriteFrame = null;
            sprite.destroy();
        }
        if (!gfx) gfx = node.addComponent(cc.Graphics);
        this._drawStatusIconFallback(gfx, size, fallbackType);
        return true;
    },

    _playHealParticleEffect: function (actorNode) {
        if (!this.healParticleSprite || !actorNode || !actorNode.isValid) return false;

        var node = new cc.Node('HealParticle');
        node.setPosition(0, this.healParticleYOffset || 0);
        actorNode.addChild(node, 65);

        var particle = node.addComponent(cc.ParticleSystem);
        particle.custom = true;
        particle.spriteFrame = this.healParticleSprite;
        particle.playOnLoad = false;
        particle.autoRemoveOnFinish = false;
        particle.duration = Math.max(0.05, this.healParticleDuration || 0.45);
        particle.emitterMode = cc.ParticleSystem.EmitterMode.GRAVITY;
        particle.positionType = cc.ParticleSystem.PositionType.RELATIVE;
        particle.totalParticles = Math.max(1, this.healParticleTotal || 28);
        particle.emissionRate = Math.max(1, this.healParticleEmissionRate || 80);
        particle.life = Math.max(0.01, this.healParticleLife || 0.45);
        particle.lifeVar = particle.life * 0.35;
        particle.angle = 90;
        particle.angleVar = Math.max(0, this.healParticleAngleVar || 180);
        particle.speed = Math.max(0, this.healParticleSpeed || 28);
        particle.speedVar = Math.max(0, this.healParticleSpeedVar || 12);
        particle.gravity = cc.v2(0, Math.max(0, this.healParticleGravityY || 14));
        particle.radialAccel = Math.max(0, this.healParticleRadialAccel || 8);
        particle.radialAccelVar = 0;
        particle.tangentialAccel = 0;
        particle.tangentialAccelVar = 0;
        particle.startSize = Math.max(1, this.healParticleStartSize || 8);
        particle.startSizeVar = particle.startSize * 0.3;
        particle.endSize = Math.max(0, this.healParticleEndSize || 1);
        particle.endSizeVar = 0;
        particle.startColor = cc.color(130, 255, 165, 210);
        particle.startColorVar = cc.color(30, 20, 30, 35);
        particle.endColor = cc.color(210, 255, 220, 0);
        particle.endColorVar = cc.color(20, 20, 20, 0);
        particle.posVar = this.healParticlePosVar || cc.v2(12, 10);
        particle.sourcePos = cc.v2(0, 0);
        particle.startSpin = 0;
        particle.startSpinVar = 45;
        particle.endSpin = 0;
        particle.endSpinVar = 45;
        particle.rotationIsDir = false;
        particle.resetSystem();

        var life = particle.duration + particle.life + particle.lifeVar + 0.1;
        node.runAction(cc.sequence(
            cc.delayTime(life),
            cc.callFunc(function () {
                if (node && node.isValid) node.destroy();
            })
        ));
        return true;
    },

    _updateStatusIconAnimation: function (sprite, frames, fps) {
        if (!sprite || !frames || frames.length === 0) return;

        var now = Date.now() / 1000;
        var frameIndex = Math.floor(now * Math.max(1, fps || 8)) % frames.length;
        sprite.spriteFrame = frames[frameIndex];
    },

    _drawStatusIconFallback: function (gfx, size, fallbackType) {
        gfx.clear();
        var half = size / 2;
        if (fallbackType === 'following') {
            gfx.fillColor = cc.color(245, 65, 65, 235);
            gfx.strokeColor = cc.color(255, 230, 230, 245);
            gfx.lineWidth = 1;
            gfx.circle(0, 0, half - 1);
            gfx.fill();
            gfx.stroke();
            gfx.fillColor = cc.color(255, 255, 255, 245);
            gfx.circle(0, 0, Math.max(2, size * 0.18));
            gfx.fill();
            return;
        }

        if (fallbackType === 'bait') {
            gfx.fillColor = cc.color(255, 235, 70, 245);
            gfx.strokeColor = cc.color(80, 40, 12, 245);
            gfx.lineWidth = 1;
            gfx.circle(0, 0, half - 1);
            gfx.fill();
            gfx.stroke();
            gfx.fillColor = cc.color(80, 40, 12, 245);
            gfx.circle(0, -2, Math.max(2, size * 0.16));
            gfx.fill();
            return;
        }

        gfx.fillColor = cc.color(255, 226, 74, 235);
        gfx.strokeColor = cc.color(82, 42, 18, 245);
        gfx.lineWidth = 1;
        gfx.rect(-half + 2, -half + 3, size - 4, size - 6);
        gfx.fill();
        gfx.stroke();
        gfx.fillColor = cc.color(82, 42, 18, 245);
        gfx.rect(-half + 5, 1, size - 10, 2);
        gfx.rect(-half + 5, -4, size - 12, 2);
        gfx.fill();
    },

    _flashDamageTarget: function (node) {
        if (!node || !node.isValid) return;

        if (this.damageEffectShader) {
            var sprite = this._findDamageSprite(node);
            if (sprite && this._flashDamageSprite(sprite, node)) return;
        }

        this._flashDamageColorFallback(node);
    },

    _findDamageSprite: function (node) {
        if (!node || !node.isValid) return null;

        var sprite = node.getComponent(cc.Sprite);
        if (sprite) return sprite;

        for (var i = 0; i < node.childrenCount; i++) {
            sprite = this._findDamageSprite(node.children[i]);
            if (sprite) return sprite;
        }

        return null;
    },

    _flashDamageSprite: function (sprite, actionNode) {
        if (!sprite || !sprite.node || !sprite.node.isValid) return false;

        var material = this._createDamageEffectMaterial(sprite);
        if (!material) return false;

        var originalMaterial = sprite.getMaterial ? sprite.getMaterial(0) : null;
        if (!sprite._npDamageFlashActive) {
            sprite._npDamageOriginalMaterial = originalMaterial;
        }

        var token = (sprite._npDamageFlashToken || 0) + 1;
        sprite._npDamageFlashToken = token;
        sprite._npDamageFlashActive = true;

        actionNode = actionNode && actionNode.isValid ? actionNode : sprite.node;
        actionNode.stopActionByTag(9101);
        sprite.setMaterial(0, material);

        var flashSeconds = Math.max(0.01, this.damageFlashSeconds || 0.08);
        var action = cc.sequence(
            cc.delayTime(flashSeconds),
            cc.callFunc(function () {
                if (!sprite || !sprite.node || !sprite.node.isValid) return;
                if (sprite._npDamageFlashToken !== token) return;

                if (sprite._npDamageOriginalMaterial && sprite.setMaterial) {
                    sprite.setMaterial(0, sprite._npDamageOriginalMaterial);
                }
                sprite._npDamageOriginalMaterial = null;
                sprite._npDamageFlashActive = false;
            })
        );
        action.setTag(9101);
        actionNode.runAction(action);
        return true;
    },

    _createDamageEffectMaterial: function (owner) {
        if (!this.damageEffectShader || !cc.Material) return null;

        var material = null;
        try {
            if (cc.Material.create) {
                material = cc.Material.create(this.damageEffectShader, 0);
            } else {
                material = new cc.Material();
                if (material.initWithEffect) {
                    material.initWithEffect(this.damageEffectShader);
                } else {
                    material.effectAsset = this.damageEffectShader;
                }
            }
        } catch (e) {
            cc.warn('[NiuPai] Failed to create damage material: ' + e);
            return null;
        }

        if (!material) return null;
        if (material.define) {
            material.define('USE_TEXTURE', true);
            material.define('USE_ALPHA_TEST', false);
        }

        if (cc.MaterialVariant && cc.MaterialVariant.create && owner) {
            return cc.MaterialVariant.create(material, owner) || material;
        }
        return material;
    },

    _flashDamageColorFallback: function (node) {
        if (!node || !node.isValid) return;

        var original = node.color ? cc.color(node.color.r, node.color.g, node.color.b, node.color.a) : cc.Color.WHITE;
        node.stopActionByTag(9101);
        node.color = cc.Color.WHITE;

        var action = cc.sequence(
            cc.delayTime(Math.max(0.01, this.damageFlashSeconds || 0.08)),
            cc.callFunc(function () {
                if (node && node.isValid) node.color = original;
            })
        );
        action.setTag(9101);
        node.runAction(action);
    },

    _cleanupBigMacBaits: function () {
        if (!this._bigMacBaits) return;
        var kept = [];
        for (var i = 0; i < this._bigMacBaits.length; i++) {
            var bait = this._bigMacBaits[i];
            if (bait && bait.hp > 0 && bait.node && bait.node.isValid) kept.push(bait);
        }
        this._bigMacBaits = kept;
    },

    _clearWorldItems: function () {
        var i;
        if (this._bigMacBaits) {
            for (i = 0; i < this._bigMacBaits.length; i++) {
                if (this._bigMacBaits[i].node && this._bigMacBaits[i].node.isValid) {
                    this._bigMacBaits[i].node.destroy();
                }
            }
        }
        if (this._mcFlurryExplosions) {
            for (i = 0; i < this._mcFlurryExplosions.length; i++) {
                if (this._mcFlurryExplosions[i].node && this._mcFlurryExplosions[i].node.isValid) {
                    this._mcFlurryExplosions[i].node.destroy();
                }
            }
        }
        if (this._wallets) {
            for (i = 0; i < this._wallets.length; i++) {
                if (this._wallets[i].node && this._wallets[i].node.isValid) {
                    this._wallets[i].node.destroy();
                }
            }
        }
        this._bigMacBaits = [];
        this._mcFlurryExplosions = [];
        this._wallets = [];
    },

    _addScore: function (amount, reason) {
        amount = Math.floor(amount || 0);
        if (amount === 0) return;
        this._runtimeScore = Math.max(0, (this._runtimeScore || 0) + amount);
        this._refreshHudContent();
        cc.log('[NiuPai] Score +' + amount + ' ' + (reason || '') + ' total=' + this._runtimeScore);
    },

    _addBlackDogDamageScore: function () {
        this._addScore(this.scoreBlackDogDamagePoints, 'blackdog');
    },

    _updateWallets: function (dt) {
        if (!this._active || !this._world || !this._playerNode) return;

        this._walletNoticeCooldown = Math.max(0, (this._walletNoticeCooldown || 0) - dt);
        this._walletPlayerDropCooldownTimer = Math.max(0, (this._walletPlayerDropCooldownTimer || 0) - dt);
        if (this._currentSection !== 'main') return;

        this._walletDropTimer = Math.max(0, (this._walletDropTimer || 0) - dt);
        if (this._walletDropTimer <= 0) {
            this._walletDropTimer = Math.max(0.01, this.walletDropIntervalSeconds || 5);
            this._tryRandomNpcWalletDrop();
        }

        this._checkWalletPickup();
        this._cleanupWallets();
    },

    _tryRandomNpcWalletDrop: function () {
        if (Math.random() >= Math.max(0, Math.min(1, this.walletNpcDropChance || 0))) return false;

        var nodes = this._getWalletDropNpcNodes();
        if (!nodes || nodes.length === 0) return false;

        var node = nodes[Math.floor(Math.random() * nodes.length)];
        return this._spawnWallet(node.getPosition());
    },

    _tryDropWalletFromPlayerBump: function (node) {
        if (!node || !node.isValid) return false;
        if (node._npWalletDroppedFromBump) return false;
        if (this._walletPlayerDropCooldownTimer > 0) return false;
        node._npWalletDroppedFromBump = true;
        if (Math.random() >= Math.max(0, Math.min(1, this.walletPlayerDropChance || 0))) return false;
        if (!this._spawnWallet(node.getPosition())) return false;
        this._walletPlayerDropCooldownTimer = Math.max(0, this.walletPlayerDropCooldownSeconds || 3);
        return true;
    },

    _getWalletDropNpcNodes: function () {
        var nodes = [];
        var i;
        if (this._normieControl && this._normieControl.normies) {
            for (i = 0; i < this._normieControl.normies.length; i++) {
                var normie = this._normieControl.normies[i];
                if (normie && normie.node && normie.node.isValid) nodes.push(normie.node);
            }
        }
        if (this._mcDonaldControl && this._mcDonaldControl.getQueueNormieNodes) {
            var queueNodes = this._mcDonaldControl.getQueueNormieNodes();
            for (i = 0; i < queueNodes.length; i++) {
                if (queueNodes[i] && queueNodes[i].isValid) nodes.push(queueNodes[i]);
            }
        }
        return nodes;
    },

    _spawnWallet: function (position) {
        if (!this._world || !position) return false;

        var node = new cc.Node('Wallet');
        var size = Math.max(6, this.walletSize || 18);
        node.setAnchorPoint(0.5, 0.5);
        node.setContentSize(size, size);
        node.setPosition(position);
        this._world.addChild(node, 19);

        if (this.walletSprite) {
            this._ensureItemDropShadow(
                node,
                this.walletDropShadowOffsetY || -4,
                this.walletDropShadowSprite || this.itemDropShadowSprite
            );
            var visual = new cc.Node('WalletVisual');
            visual.setContentSize(size, size);
            node.addChild(visual, 1);
            var sprite = visual.addComponent(cc.Sprite);
            sprite.spriteFrame = this.walletSprite;
            sprite.sizeMode = cc.Sprite.SizeMode.RAW;
        } else {
            var gfx = node.addComponent(cc.Graphics);
            gfx.fillColor = cc.color(140, 82, 28, 245);
            gfx.strokeColor = cc.color(248, 210, 96, 245);
            gfx.lineWidth = 2;
            gfx.rect(-size / 2, -size / 2 + 2, size, size - 4);
            gfx.fill();
            gfx.stroke();
            gfx.fillColor = cc.color(245, 208, 75, 245);
            gfx.rect(-2, -2, 4, 4);
            gfx.fill();
        }

        node.runAction(cc.repeatForever(cc.sequence(
            cc.moveBy(0.45, 0, 2),
            cc.moveBy(0.45, 0, -2)
        )));

        if (!this._wallets) this._wallets = [];
        this._wallets.push({ node: node });
        this._playSfx(this.sfxWalletDrop, 0.75);
        return true;
    },

    _checkWalletPickup: function () {
        if (!this._wallets || this._wallets.length === 0) return;

        var playerRect = this._getPlayerTriggerRect();
        var size = Math.max(6, this.walletSize || 18);
        for (var i = 0; i < this._wallets.length; i++) {
            var wallet = this._wallets[i];
            if (!wallet || !wallet.node || !wallet.node.isValid) continue;
            var rect = {
                minX: wallet.node.x - size / 2,
                maxX: wallet.node.x + size / 2,
                minY: wallet.node.y - size / 2,
                maxY: wallet.node.y + size / 2,
            };
            if (!this._rectsOverlap(playerRect, rect)) continue;

            if (this._playerMovingCarefully) {
                this._pickupWallet(wallet);
            } else {
                this._showWalletSeenNotification();
            }
        }
    },

    _pickupWallet: function (wallet) {
        if (!wallet || wallet.picked) return;
        wallet.picked = true;
        this._playSfx(this.sfxWalletPickup);
        this._walletPickupCount = Math.max(0, (this._walletPickupCount || 0) + 1);
        this._addScore(this._rollWalletPickupScore(), 'wallet');
        if (!this._isNiuPaiWaitingForPickup() && !this._shownWalletPickupNotification) {
            this._shownWalletPickupNotification = true;
            this._showNotification(NPNotification.Type.FirstWalletPickup, this.notificationDuration);
        }
        if (wallet.node && wallet.node.isValid) wallet.node.destroy();
    },

    _rollWalletPickupScore: function () {
        var base = Math.max(0, this.scoreWalletPickupPoints || 0);
        var tier = this._rollWalletRewardTier();
        var min = Math.max(0, tier.minMultiplier || 0);
        var max = Math.max(min, tier.maxMultiplier || min);
        var multiplier = min + Math.random() * (max - min);
        var score = Math.max(0, Math.round(base * multiplier));
        cc.log('[NiuPai] Wallet reward base=' + base + ' multiplier=' + multiplier.toFixed(2) + ' score=' + score);
        return score;
    },

    _rollWalletRewardTier: function () {
        var tiers = this.walletRewardTiers;
        if (!tiers || tiers.length === 0) {
            return { minMultiplier: 1, maxMultiplier: 1 };
        }

        var total = 0;
        for (var i = 0; i < tiers.length; i++) {
            total += Math.max(0, tiers[i].chance || 0);
        }
        if (total <= 0) {
            return { minMultiplier: 1, maxMultiplier: 1 };
        }

        var roll = Math.random() * total;
        var cursor = 0;
        for (var j = 0; j < tiers.length; j++) {
            cursor += Math.max(0, tiers[j].chance || 0);
            if (roll <= cursor) return tiers[j];
        }
        return tiers[tiers.length - 1];
    },

    _showWalletSeenNotification: function () {
        if (this._isNiuPaiWaitingForPickup()) return;
        if (this._walletNoticeCooldown > 0) return;
        this._walletNoticeCooldown = Math.max(0, this.walletNoticeCooldownSeconds || 20);
        this._playSfx(this.sfxWalletNotice, 0.8);
        this._showNotification(NPNotification.Type.WalletSeen, this.notificationDuration);
    },

    _cleanupWallets: function () {
        if (!this._wallets) return;
        var kept = [];
        for (var i = 0; i < this._wallets.length; i++) {
            var wallet = this._wallets[i];
            if (wallet && !wallet.picked && wallet.node && wallet.node.isValid) kept.push(wallet);
        }
        this._wallets = kept;
    },

    _mkFloatingLabel: function (name, str, pos, size, color) {
        var node = new cc.Node(name);
        var label = node.addComponent(cc.Label);
        label.string = str;
        label.font = this.labelFont;
        label.fontSize = size;
        label.lineHeight = size + 3;
        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        node.color = color || cc.Color.WHITE;
        node.setPosition(pos);
        return node;
    },

    _checkTunnelEntrance: function () {
        if (this._currentSection !== 'main') return;
        if (!this._mainTiledMap || !this._tunnelTiledMap || !this._playerNode) return;

        var center = this._getTunnelEntranceCenter();
        if (!center) return;

        var halfW = this.tunnelEntranceWidth / 2;
        var halfH = this.tunnelEntranceHeight / 2;
        var playerRect = this._getPlayerTriggerRect();
        var triggerRect = {
            minX: center.x - halfW,
            maxX: center.x + halfW,
            minY: center.y - halfH,
            maxY: center.y + halfH,
        };

        var touching = this._rectsOverlap(playerRect, triggerRect);
        if (this._teleportNeedsExit) {
            this._updateTeleportNeedsExit(playerRect);
            return;
        }
        if (this._teleportCooldown > 0) return;

        if (touching) {
            if (!this._hasEnteredTunnelSection && !this._heldItem) {
                this._playSfx(this.sfxTunnelExitBlocked);
                this._showTunnelExitNoFoodDialogue();
                this._setTeleportNeedsExit(triggerRect);
                this._teleportCooldown = 0.2;
                return;
            }
            this._teleportToTunnel();
        }
    },

    _getPlayerTriggerRect: function () {
        return this._getActorTriggerRect(
            this._playerNode,
            this.playerFrameW,
            this.playerFrameH,
            this.playerColliderWidthRatio,
            this.playerColliderHeightRatio,
            this.playerColliderYOffsetRatio
        );
    },

    _getNiuPaiTriggerRect: function () {
        return this._getActorTriggerRect(
            this._niuPaiNode,
            this.niuPaiFrameW,
            this.niuPaiFrameH,
            this.niuPaiColliderWidthRatio,
            this.niuPaiColliderHeightRatio,
            this.niuPaiColliderYOffsetRatio
        );
    },

    _getBlackDogTriggerRect: function (node) {
        return this._getActorTriggerRect(
            node,
            this.blackDogFrameW,
            this.blackDogFrameH,
            this.blackDogColliderWidthRatio,
            this.blackDogColliderHeightRatio,
            this.blackDogColliderYOffsetRatio
        );
    },

    _getNormieTriggerRect: function (node) {
        return this._getActorTriggerRect(
            node,
            this.normieFrameW,
            this.normieFrameH,
            this.normieColliderWidthRatio,
            this.normieColliderHeightRatio,
            this.normieColliderYOffsetRatio
        );
    },

    _getActorTriggerRect: function (node, frameW, frameH, widthRatio, heightRatio, yOffsetRatio) {
        if (!node) return null;

        return this._getActorTriggerRectAtPosition(
            node.x,
            node.y,
            frameW,
            frameH,
            widthRatio,
            heightRatio,
            yOffsetRatio
        );
    },

    _rectsOverlap: function (a, b) {
        if (!a || !b) return false;
        return a.minX <= b.maxX && a.maxX >= b.minX &&
               a.minY <= b.maxY && a.maxY >= b.minY;
    },

    _isPlayerInTeleportExitHoldArea: function (playerRect, triggerRect) {
        var padding = Math.max(0, this.teleportExitPadding || 0);
        return this._rectsOverlap(playerRect, {
            minX: triggerRect.minX - padding,
            maxX: triggerRect.maxX + padding,
            minY: triggerRect.minY - padding,
            maxY: triggerRect.maxY + padding,
        });
    },

    _makeTeleportTriggerRect: function (center) {
        var halfW = this.tunnelEntranceWidth / 2;
        var halfH = this.tunnelEntranceHeight / 2;
        return {
            minX: center.x - halfW,
            maxX: center.x + halfW,
            minY: center.y - halfH,
            maxY: center.y + halfH,
        };
    },

    _setTeleportNeedsExit: function (triggerRect) {
        this._teleportNeedsExit = true;
        this._teleportExitHoldRect = triggerRect ? {
            minX: triggerRect.minX,
            maxX: triggerRect.maxX,
            minY: triggerRect.minY,
            maxY: triggerRect.maxY,
        } : null;
    },

    _updateTeleportNeedsExit: function (playerRect) {
        if (!this._teleportNeedsExit) return false;

        if (!this._teleportExitHoldRect ||
            !this._isPlayerInTeleportExitHoldArea(playerRect, this._teleportExitHoldRect)) {
            this._teleportNeedsExit = false;
            this._teleportExitHoldRect = null;
        }

        return this._teleportNeedsExit;
    },

    _getTunnelEntranceCenter: function () {
        if (!this._mainTiledMap) return null;

        var props = this._mainTiledMap.getProperties() || {};
        var tileX = this._readNumberProperty(props, 'tunnelEntranceX');
        var tileY = this._readNumberProperty(props, 'tunnelEntranceY');
        if (tileX === null || tileY === null) return null;

        return cc.v2(
            this.mainTilemapOffset.x + (tileX - 0.5) * this.mapPropertyTileSize,
            this.mainTilemapOffset.y + (tileY - 0.5) * this.mapPropertyTileSize
        );
    },

    _getTunnelReturnEntranceCenter: function () {
        return this._getEntranceTileCenter(
            this._tunnelTiledMap,
            this.tunnelTilemapOffset,
            'entranceX',
            'entranceY'
        );
    },


    _getEntranceTileCenter: function (tiledMap, offset, propX, propY) {
        if (!tiledMap) return null;

        var props = tiledMap.getProperties() || {};
        var tileX = this._readNumberProperty(props, propX);
        var tileY = this._readNumberProperty(props, propY);
        if (tileX === null || tileY === null) return null;

        return cc.v2(
            offset.x + (tileX - 0.5) * this.mapPropertyTileSize,
            offset.y + (tileY - 0.5) * this.mapPropertyTileSize
        );
    },

    _drawTeleportPrompts: function () {
        if (!this._world) return;

        if (this._teleportPromptNode && this._teleportPromptNode.isValid) {
            this._teleportPromptNode.destroy();
        }

        var root = new cc.Node('TeleportVisuals');
        this._world.addChild(root, 999);
        root.zIndex = 999;
        this._teleportPromptNode = root;

        var center = this._getTunnelEntranceCenter();
        if (!center) {
            cc.warn('[NiuPai] Missing tunnelEntranceX/tunnelEntranceY in main tilemap properties.');
        } else {
            var node = new cc.Node('TeleportPrompt_MainTunnelEntrance');
            node.setPosition(center);
            root.addChild(node, 1);

            this._addTunnelEntrancePromptVisual(node, { showArrow: true, showLabel: true });
        }

        var returnCenter = this._getTunnelReturnEntranceCenter();
        if (returnCenter) {
            var returnNode = new cc.Node('TeleportPrompt_TunnelReturnEntrance');
            returnNode.setPosition(returnCenter);
            root.addChild(returnNode, 1);
            this._addTunnelEntrancePromptVisual(returnNode, { showArrow: false, showLabel: false });
        }

        var exitCenter = this._getTunnelExitCenter();
        if (exitCenter) {
            var exitNode = new cc.Node('TeleportPrompt_TunnelExit');
            exitNode.setPosition(exitCenter);
            root.addChild(exitNode, 1);
            this._addTunnelEntrancePromptVisual(exitNode, { showArrow: true, showLabel: false });
        }

    },


    _drawOrderAreaPrompt: function () {
        if (!this._world) return;

        if (this._orderAreaPromptNode && this._orderAreaPromptNode.isValid) {
            this._orderAreaPromptNode.destroy();
        }

        var rect = this._getMcOrderTriggerRect();
        if (!rect) return;

        var root = new cc.Node('OrderAreaVisuals');
        this._world.addChild(root, 998);
        root.zIndex = 998;
        this._orderAreaPromptNode = root;

        var width = Math.max(36, rect.maxX - rect.minX + 10);
        var height = Math.max(28, rect.maxY - rect.minY + 10);
        var center = cc.v2((rect.minX + rect.maxX) / 2, (rect.minY + rect.maxY) / 2);
        var node = new cc.Node('OrderAreaPrompt');
        node.setPosition(center);
        root.addChild(node, 1);

        this._addOrderAreaPulseFrames(node, width, height);
    },

    _addTunnelEntrancePromptVisual: function (parent, options) {
        if (!parent || !parent.isValid) return;
        options = options || {};

        var frameW = Math.max(42, this.tunnelEntranceWidth + 24);
        var frameH = Math.max(64, this.tunnelEntranceHeight + 28);

        var frameNode = new cc.Node('ExitPromptBaseFrame');
        frameNode.setContentSize(frameW, frameH);
        parent.addChild(frameNode, 4);
        // this._drawExitPromptFrame(frameNode, frameW, frameH);
        frameNode.opacity = 160;
        this._addExitPromptPulseFrames(parent, frameW, frameH);

        if (options.showArrow) {
            var arrowNode = new cc.Node('ExitPromptArrow');
            arrowNode.setPosition(0, frameH / 2 + 12);
            parent.addChild(arrowNode, 5);
            this._drawExitPromptArrow(arrowNode);
            arrowNode.runAction(cc.repeatForever(cc.sequence(
                cc.moveBy(0.36, 0, -4),
                cc.moveBy(0.36, 0, 4)
            )));
        }

        if (!options.showLabel) return;

        var labelNode = new cc.Node('ExitPromptLabel');
        labelNode.setPosition(0, -frameH / 2 - 16);
        parent.addChild(labelNode, 5);

        var label = labelNode.addComponent(cc.Label);
        label.string = 'EXIT?';
        label.font = this.labelFont;
        label.fontSize = 10;
        label.lineHeight = 12;
        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        label.verticalAlign = cc.Label.VerticalAlign.CENTER;
        labelNode.color = cc.color(130, 225, 255);
    },

    _drawExitPromptFrame: function (node, width, height) {
        var gfx = node.addComponent(cc.Graphics);
        gfx.clear();
        gfx.strokeColor = cc.color(75, 205, 255, 245);
        gfx.lineWidth = 2;
        gfx.rect(-width / 2 + 8, -height / 2 + 8, width - 16, height - 16);
        gfx.stroke();
    },

    _addOrderAreaPulseFrames: function (parent, width, height) {
        var count = 2;
        for (var i = 0; i < count; i++) {
            var pulse = new cc.Node('OrderAreaPulseFrame_' + i);
            pulse.setContentSize(width, height);
            parent.addChild(pulse, 3);
            this._drawOrderAreaPromptFrame(pulse, width, height);
            this._runOrderAreaPulse(pulse, i * 0.48);
        }
    },

    _drawOrderAreaPromptFrame: function (node, width, height) {
        var gfx = node.addComponent(cc.Graphics);
        gfx.clear();
        gfx.strokeColor = cc.color(90, 215, 255, 135);
        gfx.lineWidth = 1.25;
        gfx.rect(-width / 2 + 6, -height / 2 + 6, width - 12, height - 12);
        gfx.stroke();
    },

    _runOrderAreaPulse: function (node, delay) {
        var reset = cc.callFunc(function () {
            if (!node || !node.isValid) return;
            node.opacity = 95;
            node.setScale(0.86);
        });
        node.runAction(cc.repeatForever(cc.sequence(
            cc.delayTime(delay),
            reset,
            cc.spawn(
                cc.scaleTo(1.18, 1.16),
                cc.fadeTo(1.18, 0)
            ),
            cc.delayTime(0.22)
        )));
    },

    _addExitPromptPulseFrames: function (parent, width, height) {
        var count = 3;
        for (var i = 0; i < count; i++) {
            var pulse = new cc.Node('ExitPromptPulseFrame_' + i);
            pulse.setContentSize(width, height);
            parent.addChild(pulse, 3);
            this._drawExitPromptFrame(pulse, width, height);
            this._runExitPromptPulse(pulse, i * 0.32);
        }
    },

    _runExitPromptPulse: function (node, delay) {
        var reset = cc.callFunc(function () {
            if (!node || !node.isValid) return;
            node.opacity = 210;
            node.setScale(0.62);
        });
        node.runAction(cc.repeatForever(cc.sequence(
            cc.delayTime(delay),
            reset,
            cc.spawn(
                cc.scaleTo(0.96, 1.45),
                cc.fadeTo(0.96, 0)
            ),
            cc.delayTime(0.06)
        )));
    },

    _drawExitPromptArrow: function (node) {
        var gfx = node.addComponent(cc.Graphics);
        gfx.clear();
        gfx.fillColor = cc.color(255, 220, 35, 245);
        gfx.strokeColor = cc.color(255, 250, 130, 255);
        gfx.lineWidth = 1;
        gfx.moveTo(0, -12);
        gfx.lineTo(-10, 12);
        gfx.lineTo(10, 12);
        gfx.close();
        gfx.fill();
        gfx.stroke();
    },

    _teleportToTunnel: function () {
        var fallback = cc.v2(
            this.tunnelTilemapOffset.x + this.mapPropertyTileSize / 2,
            this.tunnelTilemapOffset.y + this.mapPropertyTileSize / 2
        );
        var target = this._getTunnelReturnEntranceCenter() || fallback;

        this._playSfx(this.sfxTeleport);
        this._currentSection = 'tunnel';
        this._hasEnteredTunnelSection = true;
        this._tunnelOverlayFade = 1;
        this._teleportCooldown = 0.35;
        this._setTeleportNeedsExit(this._makeTeleportTriggerRect(target));
        this._playerNode.setPosition(target);
        if (this._playerBody) {
            this._playerBody.linearVelocity = cc.v2(0, 0);
            this._playerBody.syncPosition(true);
        }
        if (this._niuPaiControl) this._niuPaiControl.moveNearPlayer();
        if (this._blackDogControl) this._blackDogControl.onEnterTunnel();
        this._updateCameraFollow();
        this._playSectionBgm('tunnel');
        this._showFirstTunnelIntroDialogue();
        cc.log('[NiuPai] Teleported to tunnel at ' + target.x + ', ' + target.y);
    },

    _checkTunnelReturnEntrance: function () {
        if (this._currentSection !== 'tunnel') return;
        if (!this._mainTiledMap || !this._tunnelTiledMap || !this._playerNode) return;

        var center = this._getTunnelReturnEntranceCenter();
        if (!center) return;

        var halfW = this.tunnelEntranceWidth / 2;
        var halfH = this.tunnelEntranceHeight / 2;
        var playerRect = this._getPlayerTriggerRect();
        var triggerRect = {
            minX: center.x - halfW,
            maxX: center.x + halfW,
            minY: center.y - halfH,
            maxY: center.y + halfH,
        };

        var touching = this._rectsOverlap(playerRect, triggerRect);
        if (this._teleportNeedsExit) {
            this._updateTeleportNeedsExit(playerRect);
            return;
        }
        if (this._teleportCooldown > 0) return;

        if (touching) {
            this._teleportToMain();
        }
    },

    _teleportToMain: function () {
        var fallback = this.playerStartPosition;
        var target = this._getTunnelEntranceCenter() || fallback;

        this._playSfx(this.sfxTeleport);
        this._currentSection = 'main';
        this._teleportCooldown = 0.35;
        this._setTeleportNeedsExit(this._makeTeleportTriggerRect(target));
        this._playerNode.setPosition(target);
        if (this._playerBody) {
            this._playerBody.linearVelocity = cc.v2(0, 0);
            this._playerBody.syncPosition(true);
        }
        if (this._niuPaiControl) this._niuPaiControl.moveNearPlayer();
        if (this._blackDogControl) this._blackDogControl.onExitTunnel();
        this._updateCameraFollow();
        this._playSectionBgm('main');
        cc.log('[NiuPai] Returned to main at ' + target.x + ', ' + target.y);
    },


    _teleportToMainSpawn: function (sourceTriggerRect) {
        var target = this._getPlayerSpawnPosition();

        this._playSfx(this.sfxTeleport);
        this._currentSection = 'main';
        this._teleportCooldown = 0.35;
        this._setTeleportNeedsExit(sourceTriggerRect);
        this._playerNode.setPosition(target);
        if (this._playerBody) {
            this._playerBody.linearVelocity = cc.v2(0, 0);
            this._playerBody.syncPosition(true);
        }
        if (this._niuPaiControl) this._niuPaiControl.moveNearPlayer();
        if (this._blackDogControl) this._blackDogControl.onExitTunnel();
        this._updateCameraFollow();
        this._playSectionBgm('main');
        cc.log('[NiuPai] Troll teleported player to main spawn at ' + target.x + ', ' + target.y);
    },

    _checkTunnelExit: function () {
        if (this._currentSection !== 'tunnel') return;
        if (!this._tunnelTiledMap || !this._playerNode) return;

        var center = this._getTunnelExitCenter();
        if (!center) return;

        var halfW = this.tunnelEntranceWidth / 2;
        var halfH = this.tunnelEntranceHeight / 2;
        var playerRect = this._getPlayerTriggerRect();
        var triggerRect = {
            minX: center.x - halfW,
            maxX: center.x + halfW,
            minY: center.y - halfH,
            maxY: center.y + halfH,
        };

        var touching = this._rectsOverlap(playerRect, triggerRect);
        if (this._teleportNeedsExit) {
            this._updateTeleportNeedsExit(playerRect);
            return;
        }
        if (this._teleportCooldown > 0) return;

        if (touching) {
            if (!this._heldItem) {
                this._playSfx(this.sfxTunnelExitBlocked);
                this._showTunnelExitNoFoodDialogue();
                this._setTeleportNeedsExit(triggerRect);
                this._teleportCooldown = 0.2;
                return;
            }
            this._exitToOverworld();
        }
    },

    _showTunnelExitNoFoodDialogue: function () {
        this._ensureDialogueControl();
        this._keys = {};
        this._stopAllActorMovement();
        if (this._dialogueControl) {
            var self = this;
            if (!this._dialogueControl.show(NPDialogue.Type.TunnelExitNoFood, function () {
                self._resumeAfterDialogue();
            })) {
                self._resumeAfterDialogue();
            }
        } else {
            this._resumeAfterDialogue();
        }
    },

    _getTunnelExitCenter: function () {
        return this._getEntranceTileCenter(
            this._tunnelTiledMap,
            this.tunnelTilemapOffset,
            'exitX',
            'exitY'
        );
    },

    _exitToOverworld: function () {
        var win = this._hasWinningFood();
        var held = this._heldItem ? this._formatItemName(this._heldItem) : 'None';
        cc.log('[NiuPai] Tunnel exit reached. Holding=' + held +
            ' spoil=' + Math.ceil(this._foodSpoilTime) + ' win=' + win);
        this._startTunnelExitTransition(win, win ? '' : 'incorrect_food');
    },

    _startTunnelExitTransition: function (win, reason) {
        if (this._exitTransitionActive) return;

        this._exitTransitionActive = true;
        this._exitTransitionDuration = Math.max(0.01, this.tunnelExitLightRestoreSeconds || 0.85);
        this._exitTransitionTimer = this._exitTransitionDuration;
        this._pendingExitResult = {
            win: !!win,
            reason: reason || '',
        };
        this._tunnelOverlayFade = 1;
        this._keys = {};
        this._stopAllActorMovement();
        if (this._notificationControl) this._notificationControl.clear();
    },

    _updateTunnelExitTransition: function (dt) {
        if (!this._exitTransitionActive) return false;

        this._keys = {};
        this._stopAllActorMovement();
        this._exitTransitionTimer = Math.max(0, this._exitTransitionTimer - Math.max(0, dt || 0));
        var duration = Math.max(0.01, this._exitTransitionDuration || 0.01);
        this._tunnelOverlayFade = Math.max(0, Math.min(1, this._exitTransitionTimer / duration));
        this._updateCameraFollow();
        this._updateHud(0);
        if (this._notificationControl) this._notificationControl.update(dt);

        if (this._exitTransitionTimer > 0) return true;

        var result = this._pendingExitResult || { win: false, reason: 'incorrect_food' };
        this._exitTransitionActive = false;
        this._pendingExitResult = null;
        this._tunnelOverlayFade = 0;
        this._showExitPreResultDialogue(!!result.win, result.reason || '');
        return true;
    },

    _showExitPreResultDialogue: function (win, reason) {
        this._ensureDialogueControl();
        this._keys = {};
        this._stopAllActorMovement();

        var self = this;
        if (this._dialogueControl) {
            if (!this._dialogueControl.show(NPDialogue.Type.ExitPreResult, function () {
                self._showExitResultSummary(!!win, reason || '');
            })) {
                self._showExitResultSummary(!!win, reason || '');
            }
        } else {
            this._showExitResultSummary(!!win, reason || '');
        }
    },

    _showExitResultSummary: function (win, reason) {
        this._ensureDialogueControl();
        this._keys = {};
        this._stopAllActorMovement();

        var content = NPDialogue.Content[NPDialogue.Type.ExitResultSummary];
        if (content) {
            content.text = this._buildExitResultSummaryText(!!win);
            content.confirmText = '[E] Confirm';
        }

        var self = this;
        if (this._dialogueControl) {
            if (!this._dialogueControl.show(NPDialogue.Type.ExitResultSummary, function () {
                self._finishExitResult(!!win, reason || '');
            })) {
                self._finishExitResult(!!win, reason || '');
            }
        } else {
            this._finishExitResult(!!win, reason || '');
        }
    },

    _finishExitResult: function (win, reason) {
        if (this._blackDogControl) this._blackDogControl.onExitTunnel();
        this._finishGame(!!win, win ? 1 : 0, reason || '');
    },

    _buildExitResultSummaryText: function (win) {
        var breakdown = this._getFinalScoreBreakdown(!!win);
        var held = this._heldItem ? this._formatItemName(this._heldItem) : 'None';
        var result = win ? 'SUCCESS' : 'ESCAPED';
        return [
            'Food: ' + held,
            'Wallets: ' + Math.max(0, this._walletPickupCount || 0),
            'Base Score        +' + breakdown.baseScore,
            'Time Bonus        +' + breakdown.timeBonus,
            'HP Penalty        -' + breakdown.hpPenalty,
            'Final Score        ' + breakdown.finalScore,
        ].join('\n');
    },

    _hasWinningFood: function () {
        if (this._heldItem !== 'apple_pie') return false;
        if (this.requireFreshFoodToWin && this._foodSpoilTime <= 0) return false;
        return true;
    },

    _damagePlayer: function (amount) {
        if (!this._active || this._deathSequenceActive) return;

        this._flashDamageTarget(this._playerNode);
        this._mcHp = Math.max(0, this._mcHp - amount);
        cc.log('[NiuPai] Player damaged. HP=' + this._mcHp);
        this._refreshHudContent();

        if (this._mcHp <= 0) {
            this._startDeathSequence('player');
            return;
        }

        this._playSfx(this.sfxPlayerDamage);
    },

    _damageNiuPai: function (amount) {
        if (!this._active || this._deathSequenceActive) return;

        this._flashDamageTarget(this._niuPaiNode);
        this._niuPaiHp = Math.max(0, this._niuPaiHp - amount);
        cc.log('[NiuPai] NiuPai damaged. HP=' + this._niuPaiHp);
        this._showNiuPaiHurtNotification();
        this._refreshHudContent();

        if (this._niuPaiHp <= 0) {
            this._startDeathSequence('niupai');
            return;
        }

        this._playSfx(this.sfxNiuPaiDamage);
    },

    _startDeathSequence: function (targetType) {
        if (this._deathSequenceActive || !this._active) return;

        var targetNode = targetType === 'niupai' ? this._niuPaiNode : this._playerNode;
        if (!targetNode || !targetNode.isValid) {
            this._finishGame(false, 0);
            return;
        }

        this._deathSequenceActive = true;
        this._keys = {};
        this._orderOpen = false;
        this._cameraShakeTimer = 0;
        this._stopAllActorMovement();
        this._pauseBgmForDeathSequence();
        if (this._dialogueControl) this._dialogueControl.close();
        if (this._notificationControl) this._notificationControl.clear();

        var deathClip = targetType === 'niupai'
            ? (this.sfxNiuPaiDeath || this.sfxNiuPaiDamage)
            : (this.sfxPlayerDeath || this.sfxPlayerDamage);
        this._playSfx(deathClip, 1);

        this._panCameraToNode(targetNode, Math.max(0, this.deathCameraPanSeconds || 0.45));
        var actorFadeSeconds = Math.max(0, this.deathActorFadeSeconds || 0.65);
        var screenFadeSeconds = Math.max(0, this.deathScreenFadeSeconds || 0);
        this._fadeOutDeathNode(targetNode, actorFadeSeconds);
        this._fadeOutDeathScreen(actorFadeSeconds, screenFadeSeconds);

        var delay = Math.max(
            Math.max(0, this.deathCameraPanSeconds || 0.45),
            actorFadeSeconds + screenFadeSeconds,
            Math.max(0, this.deathFinishDelaySeconds || 0.8)
        );
        var self = this;
        var reason = targetType === 'niupai' ? 'niupai_dead' : 'player_dead';
        this.scheduleOnce(function () {
            self._finishGame(false, 0, reason);
        }, delay);

        cc.log('[NiuPai] Death sequence started: ' + targetType);
    },

    _pauseBgmForDeathSequence: function () {
        if (this._bgmId < 0) return;
        try { cc.audioEngine.pause(this._bgmId); } catch (e) {}
    },

    _panCameraToNode: function (targetNode, duration) {
        if (!this._camera || !this._camera.node || !targetNode || !targetNode.isValid) return;

        var worldPos = targetNode.parent
            ? targetNode.parent.convertToWorldSpaceAR(targetNode.getPosition())
            : targetNode.getPosition();
        var cameraParent = this._camera.node.parent;
        var cameraLocal = cameraParent
            ? cameraParent.convertToNodeSpaceAR(worldPos)
            : worldPos;

        cameraLocal.x += this.cameraFollowOffset.x;
        cameraLocal.y += this.cameraFollowOffset.y;
        cameraLocal = this._clampCameraToMap(cameraLocal);

        this._camera.node.stopAllActions();
        if (duration <= 0) {
            this._camera.node.setPosition(cameraLocal);
            return;
        }

        this._camera.node.runAction(cc.moveTo(duration, cameraLocal));
    },

    _fadeOutDeathNode: function (targetNode, duration) {
        if (!targetNode || !targetNode.isValid) return;

        targetNode.stopAllActions();
        targetNode.opacity = 255;
        if (duration <= 0) {
            targetNode.opacity = 0;
            return;
        }

        targetNode.runAction(cc.fadeOut(duration));
    },

    _fadeOutDeathScreen: function (delay, duration) {
        var node = this._ensureDeathScreenFadeNode();
        if (!node) return;

        this._updateDeathScreenFadeNodeLayout();
        node.stopAllActions();
        node.opacity = 0;
        node.active = true;
        this._deathScreenFadeDelay = Math.max(0, delay || 0);
        this._deathScreenFadeTimer = 0;
        this._deathScreenFadeDuration = Math.max(0, duration || 0);
        if (this._deathScreenFadeDelay <= 0 && this._deathScreenFadeDuration <= 0) {
            node.opacity = 255;
        }
    },

    _updateDeathScreenFade: function (dt) {
        var node = this._deathScreenFadeNode;
        if (!node || !node.isValid || !node.active) return;

        if (this._deathScreenFadeDelay > 0) {
            this._deathScreenFadeDelay = Math.max(0, this._deathScreenFadeDelay - Math.max(0, dt || 0));
            node.opacity = 0;
            return;
        }

        var duration = Math.max(0, this._deathScreenFadeDuration || 0);
        if (duration <= 0) {
            node.opacity = 255;
            return;
        }

        this._deathScreenFadeTimer = Math.min(duration, (this._deathScreenFadeTimer || 0) + Math.max(0, dt || 0));
        node.opacity = Math.round(255 * (this._deathScreenFadeTimer / duration));
    },

    _ensureDeathScreenFadeNode: function () {
        if (this._deathScreenFadeNode && this._deathScreenFadeNode.isValid) return this._deathScreenFadeNode;
        if (!this._camera || !this._camera.node || !this._camera.node.isValid) return null;

        var node = new cc.Node('DeathScreenFade');
        node.setAnchorPoint(0.5, 0.5);
        node.opacity = 0;
        node.active = false;
        node.zIndex = 2500;
        node.addComponent(cc.Graphics);
        this._camera.node.addChild(node, 2500);
        this._deathScreenFadeNode = node;
        this._updateDeathScreenFadeNodeLayout();
        return node;
    },

    _updateDeathScreenFadeNodeLayout: function () {
        var node = this._deathScreenFadeNode;
        if (!node || !node.isValid) return;

        var zoom = this._camera ? (this._camera.zoomRatio || 1) : 1;
        var viewW = cc.winSize.width;
        var viewH = cc.winSize.height;
        node.setPosition(0, 0);
        node.setScale(1 / zoom);
        node.setContentSize(viewW, viewH);

        var gfx = node.getComponent(cc.Graphics);
        if (!gfx) return;
        gfx.clear();
        gfx.fillColor = cc.color(0, 0, 0, 255);
        gfx.rect(-viewW / 2, -viewH / 2, viewW, viewH);
        gfx.fill();
    },

    _getTilePropertyPosition: function (tiledMap, offset, propX, propY, fallback) {
        if (!tiledMap) return fallback;

        var props = tiledMap.getProperties() || {};
        var tileX = this._readNumberProperty(props, propX);
        var tileY = this._readNumberProperty(props, propY);
        if (tileX === null || tileY === null) return fallback;

        return cc.v2(
            offset.x + (tileX + 0.5) * this.mapTileSize,
            offset.y + (tileY + 0.5) * this.mapTileSize
        );
    },

    _filterMapBoundaryVelocity: function (vx, vy) {
        return this._filterNodeMapBoundaryVelocity(
            this._playerNode,
            this.playerFrameW,
            this.playerFrameH,
            vx,
            vy
        );
    },

    _filterNodeMapBoundaryVelocity: function (node, frameW, frameH, vx, vy) {
        if (!this.clampPlayerToMap || !node) return cc.v2(vx, vy);

        var bounds = this._getNodeMapBounds(frameW, frameH);
        var epsilon = 0.5;

        if (node.x <= bounds.minX + epsilon && vx < 0) vx = 0;
        if (node.x >= bounds.maxX - epsilon && vx > 0) vx = 0;
        if (node.y <= bounds.minY + epsilon && vy < 0) vy = 0;
        if (node.y >= bounds.maxY - epsilon && vy > 0) vy = 0;

        return cc.v2(vx, vy);
    },

    _moveActorWithCollision: function (
        node,
        frameW,
        frameH,
        widthRatio,
        heightRatio,
        yOffsetRatio,
        vx,
        vy,
        dt,
        body,
        actorType,
        section
    ) {
        if (!node || dt <= 0) return false;
        if (body) body.linearVelocity = cc.v2(0, 0);

        var moved = false;
        var dx = vx * dt;
        var dy = vy * dt;
        var oldX = node.x;
        var oldY = node.y;
        section = section || this._currentSection;

        if (dx !== 0) {
            node.x = oldX + dx;
            if (this._actorPositionBlocked(node, frameW, frameH, widthRatio, heightRatio, yOffsetRatio, actorType, section)) {
                node.x = oldX;
            } else {
                moved = true;
            }
        }

        if (dy !== 0) {
            node.y = oldY + dy;
            if (this._actorPositionBlocked(node, frameW, frameH, widthRatio, heightRatio, yOffsetRatio, actorType, section)) {
                node.y = oldY;
            } else {
                moved = true;
            }
        }

        if (body) body.syncPosition(true);
        return moved;
    },

    _actorPositionBlocked: function (node, frameW, frameH, widthRatio, heightRatio, yOffsetRatio, actorType, section) {
        var rect = this._getActorTriggerRectAtPosition(
            node.x,
            node.y,
            frameW,
            frameH,
            widthRatio,
            heightRatio,
            yOffsetRatio
        );

        var hitInitialObstacle = this._rectHitsInitialObstacle(rect, section);
        if (hitInitialObstacle && actorType === 'player') {
            this._playObstacleBumpSfx();
            this._showFirstObstacleBumpDialogue();
        }
        var hitStatic = hitInitialObstacle || this._rectHitsStaticObstacle(rect, section);
        return hitStatic || this._rectHitsActorBlocker(rect, actorType, node);
    },

    _getActorTriggerRectAtPosition: function (x, y, frameW, frameH, widthRatio, heightRatio, yOffsetRatio) {
        var w = frameW * widthRatio;
        var h = frameH * heightRatio;
        var cx = x;
        var cy = y + frameH * yOffsetRatio;

        return {
            minX: cx - w / 2,
            maxX: cx + w / 2,
            minY: cy - h / 2,
            maxY: cy + h / 2,
        };
    },

    _rectHitsStaticObstacle: function (rect, section) {
        if (!rect || !this._staticCollisionRects) return false;

        var epsilon = 0.01;
        for (var i = 0; i < this._staticCollisionRects.length; i++) {
            var obstacle = this._staticCollisionRects[i];
            if (!obstacle || obstacle.section !== section) continue;
            if (this._rectsOverlapWithPadding(rect, obstacle, -epsilon)) return true;
        }

        return false;
    },

    _rectHitsInitialObstacle: function (rect, section) {
        if (!rect || !this._staticCollisionRects) return false;

        var epsilon = 0.01;
        for (var i = 0; i < this._staticCollisionRects.length; i++) {
            var obstacle = this._staticCollisionRects[i];
            if (!obstacle || obstacle.section !== section || obstacle.source !== 'initialObstacle') continue;
            if (this._rectsOverlapWithPadding(rect, obstacle, -epsilon)) return true;
        }

        return false;
    },

    _rectHitsActorBlocker: function (rect, actorType, selfNode) {
        if (!rect || this._playerMovingCarefully) return false;

        if (actorType === 'player') {
            return this._rectHitsNormie(rect, selfNode);
        }

        if (actorType === 'normie' && this._playerNode && this._playerNode !== selfNode) {
            return this._rectsOverlapWithPadding(rect, this._getPlayerTriggerRect(), -0.01);
        }

        return false;
    },

    _rectHitsNormie: function (rect, selfNode) {
        var i;

        if (this._normieControl && this._normieControl.normies) {
            for (i = 0; i < this._normieControl.normies.length; i++) {
                var normie = this._normieControl.normies[i];
                if (!normie || !normie.node || !normie.node.isValid || normie.node === selfNode) continue;
                if (this._rectsOverlapWithPadding(rect, this._getNormieTriggerRect(normie.node), -0.01)) {
                    return this._handlePlayerNormieTouch(normie.node, selfNode);
                }
                this._resetPlayerNormieTouchIfClear(normie.node);
            }
        }

        if (this._mcDonaldControl && this._mcDonaldControl.getQueueNormieNodes) {
            var queueNodes = this._mcDonaldControl.getQueueNormieNodes();
            for (i = 0; i < queueNodes.length; i++) {
                if (queueNodes[i] === selfNode) continue;
                if (this._rectsOverlapWithPadding(rect, this._getNormieTriggerRect(queueNodes[i]), -0.01)) {
                    return this._handlePlayerNormieTouch(queueNodes[i], selfNode);
                }
                this._resetPlayerNormieTouchIfClear(queueNodes[i]);
            }
        }

        return false;
    },

    _handlePlayerNormieTouch: function (normieNode, selfNode) {
        this._showFirstNormieBumpNotification();
        this._tryDropWalletFromPlayerBump(normieNode);

        if (typeof normieNode._npNormieBumpBlocksPlayer !== 'boolean') {
            var blockChance = Math.max(0, Math.min(1, this.normiePlayerBlockChance || 0));
            normieNode._npNormieBumpBlocksPlayer = Math.random() < blockChance;
        }

        var shouldBlock = normieNode._npNormieBumpBlocksPlayer;
        if (!shouldBlock) {
            this._playerNormieSlowTimer = Math.max(
                this._playerNormieSlowTimer || 0,
                Math.max(0, this.normiePlayerSlowSeconds || 0.16)
            );
            if (!normieNode._npNormieTouchSfxPlayed) {
                normieNode._npNormieTouchSfxPlayed = true;
                this._playSfx(this.sfxNormieSlow, 0.65);
            }
            return false;
        }

        if (!normieNode._npNormieTouchSfxPlayed) {
            normieNode._npNormieTouchSfxPlayed = true;
            this._playSfx(this.sfxNormieBump);
        }
        this._playNormieCollisionEffects(
            normieNode,
            selfNode ? selfNode.getPosition() : normieNode.getPosition()
        );
        return true;
    },

    _resetPlayerNormieTouchIfClear: function (normieNode) {
        if (!normieNode || !normieNode.isValid || !this._playerNode) return;
        if (!this._rectsOverlapWithPadding(this._getPlayerTriggerRect(), this._getNormieTriggerRect(normieNode), 0.01)) {
            normieNode._npNormieBumpBlocksPlayer = null;
            normieNode._npNormieTouchSfxPlayed = false;
        }
    },

    _rectsOverlapWithPadding: function (a, b, padding) {
        if (!a || !b) return false;
        padding = padding || 0;
        return a.minX <= b.maxX + padding && a.maxX >= b.minX - padding &&
            a.minY <= b.maxY + padding && a.maxY >= b.minY - padding;
    },

    _stopPlayerBody: function () {
        if (this._playerBody) {
            this._playerBody.linearVelocity = cc.v2(0, 0);
        }
        this._setRunParticleActive('player', this._playerNode, false);
    },

    _clampPlayerToMap: function () {
        if (!this.clampPlayerToMap || !this._playerNode) return;

        var bounds = this._getPlayerMapBounds();

        var clampedX = Math.max(bounds.minX, Math.min(bounds.maxX, this._playerNode.x));
        var clampedY = Math.max(bounds.minY, Math.min(bounds.maxY, this._playerNode.y));

        if (clampedX !== this._playerNode.x || clampedY !== this._playerNode.y) {
            this._playerNode.setPosition(clampedX, clampedY);
            if (this._playerBody) {
                this._playerBody.linearVelocity = cc.v2(0, 0);
                this._playerBody.syncPosition(true);
            }
        }
    },

    _getPlayerMapBounds: function () {
        return this._getNodeMapBounds(this.playerFrameW, this.playerFrameH);
    },

    _getNodeMapBounds: function (frameW, frameH) {
        return this._getNodeMapBoundsForSection(this._currentSection, frameW, frameH);
    },

    _getNodeMapBoundsForSection: function (sectionName, frameW, frameH) {
        var currentSection = this._currentSection;
        this._currentSection = sectionName || currentSection;
        var section = this._getCurrentSectionInfo();
        this._currentSection = currentSection;
        var mapW = section.cols * this.mapTileSize;
        var mapH = section.rows * this.mapTileSize;
        var halfW = frameW / 2;
        var halfH = frameH / 2;

        return {
            minX: section.offset.x + halfW,
            maxX: section.offset.x + mapW - halfW,
            minY: section.offset.y + halfH,
            maxY: section.offset.y + mapH - halfH,
        };
    },

    _isActorSpawnPositionBlocked: function (
        position,
        frameW,
        frameH,
        widthRatio,
        heightRatio,
        yOffsetRatio,
        section
    ) {
        if (!position) return true;

        var bounds = this._getNodeMapBoundsForSection(section, frameW, frameH);
        if (position.x < bounds.minX || position.x > bounds.maxX ||
            position.y < bounds.minY || position.y > bounds.maxY) {
            return true;
        }

        var rect = this._getActorTriggerRectAtPosition(
            position.x,
            position.y,
            frameW,
            frameH,
            widthRatio,
            heightRatio,
            yOffsetRatio
        );
        return this._rectHitsStaticObstacle(rect, section);
    },

    _markInitialObstaclesBlockedOnGrid: function (grid, sectionName) {
        if (!grid || !this._initialObstacles) return;

        for (var i = 0; i < this._initialObstacles.length; i++) {
            var obstacle = this._initialObstacles[i];
            if (!obstacle || obstacle.section !== sectionName || !obstacle.rect) continue;
            this._markWorldRectBlockedOnGrid(grid, obstacle.rect);
        }
    },

    _markWorldRectBlockedOnGrid: function (grid, rect) {
        if (!grid || !rect) return;

        var epsilon = 0.001;
        var minTile = {
            x: Math.floor((rect.minX - grid.offset.x) / this.mapTileSize),
            y: Math.floor((rect.minY - grid.offset.y) / this.mapTileSize),
        };
        var maxTile = {
            x: Math.floor((rect.maxX - grid.offset.x - epsilon) / this.mapTileSize),
            y: Math.floor((rect.maxY - grid.offset.y - epsilon) / this.mapTileSize),
        };

        var minX = Math.max(0, Math.min(minTile.x, maxTile.x));
        var maxX = Math.min(grid.cols - 1, Math.max(minTile.x, maxTile.x));
        var minY = Math.max(0, Math.min(minTile.y, maxTile.y));
        var maxY = Math.min(grid.rows - 1, Math.max(minTile.y, maxTile.y));

        for (var y = minY; y <= maxY; y++) {
            for (var x = minX; x <= maxX; x++) {
                if (grid.cells[y]) grid.cells[y][x] = false;
            }
        }
    },

    _clampBlackDogToMap: function (dog) {
        if (!this.clampPlayerToMap || !dog || !dog.node) return;

        var currentSection = this._currentSection;
        this._currentSection = dog.section || currentSection;
        var clamped = this._clampPositionToCurrentMap(
            dog.node.getPosition(),
            this.blackDogFrameW,
            this.blackDogFrameH
        );
        this._currentSection = currentSection;

        if (clamped.x !== dog.node.x || clamped.y !== dog.node.y) {
            dog.node.setPosition(clamped);
            if (dog.body) {
                dog.body.linearVelocity = cc.v2(0, 0);
                dog.body.syncPosition(true);
            }
        }
    },

    _clampNormieToMap: function (normie) {
        if (!this.clampPlayerToMap || !normie || !normie.node) return;

        var currentSection = this._currentSection;
        this._currentSection = 'main';
        var clamped = this._clampPositionToCurrentMap(
            normie.node.getPosition(),
            this.normieFrameW,
            this.normieFrameH
        );
        this._currentSection = currentSection;

        if (clamped.x !== normie.node.x || clamped.y !== normie.node.y) {
            normie.node.setPosition(clamped);
            if (normie.body) {
                normie.body.linearVelocity = cc.v2(0, 0);
                normie.body.syncPosition(true);
            }
        }
    },

    _isNodeVisibleToCamera: function (node) {
        if (!node || !node.isValid) return false;

        var cameraPos = this._camera && this._camera.node
            ? this._camera.node.getPosition()
            : cc.v2(0, 0);
        var zoom = this._camera ? (this._camera.zoomRatio || 1) : 1;
        var viewW = cc.winSize.width / zoom;
        var viewH = cc.winSize.height / zoom;
        var padding = this.mapTileSize;

        return node.x >= cameraPos.x - viewW / 2 - padding &&
            node.x <= cameraPos.x + viewW / 2 + padding &&
            node.y >= cameraPos.y - viewH / 2 - padding &&
            node.y <= cameraPos.y + viewH / 2 + padding;
    },

    _clampPositionToCurrentMap: function (pos, frameW, frameH) {
        var bounds = this._getNodeMapBounds(frameW, frameH);
        return cc.v2(
            Math.max(bounds.minX, Math.min(bounds.maxX, pos.x)),
            Math.max(bounds.minY, Math.min(bounds.maxY, pos.y))
        );
    },

    _drawPlayerFallback: function (node) {
        var gfx = node.addComponent(cc.Graphics);
        var w = this.playerFrameW;
        var h = this.playerFrameH;

        gfx.fillColor = cc.color(74, 144, 217);
        gfx.rect(-w / 2 + 4, -h / 2 + 4, w - 8, h - 8);
        gfx.fill();

        gfx.fillColor = cc.color(245, 203, 167);
        gfx.rect(-w / 2 + 8, h / 2 - 12, w - 16, 8);
        gfx.fill();

        gfx.strokeColor = cc.color(170, 204, 255);
        gfx.lineWidth = 2;
        gfx.rect(-6, h / 2 - 10, 5, 3);
        gfx.rect(2, h / 2 - 10, 5, 3);
        gfx.stroke();
    },

    _mkLabel: function (str, pos, size, color) {
        var node = new cc.Node();
        var label = node.addComponent(cc.Label);
        label.string = str;
        label.fontSize = size;
        label.font = this.labelFont;
        label.lineHeight = size + 4;
        label.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        node.color = color || cc.Color.WHITE;
        node.setPosition(pos);
        this.node.addChild(node, 5);
        return node;
    },

    _finishGame: function (win, score, reason) {
        if (!this._active) return;

        var isDeathResult = reason === 'player_dead' || reason === 'niupai_dead';
        var finalScore = this._calculateFinalScore(!!win);
        this._active = false;
        this._deathSequenceActive = false;
        this._exitTransitionActive = false;
        this._pendingExitResult = null;
        this._tunnelOverlayFade = 1;
        this._introDialogOpen = false;
        this._cameraShakeTimer = 0;
        if (isDeathResult) this._holdDeathScreenFade();
        else this._resetDeathScreenFade();
        if (this._criticalHpOverlayNode) this._criticalHpOverlayNode.active = false;
        if (this._tunnelVisionOverlayNode) this._tunnelVisionOverlayNode.active = false;
        if (this._objectiveRoot) this._objectiveRoot.active = false;
        if (this._dialogueControl) this._dialogueControl.close();
        this._stopBgm();

        if (win) this._playSfx(this.sfxCorrect);
        else if (!isDeathResult) this._playSfx(this.sfxWrong);

        if (this._onResult) this._onResult(!!win, finalScore, reason || '');
    },

    _holdDeathScreenFade: function () {
        var node = this._ensureDeathScreenFadeNode();
        if (!node) return;
        this._updateDeathScreenFadeNodeLayout();
        node.stopAllActions();
        node.opacity = 255;
        node.active = true;
        this._deathScreenFadeDelay = 0;
        this._deathScreenFadeTimer = this._deathScreenFadeDuration || 0;
    },

    _resetDeathScreenFade: function () {
        if (!this._deathScreenFadeNode || !this._deathScreenFadeNode.isValid) return;
        this._deathScreenFadeNode.stopAllActions();
        this._deathScreenFadeNode.opacity = 0;
        this._deathScreenFadeNode.active = false;
        this._deathScreenFadeDelay = 0;
        this._deathScreenFadeTimer = 0;
        this._deathScreenFadeDuration = 0;
    },

    _calculateFinalScore: function (win) {
        return this._getFinalScoreBreakdown(!!win).finalScore;
    },

    _getFinalScoreBreakdown: function (win) {
        var score = Math.max(0, Math.floor(this._runtimeScore || 0));
        var mcLost = Math.max(0, (this.mcMaxHp || 0) - (this._mcHp || 0));
        var niuPaiLost = Math.max(0, (this.niuPaiMaxHp || 0) - (this._niuPaiHp || 0));
        var hpPenalty =
            mcLost * Math.max(0, this.scoreMcHpPenaltyPerHp || 0) +
            niuPaiLost * Math.max(0, this.scoreNiuPaiHpPenaltyPerHp || 0);
        var timeBonus = 0;
        if (win) {
            var remaining = Math.max(0, (this.scoreTimeBonusLimitSeconds || 0) - (this._elapsedGameSeconds || 0));
            timeBonus = Math.floor(remaining * Math.max(0, this.scoreTimeBonusPointsPerSecond || 0));
        }
        var finalScore = Math.max(0, Math.floor(score + timeBonus - hpPenalty));
        cc.log('[NiuPai] Final score runtime=' + score +
            ' timeBonus=' + timeBonus +
            ' hpPenalty=' + hpPenalty +
            ' final=' + finalScore);
        return {
            baseScore: score,
            timeBonus: timeBonus,
            hpPenalty: hpPenalty,
            mcHpLost: mcLost,
            niuPaiHpLost: niuPaiLost,
            finalScore: finalScore,
        };
    },

    _playSfx: function (clip, volumeScale) {
        if (!clip) return -1;
        var configuredVolume = typeof this.sfxVolume === 'number' ? this.sfxVolume : 0.9;
        var baseVolume = Math.max(0, Math.min(1, configuredVolume));
        var scale = volumeScale === undefined ? 1 : Math.max(0, volumeScale);
        var volume = Math.max(0, Math.min(1, baseVolume * scale * this._getMasterAudioVolume()));
        if (volume <= 0) return -1;
        return cc.audioEngine.play(clip, false, volume);
    },

    _playSectionBgm: function (section) {
        var clip = section === 'tunnel'
            ? (this.tunnelBgm || this.bgm)
            : this.bgm;
        if (this._currentBgmClip === clip && this._bgmId >= 0) return;

        this._stopBgm();
        this._currentBgmClip = clip || null;
        if (!clip) return;

        this._bgmId = cc.audioEngine.play(clip, true, this._getBgmEffectiveVolume());
        if (PauseMenu && PauseMenu.isOpen && PauseMenu.isOpen()) {
            this.onGlobalPauseChanged(true);
        }
    },

    _stopBgm: function () {
        if (this._bgmId >= 0) {
            cc.audioEngine.stop(this._bgmId);
            this._bgmId = -1;
        }
        this._currentBgmClip = null;
        this._bgmPausedByGlobalPause = false;
    },

    _getMasterAudioVolume: function () {
        if (PauseMenu && PauseMenu.getMasterVolume) {
            return Math.max(0, Math.min(1, PauseMenu.getMasterVolume()));
        }
        return 1;
    },

    _getBgmEffectiveVolume: function () {
        var volume = typeof this.bgmVolume === 'number' ? this.bgmVolume : 0.65;
        return Math.max(0, Math.min(1, volume * this._getMasterAudioVolume()));
    },

    _updateBgmVolume: function () {
        if (this._bgmId < 0) return;
        try {
            cc.audioEngine.setVolume(this._bgmId, this._getBgmEffectiveVolume());
        } catch (e) {}
    },

    onGlobalAudioVolumeChanged: function () {
        this._updateBgmVolume();
    },

    onGlobalPauseChanged: function (paused) {
        if (this._bgmId < 0) return;
        if (paused) {
            try { cc.audioEngine.pause(this._bgmId); } catch (e) {}
            this._bgmPausedByGlobalPause = true;
            return;
        }

        if (this._bgmPausedByGlobalPause) {
            this._updateBgmVolume();
            try { cc.audioEngine.resume(this._bgmId); } catch (e) {}
            this._bgmPausedByGlobalPause = false;
        }
    },

    update: function (dt) {
        this._obstacleBumpSfxCooldownTimer = Math.max(0, (this._obstacleBumpSfxCooldownTimer || 0) - Math.max(0, dt || 0));
        this._cameraShakeTimer = Math.max(0, (this._cameraShakeTimer || 0) - Math.max(0, dt || 0));

        this._recoverDialogueStateIfNeeded();

        if (!this._orderOpen && this._dialogueControl && this._dialogueControl.isOrderOpen()) {
            this._dialogueControl.closeOrder();
        }

        if (this._introDialogOpen || (this._dialogueControl && this._dialogueControl.isSimpleOpen())) {
            this._stopAllActorMovement();
            this._updateCameraFollow();
            this._updateHud(0);
            if (this._dialogueControl) this._dialogueControl.update(dt);
            if (this._notificationControl) this._notificationControl.update(dt);
            return;
        }

        if (this._deathSequenceActive) {
            this._stopAllActorMovement();
            this._updateDeathScreenFade(dt);
            this._updateHud(0);
            if (this._dialogueControl) this._dialogueControl.update(dt);
            if (this._notificationControl) this._notificationControl.update(dt);
            return;
        }

        if (this._updateTunnelExitTransition(dt)) {
            if (this._dialogueControl) this._dialogueControl.update(dt);
            return;
        }

        this._updatePlayerMovement(dt);
        if (this._niuPaiControl) this._niuPaiControl.update(dt);
        this._updateMainBlackDogSpawn(dt);
        if (this._blackDogControl) this._blackDogControl.update(dt);
        if (this._mcDonaldControl && !this._orderOpen) this._mcDonaldControl.update(dt);
        if (this._normieControl) {
            if (this._orderOpen) this._normieControl.stopAll();
            else this._normieControl.update(dt);
        }
        this._updateMcFlurryExplosions(dt);
        this._updateWallets(dt);
        this._elapsedGameSeconds += Math.max(0, dt || 0);
        this._updateDebugImmediateResult();
        this._updateCameraFollow();
        this._updateHud(dt);
        if (this._dialogueControl) this._dialogueControl.update(dt);
        if (this._notificationControl) this._notificationControl.update(dt);
        if (this._orderOpen) {
            this._updateOrderOverlayPosition();
        }
    },

    _recoverDialogueStateIfNeeded: function () {
        if (this._introDialogOpen &&
            (!this._dialogueControl || !this._dialogueControl.isSimpleOpen())) {
            cc.warn('[NiuPai] Recovered from stale intro dialogue state.');
            this._resumeAfterDialogue();
        }

        if (this._orderOpen &&
            (!this._dialogueControl || !this._dialogueControl.isOrderOpen())) {
            cc.warn('[NiuPai] Recovered from stale order dialogue state.');
            this._closeOrderDialog();
        }
    },

    _updateDebugImmediateResult: function () {
        if (!this.debugImmediateResult || this._debugImmediateResultTriggered) return;
        if ((this._elapsedGameSeconds || 0) < 3) return;

        this._debugImmediateResultTriggered = true;
        var type = this.debugImmediateResultType;
        cc.log('[NiuPai] debugImmediateResult triggered. type=' + type);

        if (type === DebugImmediateResultType.WrongFood) {
            this._finishGame(false, 0, 'incorrect_food');
        } else if (type === DebugImmediateResultType.Lose) {
            this._finishGame(false, 0);
        } else {
            this._finishGame(true, 1);
        }
    },
});
