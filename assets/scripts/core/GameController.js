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

var StoryState   = require('StoryState');
var GameFlow     = require('GameFlow');      // the 5-game boss rush (scene-flow module)
var EndingScreen = require('EndingScreen');  // game-over / finale overlays
var ScreenTransition = require('ScreenTransition');
var Account      = require('Account');       // cloud save after every recorded result

// XiaoChiBu.fire is now fully wired (NiuPaiMinigame component + assets), pulled from
// the XiaoChiBu_Game branch — so the Niu Pai NPC launches the REAL dog minigame as
// its own scene. (Set back to false to fall back to the dialogue placeholder.)
var NIUPAI_SCENE_READY = true;

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

        // Opening cutscene / returning from a minigame
        self.scheduleOnce(function () {
            // Out of hearts already? Re-show game over (covers a reload while dead).
            if (StoryState.gameOver) { EndingScreen.showGameOver(); return; }
            if (!self._dm) return;
            if (StoryState.lastResult) {
                // Returned from a scene-minigame (typing / dog) → record result + score
                var r = StoryState.lastResult;
                StoryState.lastResult = null;
                if (r.win) {
                    StoryState.markComplete(r.key);
                    StoryState.addScore(r.key, r.score);   // only count cleared runs
                    if (r.key === 'niupai') StoryState.dogJoined = true;  // dog now follows
                    self._playPostWin(r.key);
                } else if (r.key === 'niupai' && r.reason === 'incorrect_food') {
                    self._playNiuPaiTryAgain();
                } else {
                    // a full-minigame loss empties one heart; 0 hearts → game over
                    if (StoryState.recordFail(r.key)) { EndingScreen.showGameOver(); return; }
                    self._dm.play(r.key + '_post_lose');
                }
                Account.saveProgress();   // checkpoint: scene-minigame result recorded
            } else if (StoryState.finalCleared && !StoryState.flags.endingShown) {
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

    _playPostWin: function (key) {
        var self = this;
        if (key !== 'niupai') {
            self._say(key + '_post_win');
            return;
        }

        self._setNiuPaiCompanionJoined(true);
        self._say('niupai_post_game', function () {
            ScreenTransition.fadeOutIn(function () {
                self._teleportPlayerNearMei();
            }, function () {
                self._say('niupai_post_mei_correct');
            });
        });
    },

    _playNiuPaiTryAgain: function () {
        var self = this;
        self._setNiuPaiCompanionJoined(true);
        self._say('niupai_post_game', function () {
            ScreenTransition.fadeOutIn(function () {
                self._teleportPlayerNearMei();
            }, function () {
                self._say('niupai_post_mei_wrong', function () {
                    self._setNiuPaiCompanionJoined(false);
                    Account.saveProgress();   // re-checkpoint: the cutscene dog has left again
                });
            });
        });
    },

    _setNiuPaiCompanionJoined: function (joined) {
        StoryState.dogJoined = !!joined;
        var mainGame = this.mainGameNode ? this.mainGameNode.getComponent('MainGame') : null;
        if (mainGame && mainGame.setNiuPaiCompanionJoined) {
            mainGame.setNiuPaiCompanionJoined(!!joined);
        }
    },

    _teleportPlayerNearMei: function () {
        var mainGame = this.mainGameNode ? this.mainGameNode.getComponent('MainGame') : null;
        if (!mainGame || !mainGame.teleportPlayerNearNpc) {
            cc.warn('[GameController] MainGame teleportPlayerNearNpc unavailable.');
            return;
        }
        mainGame.teleportPlayerNearNpc('mei', cc.v2(0, -100));
    },

    _teleportPlayerNearNiuPai: function () {
        var mainGame = this.mainGameNode ? this.mainGameNode.getComponent('MainGame') : null;
        if (!mainGame || !mainGame.teleportPlayerNearNpc) {
            cc.warn('[GameController] MainGame teleportPlayerNearNpc unavailable.');
            return;
        }
        mainGame.teleportPlayerNearNpc('niupai', cc.v2(0, -80));
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
                // Typing game (TYPE BLAST) — loads as its own scene
                self._runSceneChallenge('professor', 'professor_pre', 'professor_done', 'Typing_game');
                break;
            case 'niupai':
                // Real dog game once XiaoChiBu is wired; safe placeholder until then.
                if (NIUPAI_SCENE_READY) {
                    self._runNiuPaiSceneChallenge();
                } else {
                    self._runNiupai();
                }
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
                        StoryState.addScore(key, score);   // only count cleared runs
                        self._say(winId);
                    } else {
                        // losing a whole minigame empties one heart; 0 hearts → game over
                        if (StoryState.recordFail(key)) { EndingScreen.showGameOver(); return; }
                        self._say(loseId);
                    }
                    Account.saveProgress();   // checkpoint: node-minigame result recorded
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

    // Scene-based challenge: pre-dialogue → ready prompt → load the game's own scene.
    // The game reports back via StoryState.lastResult; onLoad (below) plays the post line.
    _runSceneChallenge: function (key, preId, doneId, sceneName) {
        var self = this;
        if (StoryState.completed[key]) { self._say(doneId); return; }
        self._say(preId, function () {
            self._say('ready_to_play', function () {
                cc.director.loadScene(sceneName);
            });
        });
    },

    _runNiuPaiSceneChallenge: function () {
        var self = this;
        if (StoryState.completed.niupai) { self._say('niupai_done'); return; }

        var startGame = function () {
            self._say('niupai_pre_game', function () {
                self._say('ready_to_play', function () {
                    cc.director.loadScene('XiaoChiBu');
                });
            });
        };

        if (StoryState.seen['niupai_pre_mei']) {
            startGame();
            return;
        }

        ScreenTransition.fadeOutIn(function () {
            self._teleportPlayerNearMei();
        }, function () {
            self._say('niupai_pre_mei', function () {
                ScreenTransition.fadeOutIn(function () {
                    self._teleportPlayerNearNiuPai();
                }, startGame);
            });
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
        // Placeholder for the not-yet-wired XiaoChiBu game: greet, then a deliberate
        // "ready?" confirm so it never auto-completes just by walking past the dog.
        self._say('niupai_pre_game', function () {
            self._say('ready_to_play', function () {
                StoryState.markComplete('niupai');
                StoryState.dogJoined = true;
                StoryState.addScore('niupai', 0);
                self._playPostWin('niupai');
            });
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
        Account.saveProgress();   // dogFeeds counts toward the easter-egg ending
    },
});
