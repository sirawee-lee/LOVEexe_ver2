'use strict';

// Map: 100×60 tiles × 16px = 1600×960 CC units
var MAP_W = 1600;
var MAP_H = 960;

// Interaction zones are placed in the editor as InteractZone rectangles under
// the "InteractZones" node — see InteractZone.js.

var WALK_SPEED = 220;  // CC units / second — normal WASD speed
var RUN_SPEED  = 340;  // holding Shift — sprint (faster than normal)
var ZOOM       = 2;    // world scale — zooms in, eliminates edge voids

var StoryState = require('StoryState');
var PixelFont  = require('PixelFont');   // VT323 8-bit font for the overworld HUD text
require('PauseMenu');   // registers the global ESC pause menu (once, survives scene loads)

// npcId → display name for the "[E] Talk to ..." hint
var NPC_NAMES = { father: 'Mr. Wang', professor: 'Prof. Hung', niupai: 'Niu Pai', mei: 'Mei' };

cc.Class({
    extends: cc.Component,

    properties: {
        // ── Editor-placed nodes (drag from Node Tree) ──────────
        worldNode:         { default: null, type: cc.Node },
        collidersNode:     { default: null, type: cc.Node },
        interactZonesNode: { default: null, type: cc.Node },  // entrance rectangles (legacy)
        npcsNode:          { default: null, type: cc.Node },  // story NPCs (NPC.js)
        tiledMapBgNode:    { default: null, type: cc.Node },  // TiledMap below player
        tiledMapFgNode:    { default: null, type: cc.Node },  // TiledMap above player

        // ── Assets ────────────────────────────────────────────
        mapTexture:   { default: null, type: cc.SpriteFrame },
        playerSheet:  { default: null, type: cc.Texture2D   },
        playerFrameW: { default: 48,   type: cc.Integer     },
        playerFrameH: { default: 64,   type: cc.Integer     },

        // ── Dog companion (Niu Pai) — follows the player ──────
        dogSheet:     { default: null, type: cc.Texture2D   },  // niupai_spritesheet (4-dir)
        dogFrameW:    { default: 32,   type: cc.Integer     },
        dogFrameH:    { default: 32,   type: cc.Integer     },

        bgm:          { default: null, type: cc.AudioClip   },
    },

    // ── CC lifecycle ──────────────────────────────────────────
    onLoad: function () {
        cc.log('[MainGame] v3 onLoad');
        var self = this;
        // Viewport size in design units. Canvas is Fit-Height (960×640 design,
        // height locked to 640), so width varies with the window aspect ratio.
        var vis = cc.view.getVisibleSize();
        self._W = vis.width;
        self._H = vis.height;
        // Map is 100×60 tiles × 16px = 1600×960 (confirmed by PowerShell)
        self._mapW = 1600;
        self._mapH = 960;
        self._camLogged = false;

        // ── World node ────────────────────────────────────────
        // Use the editor-placed node if assigned, otherwise create one at runtime
        var world;
        if (self.worldNode) {
            world = self.worldNode;
        } else {
            world = new cc.Node('World');
            world.setPosition(0, 0);
            self.node.addChild(world, 0);
        }
        world.setScale(ZOOM);
        self._world = world;

        // Map background
        var mapNode = new cc.Node('MapBg');
        var mapSpr  = mapNode.addComponent(cc.Sprite);
        mapSpr.spriteFrame = self.mapTexture;
        mapSpr.sizeMode    = cc.Sprite.SizeMode.RAW;
        mapNode.setPosition(0, 0);
        world.addChild(mapNode, 0);

        // ── TiledMap layer visibility ─────────────────────────
        // Background TiledMap: hide foreground layers
        var BG_HIDE = ['trees', 'trees_flower', 'objects', 'gate', 'buildings'];
        // Foreground TiledMap: hide background layers
        var FG_HIDE = ['ground', 'lake', 'ground2'];

        function hideLayers(tmNode, layerNames) {
            if (!tmNode) return;
            var tm = tmNode.getComponent(cc.TiledMap);
            if (!tm) return;
            layerNames.forEach(function (name) {
                var layer = tm.getLayer(name);
                if (layer) layer.node.active = false;
            });
        }

        hideLayers(self.tiledMapBgNode, BG_HIDE);
        hideLayers(self.tiledMapFgNode, FG_HIDE);

        // FG must render above player (player is added at zIndex=2)
        if (self.tiledMapFgNode) self.tiledMapFgNode.zIndex = 3;

        // ── Build collision list from editor-placed CollisionZone nodes ──
        // A child with a cc.PolygonCollider is stored as a traced polygon
        // (for irregular shapes like the lake); everything else is an AABB rect.
        self._colliders = [];
        if (self.collidersNode) {
            self.collidersNode.children.forEach(function (child) {
                var poly = child.getComponent(cc.PolygonCollider);
                if (poly && poly.points && poly.points.length >= 3) {
                    var ox = child.x + poly.offset.x;
                    var oy = child.y + poly.offset.y;
                    var pts = poly.points.map(function (p) {
                        return { x: ox + p.x, y: oy + p.y };
                    });
                    self._colliders.push({ type: 'poly', pts: pts });
                } else {
                    self._colliders.push({
                        type: 'rect',
                        x: child.x, y: child.y,
                        w: child.width, h: child.height,
                    });
                }
            });
            cc.log('[MainGame] loaded ' + self._colliders.length + ' colliders from editor');
        }

        // Log actual texture size for verification
        self.scheduleOnce(function () {
            var sz  = mapNode.getContentSize();
            var tex = self.mapTexture ? self.mapTexture.getTexture() : null;
            cc.log('[MainGame] sprite contentSize=' + sz.width + 'x' + sz.height +
                   '  texture=' + (tex ? tex.width + 'x' + tex.height : 'null'));
        }, 0.5);

        // ── Interaction zones (editor-placed InteractZone rectangles) ──
        self._zones = [];
        if (self.interactZonesNode) {
            self.interactZonesNode.children.forEach(function (child) {
                var iz = child.getComponent('InteractZone');
                self._zones.push({
                    x: child.x, y: child.y, w: child.width, h: child.height,
                    game:  iz ? iz.game  : '',
                    label: iz ? iz.label : child.name,
                });
            });
        }

        // ── Story NPCs (NPC.js) — talk zones ───────────────────
        self._npcs = [];
        self._activeNpc = null;
        self._npcAutoTriggered = {};   // npcId -> already auto-played this session
        if (self.npcsNode) {
            self.npcsNode.zIndex = 2;   // render NPCs at the player's level, above the map
            self.npcsNode.children.forEach(function (child) {
                var npc = child.getComponent('NPC');
                if (!npc) return;
                self._npcs.push({
                    node:  child,            // live position (NPCs may roam)
                    w: npc.triggerW, h: npc.triggerH,
                    npcId: npc.npcId,
                });
            });
            cc.log('[MainGame] loaded ' + self._npcs.length + ' NPCs');
        } else {
            cc.warn('[MainGame] npcsNode not assigned — NPCs will not appear or be interactable');
        }

        // Player node — Sprite + PlayerAnimator
        var pNode = new cc.Node('Player');
        pNode.addComponent(cc.Sprite);
        pNode.setContentSize(self.playerFrameW, self.playerFrameH);
        world.addChild(pNode, 2);
        self._playerNode = pNode;

        // ── Spawn just below a target NPC so the opening reads as a conversation ──
        // Target = the NPC whose minigame just finished (StoryState.lastResult.key);
        // otherwise Mei (fresh start, or returning after the boss). The spawn sits
        // BELOW the NPC's trigger by a margin so the walk-up auto-trigger does NOT
        // fire on load — the scripted intro/post dialogue plays regardless of position.
        var spawnTargetId = (StoryState.lastResult && StoryState.lastResult.key)
            ? StoryState.lastResult.key : 'mei';
        self._px = 0; self._py = 0; self._faceNpc = false;
        for (var si = 0; si < self._npcs.length; si++) {
            var sn = self._npcs[si];
            if (sn.npcId === spawnTargetId && sn.node && sn.node.isValid) {
                self._px = sn.node.x;
                self._py = sn.node.y - (Math.abs(sn.h) / 2 + 28);   // clear of the trigger's bottom edge
                self._faceNpc = true;
                break;
            }
        }
        pNode.setPosition(self._px, self._py);

        // Attach animator and give it the spritesheet
        var anim = pNode.addComponent('PlayerAnimator');
        anim.spritesheet  = self.playerSheet;
        anim.frameWidth   = self.playerFrameW;
        anim.frameHeight  = self.playerFrameH;
        if (self.playerSheet) anim._buildFrames();
        self._anim = anim;
        if (self._faceNpc && self._anim) self._anim.setDirection('up');   // face the NPC we spawned beside

        // ── Dog companion (Niu Pai) — walks beside the player ──
        // Attach to World BEFORE adding PlayerAnimator, so its onLoad runs
        // synchronously (initialising _dir/_frameIdx/_moving) before we call
        // _buildFrames(). Building frames on a detached node crashes _apply().
        self._dogNode = null;
        if (!self.dogSheet) cc.warn('[MainGame] dogSheet not assigned — Niu Pai companion will never appear');
        if (self.dogSheet) {
            var dNode = new cc.Node('Dog');
            dNode.addComponent(cc.Sprite);
            self._dogX = self._px - 32;
            self._dogY = self._py - 4;
            dNode.setPosition(self._dogX, self._dogY);
            world.addChild(dNode, 2);
            var dAnim = dNode.addComponent('PlayerAnimator');
            dAnim.spritesheet = self.dogSheet;
            dAnim.frameWidth  = self.dogFrameW;
            dAnim.frameHeight = self.dogFrameH;
            dAnim.rowOrder    = ['down', 'left', 'right', 'up'];  // match the XCB niupai (PlayerAnimator default)
            dAnim._buildFrames();
            dAnim.setMoving(false);
            self._dogNode = dNode;
            self._dogAnim = dAnim;
            // Hidden until Niu Pai is rescued at XCB; then she follows.
            dNode.active = StoryState.dogJoined;
        }

        // ── UI layer (fixed — doesn't scroll) ──
        // Interaction hint
        var hintNode = new cc.Node('Hint');
        var hintBg   = hintNode.addComponent(cc.Graphics);
        hintNode.setPosition(0, -self._H / 2 + 28);
        hintNode.opacity = 0;
        self.node.addChild(hintNode, 5);
        self._hintNode = hintNode;
        self._hintBg   = hintBg;

        var hintLbl = new cc.Node('HintText');
        var hl = hintLbl.addComponent(cc.Label);
        hl.string    = '';
        hl.fontSize  = 19;
        hl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        PixelFont.apply(hl);
        hintLbl.color = cc.color(255, 240, 80);
        hintLbl.setPosition(0, 0);
        hintNode.addChild(hintLbl, 1);
        self._hintLabel = hl;

        // Location name (top-center)
        var locNode = new cc.Node('LocName');
        var locLbl  = locNode.addComponent(cc.Label);
        locLbl.string   = '';
        locLbl.fontSize = 16;
        locLbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        PixelFont.apply(locLbl);
        locNode.color  = cc.color(200, 220, 255);
        locNode.setPosition(0, self._H / 2 - 18);
        locNode.opacity = 0;
        self.node.addChild(locNode, 5);
        self._locNode  = locNode;
        self._locLabel = locLbl;

        // ── Hearts HUD (top-left) — reflects StoryState.lives across all games ──
        self._heartNodes = [];
        var heartsRoot = new cc.Node('Hearts');
        self.node.addChild(heartsRoot, 6);
        for (var hi = 0; hi < 3; hi++) {
            var heartNode = new cc.Node('Heart' + hi);
            var hLbl = heartNode.addComponent(cc.Label);
            hLbl.string   = '♥';
            hLbl.fontSize = 26;
            heartNode.color = cc.color(231, 76, 60);
            heartsRoot.addChild(heartNode);
            self._heartNodes.push(heartNode);
        }
        self._updateHearts();

        // Input
        self._keys = {};
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, self._onKeyDown, self);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP,   self._onKeyUp,   self);

        self._activeZone  = null;
        self._bgmId       = -1;
        self._hintTimer   = 0;
    },

    onEnable: function () {
        // Kill any leftover minigame music. The 5 boss games play their BGM on the
        // MUSIC channel (cc.audioEngine.playMusic) and don't stop it on scene exit,
        // so it would overlap the overworld BGM. The overworld BGM below uses the
        // separate effect channel (play → _bgmId), so stopMusic() won't touch it.
        cc.audioEngine.stopMusic();
        // Resume BGM when returning from minigame
        if (this.bgm && this._bgmId < 0) {
            this._bgmId = cc.audioEngine.play(this.bgm, true, 0.6);
        }
    },

    onDisable: function () {
        this._keys = {};   // drop any held keys when hidden (e.g. entering a node-toggle minigame)
        if (this._bgmId >= 0) {
            cc.audioEngine.stop(this._bgmId);
            this._bgmId = -1;
        }
    },

    onDestroy: function () {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP,   this._onKeyUp,   this);
        if (this._bgmId >= 0) cc.audioEngine.stop(this._bgmId);
    },

    // ── Input ─────────────────────────────────────────────────
    // ── Collision check against editor-placed CollisionZone nodes ──
    _collidesWithMap: function (nx, ny) {
        var hw = 10, hh = 12; // player half-hitbox (slightly smaller than sprite)
        for (var i = 0; i < this._colliders.length; i++) {
            var c = this._colliders[i];
            if (c.type === 'poly') {
                // Player centre vs traced polygon (trace slightly inside the
                // shore so the sprite doesn't visibly overlap the water edge).
                if (this._pointInPoly(nx, ny, c.pts)) return true;
            } else {
                var hw2 = Math.abs(c.w) / 2, hh2 = Math.abs(c.h) / 2;
                if (nx + hw > c.x - hw2 && nx - hw < c.x + hw2 &&
                    ny + hh > c.y - hh2 && ny - hh < c.y + hh2) {
                    return true;
                }
            }
        }
        return false;
    },

    // Ray-casting point-in-polygon (even-odd rule). pts: [{x,y}, ...]
    _pointInPoly: function (x, y, pts) {
        var inside = false;
        for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            var xi = pts[i].x, yi = pts[i].y;
            var xj = pts[j].x, yj = pts[j].y;
            if (((yi > y) !== (yj > y)) &&
                (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    },

    // Redraw the 3-heart HUD from StoryState.lives (full ♥ vs spent ♡). Repinned
    // to the real visible edges each call so it tracks window resizes.
    _updateHearts: function () {
        if (!this._heartNodes) return;
        var vis = cc.view.getVisibleSize();
        var x0 = -vis.width / 2 + 24, y0 = vis.height / 2 - 22;
        for (var i = 0; i < this._heartNodes.length; i++) {
            var n = this._heartNodes[i];
            if (!n || !n.isValid) continue;
            n.setPosition(x0 + i * 28, y0);
            var lbl = n.getComponent(cc.Label);
            if (i < StoryState.lives) {
                if (lbl) lbl.string = '♥';
                n.color = cc.color(231, 76, 60);
                n.opacity = 255;
            } else {
                if (lbl) lbl.string = '♡';
                n.color = cc.color(120, 120, 130);
                n.opacity = 180;
            }
        }
    },

    // Remove an NPC (e.g. the XCB dog once Niu Pai joins the player): deactivate
    // the node so it both disappears AND stops registering its talk zone.
    _hideNpc: function (id) {
        for (var i = 0; i < this._npcs.length; i++) {
            if (this._npcs[i].npcId === id && this._npcs[i].node && this._npcs[i].node.isValid) {
                this._npcs[i].node.active = false;
                return;
            }
        }
    },

    // ── Niu Pai / dog-rescue overworld helpers (used by GameController's XCB cutscene) ──
    _showNpc: function (id) {
        for (var i = 0; i < this._npcs.length; i++) {
            if (this._npcs[i].npcId === id && this._npcs[i].node && this._npcs[i].node.isValid) {
                this._npcs[i].node.active = true;
                return;
            }
        }
    },

    setNiuPaiCompanionJoined: function (joined) {
        StoryState.dogJoined = !!joined;
        if (joined) {
            this._ensureDogJoinedAtPlayerSide();
        } else {
            if (this._dogNode) this._dogNode.active = false;
            if (this._dogAnim) this._dogAnim.setMoving(false);
            this._showNpc('niupai');
        }
        this._activeNpc = null;
        this._activeZone = null;
    },

    teleportPlayerNearNpc: function (npcId, offset) {
        var npc = this._findNpc(npcId);
        if (!npc || !npc.node || !npc.node.isValid) {
            cc.warn('[MainGame] Cannot teleport near missing NPC: ' + npcId);
            return false;
        }

        offset = offset || cc.v2(-0, 80);
        this._setPlayerPosition(npc.node.x + offset.x, npc.node.y + offset.y);

        if (StoryState.dogJoined) {
            this._ensureDogJoinedAtPlayerSide();
        }

        this._syncCameraToPlayer();
        this._activeNpc = null;
        this._activeZone = null;
        return true;
    },

    _findNpc: function (npcId) {
        if (!this._npcs) return null;
        for (var i = 0; i < this._npcs.length; i++) {
            if (this._npcs[i].npcId === npcId) return this._npcs[i];
        }
        return null;
    },

    _setPlayerPosition: function (x, y) {
        var hW = this._mapW / 2 - 20;
        var hH = this._mapH / 2 - 20;
        this._px = Math.max(-hW, Math.min(hW, x));
        this._py = Math.max(-hH, Math.min(hH, y));
        if (this._playerNode) this._playerNode.setPosition(this._px, this._py);
        if (this._anim) this._anim.setMoving(false);
    },

    _ensureDogJoinedAtPlayerSide: function () {
        if (!this._dogNode) return;
        this._dogNode.active = true;
        this._hideNpc('niupai');
        this._dogX = this._px - 32;
        this._dogY = this._py - 4;
        this._dogNode.setPosition(this._dogX, this._dogY);
        if (this._dogAnim) this._dogAnim.setMoving(false);
    },

    _syncCameraToPlayer: function () {
        if (!this._world) return;
        var vis = cc.view.getVisibleSize();
        var vHW = vis.width / 2;
        var vHH = vis.height / 2;
        var sHW = this._mapW / 2 * ZOOM;
        var sHH = this._mapH / 2 * ZOOM;
        var worldX = sHW <= vHW ? 0 : Math.max(vHW - sHW, Math.min(sHW - vHW, -this._px * ZOOM));
        var worldY = sHH <= vHH ? 0 : Math.max(vHH - sHH, Math.min(sHH - vHH, -this._py * ZOOM));
        this._world.setPosition(worldX, worldY);
    },

    _onKeyDown: function (e) {
        // Ignore keys while MainGame is hidden (e.g. the Osu node-toggle minigame is on
        // screen) — the global cc.systemEvent listener stays subscribed otherwise, so
        // SPACE/E would re-trigger the overworld conversation underneath the minigame.
        if (!this.node.activeInHierarchy) return;
        this._keys[e.keyCode] = true;
        // No overworld interaction while a dialogue is on screen
        if (StoryState.dialogueActive) return;
        // Interact: talk to the nearest NPC (preferred), else a legacy zone
        if (e.keyCode === cc.macro.KEY.e || e.keyCode === cc.macro.KEY.space) {
            if (this._activeNpc) {
                this.node.emit('npc-interact', this._activeNpc.npcId);
            } else if (this._activeZone) {
                this.node.emit('launch-minigame', this._activeZone.game);
            }
        }
        // Feed Niu Pai (she's always nearby once she's following)
        if (e.keyCode === cc.macro.KEY.f && this._dogNode) {
            this.node.emit('feed-dog');
        }
    },

    _onKeyUp: function (e) {
        // Always honour releases (even while hidden): a movement key held when a
        // node-toggle minigame (Osu) starts would otherwise stay "down" and auto-walk
        // the player the moment MainGame re-activates.
        this._keys[e.keyCode] = false;
    },

    // ── Update ────────────────────────────────────────────────
    update: function (dt) {
        var self = this;

        self._updateHearts();   // keep the heart HUD synced + pinned each frame

        // Freeze the overworld while a dialogue is on screen
        if (StoryState.dialogueActive) {
            if (self._anim)    self._anim.setMoving(false);
            if (self._dogAnim) self._dogAnim.setMoving(false);
            return;
        }

        // ── Player movement — normal WASD; hold Shift to sprint faster ──
        var running = !!self._keys[cc.macro.KEY.shift];
        var spd     = (running ? RUN_SPEED : WALK_SPEED) * dt;

        var upKey    = self._keys[cc.macro.KEY.w] || self._keys[cc.macro.KEY.up];
        var downKey  = self._keys[cc.macro.KEY.s] || self._keys[cc.macro.KEY.down];
        var leftKey  = self._keys[cc.macro.KEY.a] || self._keys[cc.macro.KEY.left];
        var rightKey = self._keys[cc.macro.KEY.d] || self._keys[cc.macro.KEY.right];

        var dx = 0, dy = 0;
        // Vertical has priority — prevents diagonal movement
        if      (upKey)    dy =  spd;
        else if (downKey)  dy = -spd;
        else if (leftKey)  dx = -spd;
        else if (rightKey) dx =  spd;

        var moving = dx !== 0 || dy !== 0;
        if (self._anim) {
            self._anim.fps = running ? 18 : 14;
            if      (dy > 0) self._anim.setDirection('up');
            else if (dy < 0) self._anim.setDirection('down');
            else if (dx < 0) self._anim.setDirection('left');
            else if (dx > 0) self._anim.setDirection('right');
            self._anim.setMoving(moving);
        }

        // Move with collision check (try X and Y separately for wall-sliding)
        var hW = self._mapW / 2 - 20, hH = self._mapH / 2 - 20;
        var newX = Math.max(-hW, Math.min(hW, self._px + dx));
        var newY = Math.max(-hH, Math.min(hH, self._py + dy));
        if (!self._collidesWithMap(newX, self._py)) self._px = newX;
        if (!self._collidesWithMap(self._px, newY)) self._py = newY;
        self._playerNode.setPosition(self._px, self._py);

        // ── Dog companion (Niu Pai) — only after she joins at XCB ──
        if (self._dogNode && StoryState.dogJoined) {
            if (!self._dogNode.active) {
                // She just joined — appear at the player's side; the XCB dog leaves
                self._dogNode.active = true;
                self._dogX = self._px - 32;
                self._dogY = self._py - 4;
                self._hideNpc('niupai');
            }
            var tx = self._px - 32, ty = self._py - 4;   // walk on the player's left
            var dxd = tx - self._dogX, dyd = ty - self._dogY;
            var k   = Math.min(1, 12 * dt);
            var prevX = self._dogX, prevY = self._dogY;
            var ndx = self._dogX + dxd * k, ndy = self._dogY + dyd * k;
            // Respect collision zones, per-axis (same as the player)
            if (!self._collidesWithMap(ndx, self._dogY)) self._dogX = ndx;
            if (!self._collidesWithMap(self._dogX, ndy)) self._dogY = ndy;
            var dogMoving = (Math.abs(self._dogX - prevX) + Math.abs(self._dogY - prevY)) > 0.3;
            if (dogMoving) {
                if (Math.abs(dxd) > Math.abs(dyd)) self._dogAnim.setDirection(dxd > 0 ? 'right' : 'left');
                else                               self._dogAnim.setDirection(dyd > 0 ? 'up' : 'down');
            }
            self._dogAnim.setMoving(dogMoving);
            self._dogNode.setPosition(self._dogX, self._dogY);
        }

        // ── Camera — world node is scaled by ZOOM ─────────────
        // A child at (px,py) appears on screen at:
        //   screen = world.pos + (px,py) × ZOOM
        // → world.pos = -(px,py) × ZOOM  (player at screen centre)
        // Clamp so no black void: map edges must stay inside viewport.
        // Recompute viewport each frame so the clamp follows window resizes.
        var vis = cc.view.getVisibleSize();
        var vHW = vis.width / 2, vHH = vis.height / 2;
        var sHW = self._mapW / 2 * ZOOM, sHH = self._mapH / 2 * ZOOM;

        var worldX = sHW <= vHW ? 0 : Math.max(vHW - sHW, Math.min(sHW - vHW, -self._px * ZOOM));
        var worldY = sHH <= vHH ? 0 : Math.max(vHH - sHH, Math.min(sHH - vHH, -self._py * ZOOM));
        self._world.setPosition(worldX, worldY);

        // One-shot diagnostic — check CC Console after 2 seconds of play
        if (!self._camLogged) {
            if (!self._camTimer) self._camTimer = 0;
            self._camTimer += dt;
            if (self._camTimer >= 2) {
                self._camLogged = true;
                cc.log('[CAM] mapW=' + self._mapW + ' ZOOM=' + ZOOM +
                       ' sHW=' + sHW + ' vHW=' + vHW +
                       ' px=' + Math.round(self._px) +
                       ' worldX=' + Math.round(worldX) +
                       ' mapRightEdge=' + Math.round(worldX + sHW));
            }
        }

        // ── Zone detection — player centre inside an InteractZone rect ──
        var nearZone = null;
        var minDist  = Infinity;
        for (var i = 0; i < self._zones.length; i++) {
            var z  = self._zones[i];
            var hw = Math.abs(z.w) / 2, hh = Math.abs(z.h) / 2;
            if (self._px > z.x - hw && self._px < z.x + hw &&
                self._py > z.y - hh && self._py < z.y + hh) {
                var dist = Math.hypot(self._px - z.x, self._py - z.y);
                if (dist < minDist) {
                    minDist  = dist;
                    nearZone = z;
                }
            }
        }

        self._activeZone = nearZone;

        // ── NPC detection (talk zones) ─────────────────────────
        var nearNpc = null, npcMin = Infinity;
        for (var n = 0; n < self._npcs.length; n++) {
            var np  = self._npcs[n];
            if (!np.node || !np.node.isValid || !np.node.active) continue;  // skip removed NPCs
            var nx  = np.node.x, ny = np.node.y;       // live position (NPCs may roam)
            var nhw = Math.abs(np.w) / 2, nhh = Math.abs(np.h) / 2;
            if (self._px > nx - nhw && self._px < nx + nhw &&
                self._py > ny - nhh && self._py < ny + nhh) {
                var nd = Math.hypot(self._px - nx, self._py - ny);
                if (nd < npcMin) { npcMin = nd; nearNpc = np; }
            }
        }
        self._activeNpc = nearNpc;

        // Auto-play the story beat the first time you reach an NPC this session
        if (nearNpc && !self._npcAutoTriggered[nearNpc.npcId]) {
            self._npcAutoTriggered[nearNpc.npcId] = true;
            self.node.emit('npc-interact', nearNpc.npcId);
        }

        // ── Hint display (NPC takes priority over legacy zones) ─
        var hintText = null, locText = null;
        if (nearNpc) {
            var nm   = NPC_NAMES[nearNpc.npcId] || 'them';
            hintText = '[E] Talk to ' + nm;
            locText  = nm;
        } else if (nearZone) {
            hintText = '[E] Enter ' + nearZone.label;
            locText  = nearZone.label;
        }

        if (hintText) {
            self._hintLabel.string = hintText;
            self._locLabel.string  = locText;
            self._hintNode.opacity = 255;
            self._locNode.opacity  = 255;
            var bg = self._hintBg;
            bg.clear();
            bg.fillColor = cc.color(0, 0, 0, 160);
            bg.roundRect(-120, -14, 240, 28, 6);
            bg.fill();
        } else {
            self._hintNode.opacity = 0;
            self._locNode.opacity  = 0;
        }
    },
});
