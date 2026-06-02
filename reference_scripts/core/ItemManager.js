'use strict';

/**
 * ItemManager — spawns and manages collectible items on the world map.
 *
 * Items:
 *  USB_DRIVE  → +15 affinity  "That's where my assignment was!"
 *  COFFEE     → +20s to next minigame timer (stored as bonus)
 *  FLOWER     → +10 affinity, +1 coin, romantic pickup
 *  COIN_BAG   → +30 coins
 *  LOVE_LETTER→ +20 affinity (rare, hidden)
 */
const ItemManager = (() => {

  const ITEMS_DEF = [
    { id: 'usb',      emoji: '💾', label: 'USB Drive',   x: 520, y: 100, affinity: 15, coins: 0,  timerBonus: 0,  msg: '💾 Found USB Drive! +15 Affinity' },
    { id: 'coffee',   emoji: '☕', label: 'Coffee',       x: 180, y: 400, affinity:  0, coins: 0,  timerBonus: 20, msg: '☕ Coffee boost! +20s on next mini-game' },
    { id: 'flower',   emoji: '🌸', label: 'Flower',       x: 680, y: 180, affinity: 10, coins: 5,  timerBonus: 0,  msg: '🌸 Pretty flower! +10 Affinity' },
    { id: 'coinbag',  emoji: '💰', label: 'Coin Bag',     x: 120, y: 460, affinity:  0, coins: 30, timerBonus: 0,  msg: '💰 Found coins! +30 Coins' },
    { id: 'letter',   emoji: '💌', label: 'Love Letter',  x: 720, y: 460, affinity: 20, coins: 0,  timerBonus: 0,  msg: '💌 A love letter… +20 Affinity', hidden: true },
  ];

  let items = [];          // active items (not yet collected)
  let timerBonus = 0;      // seconds to add to next mini-game

  function reset() {
    items = ITEMS_DEF.map(def => ({ ...def, collected: false, bobOffset: Math.random() * Math.PI * 2 }));
    timerBonus = 0;
  }

  function update(playerX, playerY, playerW, playerH) {
    const reach = 28;
    items.forEach(item => {
      if (item.collected) return;
      const dx = (playerX + playerW/2) - (item.x + 16);
      const dy = (playerY + playerH/2) - (item.y + 16);
      if (Math.sqrt(dx*dx + dy*dy) < reach + 16) {
        collect(item);
      }
    });
  }

  function collect(item) {
    item.collected = true;
    AudioManager.playSFX('pickup');

    if (item.affinity)    GameManager.changeAffinity(item.affinity);
    if (item.coins)       GameManager.addCoins(item.coins);
    if (item.timerBonus)  timerBonus += item.timerBonus;

    // Special: love letter triggers romance BGM briefly
    if (item.id === 'letter') AudioManager.onRomance();

    HUDController.showToast(item.msg, 2500);
  }

  function getTimerBonus() {
    const b = timerBonus;
    timerBonus = 0; // consume once
    return b;
  }

  function draw(ctx) {
    const t = performance.now() / 1000;
    items.forEach(item => {
      if (item.collected) return;
      // Bob up and down
      const bob = Math.sin(t * 2 + item.bobOffset) * 4;

      // Glow halo
      ctx.save();
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur  = 12;
      ctx.font = '22px serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.emoji, item.x + 16, item.y + 18 + bob);
      ctx.restore();

      // Sparkle dots rotating around item
      for (let i = 0; i < 4; i++) {
        const angle = t * 2 + i * Math.PI / 2;
        const sx = item.x + 16 + Math.cos(angle) * 14;
        const sy = item.y + 16 + Math.sin(angle) * 14 + bob;
        ctx.fillStyle = `rgba(255,215,0,${0.4 + 0.3 * Math.sin(t*4+i)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }

  return { reset, update, draw, getTimerBonus };
})();

window.ItemManager = ItemManager;
