'use strict';

/**
 * NPCManager — roaming student NPCs that wander the campus map.
 * They move randomly, bounce off borders and each other, and sometimes
 * display random dialogue bubbles.
 */
const NPCManager = (() => {

  const CANVAS_W = 800;
  const CANVAS_H = 552;
  const SPEED    = 0.6;

  // NPC archetypes
  const ARCHETYPES = [
    { color: '#e88', label: '👩‍🎓', lines: ['Midterm tomorrow...', 'Have you seen my notes?', 'This campus is huge!'] },
    { color: '#88e', label: '👨‍💻', lines: ['My code won\'t compile...', '404: Sleep not found', 'CS assignment due tmrw'] },
    { color: '#8e8', label: '👩', lines: ['The cafeteria is closed?!', 'Study group at 8pm!', 'Did you try the milk tea?'] },
    { color: '#ee8', label: '👨‍🔬', lines: ['Lab report due Friday...', 'Anyone seen Prof. Chen?', 'Physics is pain.'] },
    { color: '#e8e', label: '🧑', lines: ['Free period!', 'Let\'s go to the library', 'I lost my student ID again'] },
  ];

  const BUBBLE_LINES = [
    'Did you see that couple earlier?',
    'Niu Pai escaped the pond again!',
    'I heard someone completed all mini-games',
    'The cherry blossoms look nice today',
    'Is love.exe still running?',
    'Why is there a dog following that guy?',
  ];

  let npcs = [];

  function reset() {
    npcs = [];
    for (let i = 0; i < 6; i++) {
      const arch  = ARCHETYPES[i % ARCHETYPES.length];
      const angle = Math.random() * Math.PI * 2;
      npcs.push({
        x: 100 + Math.random() * 600,
        y: 80  + Math.random() * 400,
        vx: Math.cos(angle) * SPEED,
        vy: Math.sin(angle) * SPEED,
        arch,
        bubble: null,        // { text, timer }
        bubbleTimer: Math.floor(Math.random() * 300),
        dirTimer: Math.floor(Math.random() * 120),
        frame: 0,
        frameTimer: 0,
      });
    }
  }

  function update() {
    npcs.forEach(npc => {
      // Random direction change
      npc.dirTimer--;
      if (npc.dirTimer <= 0) {
        const angle = Math.random() * Math.PI * 2;
        npc.vx = Math.cos(angle) * SPEED;
        npc.vy = Math.sin(angle) * SPEED;
        npc.dirTimer = 80 + Math.floor(Math.random() * 160);
      }

      npc.x += npc.vx;
      npc.y += npc.vy;

      // Bounce off borders (avoid HUD area)
      if (npc.x < 20)          { npc.x = 20;          npc.vx *= -1; }
      if (npc.x > CANVAS_W-40) { npc.x = CANVAS_W-40; npc.vx *= -1; }
      if (npc.y < 20)          { npc.y = 20;           npc.vy *= -1; }
      if (npc.y > CANVAS_H-40) { npc.y = CANVAS_H-40; npc.vy *= -1; }

      // Walk animation
      npc.frameTimer++;
      if (npc.frameTimer >= 18) { npc.frame ^= 1; npc.frameTimer = 0; }

      // Bubble timer
      npc.bubbleTimer--;
      if (npc.bubbleTimer <= 0) {
        const pool = [...npc.arch.lines, ...BUBBLE_LINES];
        npc.bubble = { text: pool[Math.floor(Math.random() * pool.length)], timer: 90 };
        npc.bubbleTimer = 200 + Math.floor(Math.random() * 300);
      }
      if (npc.bubble) {
        npc.bubble.timer--;
        if (npc.bubble.timer <= 0) npc.bubble = null;
      }
    });
  }

  function draw(ctx) {
    npcs.forEach(npc => drawNPC(ctx, npc));
  }

  function drawNPC(ctx, npc) {
    const x = npc.x, y = npc.y;
    const bob = npc.frame ? 1 : 0;

    // Shadow
    ctx.fillStyle = '#00000022';
    ctx.beginPath();
    ctx.ellipse(x + 10, y + 30, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = npc.arch.color;
    ctx.fillRect(x + 2, y + 12, 16, 16);

    // Head
    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(x + 3, y, 14, 14);

    // Hair (random dark)
    ctx.fillStyle = '#2c1a0e';
    ctx.fillRect(x + 3, y, 14, 5);

    // Legs bob
    ctx.fillStyle = '#555';
    ctx.fillRect(x + 3,  y + 28, 5, 6 + bob);
    ctx.fillRect(x + 12, y + 28, 5, 6 - bob);

    // Emoji icon above head
    ctx.font = '12px serif';
    ctx.textAlign = 'center';
    ctx.fillText(npc.arch.label, x + 10, y - 2);

    // Speech bubble
    if (npc.bubble) {
      const alpha = Math.min(npc.bubble.timer, 20) / 20;
      ctx.globalAlpha = alpha;
      const bw = npc.bubble.text.length * 5.5 + 12;
      const bx = x + 10 - bw / 2;
      const by = y - 28;
      ctx.fillStyle = '#ffffee';
      ctx.fillRect(bx, by, bw, 16);
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, 16);
      // Tail
      ctx.fillStyle = '#ffffee';
      ctx.beginPath();
      ctx.moveTo(x + 6, by + 16); ctx.lineTo(x + 12, by + 22); ctx.lineTo(x + 16, by + 16);
      ctx.fill();
      // Text
      ctx.fillStyle = '#333';
      ctx.font = '8px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(npc.bubble.text, x + 10, by + 11);
      ctx.globalAlpha = 1;
    }
  }

  return { reset, update, draw };
})();

window.NPCManager = NPCManager;
