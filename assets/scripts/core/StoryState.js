'use strict';

// StoryState — a single shared object holding all story progress. The whole
// game runs in one scene (overworld + minigames are nodes toggled active), so
// this in-memory singleton persists for the entire play session.
//
// Use from any script:   var StoryState = require('StoryState');
// Then read/update:       StoryState.addAffinity(10);  StoryState.markComplete('father');

var StoryState = {
    affinity: 0,                  // Mei's affection — raised/lowered by choices
    completed: { father: false, professor: false, niupai: false },
    dogFeeds: 0,                  // times you fed Niu Pai → easter-egg ending
    dogJoined: false,             // is Niu Pai currently following you
    romanticChoices: 0,           // # of "pink" (positive) choices picked
    choices: {},                  // dialogueId -> chosen index
    seen: {},                     // dialogueId -> true (already played once)
    flags: {},                    // misc story flags (e.g. secret bush found)
    finalCleared: false,          // beat the lake final boss
    dialogueActive: false,        // true while a dialogue is on screen — overworld input gate
    lastResult: null,             // {key, win, score} a scene-minigame sets before returning to MainScene

    // ── 3-heart life system (shared by osu / typing / niupai prerequisite games) ──
    lives: 3,                     // start with 3 hearts; each FULL-minigame loss empties one
    gameOver: false,              // true once lives hit 0 (routes to the game-over screen)
    lastFailGame: null,           // which game cost the last heart (debug/flavour)

    // ── cross-game score tracking (summed on the ending/leaderboard screen) ──
    scores: {},                   // key -> numeric score (father / professor / niupai / boss)

    // ── ending routing (read by EndingScreen) ──
    endingRoute: null,            // 'true_love' | 'niupai' — which finale the player chose

    // ── Hero Mode — chosen on the title screen, persisted: no heart loss, not ranked ──
    heroMode: (function () { try { return cc.sys.localStorage.getItem('loveexe_hero_mode') === '1'; } catch (e) { return false; } })(),
    usedHero: false,              // RUN flag: true once any part of this run was played in Hero Mode
                                  // (saved with the run, so toggling Hero off later can't sneak a
                                  //  hero-assisted run onto the leaderboard)

    reset: function () {
        this.affinity        = 0;
        this.completed       = { father: false, professor: false, niupai: false };
        this.dogFeeds        = 0;
        this.dogJoined       = false;
        this.romanticChoices = 0;
        this.choices         = {};
        this.seen            = {};
        this.flags           = {};
        this.finalCleared    = false;
        this.dialogueActive  = false;
        this.lastResult      = null;
        this.lives           = 3;
        this.gameOver        = false;
        this.lastFailGame    = null;
        this.scores          = {};
        this.endingRoute     = null;
        // heroMode is a persisted SETTING, not run progress — re-read it (don't wipe)
        try { this.heroMode = cc.sys.localStorage.getItem('loveexe_hero_mode') === '1'; } catch (e) { this.heroMode = false; }
        this.usedHero        = this.heroMode;   // a fresh run started in Hero Mode is hero-tainted from the start
    },

    // Toggle Hero Mode and persist it across reloads.
    setHeroMode: function (on) {
        this.heroMode = !!on;
        try { cc.sys.localStorage.setItem('loveexe_hero_mode', on ? '1' : '0'); } catch (e) {}
    },

    addAffinity: function (delta) {
        this.affinity += (delta || 0);
        if (delta > 0) this.romanticChoices++;
    },

    markComplete: function (game) {
        if (this.completed.hasOwnProperty(game)) this.completed[game] = true;
    },

    // Empty one heart on a FULL-minigame failure (osu / typing / niupai).
    // Returns true if that was the last heart, so the caller can route to the
    // game-over screen. Never drops below 0; ignores extra fails once dead.
    recordFail: function (game) {
        if (this.heroMode) { this.usedHero = true; return false; }   // HERO MODE: hearts never drop, never game-over
        if (this.gameOver) return true;
        this.lives = Math.max(0, this.lives - 1);
        this.lastFailGame = game || null;
        if (this.lives <= 0) { this.gameOver = true; return true; }
        return false;
    },

    // Record a challenge's best numeric score (overwrites earlier attempts so a
    // retry's score replaces a worse one rather than double-counting).
    addScore: function (key, score) {
        score = score || 0;
        if (!this.scores[key] || score > this.scores[key]) this.scores[key] = score;
    },

    // Sum of every recorded challenge score — shown on the win/leaderboard screen.
    totalScore: function () {
        var t = 0;
        for (var k in this.scores) {
            if (this.scores.hasOwnProperty(k)) t += (this.scores[k] || 0);
        }
        return t;
    },

    challengesDone: function () {
        return (this.completed.father    ? 1 : 0) +
               (this.completed.professor ? 1 : 0) +
               (this.completed.niupai    ? 1 : 0);
    },

    // The lake final boss only unlocks once all three challenges are won
    isFinalUnlocked: function () {
        return this.completed.father && this.completed.professor && this.completed.niupai;
    },

    // ── cloud-save snapshot (used by Account.saveProgress / loadProgress) ──
    // Captures run PROGRESS only — transient fields (dialogueActive, lastResult)
    // and persisted settings (heroMode) are deliberately excluded.
    serialize: function () {
        return {
            v: 1,
            affinity:        this.affinity,
            completed:       { father: !!this.completed.father, professor: !!this.completed.professor, niupai: !!this.completed.niupai },
            dogFeeds:        this.dogFeeds,
            dogJoined:       this.dogJoined,
            romanticChoices: this.romanticChoices,
            choices:         this.choices,
            seen:            this.seen,
            flags:           this.flags,
            finalCleared:    this.finalCleared,
            lives:           this.lives,
            gameOver:        this.gameOver,
            lastFailGame:    this.lastFailGame,
            scores:          this.scores,
            endingRoute:     this.endingRoute,
            usedHero:        this.usedHero || this.heroMode,   // checkpointing while Hero is on taints the run
        };
    },

    // Restore a serialize() snapshot (CONTINUE from the main menu). Returns
    // false for garbage input so the caller can fall back to a fresh start.
    hydrate: function (s) {
        if (!s || typeof s !== 'object' || !s.completed) return false;
        this.reset();   // clean baseline (also re-reads the heroMode setting)
        this.affinity        = s.affinity || 0;
        this.completed       = { father: !!s.completed.father, professor: !!s.completed.professor, niupai: !!s.completed.niupai };
        this.dogFeeds        = s.dogFeeds || 0;
        this.dogJoined       = !!s.dogJoined;
        this.romanticChoices = s.romanticChoices || 0;
        this.choices         = s.choices || {};
        this.seen            = s.seen || {};
        this.flags           = s.flags || {};
        this.finalCleared    = !!s.finalCleared;
        this.lives           = (typeof s.lives === 'number') ? Math.max(0, Math.min(3, s.lives)) : 3;
        this.gameOver        = !!s.gameOver;
        this.lastFailGame    = s.lastFailGame || null;
        this.scores          = s.scores || {};
        this.endingRoute     = s.endingRoute || null;
        this.usedHero        = !!s.usedHero || this.heroMode;
        return true;
    },
};

module.exports = StoryState;
