'use strict';

const GameManager = (() => {

  let state = {};

  function reset() {
    state = {
      hp: 4,               // 4-slot HP bar
      hearts: 0,           // heart fragments 0-4
      coins: 0,
      affinity: 0,         // 0-100

      professorDone: false,
      niupaiDone: false,
      fatherDone: false,
      girlMet: false,      // met girl NPC on map
      girlDone: false,     // completed final mini-game

      // dog companion
      dogUnlocked: false,  // follows player after first girl meeting
      fedDogCount: 0,      // times fed Niu Pai on map
      dogAsked: 0,         // times dog asked for food (throttle)

      // easter egg: secret bush
      foundEasterEgg: false,

      neverRomantic: true,
    };
  }

  function addHeart() {
    if (state.hearts < 4) state.hearts++;
    HUDController.update();
  }

  function loseHP() {
    if (state.hp > 0) state.hp--;
    HUDController.update();
    if (state.hp <= 0) {
      HUDController.showToast('💀 No HP left! Heading to ending...');
      setTimeout(() => EndingManager.resolve(), 1500);
    }
  }

  function getHearts()  { return state.hearts; }
  function getHP()      { return state.hp; }

  function addCoins(n) { state.coins += n; HUDController.update(); }
  function getCoins()  { return state.coins; }

  function changeAffinity(delta) {
    state.affinity = Math.max(0, Math.min(100, state.affinity + delta));
    if (delta > 0) state.neverRomantic = false;
    HUDController.update();
  }

  function completeMiniGame(name) {
    if (name === 'professor' && !state.professorDone) {
      state.professorDone = true; addHeart();
    } else if (name === 'niupai' && !state.niupaiDone) {
      state.niupaiDone = true; addHeart();
    } else if (name === 'father' && !state.fatherDone) {
      state.fatherDone = true; addHeart();
    } else if (name === 'girl' && !state.girlDone) {
      state.girlDone = true; addHeart();
    }
  }

  function meetGirl() {
    if (!state.girlMet) {
      state.girlMet = true;
      state.dogUnlocked = true;
    }
  }

  function feedDog() {
    state.fedDogCount++;
    HUDController.showToast(`🌭 Niu Pai: "Woof! Thank you!" (${state.fedDogCount}/3)`);
    if (state.fedDogCount >= 3) {
      setTimeout(() => EndingManager.show('ending_niupai'), 1200);
    }
  }

  // Called from MiniGame_NiuPai when dropping sausage decoy
  function feedNiupai() {
    state.fedDogCount++;
    if (state.fedDogCount >= 3) {
      setTimeout(() => EndingManager.show('ending_niupai'), 2000);
    }
  }

  function findEasterEgg() {
    if (!state.foundEasterEgg) {
      state.foundEasterEgg = true;
      HUDController.showToast('🌟 You found something hidden...!', 3000);
      setTimeout(() => EndingManager.show('ending_secret'), 2000);
    }
  }

  function getState() { return { ...state }; }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById('screen-' + id);
    if (el) el.classList.add('active');
    if (typeof AudioManager !== 'undefined') AudioManager.onScreenChange(id);
  }

  function startNewGame() {
    reset();
    HUDController.update();
    showScreen('game');
    PlayerController.init();
    // Intro dialogue after brief delay
    setTimeout(() => {
      DialogueSystem.start('intro_girl', null);
    }, 300);
  }

  function backToTitle() { showScreen('title'); }
  function showCredits() { HUDController.showToast('LOVE.EXE — Group 23 | SS2026 NTHU ♥'); }

  return {
    reset, startNewGame, backToTitle, showCredits, showScreen,
    addHeart, loseHP, getHearts, getHP,
    addCoins, getCoins,
    changeAffinity, getAffinity: () => state.affinity,
    completeMiniGame,
    meetGirl, feedDog, feedNiupai, findEasterEgg,
    getState,
  };
})();

window.GameManager = GameManager;
window.Game = GameManager;
