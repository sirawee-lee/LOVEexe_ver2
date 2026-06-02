'use strict';

/**
 * MiniGame_Father — "Catch the Good Stuff"
 * Move left/right to catch falling good items (star, book, heart).
 * Avoid bad items (virus, monster, poop, bomb).
 * All items rendered in greyscale pixel art with emoji labels.
 * 3 lives. Catch 20 good items to win.
 */
const MiniGame_Father = (() => {

  const W = 700, H = 400;
  const PLAYER_W = 48, PLAYER_H = 16;
  const PLAYER_Y = H - 40;
  const PLAYER_SPEED = 5;
  const ITEM_R = 18;
  const GOAL = 10;          // good items needed to win
  const SPAWN_INTERVAL = 50; // frames between spawns
  const FALL_SPEED_BASE = 0.8;
  const FALL_SPEED_INC  = 0.001; // gets faster over time
  const FALL_SPEED_MAX  = 1.1;   // cap

  const GOOD_ITEMS = [
    { emoji: '⭐', label: 'star'  },
    { emoji: '📖', label: 'book'  },
    { emoji: '💙', label: 'heart' },
  ];
  const BAD_ITEMS = [
    { emoji: '🦠', label: 'virus'   },
    { emoji: '👾', label: 'monster' },
    { emoji: '💩', label: 'poop'    },
    { emoji: '💣', label: 'bomb'    },
  ];

  let playerX, lives, caught, animFrame, frameCount, gameActive;
  let items = [];
  let keys  = {};
  let flashTimer = 0; // >0 green, <0 red

  // ── Lifecycle ─────────────────────────────────────────────
  function start() {
    playerX   = W / 2 - PLAYER_W / 2;
    lives     = 3;
    caught    = 0;
    frameCount = 0;
    items     = [];
    keys      = {};
    gameActive = true;
    flashTimer = 0;

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);

    HUDController.setMiniGameTitle(
      'GIFT CATCHER',
      'Catch ⭐📖💙 — Avoid 🦠👾💩💣   [← →] to move'
    );
    updateHUD();
    animFrame = requestAnimationFrame(loop);
  }

  function stop() {
    gameActive = false;
    cancelAnimationFrame(animFrame);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('keyup',   onKeyUp);
  }

  function updateHUD() {
    HUDController.updateMiniGameHUD(
      `Lives: ${'❤'.repeat(Math.max(0, lives))}`,
      `Caught: ${caught} / ${GOAL}`,
      ''
    );
  }

  // ── Input ─────────────────────────────────────────────────
  function onKeyDown(e) { keys[e.key] = true; }
  function onKeyUp(e)   { keys[e.key] = false; }

  // ── Game loop ─────────────────────────────────────────────
  function loop() {
    if (!gameActive) return;
    update();
    render();
    animFrame = requestAnimationFrame(loop);
  }

  function update() {
    frameCount++;
    if (flashTimer > 0) flashTimer--;
    else if (flashTimer < 0) flashTimer++;

    // Move player
    if ((keys['ArrowLeft']  || keys['a'] || keys['A']) && playerX > 0)
      playerX -= PLAYER_SPEED;
    if ((keys['ArrowRight'] || keys['d'] || keys['D']) && playerX + PLAYER_W < W)
      playerX += PLAYER_SPEED;

    // Spawn items
    if (frameCount % SPAWN_INTERVAL === 0) spawnItem();

    // Move & check items
    const speed = Math.min(FALL_SPEED_BASE + frameCount * FALL_SPEED_INC, FALL_SPEED_MAX);
    for (let i = items.length - 1; i >= 0; i--) {
      const it = items[i];
      it.y += speed;

      // Catch check — item center vs player rect
      if (
        it.y + ITEM_R >= PLAYER_Y &&
        it.y - ITEM_R <= PLAYER_Y + PLAYER_H &&
        it.x + ITEM_R >= playerX &&
        it.x - ITEM_R <= playerX + PLAYER_W
      ) {
        items.splice(i, 1);
        if (it.good) {
          caught++;
          flashTimer = 25;
          updateHUD();
          if (caught >= GOAL) { winGame(); return; }
        } else {
          lives--;
          flashTimer = -25;
          updateHUD();
          HUDController.showToast(lives > 0
            ? `Ouch! ${lives} ${lives === 1 ? 'life' : 'lives'} left!`
            : 'No lives left!');
          AudioManager.playSFX('wrong');
          if (lives <= 0) { loseGame('Caught too many bad things!'); return; }
        }
        continue;
      }

      // Missed good item — just remove, no penalty
      if (it.y - ITEM_R > H) {
        items.splice(i, 1);
      }
    }
  }

  function spawnItem() {
    const good = Math.random() < 0.55;
    const pool = good ? GOOD_ITEMS : BAD_ITEMS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    items.push({
      x: ITEM_R + Math.random() * (W - ITEM_R * 2),
      y: -ITEM_R,
      emoji: pick.emoji,
      label: pick.label,
      good,
    });
  }

  // ── Win / Lose ────────────────────────────────────────────
  function winGame() {
    stop();
    AudioManager.playSFX('correct');
    AudioManager.onMiniGameEnd();
    GameManager.completeMiniGame('father');
    GameManager.addCoins(300);
    HUDController.showMiniGameResult(true, 'MISSION COMPLETE!',
      `You caught ${caught} gifts!\nMr. Wang nods slowly. "You have my blessing."`,
      () => HUDController.showHeartFragment('Mr. Wang 👔', () => {
        DialogueSystem.start('father_post_win', () => {
          CutsceneManager.show('father_win', checkAllDone);
        });
      })
    );
  }

  function loseGame(reason) {
    stop();
    AudioManager.playSFX('wrong');
    AudioManager.onMiniGameEnd();
    GameManager.loseHP();
    HUDController.showMiniGameResult(false, 'REJECTED!',
      `${reason}\nMr. Wang shakes his head.`,
      () => DialogueSystem.start('father_post_lose', () => {
        CutsceneManager.show('father_lose', null);
      })
    );
  }

  function checkAllDone() {
    const s = GameManager.getState();
    if (s.professorDone && s.niupaiDone && s.fatherDone && !s.girlDone) {
      setTimeout(() => HUDController.showToast(
        '💕 All 3 fragments! Head north to Xiao Chi Bu, then east to Delta Building!', 5000
      ), 500);
    }
  }

  // ── Render ────────────────────────────────────────────────
  function render() {
    const canvas = document.getElementById('minigame-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, W, H);

    drawBackground(ctx);
    drawItems(ctx);
    drawPlayer(ctx);
    drawFlash(ctx);
    drawProgressBar(ctx);
  }

  function drawBackground(ctx) {
    // Grey gradient sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1a1a1a');
    sky.addColorStop(1, '#3a3a3a');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Floor
    ctx.fillStyle = '#555';
    ctx.fillRect(0, PLAYER_Y + PLAYER_H, W, H - PLAYER_Y - PLAYER_H);
    ctx.fillStyle = '#666';
    ctx.fillRect(0, PLAYER_Y + PLAYER_H, W, 3);
  }

  function drawItems(ctx) {
    ctx.save();
    ctx.font = `${ITEM_R * 1.5}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (const it of items) {
      ctx.save();
      if (it.good) {
        // Good items — full colour
        ctx.fillText(it.emoji, it.x, it.y);
      } else {
        // Bad items — draw then desaturate to greyscale
        ctx.fillText(it.emoji, it.x, it.y);
        ctx.globalCompositeOperation = 'saturation';
        ctx.fillStyle = '#808080';
        ctx.beginPath();
        ctx.arc(it.x, it.y, ITEM_R + 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawPlayer(ctx) {
    // Basket / catcher — grey pixel art style
    const x = playerX, y = PLAYER_Y;
    const w = PLAYER_W, h = PLAYER_H;

    // Basket body
    ctx.fillStyle = '#888';
    ctx.fillRect(x, y, w, h);

    // Basket rim highlight
    ctx.fillStyle = '#aaa';
    ctx.fillRect(x, y, w, 3);

    // Basket weave lines
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    for (let lx = x + 8; lx < x + w; lx += 8) {
      ctx.beginPath();
      ctx.moveTo(lx, y);
      ctx.lineTo(lx, y + h);
      ctx.stroke();
    }

    // Handle dots
    ctx.fillStyle = '#bbb';
    ctx.fillRect(x - 4, y + 4, 4, h - 4);
    ctx.fillRect(x + w, y + 4, 4, h - 4);
  }

  function drawFlash(ctx) {
    if (flashTimer === 0) return;
    const t = Math.abs(flashTimer);
    const alpha = (t / 25) * 0.3;
    ctx.fillStyle = flashTimer > 0
      ? `rgba(200, 255, 200, ${alpha})`
      : `rgba(255, 80,  80,  ${alpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  function drawProgressBar(ctx) {
    const barW = W - 40, barH = 12;
    const bx = 20, by = 12;
    const pct = Math.min(caught / GOAL, 1);

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(bx, by, barW, barH);

    // Fill
    ctx.fillStyle = '#999';
    ctx.fillRect(bx, by, barW * pct, barH);

    // Border
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.strokeRect(bx, by, barW, barH);

    // Label
    ctx.fillStyle = '#ccc';
    ctx.font = '10px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${caught}/${GOAL}`, bx + barW / 2, by + barH / 2);
    ctx.textBaseline = 'alphabetic';
  }

  return { start, stop };
})();

window.MiniGame_Father = MiniGame_Father;
