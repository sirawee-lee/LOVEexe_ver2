'use strict';

/**
 * AudioManager — BGM scene switching + SFX one-shots.
 * BGM map:  title → bgm_title, world → bgm_main, romance → bgm_romance,
 *           minigame → bgm_minigame, tense → bgm_tense, ending → bgm_ending
 */
const AudioManager = (() => {

  const BGM_FILES = {
    title:    'assets/audio/bgm/bgm_title.mp3',
    world:    'assets/audio/bgm/bgm_main.mp3',
    romance:  'assets/audio/bgm/bgm_romance.mp3',
    minigame: 'assets/audio/bgm/bgm_minigame.mp3',
    tense:    'assets/audio/bgm/bgm_tense.mp3',
    ending:   'assets/audio/bgm/bgm_ending.mp3',
  };

  const SFX_FILES = {
    click:   'assets/audio/sfx/click.mp3',
    correct: 'assets/audio/sfx/correct.mp3',
    wrong:   'assets/audio/sfx/wrong.mp3',
    pickup:  'assets/audio/sfx/pickup.mp3',
    heart:   'assets/audio/sfx/heart.mp3',
    laser:   'assets/audio/sfx/laser.mp3',
  };

  let bgmEl      = null;
  let currentBGM = null;
  let muted      = false;
  let bgmVol     = 0.35;
  let sfxVol     = 0.7;

  // Pre-load SFX into Audio objects
  const sfxCache = {};
  Object.entries(SFX_FILES).forEach(([k, v]) => {
    const a = new Audio(v);
    a.preload = 'auto';
    sfxCache[k] = a;
  });

  function _ensureBGM() {
    if (!bgmEl) {
      bgmEl = new Audio();
      bgmEl.loop   = true;
      bgmEl.volume = bgmVol;
    }
  }

  function playBGM(key) {
    if (muted) return;
    if (currentBGM === key) return;
    _ensureBGM();
    const src = BGM_FILES[key];
    if (!src) return;
    currentBGM   = key;
    bgmEl.src    = src;
    bgmEl.volume = 0;
    bgmEl.play().catch(() => {});

    // Fade in
    let v = 0;
    const fade = setInterval(() => {
      v = Math.min(v + 0.02, bgmVol);
      bgmEl.volume = v;
      if (v >= bgmVol) clearInterval(fade);
    }, 60);
  }

  function stopBGM(onDone) {
    if (!bgmEl) { if (onDone) onDone(); return; }
    let v = bgmEl.volume;
    const fade = setInterval(() => {
      v = Math.max(v - 0.04, 0);
      bgmEl.volume = v;
      if (v <= 0) {
        clearInterval(fade);
        bgmEl.pause();
        currentBGM = null;
        if (onDone) onDone();
      }
    }, 40);
  }

  function playSFX(key) {
    if (muted) return;
    const orig = sfxCache[key];
    if (!orig) return;
    // Clone so rapid plays don't cut each other off
    const a = orig.cloneNode();
    a.volume = sfxVol;
    a.play().catch(() => {});
  }

  function toggleMute() {
    muted = !muted;
    if (bgmEl) bgmEl.volume = muted ? 0 : bgmVol;
    return muted;
  }

  // Called by GameManager.showScreen to auto-switch BGM
  function onScreenChange(screenId) {
    if (screenId === 'title')     playBGM('title');
    else if (screenId === 'game') playBGM('world');
    else if (screenId === 'ending') stopBGM(() => playBGM('ending'));
  }

  // Called before minigame starts to switch to appropriate BGM
  function onMiniGameStart(gameId) {
    if (gameId === 'professor' || gameId === 'finalboss') playBGM('tense');
    else playBGM('minigame');
  }

  function onMiniGameEnd() { playBGM('world'); }

  // Romance BGM when near / talking to Mei
  function onRomance() { playBGM('romance'); }

  return { playBGM, stopBGM, playSFX, toggleMute, onScreenChange, onMiniGameStart, onMiniGameEnd, onRomance };
})();

window.AudioManager = AudioManager;
