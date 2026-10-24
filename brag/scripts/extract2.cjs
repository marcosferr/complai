const { chromium } = require('playwright');
const fs = require('fs');
const OUT = '/home/user/brag-output/work/snapshots';
const BASE = 'http://127.0.0.1:3000';
const serialize = (p) => p.evaluate(() => {
  document.querySelectorAll('input, textarea').forEach(el => {
    if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) el.setAttribute('checked', ''); else el.removeAttribute('checked'); }
    else el.setAttribute('value', el.value);
    if (el.tagName === 'TEXTAREA') el.textContent = el.value;
  });
  document.querySelectorAll('select').forEach(el => [...el.options].forEach(o => o.selected ? o.setAttribute('selected', '') : o.removeAttribute('selected')));
  document.querySelectorAll('*').forEach(el => { if (el.scrollTop > 0) el.setAttribute('data-scroll-top', el.scrollTop); });
  const c = document.body.cloneNode(true); c.querySelectorAll('script, iframe, noscript').forEach(n => n.remove()); return c.innerHTML;
});
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1920, height: 1080 } });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.goto(BASE + '/login'); await p.fill('#username', 'admin.contratos'); await p.fill('#password', 'Demo-UNI-2026!');
  await p.click('button[type=submit]'); await p.waitForTimeout(2500);
  const save = async (n) => { await p.waitForTimeout(1500); fs.writeFileSync(`${OUT}/${n}.html`, await serialize(p)); await p.screenshot({ path: `${OUT}/${n}.png` }); console.log('ok', n); };
  await p.goto(BASE + '/tareas'); await p.waitForTimeout(2500);
  await p.locator('h3,h4,p', { hasText: 'estructura metálica del techo' }).first().click(); await p.waitForTimeout(1800);
  await p.getByRole('button', { name: /Enviar a Revisión Gerencial/ }).first().click();
  await p.waitForTimeout(2500); await save('accion_1');
  const confirm = p.getByRole('button', { name: /Confirmar|Enviar|Aceptar/ }).last();
  if (await confirm.isVisible().catch(() => false)) { await confirm.click(); }
  await save('accion_2');
  await p.getByText('Etapas', { exact: true }).first().click().catch(() => {});
  await save('accion_3');
  await b.close();
})();
