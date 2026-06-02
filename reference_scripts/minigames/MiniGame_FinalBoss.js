'use strict';

const MiniGame_FinalBoss = (() => {

  const W = 700, H = 400;
  const TOTAL_NOTES       = 15;
  const NOTE_RADIUS       = 26;
  const APPROACH_DURATION = 1400;  // ms for approach ring to shrink to circle edge
  const APPROACH_R_START  = 78;
  const PERFECT_WINDOW    = 10;    // px: ring must be within this of NOTE_RADIUS for PERFECT
  const GOOD_WINDOW       = 22;    // px: ring must be within this for GOOD
  const WIN_THRESHOLD     = 10;
  const NOTE_INTERVAL     = 850;   // ms between spawns (< APPROACH_DURATION = 2-3 notes visible at once)

  let gameActive = false;
  let animFrame  = null;
  let noteTimer  = null;
  let noteIndex  = 0;
  let activeNotes  = [];
  let judgeTexts   = [];
  let hits = 0, misses = 0, score = 0, combo = 0;
  let time = 0;
  let mouseX = W / 2, mouseY = H / 2;
  let cursorTrail = [];
  let clickHandler = null, mouseMoveHandler = null, keyHandler = null;
  let notePositions = [];

  // ── Note placement: directional walk ──────────────────────────
  // Notes flow across the screen in varying directions rather than
  // scattered randomly or arranged in a circle.
  function genNotePositions() {
    const margin = 65;
    const positions = [];
    let x = W / 2 + (Math.random() - 0.5) * 120;
    let y = H / 2 + (Math.random() - 0.5) * 80;
    let angle = Math.random() * Math.PI * 2;

    for (let i = 0; i < TOTAL_NOTES; i++) {
      // Every 3rd note: large direction change (jump); otherwise small drift
      angle += i % 3 === 0
        ? (Math.random() - 0.5) * Math.PI * 1.4
        : (Math.random() - 0.5) * Math.PI * 0.4;

      const step = 80 + Math.random() * 110;
      x += Math.cos(angle) * step;
      y += Math.sin(angle) * step;

      // Reflect off edges to keep notes in bounds
      if (x < margin)     { x = margin;     angle = Math.PI - angle; }
      if (x > W - margin) { x = W - margin; angle = Math.PI - angle; }
      if (y < margin)     { y = margin;     angle = -angle; }
      if (y > H - margin) { y = H - margin; angle = -angle; }

      positions.push({ x, y });
    }
    return positions;
  }

  // ── Public API ─────────────────────────────────────────────────
  function start() {
    hits = 0; misses = 0; score = 0; combo = 0;
    gameActive    = true;
    noteIndex     = 0;
    activeNotes   = [];
    judgeTexts    = [];
    time          = 0;
    cursorTrail   = [];
    notePositions = genNotePositions();

    HUDController.setMiniGameTitle(
      'OSU! HEART BEAT ♥',
      'Click the circles when the ring hits the edge! Move mouse + Left Click'
    );
    HUDController.updateMiniGameHUD(`Hits: 0/${TOTAL_NOTES}`, 'Score: 0', '♥ ♥ ♥');

    const canvas = document.getElementById('minigame-canvas');
    clickHandler     = e => handleClick(e);
    mouseMoveHandler = e => handleMouseMove(e);
    keyHandler       = e => { if (e.code === 'Space') { e.preventDefault(); tapKey(); } };
    if (canvas) {
      canvas.addEventListener('click', clickHandler);
      canvas.addEventListener('mousemove', mouseMoveHandler);
    }
    document.addEventListener('keydown', keyHandler);

    animFrame = requestAnimationFrame(renderLoop);
    scheduleNote();
  }

  function stop() {
    gameActive = false;
    clearTimeout(noteTimer);
    cancelAnimationFrame(animFrame);
    const canvas = document.getElementById('minigame-canvas');
    if (canvas) {
      if (clickHandler)     canvas.removeEventListener('click', clickHandler);
      if (mouseMoveHandler) canvas.removeEventListener('mousemove', mouseMoveHandler);
    }
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    clickHandler = null; mouseMoveHandler = null; keyHandler = null;
  }

  // ── Note scheduling ─────────────────────────────────────────────
  function scheduleNote() {
    if (!gameActive) return;
    if (noteIndex >= TOTAL_NOTES) {
      noteTimer = setTimeout(checkEnd, NOTE_INTERVAL + APPROACH_DURATION + 700);
      return;
    }
    const pos = notePositions[noteIndex];
    activeNotes.push({
      x:         pos.x,
      y:         pos.y,
      spawnTime: performance.now(),
      approachR: APPROACH_R_START,
      judged:    false,
      id:        noteIndex,
      burst:     null,
    });
    noteIndex++;
    noteTimer = setTimeout(scheduleNote, NOTE_INTERVAL);
  }

  // ── Input ───────────────────────────────────────────────────────
  function handleMouseMove(e) {
    const canvas = document.getElementById('minigame-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (W / rect.width);
    mouseY = (e.clientY - rect.top)  * (H / rect.height);
    cursorTrail.push({ x: mouseX, y: mouseY, life: 14 });
    if (cursorTrail.length > 20) cursorTrail.shift();
  }

  function handleClick(e) {
    if (!gameActive) return;
    const canvas = document.getElementById('minigame-canvas');
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (W / rect.width);
    const my = (e.clientY - rect.top)  * (H / rect.height);
    tryHit(mx, my);
  }

  // Space: hit the earliest visible unjudged note (keyboard fallback)
  function tapKey() {
    if (!gameActive) return;
    const note = activeNotes.filter(n => !n.judged).sort((a, b) => a.id - b.id)[0];
    if (note) judgeNote(note);
  }

  function tryHit(mx, my) {
    // Prefer earliest unjudged note whose circle contains the click
    const hit = activeNotes
      .filter(n => !n.judged && Math.hypot(mx - n.x, my - n.y) <= NOTE_RADIUS + 14)
      .sort((a, b) => a.id - b.id)[0];
    if (hit) judgeNote(hit);
  }

  // ── Judgement ───────────────────────────────────────────────────
  function judgeNote(note) {
    if (note.judged) return;
    note.judged = true;

    const diff = Math.abs(note.approachR - NOTE_RADIUS);
    if (diff <= PERFECT_WINDOW) {
      hits++; combo++; score += 300 * Math.max(1, Math.floor(combo / 5));
      judgeTexts.push({ text: '✨ PERFECT!', color: '#ff69b4', x: note.x, y: note.y - 36, life: 50 });
    } else if (diff <= GOOD_WINDOW) {
      hits++; combo++; score += 150 * Math.max(1, Math.floor(combo / 5));
      judgeTexts.push({ text: '♥ GOOD', color: '#ffdd44', x: note.x, y: note.y - 36, life: 50 });
    } else {
      misses++; combo = 0;
      judgeTexts.push({ text: 'MISS...', color: '#cc4444', x: note.x, y: note.y - 36, life: 50 });
    }

    note.burst = { life: 20 };
    HUDController.updateMiniGameHUD(
      `Hits: ${hits}/${TOTAL_NOTES}`, `Score: ${score}`, '♥'.repeat(hits)
    );
    setTimeout(() => {
      const idx = activeNotes.indexOf(note);
      if (idx !== -1) activeNotes.splice(idx, 1);
    }, 360);
  }

  function checkEnd() {
    if (!gameActive) return;
    activeNotes.filter(n => !n.judged).forEach(n => {
      n.judged = true; misses++; combo = 0;
    });
    setTimeout(() => hits >= WIN_THRESHOLD ? winGame() : loseGame(), 500);
  }

  // ── Win / Lose ──────────────────────────────────────────────────
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

  // ── Render ──────────────────────────────────────────────────────
  function renderLoop() {
    if (!gameActive) return;
    time++;
    const now = performance.now();

    const canvas = document.getElementById('minigame-canvas');
    if (!canvas) { animFrame = requestAnimationFrame(renderLoop); return; }
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // Background
    const grd = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, 340);
    grd.addColorStop(0, '#1a0a1a');
    grd.addColorStop(1, '#060610');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Ambient floating hearts
    for (let i = 0; i < 12; i++) {
      const a  = (i / 12) * Math.PI * 2 + time * 0.004;
      const d  = 220 + Math.sin(time * 0.02 + i) * 25;
      ctx.fillStyle = `rgba(255,105,180,${0.05 + 0.03 * Math.sin(time * 0.04 + i)})`;
      ctx.font = '16px serif'; ctx.textAlign = 'center';
      ctx.fillText('♥', W / 2 + Math.cos(a) * d, H / 2 + Math.sin(a) * d);
    }

    // Auto-miss notes whose window has expired
    for (const note of activeNotes) {
      if (!note.judged && now - note.spawnTime > APPROACH_DURATION + 350) {
        note.judged = true; misses++; combo = 0;
        judgeTexts.push({ text: 'MISS...', color: '#cc4444', x: note.x, y: note.y - 36, life: 50 });
        HUDController.updateMiniGameHUD(
          `Hits: ${hits}/${TOTAL_NOTES}`, `Score: ${score}`, '♥'.repeat(hits)
        );
        const ref = note;
        setTimeout(() => {
          const idx = activeNotes.indexOf(ref);
          if (idx !== -1) activeNotes.splice(idx, 1);
        }, 300);
      }
    }

    // Update approach ring radii
    for (const note of activeNotes) {
      if (!note.judged) {
        const progress = Math.min((now - note.spawnTime) / APPROACH_DURATION, 1);
        note.approachR = APPROACH_R_START + (NOTE_RADIUS - APPROACH_R_START) * progress;
      }
    }

    // Dashed connection lines between consecutive unjudged notes (movement hint)
    const unjudged = activeNotes.filter(n => !n.judged).sort((a, b) => a.id - b.id);
    ctx.setLineDash([4, 7]);
    for (let i = 0; i < unjudged.length - 1; i++) {
      ctx.strokeStyle = 'rgba(255,150,200,0.12)';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(unjudged[i].x, unjudged[i].y);
      ctx.lineTo(unjudged[i + 1].x, unjudged[i + 1].y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw notes — later ids behind, earlier ids on top
    [...activeNotes].sort((a, b) => b.id - a.id).forEach(n => drawNote(ctx, n));

    // Cursor trail
    cursorTrail.forEach((t, i) => {
      t.life--;
      ctx.fillStyle = `rgba(255,150,220,${(t.life / 14) * 0.45})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 3.5 * (i / cursorTrail.length), 0, Math.PI * 2);
      ctx.fill();
    });
    cursorTrail = cursorTrail.filter(t => t.life > 0);

    // Cursor dot
    ctx.fillStyle = '#ffffffcc';
    ctx.beginPath(); ctx.arc(mouseX, mouseY, 4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff69b4'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(mouseX, mouseY, 8, 0, Math.PI * 2); ctx.stroke();

    // Floating judge texts
    for (let i = judgeTexts.length - 1; i >= 0; i--) {
      const jt = judgeTexts[i];
      jt.life--; jt.y -= 0.4;
      ctx.globalAlpha = jt.life / 50;
      ctx.fillStyle   = jt.color;
      ctx.font        = 'bold 14px Courier New';
      ctx.textAlign   = 'center';
      ctx.fillText(jt.text, jt.x, jt.y);
      ctx.globalAlpha = 1;
      if (jt.life <= 0) judgeTexts.splice(i, 1);
    }

    // Top progress bar
    ctx.fillStyle = '#ffffff0a';
    ctx.fillRect(20, 8, W - 40, 5);
    ctx.fillStyle = '#ff69b4';
    ctx.fillRect(20, 8, (W - 40) * (Math.min(hits + misses, TOTAL_NOTES) / TOTAL_NOTES), 5);

    // Bottom note track dots
    const dotSpacing = (W - 120) / TOTAL_NOTES;
    for (let i = 0; i < TOTAL_NOTES; i++) {
      const dx = 60 + i * dotSpacing, dy = H - 18;
      const isLive = activeNotes.find(n => n.id === i && !n.judged);
      ctx.beginPath(); ctx.arc(dx, dy, 5, 0, Math.PI * 2);
      ctx.fillStyle = isLive ? '#ffdd44' : i < noteIndex ? '#ff69b4' : '#333';
      ctx.fill();
      ctx.strokeStyle = '#ff69b444'; ctx.lineWidth = 1; ctx.stroke();
    }

    // Combo display
    if (combo >= 5) {
      ctx.fillStyle = `rgba(255,105,180,${0.25 + 0.1 * Math.sin(time * 0.2)})`;
      ctx.font = 'bold 18px Courier New'; ctx.textAlign = 'center';
      ctx.fillText(`${combo}x COMBO`, W / 2, 38);
    }

    // Score
    ctx.fillStyle = '#ff69b4'; ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'right';
    ctx.fillText(`${score}`, W - 12, 32);

    // Hit / miss counter
    ctx.fillStyle = '#aaaaaa'; ctx.font = '11px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(`${hits} hits  ${misses} miss`, 12, 30);

    // Hint
    ctx.fillStyle = '#ffffff22'; ctx.font = '11px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('[LEFT CLICK on circle] when ring = edge  |  [SPACE] keyboard', W / 2, H - 5);

    animFrame = requestAnimationFrame(renderLoop);
  }

  function drawNote(ctx, note) {
    const { x, y, approachR, judged, burst } = note;

    if (judged) {
      if (burst && burst.life > 0) {
        const p = 1 - burst.life / 20;
        burst.life--;
        ctx.globalAlpha = burst.life / 20;
        ctx.strokeStyle = '#ff69b4'; ctx.lineWidth = 2.5;
        ctx.shadowColor = '#ff69b4'; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS + p * 22, 0, Math.PI * 2); ctx.stroke();
        ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      }
      return;
    }

    // Approach ring (shrinks toward circle edge)
    const ringP = Math.min((APPROACH_R_START - approachR) / (APPROACH_R_START - NOTE_RADIUS), 1);
    ctx.strokeStyle = `rgba(255,180,220,${0.3 + 0.7 * ringP})`;
    ctx.lineWidth = 2.5; ctx.shadowColor = '#ff69b4'; ctx.shadowBlur = 7;
    ctx.beginPath(); ctx.arc(x, y, Math.max(approachR, NOTE_RADIUS + 1), 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // Hit circle
    ctx.fillStyle = 'rgba(255,105,180,0.15)';
    ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#ff69b4'; ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff69b4'; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0;

    // Note number
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Courier New'; ctx.textAlign = 'center';
    ctx.fillText((note.id + 1).toString(), x, y + 5);
  }

  return { start, stop };
})();

window.MiniGame_FinalBoss = MiniGame_FinalBoss;
