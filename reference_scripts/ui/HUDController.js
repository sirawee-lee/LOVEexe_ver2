'use strict';

const HUDController = (() => {

  let toastTimer = null;

  function update() {
    const s = GameManager.getState();

    // ── HP bar (4 slots) ──
    const hpEl = document.getElementById('hud-hp');
    if (hpEl) {
      hpEl.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const slot = document.createElement('div');
        slot.className = 'hp-slot' + (i < s.hp ? ' hp-full' : ' hp-empty');
        hpEl.appendChild(slot);
      }
    }

    // ── Heart fragments (0-4) ──
    const heartsEl = document.getElementById('hud-hearts');
    if (heartsEl) {
      heartsEl.innerHTML = '';
      for (let i = 0; i < 4; i++) {
        const span = document.createElement('span');
        span.className = 'hud-heart';
        // Partial fill like Zelda: full / empty
        span.textContent = i < s.hearts ? '💗' : '🤍';
        heartsEl.appendChild(span);
      }
    }

    const coinsEl = document.getElementById('hud-coins');
    if (coinsEl) coinsEl.textContent = s.coins;

    const affEl = document.getElementById('hud-affinity');
    if (affEl) affEl.textContent = `♥ ${s.affinity}`;
  }

  function updateMiniGameHUD(left, center, right) {
    const l = document.getElementById('mg-left');
    const c = document.getElementById('mg-center');
    const r = document.getElementById('mg-right');
    if (l && left   !== undefined) l.textContent = left;
    if (c && center !== undefined) c.textContent = center;
    if (r && right  !== undefined) r.textContent = right;
  }

  function showToast(msg, duration = 2200) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.remove('active');
    void toast.offsetWidth;
    toast.classList.add('active');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('active'), duration);
  }

  function setMiniGameTitle(title, subtitle) {
    const t = document.getElementById('minigame-title');
    const s = document.getElementById('minigame-subtitle');
    if (t) t.textContent = title;
    if (s) s.textContent = subtitle || '';
  }

  // ── Heart Fragment Popup (Zelda-style) ───────────────────
  function showHeartFragment(source, onDone) {
    const overlay = document.getElementById('heart-fragment-overlay');
    const label   = document.getElementById('heart-fragment-label');
    if (!overlay) { if (onDone) onDone(); return; }

    label.textContent = source ? `From: ${source}` : '';
    overlay.classList.add('active');

    // Animate the heart fill
    const fill = document.getElementById('heart-fill-bar');
    if (fill) {
      fill.style.width = '0%';
      setTimeout(() => { fill.style.width = '100%'; }, 100);
    }

    setTimeout(() => {
      overlay.classList.remove('active');
      if (onDone) onDone();
    }, 2800);
  }

  function showMiniGameResult(win, titleText, bodyText, onContinue) {
    const result = document.getElementById('minigame-result');
    const rTitle = document.getElementById('result-title');
    const rBody  = document.getElementById('result-body');
    const rBtn   = document.getElementById('result-btn');

    rTitle.textContent = win ? '✨ MISSION COMPLETE!' : '💔 FAILED';
    rTitle.style.color = win ? '#ff69b4' : '#cc4444';
    rBody.innerHTML    = bodyText ? bodyText.replace(/\n/g, '<br>') : '';
    result.classList.add('active');

    rBtn.onclick = () => {
      result.classList.remove('active');
      GameManager.showScreen('game');
      PlayerController.setDialogueOpen(false);
      if (onContinue) onContinue();
    };
  }

  return { update, updateMiniGameHUD, showToast, setMiniGameTitle, showMiniGameResult, showHeartFragment };
})();

window.HUDController = HUDController;
