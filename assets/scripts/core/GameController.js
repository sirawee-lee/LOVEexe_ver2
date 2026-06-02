'use strict';

// GameController — sits on Canvas, coordinates between the overworld
// and each minigame. Listens for 'launch-minigame' from MainGame,
// activates the right minigame node, then returns to the overworld when done.

cc.Class({
    extends: cc.Component,

    properties: {
        // Drag each node into these slots in the CC editor
        mainGameNode:   { default: null, type: cc.Node },   // has MainGame component
        fatherNode:     { default: null, type: cc.Node },   // has FatherMinigame component
        osuNode:        { default: null, type: cc.Node },   // has OsuMinigame component

        // "Coming soon" label — shown for unimplemented games
        niuPaiNode: { default: null, type: cc.Node },
    },

    // ── CC lifecycle ──────────────────────────────────────────
    onLoad: function () {
        var self = this;

        // Start with only the overworld active
        if (self.fatherNode)     self.fatherNode.active     = false;
        if (self.osuNode)        self.osuNode.active        = false;
        if (self.niuPaiNode) self.niuPaiNode.active = false;

        // Listen for the launch event emitted by MainGame
        if (self.mainGameNode) {
            self.mainGameNode.on('launch-minigame', function (game) {
                self._launchGame(game);
            }, self);
        }
    },

    onDestroy: function () {
        if (this.mainGameNode) {
            this.mainGameNode.off('launch-minigame', null, this);
        }
    },

    // ── Game launcher ─────────────────────────────────────────
    _launchGame: function (game) {
        var self = this;
        cc.log('[GameController] Launching: ' + game);

        // Hide overworld
        if (self.mainGameNode) self.mainGameNode.active = false;

        switch (game) {
            case 'father':
                self._runFather();
                break;
            case 'finalboss':
                self._runOsu();
                break;
            case 'niupai':
            case 'professor':
                self._showComingSoon(game);
                break;
            default:
                cc.log('[GameController] Unknown game: ' + game);
                self._returnToOverworld();
        }
    },

    _returnToOverworld: function () {
        var self = this;
        if (self.fatherNode)     self.fatherNode.active     = false;
        if (self.osuNode)        self.osuNode.active        = false;
        if (self.niuPaiNode) self.niuPaiNode.active = false;
        if (self.mainGameNode)   self.mainGameNode.active   = true;
    },

    // ── Father minigame (dress up) ────────────────────────────
    _runFather: function () {
        var self = this;
        if (!self.fatherNode) { self._returnToOverworld(); return; }
        self.fatherNode.active = true;
        var comp = self.fatherNode.getComponent('FatherMinigame');
        if (!comp) { self._returnToOverworld(); return; }
        comp.startGame(function (win, score) {
            cc.log('[Father] ' + (win ? 'WIN' : 'LOSE') + ' score=' + score);
            self._returnToOverworld();
        });
    },

    // ── Osu minigame (final boss) ─────────────────────────────
    _runOsu: function () {
        var self = this;
        if (!self.osuNode) { self._returnToOverworld(); return; }
        self.osuNode.active = true;
        var comp = self.osuNode.getComponent('OsuMinigame');
        if (!comp) { self._returnToOverworld(); return; }
        comp.startGame(function (win, score) {
            cc.log('[Osu] ' + (win ? 'WIN' : 'LOSE') + ' score=' + score);
            self._returnToOverworld();
        });
    },

    // ── Coming-soon stub ──────────────────────────────────────
    _showComingSoon: function (game) {
        var self = this;
        if (!self.niuPaiNode) { self._returnToOverworld(); return; }
        self.niuPaiNode.active = true;

        // Update the label inside the node if it has one
        var lbl = self.niuPaiNode.getComponentInChildren(cc.Label);
        if (lbl) lbl.string = game.toUpperCase() + ' minigame\ncoming soon!';

        // Auto-return after 2.5 seconds
        setTimeout(function () {
            self._returnToOverworld();
        }, 2500);
    },
});
