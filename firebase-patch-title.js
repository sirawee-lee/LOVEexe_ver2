// Firebase Hosting predeploy hook.
// Cocos Creator's build "Title" field rejects periods, so it sanitizes the game
// name "LOVE.EXE" -> "LOVE_EXE" in the generated index.html. This restores the
// real name in the built page right before every `firebase deploy`.
const fs = require('fs');
const page = 'build/web-desktop/index.html';
try {
  const html = fs.readFileSync(page, 'utf8');
  fs.writeFileSync(page, html.replace(/LOVE_EXE/g, 'LOVE.EXE'));
  console.log('[predeploy] title patched -> LOVE.EXE');
} catch (e) {
  console.warn('[predeploy] title patch skipped:', e.message);
}
