'use strict';
/* UNI Contratos — composición de video. Cada cuadro es una función pura de t (segundos). */
const W = 1920, H = 1080, DUR = 49.2;

// ───────────────────────── matemática ─────────────────────────
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const E = {
  lin: t => t,
  inCubic: t => t * t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: t => 1 - Math.pow(1 - t, 5),
  inOutQuint: t => (t < 0.5 ? 16 * Math.pow(t, 5) : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: t => { const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  spring: t => (t >= 1 ? 1 : 1 - Math.exp(-6.5 * t) * Math.cos(10.5 * t)),
};
const P = (t, a, d, e = E.outCubic) => e(clamp((t - a) / d));
const env = (t, a, b, din = 0.35, dout = 0.3, ein = E.outCubic, eout = E.inCubic) =>
  Math.min(P(t, a, din, ein), 1 - P(t, b - dout, dout, eout));

// ───────────────────────── DOM ─────────────────────────
const $ = (s, r = document) => r.querySelector(s);
function mk(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
const css = (e, o) => { for (const k in o) e.style[k] = o[k]; };
const show = (e, v) => { const s = v ? '' : 'none'; if (e.style.display !== s) e.style.display = s; };
const SVGNS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs, parent) => {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
};
function deepest(root, text, { sel = '*', exact = false, nth = 0 } = {}) {
  const has = e => (exact ? e.textContent.trim() === text : e.textContent.includes(text));
  const list = [...root.querySelectorAll(sel)].filter(e => has(e) && ![...e.children].some(has));
  if (!list[nth]) throw new Error(`no encontrado: "${text}" (${nth})`);
  return list[nth];
}
function climb(e, pred) { while (e && !pred(e)) e = e.parentElement; return e; }

// ───────────────────────── colores ─────────────────────────
const C = {
  bordo: '#AE152D', bordo2: '#9D2235', ladrillo: '#CC6633', oro: '#C8860A', ink: '#1E1A1A',
  verde: '#15803D', ambar: '#D97706', rojo: '#B91C1C',
};

// ───────────────────────── datos ─────────────────────────
const RUBRIC = [
  'Obligaciones de las partes', 'Fechas y plazos críticos', 'Entregables previstos', 'Documentación pendiente',
  'Desviaciones o incumplimientos', 'Alertas y acciones de seguimiento', 'Ficha resumida del contrato',
  'Semáforo: normal · atención · crítico',
];
// t de cada tilde (índice = punto − 1) y ventana en la que el punto está activo
const CHECK = [13.8, 16.2, 21.0, 23.4, 28.2, 33.0, 11.4, 18.6];
const ACTIVE = [[12.0, 14.1], [14.4, 16.5], [19.2, 21.3], [21.6, 23.7], [24.0, 28.5], [28.8, 33.3], [9.9, 11.7], [16.8, 18.9]];

const CAPS = [
  { t0: 9.95, t1: 11.85, n: '07', k: 'Ficha resumida del contrato', heads: [{ t0: 9.95, t1: 11.85, l: ['El contrato,', '<b>en una ficha.</b>'] }] },
  { t0: 12.2, t1: 14.25, n: '01', k: 'Obligaciones de las partes', heads: [{ t0: 12.2, t1: 14.25, l: ['De cláusulas a', 'obligaciones', '<b>con responsable.</b>'] }] },
  { t0: 14.65, t1: 16.62, n: '02', k: 'Fechas y plazos críticos', heads: [{ t0: 14.65, t1: 16.62, l: ['Cada obligación,', '<b>con su vencimiento.</b>'] }] },
  { t0: 16.8, t1: 19.05, n: '08', k: 'Tablero tipo semáforo', heads: [{ t0: 16.8, t1: 19.05, lt: [16.85, 17.45, 18.05], l: [`<span style="color:${C.verde}">Normal.</span>`, `<span style="color:${C.ambar}">Atención.</span>`, `<span style="color:${C.rojo}">Crítico.</span>`] }] },
  { t0: 19.35, t1: 21.45, n: '03', k: 'Entregables previstos', heads: [{ t0: 19.35, t1: 21.45, l: ['Cada entrega,', '<b>con su evidencia.</b>'] }] },
  { t0: 21.75, t1: 23.85, n: '04', k: 'Documentación pendiente', heads: [{ t0: 21.75, t1: 23.85, l: ['Lo que falta,', '<b>a la vista.</b>'] }] },
  { t0: 24.15, t1: 28.65, n: '05', k: 'Desviaciones o incumplimientos', heads: [
    { t0: 24.15, t1: 26.3, l: ['Lo vencido,', '<b>marcado en rojo.</b>'] },
    { t0: 26.45, t1: 28.65, l: ['Con impacto', 'y riesgo', '<b>evaluados.</b>'] }] },
  { t0: 28.95, t1: 33.45, n: '06', k: 'Alertas y acciones de seguimiento', heads: [
    { t0: 28.95, t1: 31.1, l: ['Alertas en la app', '<b>y por correo.</b>'] },
    { t0: 31.3, t1: 33.45, l: ['Cada alerta,', 'una acción', '<b>con responsable.</b>'] }] },
  { t0: 33.75, t1: 38.3, n: '✓', k: 'Tablero del administrador', heads: [{ t0: 33.75, t1: 38.3, l: ['Todo el contrato,', '<b>en un tablero.</b>'] }] },
];

const SHEET_HTML = `
<h1>CONTRATO DE PRESTACIÓN DE SERVICIOS</h1>
<div class="k-sub">Mantenimiento preventivo y correctivo de equipos de climatización</div>
<div class="k-parties">Entre la UNIVERSIDAD NACIONAL DE ITAPÚA (en adelante, la UNI) y el PROVEEDOR, se celebra el presente contrato, sujeto a las siguientes cláusulas:</div>
<h2>CLÁUSULA 1 — OBJETO DEL CONTRATO</h2>
<p>El PROVEEDOR se obliga a prestar a la UNI el servicio de mantenimiento preventivo y correctivo de los equipos de climatización instalados en la Sede Central y en las Facultades, conforme a las Especificaciones Técnicas del llamado.</p>
<h2>CLÁUSULA 2 — PLAZO DE VIGENCIA</h2>
<p>El contrato tendrá una vigencia de <span class="k-hl" data-h="0">doce (12) meses</span> contados a partir de la firma del acta de inicio de servicios, pudiendo ampliarse conforme a la normativa vigente.</p>
<h2>CLÁUSULA 3 — GARANTÍA DE FIEL CUMPLIMIENTO</h2>
<p>Dentro de los <span class="k-hl" data-h="1">diez (10) días calendario</span> siguientes a la firma del contrato, el PROVEEDOR deberá presentar una garantía de fiel cumplimiento equivalente al cinco por ciento (5%) del monto total del contrato.</p>
<h2>CLÁUSULA 4 — PLAN DE MANTENIMIENTO Y ENTREGABLES</h2>
<p>El PROVEEDOR realizará mantenimientos preventivos mensuales y presentará, dentro de los <span class="k-hl" data-h="2">cinco (5) días hábiles</span> posteriores a cada visita, un informe técnico firmado por un profesional matriculado.</p>
<h2>CLÁUSULA 5 — TIEMPOS DE RESPUESTA</h2>
<p>Ante un pedido de mantenimiento correctivo, el PROVEEDOR deberá presentarse dentro de las <span class="k-hl" data-h="3">veinticuatro (24) horas</span> si la falla afecta aulas, laboratorios o salas de servidores, y dentro de las setenta y dos (72) horas en los demás casos.</p>
<h2>CLÁUSULA 6 — FORMA DE PAGO Y DOCUMENTACIÓN</h2>
<p>La UNI abonará mensualmente los servicios efectivamente prestados, previa presentación de la factura, el informe técnico aprobado, el certificado de cumplimiento tributario y la constancia de pago del IPS.</p>
<h2>CLÁUSULA 7 — MULTAS Y PENALIDADES</h2>
<p>El atraso dará lugar a una multa del <span class="k-hl" data-h="4">0,5% del monto mensual por cada día de atraso</span>, hasta un máximo del diez por ciento (10%) del monto total del contrato.</p>
<h2>CLÁUSULA 8 — ADMINISTRADOR DEL CONTRATO</h2>
<p>La UNI designa como Administrador del Contrato al responsable de la Dirección de Infraestructura.</p>`;
const HL = [
  { t: 0.6, tag: '12 meses' }, { t: 1.2, tag: '10 días' }, { t: 1.8, tag: '5 días hábiles' },
  { t: 3.0, tag: '24 h' }, { t: 3.6, tag: '0,5 % por día' },
];

// ───────────────────────── estado global ─────────────────────────
const S = {};      // elementos
const PG = {};     // páginas de la app
const R = {};      // rectángulos medidos (coordenadas de la app)
let SKF, CKF, RINGS = [], COUNTS = [], FLIGHTS = [], GRAPH;

function brickPattern(id, stroke, w = 150, h = 60) {
  return `<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs>
  <pattern id="${id}" width="${w}" height="${h * 2}" patternUnits="userSpaceOnUse">
    <path d="M0 0.5 H${w} M0 ${h + 0.5} H${w} M0.5 0 V${h} M${w / 2 + 0.5} ${h} V${h * 2}" fill="none" stroke="${stroke}" stroke-width="2"/>
  </pattern></defs><rect width="100%" height="100%" fill="url(#${id})"/></svg>`;
}

function archSVG(parent) {
  // Arco de medio punto con dovelas de ladrillo, como el del escudo.
  const s = svg('svg', { viewBox: '0 0 2400 2700', id: 'k-arch' }, parent);
  const cx = 1200, cy = 1200, R1 = 1200, R0 = 1095;
  svg('path', { d: `M0 2700 V${cy} A${R1} ${R1} 0 0 1 2400 ${cy} V2700 Z`, fill: C.bordo }, s);
  const n = 25, gap = 0.9 * Math.PI / 180;
  const tones = ['#CC6633', '#C45E2C', '#D46F3B', '#BF5A2A', '#CF6A36'];
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i / n) * Math.PI + gap / 2, a1 = Math.PI + ((i + 1) / n) * Math.PI - gap / 2;
    const p = (r, a) => `${cx + r * Math.cos(a)} ${cy + r * Math.sin(a)}`;
    svg('path', { d: `M${p(R0, a0)} L${p(R1, a0)} A${R1} ${R1} 0 0 1 ${p(R1, a1)} L${p(R0, a1)} A${R0} ${R0} 0 0 0 ${p(R0, a0)} Z`, fill: tones[i % 5] }, s);
  }
  for (const side of [0, 1]) {
    for (let k = 0; k < 24; k++) {
      const y = cy + 6 + k * 62, x = side ? 2400 - 105 : 0, off = k % 2 ? 0 : 0;
      svg('rect', { x: x + off, y, width: 105, height: 56, fill: tones[(k + side) % 5], rx: 3 }, s);
    }
  }
  return s;
}

// ───────────────────────── construcción ─────────────────────────
async function build() {
  const stage = $('#stage');
  // Fondos
  S.bgPaper = mk('div', 'k-layer', stage); S.bgPaper.id = 'k-bgPaper';
  mk('div', 'k-bricks', S.bgPaper, brickPattern('bp', '#CC6633'));
  S.bgBordo = mk('div', 'k-layer', stage); S.bgBordo.id = 'k-bgBordo';
  mk('div', 'k-bricks', S.bgBordo, brickPattern('bb', '#6E0A1C'));

  // Gancho: hoja de contrato
  S.hook = mk('div', 'k-layer', stage);
  S.sheetWrap = mk('div', 'k-layer', S.hook); S.sheetWrap.id = 'k-sheetWrap';
  S.sheet = mk('div', null, S.sheetWrap, SHEET_HTML); S.sheet.id = 'k-sheet';
  S.hls = [...S.sheet.querySelectorAll('.k-hl')];
  S.tags = HL.map(h => mk('div', 'k-tag', S.sheet, `<span class="material-icons">schedule</span>${h.tag}`));
  const hookLines = [
    { y: 300, txt: ['Un', 'contrato.'], color: [C.ink, C.ink] },
    { y: 420, txt: ['11', 'obligaciones.'], color: [C.bordo, C.ink] },
    { y: 300, txt: ['Seguimiento'], color: [C.ink] },
    { y: 420, txt: ['de', 'forma', 'manual.'], color: [C.ink, C.ink, C.bordo] },
  ];
  S.hookLines = hookLines.map(L => {
    const line = mk('div', 'k-hookLine', S.hook); line.style.top = L.y + 'px';
    const words = L.txt.map((w, i) => {
      const wrap = mk('span', 'k-word-wrap', line);
      const s = mk('span', 'k-word', wrap, w); s.style.color = L.color[i];
      if (i < L.txt.length - 1) line.appendChild(document.createTextNode(' '));
      return s;
    });
    return { line, words };
  });
  S.strike = svg('svg', { id: 'k-strike', width: 10, height: 10 }, S.hook);
  S.strikePath = svg('path', { d: '', fill: 'none', stroke: C.bordo, 'stroke-width': 11, 'stroke-linecap': 'round' }, S.strike);

  // Pantalla de la app
  S.screenWrap = mk('div', 'k-layer', stage); S.screenWrap.id = 'k-screenWrap';
  S.screen = mk('div', null, S.screenWrap); S.screen.id = 'k-screen';
  S.cam = mk('div', null, S.screen); S.cam.id = 'k-cam';
  mk('div', null, S.screen).id = 'k-glare';

  const names = ['docdetail', 'tareas', 'modal_informe', 'modal_pago', 'dash_resp', 'modal_acta_detalles',
    'dash_bell', 'modal_inventario_etapas', 'accion_3', 'dashboard'];
  const fetchText = n => fetch(`snapshots/${n}.html`).then(r => r.text());
  const htmls = await Promise.all(names.map(fetchText));
  names.forEach((n, i) => {
    const el = mk('div', 'k-page', S.cam, htmls[i]);
    el.dataset.page = n;
    show(el, false);
    PG[n] = { el, name: n, main: el.querySelector('main') };
    const outer = el.querySelector('div.fixed.inset-0.z-50');
    if (outer) { PG[n].backdrop = outer.querySelector(':scope > .fixed.inset-0'); PG[n].panel = outer.querySelector(':scope > .relative'); }
  });
  S.camOverlay = mk('div', null, S.cam); S.camOverlay.id = 'k-camOverlay';
  const [graphHtml, accion1Html, emailHtml] = await Promise.all(['doclist_graph', 'accion_1', 'email'].map(fetchText));

  // Grafo
  S.graph = mk('div', 'k-layer', stage);
  S.gInner = mk('div', 'k-abs', S.graph); css(S.gInner, { width: '1920px', height: '1080px', transformOrigin: '50% 50%' });
  S.edges = svg('svg', { id: 'k-edges', viewBox: '0 0 1920 1080' }, S.gInner);
  const tmp = mk('div'); tmp.innerHTML = graphHtml;
  const nodes = {};
  tmp.querySelectorAll('.react-flow__node').forEach(n => {
    const inner = n.firstElementChild.cloneNode(true);
    inner.querySelectorAll('.react-flow__handle').forEach(h => h.remove());
    const wrap = mk('div', 'k-node', S.gInner); wrap.appendChild(inner);
    inner.style.boxSizing = 'border-box'; inner.style.width = '100%';
    nodes[n.dataset.id] = { id: n.dataset.id, wrap, inner };
  });
  const edges = [...tmp.querySelectorAll('[data-testid^="rf__edge-"]')].map(e => e.dataset.testid.replace('rf__edge-', ''));
  GRAPH = { nodes, edges };
  S.gLabels = ['1 contrato', '8 cláusulas', '11 obligaciones'].map(t => {
    const [n, ...w] = t.split(' ');
    return mk('div', 'k-gLabel', S.gInner, `<b>${n}</b>${w.join(' ')}`);
  });

  // Pop-outs: semáforo, email, toast
  S.pops = mk('div', 'k-layer', stage);
  S.sema = mk('div', null, S.pops); S.sema.id = 'k-sema';
  mk('div', 'k-semaT', S.sema, 'Semáforo de vencimientos');
  S.semaRows = [['NORMAL', C.verde, '#22C55E'], ['ATENCIÓN', C.ambar, '#F59E0B'], ['CRÍTICO', C.rojo, '#EF4444']].map(([lab, col, light], k) => {
    const row = mk('div', 'k-semaRow', S.sema); row.style.top = (72 + k * 128) + 'px';
    const l = mk('div', 'k-light', row);
    const tx = mk('div', 'k-semaL', row, lab); tx.style.color = col;
    return { row, l, tx, light };
  });
  S.email = mk('div', null, S.pops); S.email.id = 'k-email';
  mk('div', null, S.email, '<span class="material-icons">mail</span>Resumen diario · UNI Contratos').id = 'k-emailBar';
  const host = mk('div', null, S.email);
  const sh = host.attachShadow({ mode: 'open' });
  sh.innerHTML = emailHtml.replace(/<img[^>]*cid:owl_reading[^>]*>/, '');
  const tmp2 = mk('div'); tmp2.innerHTML = accion1Html;
  const toastSrc = tmp2.querySelector('.fixed.top-4.right-4 > div');
  S.toast = mk('div', 'k-pop', S.pops);
  css(S.toast, { background: '#fff', borderRadius: '10px', boxShadow: '0 24px 50px rgba(40,20,15,0.25)' });
  S.toast.appendChild(toastSrc.cloneNode(true));
  S.toast.firstElementChild.style.margin = '0';

  // UI: lockups, rúbrica, captions
  S.ui = mk('div', 'k-layer', stage);
  S.lock = buildLock(S.ui, 230, 325);
  S.rTitle = mk('div', 'k-abs', S.ui, `<div style="font-weight:600;font-size:21px;letter-spacing:.16em;color:#F2C46D;text-transform:uppercase">Hackatón SOPAIA · Desafío 1</div>
    <div style="font-weight:700;font-size:78px;letter-spacing:-.035em;color:#fff;line-height:1.05;margin-top:14px">Lo que pide el Desafío 1</div>`);
  css(S.rTitle, { left: '230px', top: '300px' });
  S.railLine = mk('div', null, S.ui); S.railLine.id = 'k-railLine';
  S.items = RUBRIC.map((txt, i) => {
    const it = mk('div', 'k-item', S.ui);
    const halo = mk('div', 'k-halo', it);
    const circ = mk('div', 'k-circ', it);
    const disk = mk('div', 'k-disk', circ);
    const num = mk('div', 'k-num', circ, String(i + 1));
    const chk = svg('svg', { class: 'k-chk', viewBox: '0 0 100 100' }, circ);
    const path = svg('path', { d: 'M29 52 L44 66 L72 36', fill: 'none', stroke: '#fff', 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1 }, chk);
    const dots = [...Array(6)].map((_, k) => { const d = mk('div', 'k-dot', it); d.style.background = k % 2 ? C.oro : C.ladrillo; return d; });
    const labW = mk('div', 'k-lab k-labW', it, txt);
    const labI = mk('div', 'k-lab k-labI', it, txt);
    return { it, halo, circ, disk, num, path, dots, labW, labI };
  });
  S.caps = CAPS.map(c => {
    const box = mk('div', 'k-cap', S.ui);
    const kick = mk('div', 'k-kick', box, `<span class="k-n">${c.n}</span><span class="k-t">${c.k}</span>`);
    const heads = c.heads.map(h => {
      const hb = mk('div', 'k-head', box);
      if (c.heads.length > 1) css(hb, { position: 'absolute', left: '0', top: '64px', width: '560px' });
      const lines = h.l.map(l => { const w = mk('div', 'k-lw', hb); return mk('div', 'k-li', w, l); });
      return { hb, lines, h };
    });
    return { c, box, kick, heads };
  });
  S.score = mk('div', null, S.ui); S.score.id = 'k-score';
  S.scoreSub = mk('div', null, S.ui, 'puntos del Desafío 1, cubiertos.'); S.scoreSub.id = 'k-scoreSub';
  S.quote = mk('div', 'k-quoteBox', S.ui);
  S.quoteKick = mk('div', 'k-kick', S.quote, '<span class="k-n">✓</span><span class="k-t">Resultado esperado</span>');
  S.quoteHead = mk('div', 'k-head', S.quote);
  S.quoteLines = ['Un contrato cargado,', 'convertido en una herramienta', '<b>práctica de seguimiento.</b>'].map(l => mk('div', 'k-li', mk('div', 'k-lw', S.quoteHead), l));

  // Cierre
  S.lock2 = buildLock(S.ui, 250, 250);
  S.finalLine = mk('div', 'k-finalLine', S.lock2.root, 'Universidad Nacional de Itapúa · Hackatón SOPAIA 2026');
  css(S.finalLine, { left: '810px', top: '598px' });
  S.steps = mk('div', 'k-steps', S.ui, `<span class="k-stepL">Próximos pasos</span>
    <span class="k-step"><b>D2</b>Tutor para administradores</span>
    <span class="k-step"><b>D6</b>Historial de proveedores</span>
    <span class="k-step"><b>D8</b>IA UNI local</span>`);
  S.foot = mk('div', 'k-foot', S.ui, 'Contrato y datos de demostración ficticios · Interfaz real de UNI Contratos');
  css(S.foot, { left: '0', top: '1012px' });

  // Cursor, arco, viñeta
  S.cursorL = mk('div', 'k-layer', stage);
  S.ripple = mk('div', null, S.cursorL); S.ripple.id = 'k-ripple';
  S.cursor = mk('div', null, S.cursorL, `<svg viewBox="0 0 44 56" width="44" height="56"><path d="M6 4 L6 44 L16 34.5 L23.5 51 L30.5 48 L23 31.8 L37 31.8 Z" fill="#fff" stroke="#111" stroke-width="3" stroke-linejoin="round"/></svg>`);
  S.cursor.id = 'k-cursor';
  S.archL = mk('div', 'k-layer', stage);
  S.arch = archSVG(S.archL);
  mk('div', 'k-layer', stage).id = 'k-vignette';
}

function buildLock(parent, ex, ey) {
  const root = mk('div', 'k-lock', parent);
  const esc = mk('img', 'k-escudo', root); esc.src = 'assets/escudo.png';
  css(esc, { left: ex + 'px', top: ey + 'px' });
  const tx = ex + 560;
  const w1 = mk('div', 'k-word1', root, 'UNI Contratos'); css(w1, { left: tx + 'px', top: (ey + 70) + 'px' });
  const rib = svg('svg', { class: 'k-ribbon', width: 900, height: 60, viewBox: '0 0 900 60' }, root);
  css(rib, { left: (tx + 4) + 'px', top: (ey + 196) + 'px' });
  const ribs = [['#FFFFFF', 8], ['#2E5FD0', 26], ['#E8344A', 44]].map(([col, y]) =>
    svg('path', { d: `M0 ${y + 10} C 220 ${y - 14}, 520 ${y + 22}, 900 ${y - 6}`, fill: 'none', stroke: col, 'stroke-width': 7, 'stroke-linecap': 'round', pathLength: 1 }, rib));
  const tag = mk('div', 'k-tagline', root, 'Seguimiento inteligente de contratos y obligaciones');
  css(tag, { left: tx + 'px', top: (ey + 268) + 'px' });
  return { root, esc, w1, rib, ribs, tag, ex, ey };
}

// ───────────────────────── medición ─────────────────────────
function rectIn(el) {
  const r = el.getBoundingClientRect(), c = S.cam.getBoundingClientRect();
  return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
}
const center = r => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
function union(...rs) {
  const x0 = Math.min(...rs.map(r => r.x)), y0 = Math.min(...rs.map(r => r.y));
  const x1 = Math.max(...rs.map(r => r.x + r.w)), y1 = Math.max(...rs.map(r => r.y + r.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

function measure() {
  css(S.screen, { left: '0px', top: '0px', width: W + 'px', height: H + 'px', transform: 'none', opacity: 1 });
  S.cam.style.transform = 'translate(0px,0px) scale(1)';
  show(S.screenWrap, true);
  for (const n in PG) {
    show(PG[n].el, true);
    PG[n].el.querySelectorAll('[data-scroll-top]').forEach(e => { e.scrollTop = +e.dataset.scrollTop; });
  }
  const g = (page, text, o) => deepest(PG[page].panel || PG[page].el, text, o);
  const box = (e, maxW = 900, minH = 30) => climb(e, x => /rounded/.test(x.className) && x.getBoundingClientRect().width < maxW && x.getBoundingClientRect().height >= minH) || e;
  const card = (e, minW = 0) => climb(e, x => /rounded/.test(x.className) && (x.className.includes('border') || x.className.includes('shadow')) && x.getBoundingClientRect().width > minW);

  // Ficha
  const h1 = g('docdetail', 'Contrato de Mantenimiento de Climatización 2026', { sel: 'h1,h2,h3' });
  R.docHdr = rectIn(card(h1, 900));
  R.docTitle = rectIn(h1);
  R.docFicha = union(R.docTitle, rectIn(g('docdetail', 'COMPLETADO')));
  R.docIA = rectIn(climb(g('docdetail', 'COMPLETADO'), e => e.textContent.includes('procesamiento IA')));
  const info = climb(g('docdetail', 'Información del Documento'), e => e.textContent.includes('Cláusulas creadas'));
  R.docInfo = rectIn(info);
  const clVal = g('docdetail', 'Cláusulas creadas').nextElementSibling;
  COUNTS.push({ el: clVal, to: +clVal.textContent.trim(), t0: 11.05, d: 0.6, page: 'docdetail' });

  // Tablero Kanban
  const chips = ['Vence en 365 días', 'Vence en 5 días', 'Vencida hace 4 días'].map(t => g('tareas', t, { exact: true }));
  S.chipSrc = chips;
  R.chips = chips.map(rectIn);
  R.chipRows = chips.map(c => rectIn(c.parentElement));
  R.cards = chips.map(c => rectIn(card(c, 300)));

  // Entregables
  const file = g('modal_informe', 'informe_mantenimiento_septiembre.pdf', { exact: true });
  R.file = rectIn(climb(file, e => e.getBoundingClientRect().width > 380));
  R.informePanel = rectIn(PG.modal_informe.panel);
  const adj = g('modal_informe', 'Adjuntos (1)');
  R.adj = rectIn(climb(adj, e => e.getBoundingClientRect().width > 300));

  // Documentación pendiente
  const chkHead = climb(g('modal_pago', 'Checklist'), e => e.getBoundingClientRect().width > 400);
  R.chkHead = rectIn(chkHead);
  R.chkItems = ['Factura del mes', 'Informe técnico aprobado', 'Certificado de cumplimiento tributario', 'Constancia de pago de IPS']
    .map(t => rectIn(climb(g('modal_pago', t, { exact: true }), e => e.getBoundingClientRect().width > 380 || e.className.includes('rounded'))));
  R.chkBlock = union(R.chkHead, ...R.chkItems);
  R.pagoPanel = rectIn(PG.modal_pago.panel);

  // Desvíos
  const venc = g('dash_resp', 'Tareas Vencidas', { exact: true });
  const prox = g('dash_resp', 'Próximas a Vencer (7 días)', { exact: true });
  R.venc = rectIn(card(venc, 200)); R.prox = rectIn(card(prox, 200));
  for (const [lab, t0] of [['Tareas Vencidas', 24.55], ['Próximas a Vencer (7 días)', 24.75], ['Tareas Totales', 24.35], ['En Progreso', 24.4], ['Pendientes', 24.45], ['Requieren Atención', 24.5]]) {
    const v = g('dash_resp', lab, { exact: true }).nextElementSibling;
    if (v && /^\d+$/.test(v.textContent.trim())) COUNTS.push({ el: v, to: +v.textContent.trim(), t0, d: 0.55, page: 'dash_resp' });
  }
  const evalSec = climb(g('modal_acta_detalles', 'Evaluación y Riesgos'), e => e.textContent.includes('Impacto en el negocio'));
  R.eval = rectIn(evalSec);
  R.critica = rectIn(box(g('modal_acta_detalles', 'Crítica', { exact: true }), 500, 50));
  const impSec = climb(g('modal_acta_detalles', 'Impacto en el negocio'), e => e.querySelectorAll('*').length > 20);
  R.altoImp = rectIn(box(deepest(impSec, 'Alto', { exact: true }), 500, 50));

  // Alertas
  const bellPage = PG.dash_bell.el;
  const dropTitle = g('dash_bell', 'Notificaciones (4)');
  const drop = climb(dropTitle, e => /absolute|fixed/.test(e.className) && e.getBoundingClientRect().height > 200);
  PG.dash_bell.drop = drop;
  R.drop = rectIn(drop);
  R.bell = rectIn(climb(bellPage.querySelector('aside .material-icons'), e => e.tagName === 'BUTTON') || drop);
  const badge = [...bellPage.querySelectorAll('aside span, aside div')].find(e => e.textContent.trim() === '4' && /rounded-full/.test(e.className));
  PG.dash_bell.badge = badge;
  R.notifItems = ['Acta de inicio requiere atención', 'Obligación vencida: póliza de garantía'].map(t =>
    rectIn(climb(g('dash_bell', t), e => e.getBoundingClientRect().height > 50)));

  // Acción
  const btns = [...PG.modal_inventario_etapas.el.querySelectorAll('button')].filter(b => b.textContent.includes('Enviar a Revisión Gerencial'));
  S.actionBtn = btns[btns.length - 1];
  R.actionBtn = rectIn(S.actionBtn);
  const etapaSec = climb(g('modal_inventario_etapas', 'Etapa Actual'), e => e.textContent.includes('Cambiar estado') && e.getBoundingClientRect().width > 500);
  R.etapas = rectIn(etapaSec);
  const hist = climb(g('accion_3', 'Historial de Estados'), e => e.textContent.includes('REVISION_GERENCIAL') && e.getBoundingClientRect().height > 120);
  R.hist = rectIn(hist);
  R.histEntry = rectIn(climb(g('accion_3', 'Avance de INICIO a REVISION_GERENCIAL'), e => e.getBoundingClientRect().height > 80));
  R.etapaActual3 = rectIn(climb(g('accion_3', 'Etapa Actual'), e => e.textContent.includes('Cambiar estado') && e.getBoundingClientRect().width > 500));

  // Tablero final
  const dash = PG.dashboard.el;
  for (const [lab, t0] of [['Tareas Totales', 34.0], ['Documentos Legales', 34.1], ['Cláusulas', 34.2], ['Áreas', 34.3], ['Usuarios Activos', 34.4]]) {
    const v = g('dashboard', lab, { exact: true }).nextElementSibling;
    if (v && /^\d+$/.test(v.textContent.trim())) COUNTS.push({ el: v, to: +v.textContent.trim(), t0, d: 0.7, page: 'dashboard' });
  }
  R.stats = rectIn(climb(g('dashboard', 'Tareas Totales', { exact: true }), e => e.className.includes('grid') && e.getBoundingClientRect().width > 1000));
  R.statsAll = union(R.stats, rectIn(climb(g('dashboard', 'Usuarios Activos', { exact: true }), e => e.className.includes('grid') && e.getBoundingClientRect().width > 1000)));
  R.proxPanel = rectIn(climb(g('dashboard', 'Próximos Vencimientos'), e => e.getBoundingClientRect().height > 250));
  R.actPanel = rectIn(climb(g('dashboard', 'Actividad Reciente'), e => e.getBoundingClientRect().height > 250));
  R.dashMain = rectIn(PG.dashboard.main);

  // Graph layout
  layoutGraph();

  // Toast natural size
  R.toast = { w: S.toast.offsetWidth, h: S.toast.offsetHeight };
  R.chipNat = chips.map(c => ({ w: c.offsetWidth, h: c.offsetHeight }));
  S.chipClones = chips.map(c => { const k = mk('div', 'k-pop', S.pops); k.appendChild(c.cloneNode(true)); return k; });
}

function layoutGraph() {
  const N = GRAPH.nodes;
  const doc = N['doc-1'];
  const clauses = Object.values(N).filter(n => n.id.startsWith('clausula-')).sort((a, b) => +a.id.split('-')[1] - +b.id.split('-')[1]);
  const kids = {};
  GRAPH.edges.forEach(e => {
    const m = e.match(/^clausula-tarea-(\d+)-(\d+)$/);
    if (m) (kids[m[1]] = kids[m[1]] || []).push('tarea-' + m[2]);
  });
  const X = { doc: 220, cl: 760, task: 1150 }, WD = { doc: 380, cl: 300, task: 640 };
  css(doc.wrap, { width: WD.doc + 'px' });
  clauses.forEach(c => css(c.wrap, { width: WD.cl + 'px' }));
  Object.values(N).filter(n => n.id.startsWith('tarea-')).forEach(n => css(n.wrap, { width: WD.task + 'px' }));
  // alturas
  const hOf = n => n.wrap.offsetHeight;
  const GAP_T = 10, GAP_ROW = 18;
  let rows = clauses.map(c => {
    const ts = (kids[c.id.split('-')[1]] || []).map(id => N[id]);
    const th = ts.reduce((s, n) => s + hOf(n), 0) + GAP_T * Math.max(0, ts.length - 1);
    return { c, ts, h: Math.max(hOf(c), th) };
  });
  const total = rows.reduce((s, r) => s + r.h, 0) + GAP_ROW * (rows.length - 1);
  const top0 = 150, avail = 1040 - top0;
  const g = Math.min(1, avail / total);
  GRAPH.scale = g;
  let y = top0 + (avail - total * g) / 2;
  const pos = {};
  const order = [];
  rows.forEach(r => {
    const rh = r.h * g;
    const cy = y + rh / 2;
    pos[r.c.id] = { x: X.cl, y: cy - hOf(r.c) * g / 2, w: WD.cl * g, h: hOf(r.c) * g };
    let ty = y + (rh - (r.ts.reduce((s, n) => s + hOf(n), 0) + GAP_T * Math.max(0, r.ts.length - 1)) * g) / 2;
    r.ts.forEach(n => { pos[n.id] = { x: X.task, y: ty, w: WD.task * g, h: hOf(n) * g }; ty += (hOf(n) + GAP_T) * g; order.push(n.id); });
    y += rh + GAP_ROW * g;
  });
  const docH = hOf(doc) * g;
  pos['doc-1'] = { x: X.doc, y: 600 - docH / 2, w: WD.doc * g, h: docH };
  for (const id in pos) {
    const p = pos[id], n = N[id];
    css(n.wrap, { left: p.x + 'px', top: p.y + 'px', transform: `scale(${g})`, transformOrigin: '0 0' });
  }
  // aristas
  const colorOf = n => getComputedStyle(n.inner).borderTopColor;
  GRAPH.paths = [];
  const addEdge = (a, b, color, width, t0) => {
    const A = pos[a], B = pos[b];
    const x1 = A.x + A.w, y1 = A.y + A.h / 2, x2 = B.x, y2 = B.y + B.h / 2, dx = (x2 - x1) * 0.55;
    const p = svg('path', { d: `M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`, fill: 'none', stroke: color, 'stroke-width': width, 'stroke-linecap': 'round', pathLength: 1 }, S.edges);
    GRAPH.paths.push({ p, t0, to: b });
  };
  const NODE_T = { 'doc-1': 12.12 };
  clauses.forEach((c, i) => { const t0 = 12.3 + i * 0.075; addEdge('doc-1', c.id, '#8B5CF6', 3, t0); NODE_T[c.id] = t0 + 0.24; });
  order.forEach((id, j) => {
    const cl = clauses.find(c => (kids[c.id.split('-')[1]] || []).includes(id));
    const t0 = 12.9 + j * 0.075; addEdge(cl.id, id, colorOf(N[id]), 2.2, t0); NODE_T[id] = t0 + 0.24;
  });
  GRAPH.pos = pos; GRAPH.nodeT = NODE_T; GRAPH.order = order; GRAPH.clauses = clauses;
  css(S.gLabels[0], { left: X.doc + 'px', top: (pos['doc-1'].y - 56) + 'px' });
  css(S.gLabels[1], { left: X.cl + 'px', top: '96px' });
  css(S.gLabels[2], { left: X.task + 'px', top: '96px' });
  GRAPH.docCenter = { x: X.doc + pos['doc-1'].w / 2, y: 600 };
}

// ───────────────────────── keyframes ─────────────────────────
function fillKF(list) { const out = []; let prev = {}; for (const k of list) { prev = { ...prev, ...k }; out.push(prev); } return out; }
function kf(frames, t) {
  if (t <= frames[0].t) return frames[0];
  for (let i = 0; i < frames.length - 1; i++) {
    const a = frames[i], b = frames[i + 1];
    if (t < b.t) {
      const p = (E[b.e] || E.inOutCubic)(clamp((t - a.t) / (b.t - a.t)));
      const o = {};
      for (const k in b) if (typeof b[k] === 'number') o[k] = lerp(a[k], b[k], p);
      return o;
    }
  }
  return frames[frames.length - 1];
}
const foc = (r, z, dx = 0, dy = 0) => ({ fx: r.x + r.w / 2 + dx, fy: r.y + r.h / 2 + dy, z });
const fit = (r, zmax, m = 50, dx = 0, dy = 0) => ({ fx: r.x + r.w / 2 + dx, fy: r.y + r.h / 2 + dy, z: Math.min(zmax, 1120 / (r.w + 2 * m), 844 / (r.h + 2 * m)) });

function buildTimeline() {
  const FEAT = { x: 740, y: 118, w: 1120, h: 844, rx: 2.2, ry: -6.5, s: 1, o: 1, tx: 0, ty: 0 };
  const OFF_R = { ...FEAT, o: 0, tx: 760, ty: 90, ry: -28, rx: 6 };
  const dc = GRAPH.docCenter;
  SKF = fillKF([
    { t: 0, ...OFF_R },
    { t: 9.92, ...OFF_R },
    { t: 10.8, ...FEAT, e: 'outExpo' },
    { t: 12.0, ...FEAT },
    { t: 12.42, ...FEAT, s: 0.22, o: 0, tx: dc.x - (FEAT.x + FEAT.w / 2), ty: dc.y - (FEAT.y + FEAT.h / 2), ry: 0, rx: 0, e: 'inOutCubic' },
    { t: 14.42, ...OFF_R },
    { t: 15.25, ...FEAT, e: 'outExpo' },
    { t: 38.4, ...FEAT },
    { t: 38.95, ...FEAT, o: 0, tx: 820, ty: 60, ry: -30, rx: 6, e: 'inCubic' },
  ]);
  const midCard = union(...R.cards);
  CKF = fillKF([
    { t: 0, ...fit(R.docFicha, 1.3, 60, 60, 60) },
    { t: 9.6, ...fit(R.docFicha, 1.3, 60, 60, 60) },
    { t: 10.3, ...fit(R.docFicha, 1.5, 60) },
    { t: 11.05, ...fit(union(R.docIA, R.docInfo), 1.3, 40), e: 'inOutQuint' },
    { t: 12.0, ...fit(union(R.docIA, R.docInfo), 1.34, 30) },
    { t: 14.38, ...foc(midCard, 0.98, 120, 40) },
    { t: 15.05, ...foc(R.chipRows[0], 1.85, -60, -60), e: 'inOutQuint' },
    { t: 15.6, ...foc(R.chipRows[1], 1.85, -60, -60), e: 'inOutQuint' },
    { t: 16.15, ...foc(R.chipRows[2], 1.85, -60, -60), e: 'inOutQuint' },
    { t: 16.65, ...foc(union(...R.chipRows), 1.22, 0, -40), e: 'inOutQuint' },
    { t: 19.2, ...foc(union(...R.chipRows), 1.24, 0, -40) },
    { t: 19.55, ...foc(R.informePanel, 0.98) },
    { t: 20.15, ...foc(union(R.file, R.adj), 1.62, 0, 0), e: 'inOutQuint' },
    { t: 21.6, ...foc(union(R.file, R.adj), 1.66, 0, 0) },
    { t: 21.95, ...foc(R.pagoPanel, 1.0) },
    { t: 22.45, ...foc(R.chkBlock, 1.75), e: 'inOutQuint' },
    { t: 24.0, ...foc(R.chkBlock, 1.78) },
    { t: 24.65, ...fit(union(R.venc, R.prox), 1.6, 50, 0, 20), e: 'inOutQuint' },
    { t: 26.4, ...fit(union(R.venc, R.prox), 1.65, 44, 0, 20) },
    { t: 27.0, ...foc(R.eval, 1.3, 0, -40), e: 'inOutQuint' },
    { t: 28.8, ...foc(R.eval, 1.34, 0, -40) },
    { t: 29.35, ...foc(union(R.drop, R.bell), 1.58, 40, 0), e: 'inOutQuint' },
    { t: 31.2, ...foc(union(R.drop, R.bell), 1.62, 40, 0) },
    { t: 31.8, ...foc(R.etapas, 1.62, 0, 40), e: 'inOutQuint' },
    { t: 32.55, ...foc(R.etapas, 1.64, 0, 40) },
    { t: 33.2, ...foc(R.hist, 1.5, 0, -20), e: 'inOutQuint' },
    { t: 33.6, ...foc(R.hist, 1.5, 0, -20) },
    { t: 34.15, ...fit(R.statsAll, 1.4, 30, 0, -10), e: 'inOutQuint' },
    { t: 35.3, ...fit(R.statsAll, 1.4, 20, 0, -10) },
    { t: 36.3, fx: R.proxPanel.x + R.proxPanel.w / 2, fy: 560, z: 1.0, e: 'inOutQuint' },
    { t: 37.0, fx: R.proxPanel.x + R.proxPanel.w / 2, fy: 600, z: 1.38, e: 'inOutQuint' },
    { t: 38.4, fx: R.proxPanel.x + R.proxPanel.w / 2 - 200, fy: 560, z: 1.08 },
  ]);
  const ring = (t0, t1, r, o = {}) => RINGS.push({ t0, t1, r, pad: 8, color: C.bordo, rad: 14, dim: false, ...o });
  ring(10.45, 11.0, R.docIA, { pad: 6 });
  ring(11.05, 11.95, R.docInfo, { dim: true, pad: 10 });
  ring(14.95, 15.6, R.chipRows[0], { color: C.verde, pad: 6 });
  ring(15.5, 16.15, R.chipRows[1], { color: C.ambar, pad: 6 });
  ring(16.05, 16.75, R.chipRows[2], { color: C.rojo, pad: 6 });
  ring(20.05, 21.45, R.file, { dim: true, pad: 8 });
  ring(22.35, 22.95, R.chkHead, { pad: 6 });
  ring(22.75, 23.85, R.chkItems[2], { color: C.ambar, pad: 4, pill: 'Pendiente' });
  ring(23.0, 23.85, R.chkItems[3], { color: C.ambar, pad: 4, pill: 'Pendiente' });
  ring(24.6, 26.3, R.venc, { color: C.rojo, pad: 6 });
  ring(25.05, 26.3, R.prox, { color: C.ambar, pad: 6 });
  ring(26.95, 28.65, R.critica, { color: C.rojo, pad: 6 });
  ring(27.35, 28.65, R.altoImp, { color: C.rojo, pad: 6 });
  ring(29.55, 31.1, R.notifItems[0], { pad: 4, rad: 10 });
  ring(30.0, 31.1, R.notifItems[1], { pad: 4, rad: 10 });
  ring(32.85, 33.5, R.histEntry, { dim: true, pad: 8 });
  RINGS.forEach(r => {
    r.el = mk('div', 'k-ring', S.camOverlay);
    if (r.pill) r.pillEl = mk('div', 'k-pill', S.camOverlay, r.pill);
  });
}

// pre-pase: posiciones en el escenario que dependen de las transformaciones
function prepass() {
  render(16.79);
  FLIGHTS = S.chipSrc.map((c, k) => {
    const r = c.getBoundingClientRect();
    const row = S.semaRows[k].row.getBoundingClientRect();
    return { src: { x: r.left, y: r.top, s: r.width / R.chipNat[k].w }, dst: { x: row.left + 78, y: row.top + 62, s: 1.75 }, t0: 16.8 + k * 0.6 };
  });
  render(32.3);
  const b = S.actionBtn.getBoundingClientRect();
  S.btnStage = { x: b.left + b.width * 0.55, y: b.top + b.height * 0.55 };
  render(3.5);
  const hl = S.hls.map(h => ({ x: h.offsetLeft, y: h.offsetTop, w: h.offsetWidth }));
  S.tags.forEach((tg, i) => css(tg, { left: (hl[i].x - 4) + 'px', top: (hl[i].y - 56) + 'px' }));
  const mw = S.hookLines[3].words[2];
  const r = mw.getBoundingClientRect();
  S.strikeBox = { x: r.left - 12, y: r.top, w: r.width + 24, h: r.height };
}

// ───────────────────────── render ─────────────────────────
function renderBg(t) {
  const paper = t < 4.8 || (t >= 9.6 && t < 43.2);
  show(S.bgPaper, paper || (t >= 9.6 && t < 10.3));
  const bordo = (t >= 4.8 && t < 10.3) || t >= 43.2;
  show(S.bgBordo, bordo);
  if (bordo) {
    const p = t < 43.2 ? P(t, 9.6, 0.62, E.inOutQuint) : 0;
    S.bgBordo.style.clipPath = p > 0 ? `inset(0 0 ${p * 100}% 0)` : 'none';
    const zoom = t < 10 ? 1 + 0.03 * clamp((t - 4.8) / 4.8) : 1 + 0.02 * clamp((t - 43.2) / 6);
    S.bgBordo.firstElementChild.style.transform = `scale(${zoom})`;
  }
}

function renderHook(t) {
  const on = t < 4.85;
  show(S.hook, on);
  if (!on) return;
  // hoja
  const s = 1.0 + 0.07 * (t / 4.8);
  const y = lerp(40, -330, E.inOutCubic(clamp(t / 4.8)));
  S.sheet.style.left = '1170px';
  S.sheet.style.top = '0px';
  S.sheet.style.transform = `translate(0px, ${y}px) rotateX(11deg) rotateY(-17deg) rotateZ(-3.2deg) scale(${s})`;
  S.hls.forEach((h, i) => {
    const p = P(t, HL[i].t, 0.38, E.outCubic);
    h.style.backgroundSize = `${p * 100}% 100%`;
    const tg = S.tags[i];
    const q = P(t, HL[i].t + 0.12, 0.5, E.spring);
    tg.style.opacity = clamp(q * 3);
    tg.style.transform = `translateY(${(1 - q) * 18}px) scale(${0.6 + 0.4 * q})`;
  });
  // texto
  const wordIn = (w, a) => { const p = P(t, a, 0.7, E.outExpo); w.style.transform = `translateY(${(1 - p) * 110}%)`; w.style.opacity = clamp(p * 2); };
  const wordOut = (w, a) => { const p = P(t, a, 0.28, E.inCubic); return p; };
  const [L1, L2, L3, L4] = S.hookLines;
  const exitA = P(t, 2.18, 0.26, E.inCubic);
  L1.words.forEach((w, i) => { wordIn(w, 0.05 + i * 0.07); if (exitA > 0) { w.style.transform = `translateY(${-exitA * 110}%)`; } });
  L2.words.forEach((w, i) => { wordIn(w, 1.2 + i * 0.07); if (exitA > 0) { w.style.transform = `translateY(${-exitA * 110}%)`; } });
  show(L1.line, t < 2.5); show(L2.line, t < 2.5);
  show(L3.line, t >= 2.38); show(L4.line, t >= 2.38);
  L3.words.forEach((w, i) => wordIn(w, 2.42 + i * 0.07));
  L4.words.forEach((w, i) => wordIn(w, 2.55 + i * 0.07));
  // tachado
  const sp = P(t, 3.9, 0.3, E.inOutCubic);
  const b = S.strikeBox;
  if (b) {
    css(S.strike, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' });
    S.strike.setAttribute('viewBox', `0 0 ${b.w} ${b.h}`);
    const yy = b.h * 0.56;
    S.strikePath.setAttribute('d', `M4 ${yy + 10} C ${b.w * 0.3} ${yy + 2}, ${b.w * 0.65} ${yy - 2}, ${b.w - 4} ${yy - 12}`);
    S.strikePath.setAttribute('pathLength', 1);
    S.strikePath.style.strokeDasharray = '1 1';
    S.strikePath.style.strokeDashoffset = String(1 - sp);
    show(S.strike, sp > 0);
  }
}

function renderLock(L, t, tin, opts = {}) {
  const on = t >= tin - 0.01;
  show(L.root, on && (opts.until == null || t < opts.until));
  if (!on) return;
  const pe = P(t, tin, 0.9, E.spring);
  const blur = (1 - P(t, tin, 0.45, E.outCubic)) * 14;
  L.esc.style.transform = `scale(${0.8 + 0.2 * pe})`;
  L.esc.style.opacity = clamp(P(t, tin, 0.25) * 1.2);
  L.esc.style.filter = `blur(${blur}px) drop-shadow(0 26px 40px rgba(40,0,10,0.35))`;
  const pw = P(t, tin + 0.2, 0.7, E.outExpo);
  L.w1.style.clipPath = `inset(-20% ${(1 - pw) * 100}% -20% 0)`;
  L.w1.style.transform = `translateX(${(1 - pw) * 40}px)`;
  L.ribs.forEach((r, i) => { const pr = P(t, tin + 0.45 + i * 0.06, 0.8, E.inOutCubic); r.style.strokeDasharray = '1 1'; r.style.strokeDashoffset = String(1 - pr); });
  const pt = P(t, tin + 0.7, 0.6, E.outExpo);
  L.tag.style.opacity = pt; L.tag.style.transform = `translateY(${(1 - pt) * 24}px)`;
}

function renderLocks(t) {
  // Revelación + achique a la esquina
  renderLock(S.lock, t, 4.8, { until: 9.85 });
  if (t >= 4.8 && t < 9.85) {
    const pm = P(t, 7.2, 0.6, E.inOutQuint);
    const drift = 1 + 0.018 * clamp((t - 4.8) / 2.4);
    const sc = lerp(drift, 0.34, pm);
    const tx = lerp(-(drift - 1) * 960, 110 - 230 * 0.34, pm);
    const ty = lerp(-(drift - 1) * 540, 52 - 325 * 0.34, pm);
    S.lock.root.style.transform = `translate(${tx}px, ${ty}px) scale(${sc})`;
    S.lock.root.style.opacity = 1 - P(t, 9.6, 0.22);
  }
  // Cierre
  renderLock(S.lock2, t, 43.2);
  if (t >= 43.2) {
    const d = 1 + 0.02 * clamp((t - 43.2) / 6);
    S.lock2.root.style.transform = `translate(${-(d - 1) * 960}px, ${-(d - 1) * 480}px) scale(${d})`;
    const pf = P(t, 44.0, 0.6, E.outExpo);
    S.finalLine.style.opacity = pf; S.finalLine.style.transform = `translateY(${(1 - pf) * 20}px)`;
  }
  const ps = P(t, 44.6, 0.7, E.outExpo);
  show(S.steps, t >= 44.6);
  if (t >= 44.6) {
    const w = S.steps.offsetWidth;
    css(S.steps, { left: (960 - w / 2) + 'px', top: '820px', opacity: ps, transform: `translateY(${(1 - ps) * 24}px)` });
  }
  show(S.foot, t >= 45.2);
  S.foot.style.opacity = P(t, 45.2, 0.6);
  // título de la rúbrica
  const tr = env(t, 7.35, 9.62, 0.6, 0.2, E.outExpo);
  show(S.rTitle, tr > 0);
  S.rTitle.style.opacity = tr;
  S.rTitle.style.transform = `translateY(${(1 - P(t, 7.35, 0.7, E.outExpo)) * 30}px)`;
}

function itemGeom(i, mode) {
  if (mode === 'rubric') { const col = i < 4 ? 0 : 1, row = i % 4; return { cx: 258 + col * 800, cy: 540 + row * 104, d: 62 }; }
  if (mode === 'rail') return { cx: 74, cy: 296 + i * 68, d: 40 };
  return { cx: 186, cy: 232 + i * 84, d: 50 }; // outro
}
function renderRubric(t) {
  const anyOn = t >= 7.5 && t < 43.2;
  S.items.forEach(x => show(x.it, anyOn));
  show(S.railLine, t >= 9.9 && t < 39.0);
  if (t >= 9.9 && t < 39.0) {
    const o = Math.min(P(t, 9.9, 0.5), 1 - P(t, 38.4, 0.4));
    css(S.railLine, { left: '73px', top: '296px', height: (7 * 68) + 'px', opacity: o });
  }
  if (!anyOn) return;
  S.items.forEach((x, i) => {
    const g0 = itemGeom(i, 'rubric'), g1 = itemGeom(i, 'rail'), g2 = itemGeom(i, 'outro');
    let g;
    const pm1 = P(t, 9.5 + i * 0.03, 0.7, E.inOutQuint);
    const pm2 = P(t, 38.45 + i * 0.04, 0.75, E.inOutQuint);
    if (t < 30) g = { cx: lerp(g0.cx, g1.cx, pm1), cy: lerp(g0.cy, g1.cy, pm1), d: lerp(g0.d, g1.d, pm1) };
    else g = { cx: lerp(g1.cx, g2.cx, pm2), cy: lerp(g1.cy, g2.cy, pm2), d: lerp(g1.d, g2.d, pm2) };
    // entrada
    const pin = P(t, 7.62 + i * 0.11, 0.6, E.spring);
    // activo
    const [a0, a1] = ACTIVE[i];
    const act = env(t, a0, a1, 0.3, 0.3);
    // tilde
    const tc = CHECK[i];
    const pc = P(t, tc, 0.4, E.outBack);
    const pk = P(t, tc + 0.08, 0.32, E.inOutCubic);
    // destello del cierre
    const sh = env(t, 39.0 + i * 0.075, 39.5 + i * 0.075, 0.12, 0.3);
    const sc = (g.d / 100) * (0.4 + 0.6 * pin) * (1 + 0.18 * act + 0.22 * sh);
    css(x.circ, { transform: `translate(${g.cx - 50}px, ${g.cy - 50}px) scale(${sc})`, opacity: clamp(pin * 2) });
    x.circ.style.borderColor = t < 9.9 ? C.oro : (act > 0.5 ? C.bordo : '#E2D5C6');
    x.circ.style.borderWidth = t < 9.9 ? '4px' : (act > 0.5 ? '6px' : '4px');
    x.disk.style.transform = `scale(${pc})`;
    x.num.style.opacity = 1 - clamp(pc * 1.5);
    x.path.style.strokeDasharray = '1 1';
    x.path.style.strokeDashoffset = String(1 - pk);
    // halo pulsante
    const ph = act > 0 ? ((t - a0) % 1.2) / 1.2 : 0;
    css(x.halo, { transform: `translate(${g.cx - 50}px, ${g.cy - 50}px) scale(${(g.d / 100) * (1.15 + ph * 0.7)})`, opacity: act * (1 - ph) * 0.8 });
    // partículas
    const pb = P(t, tc, 0.6, E.outCubic);
    x.dots.forEach((d, k) => {
      const ang = (k / 6) * Math.PI * 2 + i;
      const dist = g.d * 0.55 + 34 * pb;
      css(d, { left: '0', top: '0', transform: `translate(${g.cx - 5 + Math.cos(ang) * dist}px, ${g.cy - 5 + Math.sin(ang) * dist}px) scale(${1 - pb * 0.6})`, opacity: pb > 0 && pb < 1 ? 1 - pb : 0 });
    });
    // etiquetas
    const pw = Math.min(P(t, 7.7 + i * 0.11, 0.6, E.outExpo), 1 - P(t, 9.42, 0.16));
    css(x.labW, { left: (g0.cx + 52) + 'px', top: (g0.cy - 25) + 'px', opacity: pw, transform: `translateX(${(1 - P(t, 7.7 + i * 0.11, 0.6, E.outExpo)) * 30}px)` });
    show(x.labW, pw > 0);
    const pi = P(t, 38.75 + i * 0.05, 0.6, E.outExpo);
    css(x.labI, { left: (g2.cx + 44) + 'px', top: (g2.cy - 23) + 'px', opacity: pi, transform: `translateX(${(1 - pi) * 30}px)` });
    show(x.labI, pi > 0);
  });
}

function renderCaps(t) {
  S.caps.forEach(cp => {
    const { c, box, kick, heads } = cp;
    const on = t >= c.t0 - 0.02 && t <= c.t1 + 0.05;
    show(box, on);
    if (!on) return;
    const pk = P(t, c.t0, 0.55, E.outExpo), ok = 1 - P(t, c.t1 - 0.28, 0.28, E.inCubic);
    kick.style.opacity = pk * ok;
    kick.style.transform = `translateX(${(1 - pk) * -24}px)`;
    heads.forEach(({ hb, lines, h }) => {
      const hon = t >= h.t0 - 0.02 && t <= h.t1 + 0.02;
      show(hb, hon);
      if (!hon) return;
      lines.forEach((li, k) => {
        const a = h.lt ? h.lt[k] : h.t0 + 0.06 + k * 0.08;
        const pin = P(t, a, 0.75, E.outExpo);
        const pout = P(t, h.t1 - 0.3 + k * 0.03, 0.27, E.inCubic);
        li.style.transform = `translateY(${(1 - pin) * 108 - pout * 108}%)`;
        li.style.opacity = clamp(pin * 2) * (1 - pout);
      });
    });
  });
}

// ── páginas de la app
const PTL = [
  [0, 'docdetail', 'cut'],
  [14.38, 'tareas', 'cut'],
  [19.2, 'modal_informe', 'modal'],
  [21.6, 'modal_pago', 'modalSwap'],
  [24.0, 'dash_resp', 'nav'],
  [26.4, 'modal_acta_detalles', 'navModal'],
  [28.8, 'dash_bell', 'navBell'],
  [31.2, 'modal_inventario_etapas', 'navModal'],
  [32.42, 'accion_3', 'cut'],
  [33.6, 'dashboard', 'nav'],
];
function showPage(pg) {
  if (pg.el.style.display === 'none') {
    show(pg.el, true);
    pg.el.querySelectorAll('[data-scroll-top]').forEach(e => { e.scrollTop = +e.dataset.scrollTop; });
  }
}
function resetPage(pg) {
  pg.el.style.opacity = 1; pg.el.style.zIndex = 0;
  if (pg.panel) { pg.panel.style.opacity = 1; pg.panel.style.transform = 'none'; pg.backdrop.style.opacity = 1; }
  if (pg.main) pg.main.style.transform = 'none';
  if (pg.drop) { pg.drop.style.opacity = 1; pg.drop.style.transform = 'none'; }
  if (pg.badge) pg.badge.style.transform = 'none';
}
function modalIn(pg, dt, keepBackdrop) {
  if (!pg.panel) return;
  const pb = keepBackdrop ? 1 : P(dt, 0, 0.32);
  const pp = P(dt, 0.04, 0.6, E.outExpo);
  pg.backdrop.style.opacity = pb;
  pg.panel.style.opacity = clamp(pp * 1.5);
  pg.panel.style.transform = `translateY(${(1 - pp) * 40}px) scale(${0.965 + 0.035 * pp})`;
}
function renderPages(t) {
  let i = 0;
  for (let k = 0; k < PTL.length; k++) if (t >= PTL[k][0]) i = k;
  const [t0, name, type] = PTL[i];
  const prev = i > 0 ? PG[PTL[i - 1][1]] : null;
  const dt = t - t0;
  const cur = PG[name];
  // Navegación con "dip": la página anterior sale antes de que entre la nueva (sin doble exposición).
  const NAV = type === 'nav' || type === 'navModal' || type === 'navBell';
  const OUT = 0.13, IN0 = 0.1;
  let needPrev = false;
  if (prev && NAV) needPrev = dt < OUT;
  for (const n in PG) {
    const pg = PG[n];
    const vis = pg === cur || (needPrev && pg === prev);
    resetPage(pg);
    if (vis) showPage(pg); else show(pg.el, false);
  }
  cur.el.style.zIndex = 2;
  if (needPrev) { prev.el.style.zIndex = 3; prev.el.style.opacity = 1 - E.inCubic(clamp(dt / OUT)); }
  if (NAV) {
    const d2 = dt - IN0;
    cur.el.style.opacity = P(d2, 0, 0.26, E.outCubic);
    if (cur.main) cur.main.style.transform = `translateY(${(1 - P(d2, 0, 0.55, E.outExpo)) * 26}px)`;
    if (type === 'navModal') modalIn(cur, d2 - 0.1);
    if (type === 'navBell' && cur.drop) {
      const pd = P(dt, 0.45, 0.55, E.outExpo);
      cur.drop.style.transformOrigin = '0 0';
      cur.drop.style.opacity = clamp(pd * 1.6);
      cur.drop.style.transform = `translateY(${(1 - pd) * -12}px) scale(${0.94 + 0.06 * pd})`;
      if (cur.badge) { const pb = env(t, 29.0, 29.5, 0.12, 0.35); cur.badge.style.transform = `scale(${1 + 0.6 * pb})`; }
    }
  } else if (type === 'modal') {
    modalIn(cur, dt);
  } else if (type === 'modalSwap') {
    const pp = P(dt, 0, 0.5, E.outExpo);
    cur.panel.style.opacity = 0.55 + 0.45 * clamp(pp * 2);
    cur.panel.style.transform = `translateY(${(1 - pp) * 34}px) scale(${0.985 + 0.015 * pp})`;
  }
  // contadores
  COUNTS.forEach(c => {
    if (c.page !== name && !(prev && c.page === prev.name)) return;
    const v = Math.round(c.to * P(t, c.t0, c.d, E.outCubic));
    const s = String(t < c.t0 ? 0 : v);
    if (c.el.textContent !== s) c.el.textContent = s;
  });
  // scroll del tablero final
  if (PG.dashboard.main) {
    const sc = Math.round(560 * P(t, 35.35, 1.0, E.inOutQuint));
    if (PG.dashboard.main.scrollTop !== sc) PG.dashboard.main.scrollTop = sc;
  }
  return name;
}

function renderRings(t) {
  const scroll = PG.dashboard.main ? PG.dashboard.main.scrollTop : 0;
  RINGS.forEach(r => {
    const o = env(t, r.t0, r.t1, 0.32, 0.25);
    show(r.el, o > 0);
    if (r.pillEl) show(r.pillEl, o > 0);
    if (o <= 0) return;
    const pin = P(t, r.t0, 0.5, E.outExpo);
    const sc = 1 + (1 - pin) * 0.08;
    const x = r.r.x - r.pad, y = r.r.y - r.pad - (r.scrolls ? scroll : 0), w = r.r.w + 2 * r.pad, h = r.r.h + 2 * r.pad;
    css(r.el, {
      left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px', opacity: o, transform: `scale(${sc})`,
      borderColor: r.color, borderRadius: r.rad + 'px',
      boxShadow: `0 0 0 ${r.dim ? 3000 : 0}px rgba(30,14,12,${r.dim ? 0.30 : 0}), 0 0 22px ${r.color}66`,
    });
    if (r.pillEl) css(r.pillEl, { left: (x + w - 8) + 'px', top: (y + h / 2 - 12) + 'px', opacity: o, transform: `translateX(${(1 - pin) * 14}px)` });
  });
}

function renderScreen(t) {
  const s = kf(SKF, t);
  const on = s.o > 0.002;
  show(S.screenWrap, on);
  if (!on) { for (const n in PG) show(PG[n].el, false); return; }
  const wob = Math.sin(t * 0.55) * 0.6;
  css(S.screen, {
    left: s.x + 'px', top: s.y + 'px', width: s.w + 'px', height: s.h + 'px', opacity: clamp(s.o),
    transform: `translate(${s.tx}px, ${s.ty}px) rotateX(${s.rx}deg) rotateY(${s.ry + wob}deg) scale(${s.s})`,
  });
  const c = kf(CKF, t);
  const vw = s.w / c.z, vh = s.h / c.z;
  const fx = vw >= W ? W / 2 : clamp(c.fx, vw / 2, W - vw / 2);
  const fy = vh >= H ? H / 2 : clamp(c.fy, vh / 2, H - vh / 2);
  S.cam.style.transform = `translate(${s.w / 2 - fx * c.z}px, ${s.h / 2 - fy * c.z}px) scale(${c.z})`;
  renderPages(t);
  renderRings(t);
}

function renderGraph(t) {
  const on = t >= 12.05 && t < 14.5;
  show(S.graph, on);
  if (!on) return;
  const drift = 1 + 0.03 * clamp((t - 12.0) / 2.6);
  const out = P(t, 14.12, 0.34, E.inCubic);
  S.gInner.style.transform = `scale(${drift})`;
  for (const id in GRAPH.nodes) {
    const n = GRAPH.nodes[id], t0 = GRAPH.nodeT[id];
    const p = P(t, t0, 0.55, E.spring), po = P(t, t0, 0.2);
    const col = id.startsWith('doc') ? 0 : id.startsWith('clausula') ? 1 : 2;
    const o2 = 1 - P(t, 14.1 + (2 - col) * 0.05, 0.26, E.inCubic);
    n.inner.style.opacity = po * o2;
    n.inner.style.transform = `translateX(${(1 - p) * -26 - out * 60}px) scale(${0.86 + 0.14 * p})`;
    n.inner.style.transformOrigin = '0 50%';
  }
  GRAPH.paths.forEach(e => {
    const p = P(t, e.t0, 0.34, E.inOutCubic);
    e.p.style.strokeDasharray = '1 1';
    e.p.style.strokeDashoffset = String(1 - p);
    e.p.style.opacity = 1 - out;
  });
  const lt = [12.2, 12.5, 13.2];
  S.gLabels.forEach((l, i) => {
    const p = P(t, lt[i], 0.6, E.outExpo);
    l.style.opacity = p * (1 - out);
    l.style.transform = `translateY(${(1 - p) * 16}px)`;
  });
}

function renderPops(t) {
  // Semáforo
  const so = env(t, 16.62, 19.35, 0.45, 0.32, E.outExpo);
  show(S.sema, so > 0);
  if (so > 0) {
    const pi = P(t, 16.62, 0.6, E.outExpo);
    S.sema.style.opacity = so;
    S.sema.style.transform = `translateY(${(1 - pi) * 40 + P(t, 19.03, 0.32, E.inCubic) * 30}px) scale(${0.97 + 0.03 * pi})`;
    S.semaRows.forEach((r, k) => {
      const tk = 16.8 + k * 0.6;
      const pl = P(t, tk + 0.3, 0.3);
      css(r.l, { background: pl > 0 ? r.light : '#E7E1DB', boxShadow: `0 0 ${28 * pl}px ${r.light}`, transform: `scale(${1 + 0.15 * env(t, tk + 0.3, tk + 0.75, 0.1, 0.35)})` });
      const pt = P(t, tk + 0.12, 0.55, E.outExpo);
      r.tx.style.opacity = pt; r.tx.style.transform = `translateX(${(1 - pt) * -20}px)`;
    });
  }
  S.chipClones.forEach((k, i) => {
    const f = FLIGHTS[i];
    const on = f && t >= f.t0 && t < 19.4;
    show(k, on);
    if (!on) return;
    const p = P(t, f.t0, 0.62, E.outExpo);
    const x = lerp(f.src.x, f.dst.x, p), y = lerp(f.src.y, f.dst.y, p) - Math.sin(p * Math.PI) * 70;
    const s = lerp(f.src.s, f.dst.s, p);
    const out = P(t, 19.03, 0.32, E.inCubic);
    css(k, { transform: `translate(${x}px, ${y + out * 30}px) scale(${s})`, opacity: 1 - out, filter: `drop-shadow(0 ${10 * Math.sin(p * Math.PI)}px 14px rgba(0,0,0,${0.25 * Math.sin(p * Math.PI)}))` });
  });
  // Email
  const eo = env(t, 30.0, 31.25, 0.6, 0.35, E.outExpo);
  show(S.email, eo > 0);
  if (eo > 0) {
    const pi = P(t, 30.0, 0.75, E.outExpo), po = P(t, 30.9, 0.35, E.inCubic);
    css(S.email, { left: '1478px', top: '370px', opacity: eo, transform: `translate(${(1 - pi) * 160 + po * 120}px, ${(1 - pi) * 30}px) rotate(${-2.2 - (1 - pi) * 4}deg) scale(0.62)` });
  }
  // Toast
  const to = env(t, 32.52, 33.55, 0.45, 0.3, E.outExpo);
  show(S.toast, to > 0);
  if (to > 0) {
    const pi = P(t, 32.52, 0.6, E.outExpo);
    const sc = 1.3;
    css(S.toast, { transform: `translate(${1830 - R.toast.w * sc + (1 - pi) * 80}px, ${150 + (1 - pi) * -20}px) scale(${sc})`, opacity: to });
  }
}

function renderCursor(t) {
  const on = t >= 31.45 && t < 33.4;
  show(S.cursorL, on);
  if (!on) return;
  const b = S.btnStage || { x: 1200, y: 600 };
  const p = P(t, 31.5, 0.78, E.inOutCubic);
  const x0 = 1700, y0 = 1020;
  let x = lerp(x0, b.x, p) + Math.sin(p * Math.PI) * -60, y = lerp(y0, b.y, p);
  const away = P(t, 32.75, 0.6, E.inOutCubic);
  x += away * 70; y += away * 90;
  const click = env(t, 32.36, 32.52, 0.06, 0.1);
  css(S.cursor, { transform: `translate(${x - 6}px, ${y - 4}px) scale(${1 - 0.14 * click})`, opacity: 1 - P(t, 33.1, 0.3) });
  const pr = P(t, 32.4, 0.55, E.outCubic);
  const rr = 10 + 70 * pr;
  css(S.ripple, { left: (b.x - rr) + 'px', top: (b.y - rr) + 'px', width: (rr * 2) + 'px', height: (rr * 2) + 'px', opacity: pr > 0 && pr < 1 ? 1 - pr : 0 });
}

function renderOutro(t) {
  const on = t >= 38.85 && t < 43.25;
  show(S.score, on); show(S.scoreSub, on); show(S.quote, on);
  if (!on) return;
  const n = S.items.filter((_, i) => t >= 39.0 + i * 0.075).length;
  const ps = P(t, 38.85, 0.7, E.outExpo);
  S.score.innerHTML = `${n}<small>/8</small>`;
  css(S.score, { opacity: ps, transform: `translateY(${(1 - ps) * 40}px)` });
  const pu = P(t, 39.2, 0.6, E.outExpo);
  css(S.scoreSub, { opacity: pu, transform: `translateY(${(1 - pu) * 20}px)` });
  const pk = P(t, 39.45, 0.55, E.outExpo);
  css(S.quoteKick, { opacity: pk, transform: `translateX(${(1 - pk) * -24}px)` });
  S.quoteLines.forEach((li, k) => {
    const p = P(t, 39.5 + k * 0.09, 0.75, E.outExpo);
    li.style.transform = `translateY(${(1 - p) * 108}%)`; li.style.opacity = clamp(p * 2);
  });
}

function renderArch(t) {
  const wipes = [[4.2, 4.8], [42.6, 43.2]];
  let top = null;
  for (const [a, b] of wipes) if (t >= a && t < b + 0.02) top = lerp(1090, -720, E.inOutCubic(clamp((t - a) / (b - a))));
  show(S.archL, top !== null);
  if (top !== null) S.arch.style.transform = `translateY(${top}px)`;
}

function render(t) {
  renderBg(t);
  renderHook(t);
  renderLocks(t);
  renderRubric(t);
  renderCaps(t);
  renderScreen(t);
  renderGraph(t);
  renderPops(t);
  renderCursor(t);
  renderOutro(t);
  renderArch(t);
}

// ───────────────────────── arranque ─────────────────────────
(async () => {
  try {
    await build();
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => (i.complete ? null : new Promise(r => { i.onload = i.onerror = r; }))));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    measure();
    buildTimeline();
    prepass();
    render(0);
    window.renderFrame = t => { render(t); return true; };
    window.__ready = true;
  } catch (e) {
    window.__error = String(e && e.stack || e);
    console.error(e);
  }
})();
