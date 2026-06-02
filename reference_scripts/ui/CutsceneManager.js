'use strict';

/**
 * CutsceneManager — short Mei reaction cutscenes after each mini-game result.
 * Shows Mei's pixel face + comment in a styled overlay, then calls onDone.
 */
const CutsceneManager = (() => {

  // Mei reactions per event
  const REACTIONS = {
    professor_win:  { mood: 'impressed', lines: ["\"You solved his circuits?\nI didn't know you were that smart...\"", "*(Her cheeks turn slightly pink)*"] },
    professor_lose: { mood: 'worried',   lines: ["\"It's okay... Prof. Chen is tough.\"", "\"Don't give up yet! 💪\""] },
    niupai_win:     { mood: 'amused',    lines: ["\"You outran Niu Pai?! That's actually hilarious 😂\"", "\"She likes you though, I can tell.\""] },
    niupai_lose:    { mood: 'laugh',     lines: ["\"Did Niu Pai really get you?\"", "\"...That's kind of adorable actually.\""] },
    father_win:     { mood: 'surprised', lines: ["\"Wait — Dad approved?!\"", "\"He NEVER approves of anyone. You must be something special.\""] },
    father_lose:    { mood: 'sorry',     lines: ["\"Dad can be... a lot. I'm sorry.\"", "\"Keep trying? For me?\" *(small smile)*"] },
    girl_win:       { mood: 'blush',     lines: ["\"...We really are in sync.\"", "*(She looks away, hiding her smile)*\n\"Don't read too much into it. Maybe.\""] },
  };

  // Mood palettes for Mei's face
  const MOODS = {
    impressed: { bg: '#1a0a2e', accent: '#ff69b4', eyes: '⊙ω⊙', blush: true  },
    worried:   { bg: '#0a1a2e', accent: '#88aaff', eyes: '>_<',  blush: false },
    amused:    { bg: '#1a1a0a', accent: '#ffdd44', eyes: '≧∇≦', blush: true  },
    laugh:     { bg: '#1a1a0a', accent: '#ffaa00', eyes: 'XD',   blush: true  },
    surprised: { bg: '#0a1a1a', accent: '#44ffcc', eyes: 'O_O',  blush: false },
    sorry:     { bg: '#1a0a0a', accent: '#ff8888', eyes: ';_;',  blush: false },
    blush:     { bg: '#1a0a1a', accent: '#ff69b4', eyes: '^///^',blush: true  },
  };

  let active    = false;
  let animFrame = null;
  let overlayEl = null;
  let onDoneCb  = null;
  let slideIdx  = 0;
  let reaction  = null;
  let tickTimer = 0;
  let advance   = false;

  function show(key, onDone) {
    reaction = REACTIONS[key];
    if (!reaction) { if (onDone) onDone(); return; }

    onDoneCb = onDone;
    slideIdx  = 0;
    active    = true;
    advance   = false;
    tickTimer = 0;

    _ensureOverlay();
    overlayEl.classList.add('active');

    document.addEventListener('keydown', _onKey);
    overlayEl.addEventListener('click',  _onClick);

    animFrame = requestAnimationFrame(_render);
    _showSlide();
  }

  function _showSlide() {
    const textEl = document.getElementById('cs-text');
    if (textEl) {
      textEl.style.opacity = 0;
      textEl.textContent   = reaction.lines[slideIdx] || '';
      // Fade in text
      setTimeout(() => { textEl.style.opacity = 1; }, 100);
    }
  }

  function _onKey(e) {
    if (e.key === 'e' || e.key === 'E' || e.key === ' ' || e.key === 'Enter') _nextOrClose();
  }
  function _onClick() { _nextOrClose(); }

  function _nextOrClose() {
    slideIdx++;
    if (slideIdx >= reaction.lines.length) {
      _close();
    } else {
      _showSlide();
    }
  }

  function _close() {
    active = false;
    cancelAnimationFrame(animFrame);
    if (overlayEl) overlayEl.classList.remove('active');
    document.removeEventListener('keydown', _onKey);
    if (overlayEl) overlayEl.removeEventListener('click', _onClick);
    if (onDoneCb) { const cb = onDoneCb; onDoneCb = null; cb(); }
  }

  function _render() {
    if (!active) return;
    const canvas = document.getElementById('cs-canvas');
    if (canvas) _drawMei(canvas);
    animFrame = requestAnimationFrame(_render);
  }

  function _drawMei(canvas) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const mood = MOODS[reaction.mood] || MOODS.impressed;
    tickTimer++;

    ctx.clearRect(0, 0, W, H);

    // BG gradient
    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, mood.bg);
    grd.addColorStop(1, '#000');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Sparkle particles
    for (let i = 0; i < 6; i++) {
      const a = (tickTimer * 0.02 + i * 1.05) % (Math.PI * 2);
      const r = 70 + Math.sin(tickTimer * 0.03 + i) * 15;
      const sx = W / 2 + Math.cos(a) * r;
      const sy = H / 2 + Math.sin(a) * r - 10;
      ctx.fillStyle = mood.accent + '66';
      ctx.font = '12px serif';
      ctx.textAlign = 'center';
      ctx.fillText('✦', sx, sy);
    }

    const cx = W / 2, cy = H / 2 - 10;

    // ── Mei face (pixel art) ──
    // Hair back layer
    ctx.fillStyle = '#2c1a0e';
    ctx.fillRect(cx - 36, cy - 54, 72, 20);
    ctx.fillRect(cx - 40, cy - 34, 12, 50); // left strand
    ctx.fillRect(cx + 28, cy - 34, 12, 50); // right strand

    // Face
    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(cx - 30, cy - 42, 60, 52);

    // Hair front
    ctx.fillStyle = '#2c1a0e';
    ctx.fillRect(cx - 30, cy - 42, 60, 14);
    // Bangs
    ctx.fillRect(cx - 30, cy - 28, 18, 8);
    ctx.fillRect(cx + 12, cy - 28, 18, 8);

    // Eyes (text expression)
    ctx.fillStyle = mood.accent;
    ctx.font = `bold 13px Courier New`;
    ctx.textAlign = 'center';
    ctx.fillText(mood.eyes, cx, cy - 10);

    // Blush
    if (mood.blush) {
      ctx.fillStyle = '#ff99b4aa';
      ctx.fillRect(cx - 30, cy - 8, 12, 5);
      ctx.fillRect(cx + 18, cy - 8, 12, 5);
    }

    // Mouth (small smile bob with tick)
    ctx.fillStyle = '#a0503a';
    ctx.fillRect(cx - 6, cy + 6 + (Math.sin(tickTimer * 0.05) > 0 ? 1 : 0), 12, 3);

    // Neck + body (peek)
    ctx.fillStyle = '#f5cba7';
    ctx.fillRect(cx - 8, cy + 12, 16, 10);
    ctx.fillStyle = '#ff99cc';
    ctx.fillRect(cx - 24, cy + 22, 48, 18);

    // Floating hearts
    const heartAlpha = 0.5 + 0.4 * Math.sin(tickTimer * 0.08);
    ctx.globalAlpha  = heartAlpha;
    ctx.fillStyle    = mood.accent;
    ctx.font = '16px serif';
    ctx.fillText('♥', cx - 45, cy - 30 + Math.sin(tickTimer * 0.04) * 5);
    ctx.fillText('♥', cx + 45, cy - 20 + Math.cos(tickTimer * 0.04) * 5);
    ctx.globalAlpha = 1;
  }

  function _ensureOverlay() {
    if (overlayEl) return;
    overlayEl = document.getElementById('cutscene-overlay');
  }

  return { show };
})();

window.CutsceneManager = CutsceneManager;
