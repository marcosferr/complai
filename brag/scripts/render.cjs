const { chromium } = require('playwright');
const [,, a, b] = process.argv.map(Number); const FPS = 30;
(async () => {
  const br = await chromium.launch();
  const p = await br.newPage({ viewport: { width: 1920, height: 1080 } });
  p.on('pageerror', e => console.log('pageerror', e.message));
  await p.goto('http://127.0.0.1:8766/index.html');
  await p.waitForFunction(() => window.__ready || window.__error, null, { timeout: 90000 });
  if (await p.evaluate(() => window.__error)) { console.log('ERR'); process.exit(1); }
  for (let f = a; f < b; f++) {
    await p.evaluate(t => window.renderFrame(t), f / FPS);
    await p.screenshot({ path: `/home/user/brag-output/work/frames/f${String(f).padStart(5, '0')}.png` });
  }
  await br.close(); console.log('done', a, b);
})();
