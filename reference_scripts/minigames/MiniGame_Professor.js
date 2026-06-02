'use strict';

const MiniGame_Professor = (() => {

  const W = 700, H = 400;
  const TOTAL_SWINGS = 3;
  const TIME_LIMIT   = 60;

  // pivot and rope
  const AX = 160, AY = 40, ROPE_LEN = 150;
  // target platform — large and fixed so it's always reachable
  const PLAT = { x: 290, y: 260, w: 360, h: 100 };
  const START_PLAT = { x: 10, y: 260, w: 120, h: 100 };

  let round, score, timeLeft, lives;
  let timerInterval, animFrame;
  let gameActive = false;
  let keyHandler = null, clickHandler = null;

  // swing state
  let angle, omega;          // pendulum
  let phase;                 // 'swing' | 'flying' | 'result'
  let resultKind;            // 'landed' | 'miss'
  let resultTimer;
  let px, py, pvx, pvy;     // player pos/vel during flight

  // ── Init ──────────────────────────────────────────────────
  function initRound() {
    angle  = -0.9;
    omega  =  0;
    phase  = 'swing';
    resultTimer = 0;
    // player starts at rope end
    px = AX + Math.sin(angle) * ROPE_LEN;
    py = AY + Math.cos(angle) * ROPE_LEN;
    pvx = pvy = 0;
  }

  // ── Public API ────────────────────────────────────────────
  function start() {
    round = 0; score = 0; timeLeft = TIME_LIMIT; lives = 3;
    gameActive = true;

    HUDController.setMiniGameTitle('ROPE SWING',
      'Press SPACE or Click to release — land on the green platform!');
    updateHUD();
    initRound();

    timerInterval = setInterval(tick, 1000);
    animFrame = requestAnimationFrame(loop);

    keyHandler   = e => { if (e.code === 'Space') { e.preventDefault(); doRelease(); } };
    clickHandler = () => doRelease();
    document.addEventListener('keydown', keyHandler);
    const cv = document.getElementById('minigame-canvas');
    if (cv) cv.addEventListener('click', clickHandler);
  }

  function stop() {
    gameActive = false;
    clearInterval(timerInterval);
    cancelAnimationFrame(animFrame);
    document.removeEventListener('keydown', keyHandler);
    const cv = document.getElementById('minigame-canvas');
    if (cv && clickHandler) cv.removeEventListener('click', clickHandler);
    keyHandler = null; clickHandler = null;
  }

  function updateHUD() {
    HUDController.updateMiniGameHUD(
      `Lives: ${'❤'.repeat(Math.max(0, lives))}`,
      `Round: ${round + 1}/${TOTAL_SWINGS}`,
      `⏱ ${timeLeft}s`
    );
  }

  function tick() {
    if (!gameActive) return;
    timeLeft--;
    updateHUD();
    if (timeLeft <= 0) loseGame("Time's up!");
  }

  function doRelease() {
    if (!gameActive || phase !== 'swing') return;
    const speed = Math.abs(omega) * ROPE_LEN;
    pvx = Math.max(speed * Math.cos(angle), 4);
    pvy = -Math.abs(omega) * ROPE_LEN * Math.sin(angle) * 0.4;
    console.log(`RELEASE round=${round} angle=${angle.toFixed(2)} omega=${omega.toFixed(3)} px=${px.toFixed(1)} py=${py.toFixed(1)} pvx=${pvx.toFixed(2)} pvy=${pvy.toFixed(2)}`);
    phase = 'flying';
  }

  // ── Loop ──────────────────────────────────────────────────
  function loop() {
    if (!gameActive) return;
    update();
    render();
    animFrame = requestAnimationFrame(loop);
  }

  function update() {
    if (phase === 'swing') {
      omega += -(0.05 / ROPE_LEN) * Math.sin(angle);
      omega *= 0.999;
      angle += omega;
      // stop at rightmost point so it never swings back left
      if (angle > 1.0) { omega = 0; angle = 1.0; }
      px = AX + Math.sin(angle) * ROPE_LEN;
      py = AY + Math.cos(angle) * ROPE_LEN;

    } else if (phase === 'flying') {
      // sub-step to avoid tunnelling
      const STEPS = 10;
      for (let s = 0; s < STEPS; s++) {
        pvy += 0.35 / STEPS;
        px  += pvx  / STEPS;
        py  += pvy  / STEPS;

        // generous overlap check with target platform
        if (px + 20 > PLAT.x && px < PLAT.x + PLAT.w &&
            py + 28 > PLAT.y && py < PLAT.y + PLAT.h) {
          py = PLAT.y - 28;
          pvx = pvy = 0;
          phase = 'result';
          resultKind = 'landed';
          resultTimer = 0;
          HUDController.showToast('✓ Landed!');
          return;
        }
      }
      // fell off screen
      if (py > H + 30 || px > W + 30 || px < -60) {
        phase = 'result';
        resultKind = 'miss';
        resultTimer = 0;
        HUDController.showToast('💥 Missed! -1 Life');
      }

    } else if (phase === 'result') {
      resultTimer++;
      if (resultTimer >= 70) {
        if (resultKind === 'landed') {
          score += 20 + Math.floor(timeLeft * 0.5);
          round++;
          if (round >= TOTAL_SWINGS) { winGame(); return; }
          initRound();
          updateHUD();
        } else {
          lives--;
          updateHUD();
          if (lives <= 0) { loseGame('Fell too many times!'); return; }
          initRound();
        }
      }
    }
  }

  // ── Win / Lose ────────────────────────────────────────────
  function winGame() {
    stop();
    AudioManager.playSFX('correct');
    AudioManager.onMiniGameEnd();
    GameManager.completeMiniGame('professor');
    GameManager.addCoins(score);
    HUDController.showMiniGameResult(true, 'MISSION COMPLETE!',
      `Score: ${score}\nProf. Hung nods. "Perfect timing. You understand physics — and perhaps, also love."`,
      () => HUDController.showHeartFragment('Prof. Hung 🏛', () => {
        DialogueSystem.start('professor_post_win', () => {
          CutsceneManager.show('professor_win', checkAllDone);
        });
      })
    );
  }

  function loseGame(reason) {
    stop();
    AudioManager.playSFX('wrong');
    AudioManager.onMiniGameEnd();
    GameManager.loseHP();
    HUDController.showMiniGameResult(false, 'FAILED',
      `${reason}\nProf. Hung: "The rope of fate requires precise release."`,
      () => DialogueSystem.start('professor_post_lose', () => {
        CutsceneManager.show('professor_lose', null);
      })
    );
  }

  function checkAllDone() {
    const s = GameManager.getState();
    if (s.professorDone && s.niupaiDone && s.fatherDone && !s.girlDone) {
      setTimeout(() => HUDController.showToast(
        '💕 All 3 fragments! Go South from Delta Building — Mei is waiting!', 5000), 500);
    }
  }

  // ── Render ────────────────────────────────────────────────
  function render() {
    if (!gameActive) return;
    const canvas = document.getElementById('minigame-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    // background
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#0a1a3a');
    sky.addColorStop(1, '#1a2a4a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // stars
    ctx.fillStyle = '#ffffff55';
    for (let i = 0; i < 24; i++) {
      ctx.fillRect((i * 137 + 40) % W, (i * 53) % 120, 2, 2);
    }

    // floor
    ctx.fillStyle = '#334455';
    ctx.fillRect(0, H - 30, W, 30);

    // start platform
    ctx.fillStyle = '#5a3a1a';
    ctx.fillRect(START_PLAT.x, START_PLAT.y, START_PLAT.w, START_PLAT.h);
    ctx.strokeStyle = '#888866'; ctx.lineWidth = 2;
    ctx.strokeRect(START_PLAT.x, START_PLAT.y, START_PLAT.w, START_PLAT.h);

    // target platform
    ctx.fillStyle = '#2a5a2a';
    ctx.fillRect(PLAT.x, PLAT.y, PLAT.w, PLAT.h);
    ctx.strokeStyle = '#88ff88'; ctx.lineWidth = 2;
    ctx.strokeRect(PLAT.x, PLAT.y, PLAT.w, PLAT.h);
    ctx.fillStyle = '#88ff88aa';
    ctx.font = 'bold 13px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('LAND HERE', PLAT.x + PLAT.w / 2, PLAT.y - 8);

    // rope anchor block
    ctx.fillStyle = '#8b7355';
    ctx.fillRect(AX - 8, AY - 12, 16, 12);

    // rope (only while swinging)
    if (phase === 'swing') {
      ctx.strokeStyle = '#c8a060';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(AX, AY);
      ctx.lineTo(px, py);
      ctx.stroke();
    }

    // player
    drawPlayer(ctx, px, py, phase === 'swing');

    // result overlay
    if (phase === 'result') {
      ctx.globalAlpha = Math.min(1, resultTimer / 20);
      ctx.fillStyle = resultKind === 'landed' ? '#88ff88' : '#ff4444';
      ctx.font = 'bold 24px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(resultKind === 'landed' ? 'LANDED! ✓' : 'MISSED!', W / 2, H / 2 - 20);
      ctx.globalAlpha = 1;
    }

    // swing indicator bar
    if (phase === 'swing') {
      const pct = (angle + 0.9) / 1.8;
      const good = pct > 0.55 && pct < 0.80;
      ctx.fillStyle = '#ffffff11';
      ctx.fillRect(W - 28, 50, 18, H - 80);
      ctx.fillStyle = good ? '#88ff88' : '#ff8844';
      const iy = 50 + (1 - pct) * (H - 80);
      ctx.fillRect(W - 32, iy - 4, 26, 8);
      ctx.fillStyle = '#ffffffcc';
      ctx.font = '9px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(good ? 'NOW!' : 'WAIT', W - 19, iy - 8);
    }

    // instruction
    ctx.fillStyle = '#ffffff44';
    ctx.font = '12px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('[SPACE] or [CLICK] to release', W / 2, H - 10);

    // round dots
    for (let i = 0; i < TOTAL_SWINGS; i++) {
      ctx.beginPath();
      ctx.arc(W / 2 - (TOTAL_SWINGS - 1) * 14 / 2 + i * 14, 18, 5, 0, Math.PI * 2);
      ctx.fillStyle = i < round ? '#88ff88' : i === round ? '#ffdd44' : '#333';
      ctx.fill();
      ctx.strokeStyle = '#88ff88'; ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawPlayer(ctx, x, y, hanging) {
    ctx.fillStyle = '#4a90d9';
    ctx.fillRect(x + 2, y + 12, 16, 18);
    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(x + 4, y, 12, 14);
    ctx.fillStyle = '#2c1a0e';
    ctx.fillRect(x + 4, y, 12, 5);
    if (hanging) {
      ctx.fillStyle = '#f5cba7';
      ctx.fillRect(x - 4, y + 2, 8, 5);
      ctx.fillRect(x + 16, y + 2, 8, 5);
    }
    ctx.fillStyle = '#2c4a7a';
    ctx.fillRect(x + 4, y + 30, 5, 10);
    ctx.fillRect(x + 11, y + 30, 5, 10);
  }

  return { start, stop };
})();

window.MiniGame_Professor = MiniGame_Professor;
