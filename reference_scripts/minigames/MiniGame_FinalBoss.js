'use strict';

/**
 * MiniGame_FinalBoss — "osu! Heart Beat"
 * OSU-style: circles appear at random positions with shrinking approach rings.
 * Click (or press SPACE for random) when the ring matches the circle edge.
 * 10 notes, need 7+ hits to win.
 */
const MiniGame_FinalBoss = (() => {

  const W = 700, H = 400;
  const TOTAL_NOTES   = 10;
  const NOTE_INTERVAL = 1600; // ms between notes
  const NOTE_RADIUS   = 28;
  const APPROACH_R_START = 80;
  const PERFECT_WINDOW   = 12;  // px tolerance
  const GOOD_WINDOW      = 26;

  let notes, hits, misses, score, gameActive;
  let animFrame, noteTimer;
  let noteIndex = 0;
  let activeNote = null;   // { x, y, born, approachR, judged, id }
  let lastJudge  = null;   // { text, color, timer, x, y }
  let clickHandler = null;
  let keyHandler   = null;
  let time = 0;

  // Pre-generated note positions (OSU-like placement)
  function genNotePositions() {
    const positions = [];
    const margin = 80;
    for (let i = 0; i < TOTAL_NOTES; i++) {
      positions.push({
        x: margin + Math.random() * (W - margin * 2),
        y: margin + Math.random() * (H - margin * 2),
      });
    }
    return positions;
  }

  let notePositions = [];

  function start() {
    notes = []; hits = 0; misses = 0; score = 0;
    gameActive = true;
    noteIndex = 0;
    activeNote = null;
    lastJudge  = null;
    time = 0;
    notePositions = genNotePositions();

    HUDController.setMiniGameTitle(
      'OSU! HEART BEAT ♥',
      'Click the circles when the ring hits the edge! [Click] or [SPACE]'
    );
    HUDController.updateMiniGameHUD(`Hits: 0/${TOTAL_NOTES}`, `Score: ${score}`, '♥ ♥ ♥');

    animFrame = requestAnimationFrame(renderLoop);
    scheduleNote();

    const canvas = document.getElementById('minigame-canvas');
    clickHandler = e => handleClick(e);
    keyHandler   = e => { if (e.code === 'Space') { e.preventDefault(); tapKey(); } };
    if (canvas) canvas.addEventListener('click', clickHandler);
    document.addEventListener('keydown', keyHandler);
  }

  function stop() {
    gameActive = false;
    clearTimeout(noteTimer);
    cancelAnimationFrame(animFrame);
    const canvas = document.getElementById('minigame-canvas');
    if (canvas && clickHandler) canvas.removeEventListener('click', clickHandler);
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    clickHandler = null; keyHandler = null;
  }

  function scheduleNote() {
    if (!gameActive) return;
    if (noteIndex >= TOTAL_NOTES) {
      // Wait for last note to finish then check end
      noteTimer = setTimeout(checkEnd, NOTE_INTERVAL + 800);
      return;
    }
    const pos = notePositions[noteIndex];
    activeNote = {
      x: pos.x,
      y: pos.y,
      born: performance.now(),
      approachR: APPROACH_R_START,
      judged: false,
      id: noteIndex,
    };
    noteIndex++;
    HUDController.updateMiniGameHUD(`Hits: ${hits}/${TOTAL_NOTES}`, `Score: ${score}`, '♥'.repeat(Math.max(0,hits)));
    noteTimer = setTimeout(scheduleNote, NOTE_INTERVAL);
  }

  function handleClick(e) {
    if (!gameActive || !activeNote || activeNote.judged) return;
    const canvas = document.getElementById('minigame-canvas');
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);

    // Check if clicked near the note circle
    const dist = Math.hypot(mx - activeNote.x, my - activeNote.y);
    if (dist <= NOTE_RADIUS + GOOD_WINDOW + 10) {
      // Clicked in the right area — now check timing
      judgeNote(activeNote.x, activeNote.y);
    }
    // Missed click far from note = no penalty (just feedback)
  }

  function tapKey() {
    if (!gameActive || !activeNote || activeNote.judged) return;
    judgeNote(activeNote.x, activeNote.y);
  }

  function judgeNote(nx, ny) {
    if (!activeNote || activeNote.judged) return;
    activeNote.judged = true;

    const diff = Math.abs(activeNote.approachR - NOTE_RADIUS);
    if (diff <= PERFECT_WINDOW) {
      hits++; score += 300;
      lastJudge = { text: '✨ PERFECT!', color: '#ff69b4', timer: 50, x: nx, y: ny - 40 };
    } else if (diff <= GOOD_WINDOW) {
      hits++; score += 150;
      lastJudge = { text: '♥ GOOD', color: '#ffdd44', timer: 50, x: nx, y: ny - 40 };
    } else {
      misses++;
      lastJudge = { text: 'MISS...', color: '#cc4444', timer: 50, x: nx, y: ny - 40 };
    }
    HUDController.updateMiniGameHUD(`Hits: ${hits}/${TOTAL_NOTES}`, `Score: ${score}`, '♥'.repeat(hits));
  }

  function checkEnd() {
    if (!gameActive) return;
    if (hits >= 7) winGame();
    else loseGame();
  }

  function winGame() {
    stop();
    AudioManager.playSFX('heart');
    AudioManager.onMiniGameEnd();
    GameManager.completeMiniGame('girl');
    GameManager.addCoins(score);
    GameManager.changeAffinity(60);
    HUDController.showMiniGameResult(true, 'IN SYNC! 💗',
      `Score: ${score}\nYou hit ${hits}/${TOTAL_NOTES} beats.\nYour heartbeats are perfectly matched...`,
      () => HUDController.showHeartFragment('Mei 💕', () => {
        CutsceneManager.show('girl_win', () => EndingManager.resolve());
      })
    );
  }

  function loseGame() {
    stop();
    AudioManager.playSFX('wrong');
    AudioManager.onMiniGameEnd();
    GameManager.loseHP();
    HUDController.showMiniGameResult(false, 'NOT IN SYNC...',
      `You got ${hits}/${TOTAL_NOTES} hits.\nMei smiles softly. "Maybe next time?"`,
      () => null
    );
  }

  // ── Render ─────────────────────────────────────────────────
  function renderLoop() {
    if (!gameActive) return;
    time++;

    const canvas = document.getElementById('minigame-canvas');
    if (!canvas) { animFrame = requestAnimationFrame(renderLoop); return; }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // BG — soft dark with particles
    const grd = ctx.createRadialGradient(W/2, H/2, 10, W/2, H/2, 350);
    grd.addColorStop(0, '#1a0a1a');
    grd.addColorStop(1, '#060610');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Floating hearts particles
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + time * 0.004;
      const dist  = 230 + Math.sin(time * 0.02 + i) * 25;
      const hx = W/2 + Math.cos(angle) * dist;
      const hy = H/2 + Math.sin(angle) * dist;
      ctx.fillStyle = `rgba(255,105,180,${0.06 + 0.04 * Math.sin(time * 0.04 + i)})`;
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.fillText('♥', hx, hy);
    }

    // Progress dots (note history)
    const dotSpacing = (W - 120) / TOTAL_NOTES;
    for (let i = 0; i < TOTAL_NOTES; i++) {
      const dx = 60 + i * dotSpacing;
      const dy = H - 28;
      ctx.beginPath();
      ctx.arc(dx, dy, 5, 0, Math.PI*2);
      if (i < noteIndex - 1) {
        ctx.fillStyle = (i < hits + misses && lastJudge) ? '#ff69b4' : '#555';
      } else if (i === noteIndex - 1) {
        ctx.fillStyle = '#ffdd44';
      } else {
        ctx.fillStyle = '#333';
      }
      ctx.fill();
      ctx.strokeStyle = '#ff69b444';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Update approach ring
    if (activeNote && !activeNote.judged) {
      const elapsed = performance.now() - activeNote.born;
      const progress = Math.min(elapsed / (NOTE_INTERVAL * 0.88), 1);
      activeNote.approachR = APPROACH_R_START + (NOTE_RADIUS - APPROACH_R_START) * progress;

      // Auto-miss
      if (activeNote.approachR <= NOTE_RADIUS - GOOD_WINDOW - 4 && !activeNote.judged) {
        activeNote.judged = true;
        misses++;
        lastJudge = { text: 'MISS...', color: '#cc4444', timer: 50, x: activeNote.x, y: activeNote.y - 40 };
        HUDController.updateMiniGameHUD(`Hits: ${hits}/${TOTAL_NOTES}`, `Score: ${score}`, '♥'.repeat(hits));
      }
    }

    // Draw active note
    if (activeNote) {
      const { x, y, approachR, judged } = activeNote;

      if (!judged) {
        // Approach ring (shrinking)
        const alpha = 0.35 + 0.65 * ((APPROACH_R_START - approachR) / (APPROACH_R_START - NOTE_RADIUS));
        ctx.strokeStyle = `rgba(255,180,220,${alpha})`;
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff69b4';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(approachR, NOTE_RADIUS), 0, Math.PI*2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Hit circle
        ctx.fillStyle = '#ff69b422';
        ctx.beginPath();
        ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI*2);
        ctx.fill();
        ctx.strokeStyle = '#ff69b4';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#ff69b4';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI*2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Note number
        ctx.fillStyle = '#fff';
        ctx.font = `bold 14px Courier New`;
        ctx.textAlign = 'center';
        ctx.fillText(noteIndex.toString(), x, y + 5);

        // Heart icon in center
        ctx.font = '16px serif';
        ctx.fillText('♥', x, y + 6);
      } else {
        // Fading out circle
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#ff69b4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, NOTE_RADIUS + 8, 0, Math.PI*2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }

    // Judge text (floating at note position)
    if (lastJudge && lastJudge.timer > 0) {
      lastJudge.timer--;
      const alpha = lastJudge.timer / 50;
      const floatY = lastJudge.y - (50 - lastJudge.timer) * 0.5;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = lastJudge.color;
      ctx.font = `bold ${16 + (50 - lastJudge.timer) * 0.15}px Courier New`;
      ctx.textAlign = 'center';
      ctx.fillText(lastJudge.text, lastJudge.x, floatY);
      ctx.globalAlpha = 1;
    }

    // Accuracy combo
    ctx.fillStyle = '#aaa';
    ctx.font = '12px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`${hits} hits  ${misses} miss`, W/2, 20);

    // Score
    ctx.fillStyle = '#ff69b4';
    ctx.font = 'bold 14px Courier New';
    ctx.fillText(`${score}`, W - 50, 20);

    // Hint
    ctx.fillStyle = '#ffffff33';
    ctx.font = '11px Courier New';
    ctx.fillText('[CLICK on circle] or [SPACE] when ring = edge', W/2, H - 10);

    animFrame = requestAnimationFrame(renderLoop);
  }

  return { start, stop };
})();

window.MiniGame_FinalBoss = MiniGame_FinalBoss;
