'use strict';

/**
 * DialogueSystem — reads dialogue data from game-data.json,
 * renders lines and choices in #dialogue-box, tracks affinity.
 */
const DialogueSystem = (() => {

  let dialogueData = null;
  let currentLines = [];
  let lineIndex = 0;
  let onDoneCallback = null;
  let active = false;
  let _currentDialogueId = '';

  // Load JSON once
  async function loadData() {
    if (dialogueData) return;
    try {
      const res = await fetch('assets/resources/game-data.json');
      const json = await res.json();
      dialogueData = json.dialogues;
    } catch(e) {
      console.warn('Could not load game-data.json, using fallback');
      dialogueData = {};
    }
  }

  function start(dialogueId, onDone) {
    onDoneCallback = onDone || null;
    active = true;
    PlayerController.setDialogueOpen(true);

    if (!dialogueData) {
      loadData().then(() => _startDialogue(dialogueId));
    } else {
      _startDialogue(dialogueId);
    }
  }

  function _startDialogue(dialogueId) {
    _currentDialogueId = dialogueId;
    const entry = dialogueData[dialogueId];
    if (!entry) {
      console.warn('Dialogue not found:', dialogueId);
      close();
      return;
    }
    currentLines = entry.lines || [];
    lineIndex = 0;
    showLine();
  }

  function showLine() {
    if (lineIndex >= currentLines.length) {
      close();
      return;
    }

    const line = currentLines[lineIndex];
    const box  = document.getElementById('dialogue-box');
    const spk  = document.getElementById('dialogue-speaker');
    const txt  = document.getElementById('dialogue-text');
    const cho  = document.getElementById('dialogue-choices');
    const nxt  = document.getElementById('dialogue-next');

    box.classList.add('active');
    spk.textContent = line.speaker || '';
    txt.textContent = line.text || '';
    cho.innerHTML = '';

    if (line.choices && line.choices.length) {
      nxt.style.display = 'none';
      line.choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'choice-btn';
        btn.textContent = choice.text;
        btn.onclick = () => pickChoice(choice);
        cho.appendChild(btn);
      });
    } else {
      nxt.style.display = 'block';
    }
  }

  function pickChoice(choice) {
    if (choice.affinityDelta) {
      GameManager.changeAffinity(choice.affinityDelta);
    }
    if (choice.jumpTo) {
      _currentDialogueId = choice.jumpTo;
      start(choice.jumpTo, onDoneCallback);
    } else {
      lineIndex++;
      showLine();
    }
  }

  function advance() {
    if (!active) return;
    const line = currentLines[lineIndex];
    if (line && line.choices && line.choices.length) return; // wait for choice
    lineIndex++;
    showLine();
  }

  function close() {
    active = false;
    PlayerController.setDialogueOpen(false);
    const box = document.getElementById('dialogue-box');
    box.classList.remove('active');
    document.getElementById('dialogue-choices').innerHTML = '';

    // After intro_girl finishes, unlock dog + girl NPC on map
    if (_currentDialogueId === 'intro_girl_bold' || _currentDialogueId === 'intro_girl_shy') {
      PlayerController.onGirlMet();
    }

    if (onDoneCallback) {
      const cb = onDoneCallback;
      onDoneCallback = null;
      cb();
    }
  }

  // Pre-load on module init
  loadData();

  return { start, advance, close };
})();

window.DialogueSystem = DialogueSystem;
