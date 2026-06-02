'use strict';

/**
 * MiniGame_NiuPai — "Xiao Chi Bu Chase"
 * Grid-based: Niu Pai (friendly) walks with you, 3 black dogs chase you.
 * Survive 30 seconds OR reach the exit to win.
 * Drop sausage decoys [Space] to distract black dogs.
 */
const MiniGame_NiuPai = (() => {

  const COLS = 14, ROWS = 10;
  const CELL = 50;
  const TIME_LIMIT = 30;   // shorter — it's survival

  let grid, player, niupai, blackDogs, decoys;
  let timeLeft, survived, score, gameActive, timerInterval, animFrame;
  let keys = {};
  let moveTimer = 0, dogTimer = 0, niupaiTimer = 0;

  const EMPTY = 0, WALL = 1, EXIT = 2;

  function buildGrid() {
    const g = [];
    for (let r = 0; r < ROWS; r++) g.push(new Array(COLS).fill(EMPTY));
    for (let c = 0; c < COLS; c++) { g[0][c] = WALL; g[ROWS-1][c] = WALL; }
    for (let r = 0; r < ROWS; r++) { g[r][0] = WALL; g[r][COLS-1] = WALL; }
    // Inner walls (maze-like alleys of a food stall area)
    const walls = [
      [2,3],[2,4],[2,5],
      [3,8],[3,9],
      [4,3],[4,4],
      [5,6],[5,7],[5,8],
      [6,2],[6,3],
      [7,9],[7,10],
      [8,4],[8,5],[8,6],
    ];
    walls.forEach(([r,c]) => { if (g[r] && g[r][c] !== undefined) g[r][c] = WALL; });
    // Exit top-right
    g[1][COLS-2] = EXIT;
    return g;
  }

  function start() {
    gameActive = true;
    timeLeft = TIME_LIMIT;
    survived = 0;
    score = 0;
    decoys = [];
    keys = {};
    moveTimer = 0; dogTimer = 0; niupaiTimer = 0;

    grid    = buildGrid();
    player  = { r: ROWS-2, c: 1 };

    // Niu Pai starts near player (friendly golden dog)
    niupai  = { r: ROWS-2, c: 2, path: [] };

    // 3 black dogs — spread around map
    blackDogs = [
      { r: 1,       c: COLS-3, path: [] },
      { r: ROWS/2|0, c: COLS-2, path: [] },
      { r: 2,       c: COLS/2|0, path: [] },
    ];

    HUDController.setMiniGameTitle(
      'XIAO CHI BU CHASE',
      'Survive 30s or reach exit! Drop [Space] sausages to distract black dogs!'
    );
    HUDController.updateMiniGameHUD(`🐕 Niu Pai with you`, `Time: ${timeLeft}s`, `Sausages: 3`);

    timerInterval = setInterval(tick, 1000);
    animFrame = requestAnimationFrame(loop);
    document.addEventListener('keydown', onKey);
    document.addEventListener('keyup',   e => { keys[e.key.toLowerCase()] = false; });
  }

  function stop() {
    gameActive = false;
    clearInterval(timerInterval);
    cancelAnimationFrame(animFrame);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('keyup',   () => {});
  }

  function loop() {
    if (!gameActive) return;
    moveTimer++;
    dogTimer++;
    niupaiTimer++;

    if (moveTimer  >= 8)  { movePlayer();  moveTimer  = 0; }
    if (dogTimer   >= 16) { moveBlackDogs(); dogTimer  = 0; }
    if (niupaiTimer>= 20) { moveNiuPai();  niupaiTimer= 0; }

    render();
    animFrame = requestAnimationFrame(loop);
  }

  function tick() {
    if (!gameActive) return;
    timeLeft--;
    survived++;
    const sausagesLeft = 3 - decoys.length;
    HUDController.updateMiniGameHUD(
      `🐕 Niu Pai with you`,
      `Time: ${timeLeft}s`,
      `Sausages: ${Math.max(0, sausagesLeft)}`
    );
    if (timeLeft <= 0) winGame('survived');
  }

  function onKey(e) {
    keys[e.key.toLowerCase()] = true;
    if (e.key === ' ' || e.key.toLowerCase() === 'e') dropDecoy();
  }

  function movePlayer() {
    if (!gameActive) return;
    let dr = 0, dc = 0;
    if (keys['w'] || keys['arrowup'])    dr = -1;
    if (keys['s'] || keys['arrowdown'])  dr =  1;
    if (keys['a'] || keys['arrowleft'])  dc = -1;
    if (keys['d'] || keys['arrowright']) dc =  1;

    const nr = player.r + dr, nc = player.c + dc;
    if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) return;
    if (grid[nr][nc] === WALL) return;
    player.r = nr; player.c = nc;

    if (grid[nr][nc] === EXIT) winGame('exit');
    checkCaughtByDog();
  }

  function dropDecoy() {
    if (!gameActive) return;
    const existing = decoys.filter(d => d.r === player.r && d.c === player.c);
    if (existing.length) return;
    if (decoys.length >= 3) return;
    decoys.push({ r: player.r, c: player.c, ttl: 25 });

    if (typeof GameManager !== 'undefined' && GameManager.feedNiupai) {
      GameManager.feedNiupai();
    }
    const sausagesLeft = 3 - decoys.length;
    HUDController.updateMiniGameHUD(`🐕 Niu Pai with you`, `Time: ${timeLeft}s`, `Sausages: ${Math.max(0,sausagesLeft)}`);
  }

  // ── A* pathfinding ────────────────────────────────────────
  function astar(sr, sc, er, ec, ignoreExit) {
    const key = (r, c) => r * COLS + c;
    const h   = (r, c) => Math.abs(r - er) + Math.abs(c - ec);
    const open = [{ r: sr, c: sc, g: 0, f: h(sr, sc), parent: null }];
    const closed = new Set();

    while (open.length) {
      open.sort((a, b) => a.f - b.f);
      const cur = open.shift();
      if (cur.r === er && cur.c === ec) {
        const path = [];
        let node = cur;
        while (node.parent) { path.unshift({ r: node.r, c: node.c }); node = node.parent; }
        return path;
      }
      closed.add(key(cur.r, cur.c));
      for (const [dr2, dc2] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const nr = cur.r + dr2, nc = cur.c + dc2;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS) continue;
        if (grid[nr][nc] === WALL) continue;
        if (!ignoreExit && grid[nr][nc] === EXIT) continue;
        if (closed.has(key(nr, nc))) continue;
        const g = cur.g + 1;
        const existing = open.find(n => n.r === nr && n.c === nc);
        if (existing && existing.g <= g) continue;
        if (existing) open.splice(open.indexOf(existing), 1);
        open.push({ r: nr, c: nc, g, f: g + h(nr, nc), parent: cur });
      }
    }
    return [];
  }

  function moveBlackDogs() {
    if (!gameActive) return;
    decoys = decoys.filter(d => { d.ttl--; return d.ttl > 0; });

    blackDogs.forEach(dog => {
      // Find nearest decoy to this dog
      let target = { r: player.r, c: player.c };
      if (decoys.length) {
        const nearest = decoys.slice().sort((a, b) =>
          (Math.abs(a.r - dog.r) + Math.abs(a.c - dog.c)) -
          (Math.abs(b.r - dog.r) + Math.abs(b.c - dog.c))
        )[0];
        // Only go to decoy if it's closer than player
        const dPlayer = Math.abs(player.r - dog.r) + Math.abs(player.c - dog.c);
        const dDecoy  = Math.abs(nearest.r - dog.r) + Math.abs(nearest.c - dog.c);
        if (dDecoy < dPlayer + 3) target = nearest;
      }

      const path = astar(dog.r, dog.c, target.r, target.c, false);
      if (path.length) {
        dog.r = path[0].r;
        dog.c = path[0].c;
      }
    });

    checkCaughtByDog();
  }

  function moveNiuPai() {
    if (!gameActive) return;
    // Niu Pai follows the player (friendly)
    const path = astar(niupai.r, niupai.c, player.r, player.c, true);
    if (path.length > 1) {
      // Stay 1 step behind
      niupai.r = path[0].r;
      niupai.c = path[0].c;
    }
  }

  function checkCaughtByDog() {
    for (const dog of blackDogs) {
      if (dog.r === player.r && dog.c === player.c) {
        loseGame('Caught by a black dog! 🐕‍🦺');
        return;
      }
    }
  }

  // ── Win / Lose ────────────────────────────────────────────
  function winGame(reason) {
    stop();
    AudioManager.playSFX('correct');
    AudioManager.onMiniGameEnd();
    score = survived * 10 + (reason === 'exit' ? 50 : 0) + (3 - decoys.length) * 20;
    GameManager.completeMiniGame('niupai');
    GameManager.addCoins(score);
    const msg = reason === 'exit'
      ? `Reached the exit!\nNiu Pai: "Woof! We did it!"`
      : `Survived all 30 seconds!\nNiu Pai kept the black dogs busy! 🎉`;
    HUDController.showMiniGameResult(true, 'ESCAPED! 🎉',
      `Score: ${score}\n${msg}`,
      () => HUDController.showHeartFragment('Niu Pai 🐕', () => {
        DialogueSystem.start('niupai_post_win', () => {
          CutsceneManager.show('niupai_win', checkAllDone);
        });
      })
    );
  }

  function loseGame(reason) {
    stop();
    AudioManager.playSFX('wrong');
    AudioManager.onMiniGameEnd();
    GameManager.loseHP();
    HUDController.showMiniGameResult(false, 'CAUGHT!',
      `${reason}\nNiu Pai couldn't protect you in time.`,
      () => CutsceneManager.show('niupai_lose', null)
    );
  }

  function checkAllDone() {
    const s = GameManager.getState();
    if (s.fatherDone && s.niupaiDone && !s.professorDone) {
      setTimeout(() => HUDController.showToast('➡ Go East to Delta Building — find Prof. Hung!', 4000), 500);
    }
  }

  // ── Render ────────────────────────────────────────────────
  function render() {
    const canvas = document.getElementById('minigame-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 700, 400);

    const OX = (700 - COLS * CELL) / 2;
    const OY = (400 - ROWS * CELL) / 2;

    // Background
    ctx.fillStyle = '#100a08';
    ctx.fillRect(0, 0, 700, 400);

    // Grid
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = OX + c * CELL, y = OY + r * CELL;
        if (grid[r][c] === WALL) {
          // Stall wall — wooden brown
          ctx.fillStyle = '#4a2e10';
          ctx.fillRect(x, y, CELL, CELL);
          ctx.strokeStyle = '#6a4e30';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, CELL, CELL);
          // Wood grain
          ctx.strokeStyle = '#3a1e08';
          ctx.beginPath(); ctx.moveTo(x+4, y); ctx.lineTo(x+4, y+CELL); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x+CELL-4, y); ctx.lineTo(x+CELL-4, y+CELL); ctx.stroke();
        } else if (grid[r][c] === EXIT) {
          ctx.fillStyle = '#1a4a1a';
          ctx.fillRect(x, y, CELL, CELL);
          ctx.fillStyle = '#88ff88';
          ctx.font = '22px serif';
          ctx.textAlign = 'center';
          ctx.fillText('🚪', x + CELL/2, y + CELL/2 + 8);
          // "EXIT" label
          ctx.fillStyle = '#88ff88';
          ctx.font = '8px Courier New';
          ctx.fillText('EXIT', x + CELL/2, y + CELL - 4);
        } else {
          // Floor — warm market tiles
          ctx.fillStyle = r % 2 === c % 2 ? '#2a1e14' : '#221812';
          ctx.fillRect(x, y, CELL, CELL);
          ctx.strokeStyle = '#1a1208';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x, y, CELL, CELL);
        }
      }
    }

    // Decoys
    decoys.forEach(d => {
      const x = OX + d.c * CELL, y = OY + d.r * CELL;
      ctx.font = '24px serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌭', x + CELL/2, y + CELL/2 + 8);
      // TTL bar
      ctx.fillStyle = '#ff8800';
      ctx.fillRect(x + 4, y + CELL - 8, (d.ttl / 25) * (CELL - 8), 4);
    });

    // Niu Pai (friendly golden dog — follows player)
    const npx = OX + niupai.c * CELL, npy = OY + niupai.r * CELL;
    drawDogPixel(ctx, npx, npy, '#c8a060', '#f0c080', '🐕');

    // Black dogs
    blackDogs.forEach(dog => {
      const bx = OX + dog.c * CELL, by = OY + dog.r * CELL;
      drawDogPixel(ctx, bx, by, '#222222', '#444444', '🐕‍🦺');
    });

    // Player
    const px = OX + player.c * CELL, py = OY + player.r * CELL;
    ctx.fillStyle = '#4a90d9';
    ctx.fillRect(px + 6, py + 6, CELL - 12, CELL - 12);
    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(px + 10, py + 4, CELL - 20, 12);
    // Glasses
    ctx.fillStyle = '#aaccff';
    ctx.fillRect(px + 11, py + 7, 6, 4);
    ctx.fillRect(px + 19, py + 7, 6, 4);
    ctx.fillStyle = '#fff';
    ctx.font = '10px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('YOU', px + CELL/2, py + CELL - 6);

    // Timer danger indicator
    if (timeLeft <= 10) {
      const flash = Math.sin(Date.now() * 0.01) > 0;
      if (flash) {
        ctx.fillStyle = 'rgba(255,50,50,0.08)';
        ctx.fillRect(0, 0, 700, 400);
      }
    }

    // Legend
    ctx.fillStyle = '#ffffff88';
    ctx.font = '9px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText('🐕 Niu Pai = friend   🐕‍🦺 = enemy   🌭 [Space] = decoy', OX, OY - 6);
  }

  function drawDogPixel(ctx, x, y, bodyColor, headColor, emoji) {
    // Simple pixel dog silhouette
    ctx.fillStyle = bodyColor;
    ctx.fillRect(x + 6,  y + 14, CELL - 16, 16);  // body
    ctx.fillStyle = headColor;
    ctx.fillRect(x + CELL - 18, y + 8, 16, 14);   // head
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + CELL - 14, y + 11, 3, 3);     // eye
    // emoji fallback label
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, x + CELL/2, y + CELL/2 + 4);
  }

  return { start, stop };
})();

window.MiniGame_NiuPai = MiniGame_NiuPai;
