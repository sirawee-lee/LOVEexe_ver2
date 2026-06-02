'use strict';

// ── Boot sequence ─────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {

  // Generate starfield on title screen
  const starsContainer = document.getElementById('stars-container');
  if (starsContainer) {
    for (let i = 0; i < 60; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left   = Math.random() * 100 + '%';
      star.style.top    = Math.random() * 100 + '%';
      star.style.animationDelay = Math.random() * 2 + 's';
      star.style.opacity = Math.random() * 0.8 + 0.2;
      starsContainer.appendChild(star);
    }
  }

  // Initialize HUD (with default zeroed state)
  GameManager.reset();
  HUDController.update();

  // Show title screen
  GameManager.showScreen('title');
});
