'use strict';

const EndingManager = (() => {

  let endingData   = null;
  let slides       = [];
  let slideIndex   = 0;

  async function loadData() {
    if (endingData) return;
    try {
      const res  = await fetch('assets/resources/game-data.json');
      const json = await res.json();
      endingData = json.endings;
    } catch(e) { endingData = {}; }
  }

  function resolve() {
    const s = GameManager.getState();
    let key;

    // Priority order
    if (s.fedDogCount >= 3) {
      key = 'ending_niupai';
    } else if (s.foundEasterEgg) {
      key = 'ending_secret';
    } else if (s.girlDone && s.hearts >= 3) {
      key = 'ending_true_love';
    } else if (s.neverRomantic && s.professorDone && s.niupaiDone && s.fatherDone) {
      key = 'ending_eecs_overload';
    } else if (s.hearts >= 2 || s.affinity >= 40) {
      key = 'ending_friend_zone';
    } else {
      key = 'ending_rejected';
    }

    show(key);
  }

  async function show(key) {
    await loadData();
    const ending = endingData[key] || endingData['ending_rejected'];
    slides     = ending.slides || [];
    slideIndex = 0;
    GameManager.showScreen('ending');
    showSlide();
  }

  function showSlide() {
    const slide = slides[slideIndex];
    if (!slide) { GameManager.backToTitle(); return; }

    document.getElementById('ending-title').textContent = slide.title || '';
    document.getElementById('ending-body').textContent  = slide.body  || '';

    // Render CG art on canvas
    const cgCanvas = document.getElementById('ending-cg-canvas');
    if (cgCanvas) drawEndingCG(cgCanvas, slide.cgType || 'default');

    const btn = document.getElementById('ending-next-btn');
    btn.textContent = slideIndex < slides.length - 1 ? 'Next ▶' : '🏠 Back to Title';
    btn.onclick = nextSlide;
  }

  function nextSlide() {
    slideIndex++;
    if (slideIndex >= slides.length) GameManager.backToTitle();
    else showSlide();
  }

  // ── Pixel-art CG renderer on canvas ──────────────────────
  function drawEndingCG(canvas, type) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (type === 'true_love' || type === 'kiss') {
      drawTrueLoveCG(ctx, W, H);
    } else if (type === 'dog') {
      drawDogCG(ctx, W, H);
    } else if (type === 'eecs') {
      drawEECSCG(ctx, W, H);
    } else if (type === 'secret') {
      drawSecretCG(ctx, W, H);
    } else if (type === 'friend') {
      drawFriendCG(ctx, W, H);
    } else {
      drawRejectedCG(ctx, W, H);
    }
  }

  function drawTrueLoveCG(ctx, W, H) {
    // Sunset sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#ff7043'); sky.addColorStop(1, '#ffd180');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);

    // Ground
    ctx.fillStyle = '#4a7a4a'; ctx.fillRect(0, H*0.65, W, H*0.35);

    // Boy (left)
    drawPixelBoy(ctx, W*0.3, H*0.35, 1.3);
    // Girl (right, facing left)
    drawPixelGirl(ctx, W*0.55, H*0.35, 1.3);

    // Kiss effect — cheek peck (boy leaning right, girl leaning left)
    ctx.fillStyle = '#ff69b4';
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.fillText('💋', W*0.45, H*0.38);

    // Hearts floating
    for (let i = 0; i < 5; i++) {
      ctx.globalAlpha = 0.7;
      ctx.font = `${14 + i*4}px serif`;
      ctx.fillText('♥', W*0.3 + i*30, H*0.25 - i*10);
    }
    ctx.globalAlpha = 1;

    // Stars
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 12; i++) {
      const sx = (i * 137) % W, sy = (i * 79) % (H*0.4);
      ctx.fillRect(sx, sy, 2, 2);
    }

    label(ctx, W, '— TRUE LOVE ENDING —', '#fff8');
  }

  function drawDogCG(ctx, W, H) {
    // Night sky
    ctx.fillStyle = '#0a0a2a'; ctx.fillRect(0, 0, W, H);
    // Moon
    ctx.fillStyle = '#fffde0';
    ctx.beginPath(); ctx.arc(W*0.8, H*0.15, 30, 0, Math.PI*2); ctx.fill();
    // Stars
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 20; i++) ctx.fillRect((i*137)%W, (i*53)%H*0.6, 2, 2);

    // Ground
    ctx.fillStyle = '#2a4a2a'; ctx.fillRect(0, H*0.65, W, H*0.35);

    // Pixel dog (large)
    const scale = 2.5;
    ctx.fillStyle = '#c8a060';
    ctx.fillRect(W*0.3, H*0.4, 60*scale/2, 30*scale/2);   // body
    ctx.fillRect(W*0.47, H*0.28, 30*scale/2, 25*scale/2); // head
    // eyes
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(W*0.49, H*0.32, 6, 6);
    // heart above dog
    ctx.fillStyle = '#ff69b4';
    ctx.font = '32px serif'; ctx.textAlign = 'center';
    ctx.fillText('💗', W*0.5, H*0.22);

    // Boy sitting next to dog
    drawPixelBoy(ctx, W*0.22, H*0.42, 0.9);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px Courier New';
    ctx.fillText('"Who needs romance?"', W/2, H*0.9);
    label(ctx, W, '— NIU PAI ENDING —', '#ff69b488');
  }

  function drawEECSCG(ctx, W, H) {
    // Lab room
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, W, H);
    // Monitor
    ctx.fillStyle = '#0d2200';
    ctx.fillRect(W*0.25, H*0.15, W*0.5, H*0.45);
    ctx.strokeStyle = '#44ff44'; ctx.lineWidth = 2;
    ctx.strokeRect(W*0.25, H*0.15, W*0.5, H*0.45);
    // Code on screen
    ctx.fillStyle = '#44ff44'; ctx.font = '10px Courier New'; ctx.textAlign = 'left';
    const lines = ['$ gcc love.c -o love', '> WARNING: undefined variable', '> GPA: 4.0', '> Girlfriend: NULL', '> Compiling...', '> Segmentation fault'];
    lines.forEach((l, i) => ctx.fillText(l, W*0.27, H*0.22 + i*18));

    // Diploma
    ctx.fillStyle = '#fffde0';
    ctx.fillRect(W*0.6, H*0.55, 80, 60);
    ctx.fillStyle = '#a0003a'; ctx.font = 'bold 9px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('DIPLOMA', W*0.6+40, H*0.55+20);
    ctx.fillText('4.0 GPA', W*0.6+40, H*0.55+36);

    // Boy at desk
    drawPixelBoy(ctx, W*0.38, H*0.55, 0.85);

    ctx.fillStyle = '#fff';
    ctx.font = '11px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('"Achievement Unlocked: Still Single"', W/2, H*0.93);
    label(ctx, W, '— EECS OVERLOAD ENDING —', '#44ff4488');
  }

  function drawSecretCG(ctx, W, H) {
    // Magic forest
    const bg = ctx.createRadialGradient(W/2, H/2, 10, W/2, H/2, W/2);
    bg.addColorStop(0, '#1a3a0a'); bg.addColorStop(1, '#0a0a0a');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

    // Glowing bush
    ctx.fillStyle = '#2e7c2e';
    ctx.fillRect(W/2-30, H*0.4, 60, 50);
    ctx.shadowColor = '#aaff00'; ctx.shadowBlur = 30;
    ctx.strokeStyle = '#aaff00'; ctx.lineWidth = 2;
    ctx.strokeRect(W/2-30, H*0.4, 60, 50);
    ctx.shadowBlur = 0;

    // Stars/sparkles
    ['✦','✧','★','✦','✧'].forEach((s, i) => {
      ctx.fillStyle = '#ffff88';
      ctx.font = `${12 + i*4}px serif`; ctx.textAlign = 'center';
      ctx.fillText(s, W*0.2 + i*80, H*0.3 - Math.sin(i)*30);
    });

    // Mystery figure
    ctx.fillStyle = '#ffffff22';
    ctx.fillRect(W*0.45, H*0.2, 40, 80);
    ctx.fillStyle = '#fff';
    ctx.font = '14px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('???', W/2, H*0.18);

    ctx.fillStyle = '#aaff00';
    ctx.font = '11px Courier New';
    ctx.fillText('"You found something no one else did..."', W/2, H*0.9);
    label(ctx, W, '— SECRET ENDING 🌟 —', '#aaff0088');
  }

  function drawFriendCG(ctx, W, H) {
    ctx.fillStyle = '#e8e8f0'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c8d8f0'; ctx.fillRect(0, H*0.6, W, H*0.4);
    drawPixelBoy(ctx, W*0.3, H*0.3, 1.1);
    drawPixelGirl(ctx, W*0.52, H*0.3, 1.1);
    // Handshake
    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(W*0.42, H*0.55, 18, 10);
    ctx.fillRect(W*0.5,  H*0.55, 18, 10);
    ctx.fillStyle = '#555'; ctx.font = '11px Courier New'; ctx.textAlign = 'center';
    ctx.fillText('"Let\'s just be friends!"', W/2, H*0.88);
    label(ctx, W, '— FRIEND ZONE ENDING —', '#33388888');
  }

  function drawRejectedCG(ctx, W, H) {
    // Grey rainy background
    ctx.fillStyle = '#2a2a3a'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = '#4444aa55'; ctx.lineWidth = 1;
      const rx = (i * 37) % W;
      ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx - 20, H); ctx.stroke();
    }
    ctx.fillStyle = '#5a5a7a'; ctx.fillRect(0, H*0.65, W, H*0.35);
    drawPixelBoy(ctx, W*0.35, H*0.3, 1.0);
    // Arrow pointing away from boy
    ctx.fillStyle = '#cc4444'; ctx.font = '28px serif'; ctx.textAlign = 'center';
    ctx.fillText('←', W*0.58, H*0.5);
    ctx.fillStyle = '#aaa'; ctx.font = '11px Courier New';
    ctx.fillText('"I\'m sorry... this won\'t work out."', W/2, H*0.9);
    label(ctx, W, '— REJECTED ENDING —', '#cc444488');
  }

  // ── Mini pixel character helpers ──────────────────────────
  function drawPixelBoy(ctx, x, y, scale) {
    const s = scale;
    ctx.fillStyle = '#f5cba7'; ctx.fillRect(x, y, 16*s, 18*s);
    ctx.fillStyle = '#2c1a0e'; ctx.fillRect(x, y, 16*s, 7*s);
    ctx.fillStyle = '#aaccff'; ctx.fillRect(x+2*s, y+10*s, 5*s, 4*s); ctx.fillRect(x+9*s, y+10*s, 5*s, 4*s);
    ctx.fillStyle = '#4a90d9'; ctx.fillRect(x+2*s, y+18*s, 12*s, 20*s);
    ctx.fillStyle = '#2c4a7a'; ctx.fillRect(x+3*s, y+38*s, 5*s, 10*s); ctx.fillRect(x+9*s, y+38*s, 5*s, 10*s);
  }

  function drawPixelGirl(ctx, x, y, scale) {
    const s = scale;
    ctx.fillStyle = '#f5cba7'; ctx.fillRect(x, y, 16*s, 18*s);
    ctx.fillStyle = '#2c1a0e'; ctx.fillRect(x-1*s, y, 18*s, 8*s); ctx.fillRect(x-2*s, y+8*s, 4*s, 20*s); ctx.fillRect(x+14*s, y+8*s, 4*s, 20*s);
    ctx.fillStyle = '#ff69b4'; ctx.fillRect(x+1*s, y+18*s, 14*s, 22*s);
    ctx.fillStyle = '#cc4488'; ctx.fillRect(x, y+18*s, 16*s, 5*s);
    ctx.fillStyle = '#f5cba7'; ctx.fillRect(x+3*s, y+40*s, 4*s, 10*s); ctx.fillRect(x+9*s, y+40*s, 4*s, 10*s);
    // blush
    ctx.fillStyle = '#ff99b4aa'; ctx.fillRect(x+1*s, y+13*s, 4*s, 2*s); ctx.fillRect(x+11*s, y+13*s, 4*s, 2*s);
  }

  function label(ctx, W, text, color) {
    ctx.fillStyle = color || '#ffffff44';
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(text, W/2, 14);
  }

  loadData();
  return { resolve, show };
})();

window.EndingManager = EndingManager;
