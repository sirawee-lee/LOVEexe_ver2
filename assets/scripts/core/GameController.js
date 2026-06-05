'use strict';

// GameController — sits on Canvas. Drives the story: listens for 'npc-interact'
// from MainGame, plays the right dialogue, launches the matching minigame, then
// plays the post-result dialogue and records progress in StoryState.
//
// Mapping (corrected):
//   father    NPC → Osu rhythm game   (OsuMinigame on osuNode)
//   professor NPC → dress-up/catch    (FatherMinigame on fatherNode)
//   niupai    NPC → market dash       (not built → resolved in dialogue)
//   mei       NPC → lake finale       (not built → placeholder; LOCKED until the 3 are won)

var StoryState = require('StoryState');
var GameFlow   = require('GameFlow');   // the 5-game boss rush (scene-flow module)

cc.Class({
    extends: cc.Component,

    properties: {
        // Drag each node into these slots in the CC editor
        mainGameNode:        { default: null, type: cc.Node },  // has MainGame
        dialogueManagerNode: { default: null, type: cc.Node },  // has DialogueManager
        osuNode:             { default: null, type: cc.Node },  // has OsuMinigame  (father's rhythm test)
        fatherNode:          { default: null, type: cc.Node },  // has FatherMinigame (professor's dress-up/catch)
        niuPaiNode:          { default: null, type: cc.Node },  // optional "coming soon" node (legacy, unused)
    },

    onLoad: function () {
        var self = this;

        if (self.osuNode)    self.osuNode.active    = false;
        if (self.fatherNode) self.fatherNode.active = false;
        if (self.niuPaiNode) self.niuPaiNode.active = false;

        self._dm = self.dialogueManagerNode
            ? self.dialogueManagerNode.getComponent('DialogueManager')
            : null;
        if (!self._dm) cc.warn('[GameController] DialogueManager node not assigned');

        if (self.mainGameNode) {
            self.mainGameNode.on('npc-interact', function (npcId) {
                self._onNpcInteract(npcId);
            }, self);
            self.mainGameNode.on('feed-dog', function () {
                self._feedDog();
            }, self);
        }

        // Opening cutscene — meet Mei once at game start
        self.scheduleOnce(function () {
            if (!self._dm) return;
            if (StoryState.finalCleared && !StoryState.flags.endingShown) {
                StoryState.flags.endingShown = true;
                self._dm.play('mei_after');         // finale payoff after the boss returns
            } else if (!StoryState.seen['intro_girl']) {
                self._dm.play('intro_girl');        // opening cutscene
            }
        }, 0.8);
    },

    onDestroy: function () {
        if (this.mainGameNode) {
            this.mainGameNode.off('npc-interact', null, this);
            this.mainGameNode.off('feed-dog', null, this);
        }
    },

    // ── Dialogue helper ───────────────────────────────────────
    _say: function (id, onDone) {
        if (this._dm) this._dm.play(id, onDone);
        else if (onDone) onDone();
    },

    // ── NPC interaction router ────────────────────────────────
    _onNpcInteract: function (npcId) {
        var self = this;
        switch (npcId) {
            case 'father':
                self._runChallenge('father', 'father_pre', 'father_post_win', 'father_post_lose', 'father_done',
                    function (cb) { self._runOsu(cb); });
                break;
            case 'professor':
                // TEMP: dress-up minigame not ready — skip straight through via dialogue
                // (like Niu Pai). To re-enable, restore the _runChallenge(... _runDressup) call below.
                self._runChallengeSkip('professor', 'professor_pre', 'professor_post_win', 'professor_done');
                // self._runChallenge('professor', 'professor_pre', 'professor_post_win', 'professor_post_lose', 'professor_done',
                //     function (cb) { self._runDressup(cb); });
                break;
            case 'niupai':
                self._runNiupai();
                break;
            case 'mei':
                self._runMei();
                break;
            default:
                cc.warn('[GameController] unknown npcId: ' + npcId);
        }
    },

    // ── Generic challenge flow: pre → minigame → post ─────────
    _runChallenge: function (key, preId, winId, loseId, doneId, launch) {
        var self = this;
        if (StoryState.completed[key]) { self._say(doneId); return; }
        self._say(preId, function () {
            self._say('ready_to_play', function () {     // "Ready to play?" → single [Play] button
                launch(function (win, score) {
                    if (win) {
                        StoryState.markComplete(key);
                        self._say(winId);
                    } else {
                        self._say(loseId);
                    }
                });
            });
        });
    },

    // TEMP skip: complete a challenge via dialogue only (its real minigame isn't ready yet)
    _runChallengeSkip: function (key, preId, winId, doneId) {
        var self = this;
        if (StoryState.completed[key]) { self._say(doneId); return; }
        self._say(preId, function () {
            StoryState.markComplete(key);
            self._say(winId);
        });
    },

    // ── Minigame launchers (activate node, run, restore overworld) ──
    _runOsu: function (cb) {
        var self = this;
        var comp = self.osuNode ? self.osuNode.getComponent('OsuMinigame') : null;
        if (!comp) {
            // Misconfigured — surface it, but DON'T report it as a player loss
            // (that would leave the challenge permanently uncompletable).
            cc.error('[GameController] osuNode / OsuMinigame missing — cannot launch');
            self._say('minigame_unavailable');
            return;
        }
        if (self.mainGameNode) self.mainGameNode.active = false;
        self.osuNode.active = true;
        comp.startGame(function (win, score) {
            self.osuNode.active = false;
            if (self.mainGameNode) self.mainGameNode.active = true;
            cb(win, score);
        });
    },

    _runDressup: function (cb) {
        var self = this;
        var comp = self.fatherNode ? self.fatherNode.getComponent('FatherMinigame') : null;
        if (!comp) {
            cc.error('[GameController] fatherNode / FatherMinigame missing — cannot launch');
            self._say('minigame_unavailable');
            return;
        }
        if (self.mainGameNode) self.mainGameNode.active = false;
        self.fatherNode.active = true;
        comp.startGame(function (win, score) {
            self.fatherNode.active = false;
            if (self.mainGameNode) self.mainGameNode.active = true;
            cb(win, score);
        });
    },

    // ── Niu Pai (market dash not built yet) → resolve in dialogue ──
    _runNiupai: function () {
        var self = this;
        if (StoryState.completed.niupai) { self._say('niupai_done'); return; }
        self._say('niupai_pre', function () {
            // Rescue succeeded — record it up front (robust to dialogue issues),
            // then play the payoff. Niu Pai now follows the player.
            StoryState.markComplete('niupai');
            StoryState.dogJoined = true;
            self._say('niupai_post_win');
        });
    },

    // ── Mei / lake finale (gated, placeholder) ────────────────
    _runMei: function () {
        var self = this;
        if (!StoryState.seen['intro_girl']) { self._say('intro_girl', function () { self._runMei(); }); return; }
        if (StoryState.finalCleared)        { self._say('mei_after'); return; }
        if (!StoryState.isFinalUnlocked()) {
            // First time = the full quest reminder; afterwards = light roaming chatter
            self._say(StoryState.seen['mei_locked'] ? 'mei_roam' : 'mei_locked');
            return;
        }
        // Unlocked → romantic lead-in, then launch the 5-game boss rush.
        self._say('mei_pre', function () {
            self._say('ready_to_play', function () {
                GameFlow.startBoss();   // loadScene → first minigame (needle); chains all 5
            });
        });
    },

    // ── Feed Niu Pai ──────────────────────────────────────────
    _feedDog: function () {
        StoryState.dogFeeds++;
        this._say(StoryState.dogFeeds <= 1 ? 'dog_feed_first' : 'dog_feed_again');
    },
});
