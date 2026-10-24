const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/home/user/brag-output/work/snapshots';
const BASE = 'http://127.0.0.1:3000';

async function serialize(p) {
  return p.evaluate(() => {
    document.querySelectorAll('input, textarea').forEach(el => {
      if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) el.setAttribute('checked', ''); else el.removeAttribute('checked'); }
      else el.setAttribute('value', el.value);
      if (el.tagName === 'TEXTAREA') el.textContent = el.value;
    });
    document.querySelectorAll('select').forEach(el => {
      [...el.options].forEach(o => { if (o.selected) o.setAttribute('selected', ''); else o.removeAttribute('selected'); });
    });
    document.querySelectorAll('*').forEach(el => {
      if (el.scrollTop > 0) el.setAttribute('data-scroll-top', el.scrollTop);
      if (el.scrollLeft > 0) el.setAttribute('data-scroll-left', el.scrollLeft);
    });
    const clone = document.body.cloneNode(true);
    clone.querySelectorAll('script, iframe, noscript').forEach(n => n.remove());
    return clone.innerHTML;
  });
}
async function css(p) {
  return p.evaluate(() => [...document.styleSheets].map(s => { try { return [...s.cssRules].map(r => r.cssText).join('\n'); } catch (e) { return ''; } }).join('\n'));
}

(async () => {
  const b = await chromium.launch();
  const session = async (user) => {
    const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
    const p = await ctx.newPage();
    await p.goto(BASE + '/login');
    await p.fill('#username', user); await p.fill('#password', 'Demo-UNI-2026!');
    await p.click('button[type=submit]'); await p.waitForTimeout(2500);
    return p;
  };
  const save = async (p, name) => {
    await p.waitForTimeout(1200);
    fs.writeFileSync(`${OUT}/${name}.html`, await serialize(p));
    await p.screenshot({ path: `${OUT}/${name}.png` });
    console.log('ok', name);
  };
  const step = async (p, name, fn) => { try { await fn(); await save(p, name); } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); } };
  const openTask = async (p, text) => {
    await p.goto(BASE + '/tareas'); await p.waitForTimeout(2500);
    await p.locator('h3,h4,p', { hasText: text }).first().click(); await p.waitForTimeout(1800);
  };

  const p = await session('admin.contratos');
  await step(p, 'dashboard', async () => { await p.goto(BASE + '/'); await p.waitForTimeout(2500); });
  await step(p, 'dash_bell', async () => { await p.locator('aside button').filter({ has: p.locator('text=notifications') }).first().click(); });
  await step(p, 'docdetail', async () => { await p.goto(BASE + '/documentos/2'); await p.waitForTimeout(2500); });
  await step(p, 'doclist_clauses', async () => { await p.goto(BASE + '/documentos'); await p.waitForTimeout(2000); await p.getByText('Contrato de Obra LPN', { exact: false }).first().click(); await p.waitForTimeout(1500); });
  await step(p, 'doclist_details', async () => { await p.getByRole('button', { name: 'Detalles', exact: true }).first().click(); });
  await step(p, 'doclist_graph', async () => { await p.getByRole('button', { name: 'Grafo', exact: true }).first().click(); await p.waitForTimeout(2500); });
  await step(p, 'tareas', async () => { await p.goto(BASE + '/tareas'); await p.waitForTimeout(2500); });
  await step(p, 'modal_informe', async () => { await openTask(p, 'informe de seguimiento de la Fiscal'); });
  await step(p, 'modal_pago', async () => { await openTask(p, 'documentación del convenio'); });
  await step(p, 'modal_poliza', async () => { await openTask(p, 'firma del convenio modificatorio'); });
  await step(p, 'modal_acta_detalles', async () => { await openTask(p, 'firma del convenio modificatorio'); await p.getByText('Detalles', { exact: true }).first().click(); });
  await step(p, 'modal_inventario', async () => { await openTask(p, 'estructura metálica del techo'); });
  await step(p, 'modal_inventario_etapas', async () => { await p.getByText('Etapas', { exact: true }).first().click(); });
  fs.writeFileSync(`${OUT}/app.css`, await css(p));
  console.log('css', fs.statSync(`${OUT}/app.css`).size);

  const r = await session('resp.infra');
  await step(r, 'dash_resp', async () => { await r.goto(BASE + '/'); await r.waitForTimeout(2500); });
  await b.close();
})();
