const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const out = process.argv[2]; const times = process.argv.slice(3).map(Number);
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('console', m => { if (m.type() === 'error') console.log('console:', m.text()); });
  p.on('pageerror', e => console.log('pageerror:', e.message));
  await p.goto('http://127.0.0.1:8766/index.html');
  await p.waitForFunction(() => window.__ready || window.__error, null, { timeout: 60000 });
  const err = await p.evaluate(() => window.__error);
  if (err) { console.log('ERROR', err); await b.close(); process.exit(1); }
  for (const t of times) {
    const t0 = Date.now();
    await p.evaluate(t => window.renderFrame(t), t);
    await p.screenshot({ path: `${out}/t${t.toFixed(2).padStart(6, '0')}.png` });
    console.log('t', t, Date.now() - t0, 'ms');
  }
  await b.close();
})();
