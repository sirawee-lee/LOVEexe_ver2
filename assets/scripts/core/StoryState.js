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
    },

    addAffinity: function (delta) {
        this.affinity += (delta || 0);
        if (delta > 0) this.romanticChoices++;
    },

    markComplete: function (game) {
        if (this.completed.hasOwnProperty(game)) this.completed[game] = true;
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
};

module.exports = StoryState;
