// "Anatomy of a measurement": animated photon paths through an atmospheric column, linked to a
// schematic reflectance spectrum (data from scripts/make_spectrum.jl via spectrum-data.js).
(function () {
  const svg = document.getElementById('anatomy');
  if (!svg || !window.SPECTRUM) return;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const $ = id => document.getElementById(id);

  // ---------- gases ----------
  const GASES = {
    O3:  { label: 'O₃',  color: '#9c7fd6' },
    O2:  { label: 'O₂',  color: '#5fa8ff' },
    H2O: { label: 'H₂O', color: '#22b8cf' },
    CO2: { label: 'CO₂', color: '#8a97a6' },
    CH4: { label: 'CH₄', color: '#4caf6a' },
    N2O: { label: 'N₂O', color: '#e57399' },
  };
  const N2 = '#c3cfdc';

  // Seeded PRNG so the scene is identical on every load.
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const inCloud = (x, y) => x > 250 && x < 350 && y > 165 && y < 225;

  const molG = $('an-molecules');
  const molecule = (x, y, gas, r = 3.2) =>
    el('circle', { cx: x, cy: y, r, fill: gas ? GASES[gas].color : N2, 'data-gas': gas || 'N2', class: 'mol' }, molG);

  for (let i = 0; i < 9; i++) molecule(20 + rnd() * 390, 74 + rnd() * 26, 'O3');
  const mix = ['O2', 'O2', 'O2', null, null, null, null, 'CO2', 'CO2', 'CH4', 'N2O', 'H2O'];
  for (let i = 0; i < 70; i++) {
    const x = 15 + rnd() * 400, y = 115 + rnd() * 340;
    if (inCloud(x, y)) continue;
    let gas = mix[Math.floor(rnd() * mix.length)];
    if (y > 330 && rnd() < 0.35) gas = 'H2O';         // water vapour lives low
    molecule(x, y, gas);
  }
  // Molecules that the highlighted photon paths interact with
  molecule(200, 150, 'O2', 4);
  molecule(150, 300, 'CO2', 4);
  molecule(255, 262, null, 4);

  const aerG = $('an-aerosols');
  for (let i = 0; i < 45; i++)
    el('circle', { cx: 10 + rnd() * 410, cy: 365 + rnd() * 60, r: 1.6 + rnd() * 2.2, fill: '#c8a26b', opacity: 0.65 }, aerG);
  el('circle', { cx: 230, cy: 390, r: 4.5, fill: '#c8a26b' }, aerG);

  // ---------- photon paths ----------
  const SUN = [45, 45], SAT = [385, 50];
  const PROCESSES = [
    { id: 'rayleigh', name: 'Rayleigh scattering', color: '#8ec5ff', pts: [SUN, [200, 150], SAT] },
    { id: 'cloud',    name: 'Cloud (Mie) scattering', color: '#ffffff', swatch: '#9aa9b8', pts: [SUN, [292, 182], SAT] },
    { id: 'aerosol',  name: 'Aerosol scattering', color: '#e0b878', pts: [SUN, [230, 390], SAT] },
    { id: 'absorb',   name: 'Trace-gas absorption', color: '#f2a541', pts: [SUN, [150, 300]], absorb: true },
    { id: 'raman',    name: 'Raman scattering (Δλ)', color: '#f2a541', color2: '#ff5a36', pts: [SUN, [255, 262], SAT] },
    { id: 'canopy',   name: 'Canopy scattering + SIF', color: '#9be27a', pts: [SUN, [122, 470], [152, 490], [95, 494], [140, 455], SAT] },
    { id: 'sif',      name: null, color: '#ff3b3b', pts: [[152, 490], SAT], follows: 'canopy', after: 2 },
    { id: 'ocean',    name: 'Ocean–atmosphere coupling', color: '#4dd0e1', pts: [SUN, [325, 482], [338, 515], [352, 482], SAT] },
  ];

  const pathsG = $('an-paths'), photG = $('an-photons');
  const SPEED = 130, PERIOD = 7.5;
  PROCESSES.forEach((p, i) => {
    p.seg = [];
    for (let k = 1; k < p.pts.length; k++)
      p.seg.push(Math.hypot(p.pts[k][0] - p.pts[k - 1][0], p.pts[k][1] - p.pts[k - 1][1]));
    p.len = p.seg.reduce((a, b) => a + b, 0);
    p.line = el('polyline', {
      points: p.pts.map(q => q.join(',')).join(' '), stroke: p.color,
      'stroke-dasharray': '3 4', opacity: 0.28, 'data-proc': p.id,
    }, pathsG);
    p.dot = el('circle', { r: 3.6, fill: p.color }, photG);
    p.flash = p.absorb ? el('circle', { cx: p.pts[1][0], cy: p.pts[1][1], r: 4, fill: 'none', stroke: '#f2a541', opacity: 0 }, photG) : null;
    p.offset = i * 0.9;
  });
  const byId = Object.fromEntries(PROCESSES.map(p => [p.id, p]));
  const sif = byId.sif, canopy = byId.canopy;
  sif.offset = canopy.offset + canopy.seg.slice(0, sif.after).reduce((a, b) => a + b, 0) / SPEED;
  byId.raman.label = el('text', { x: 266, y: 256, fill: '#ff8a65', 'font-size': 11, 'font-family': 'Inter, sans-serif', opacity: 0 }, photG);
  byId.raman.label.textContent = 'Δλ';

  function place(p, t) {
    const tc = ((t - p.offset) % PERIOD + PERIOD) % PERIOD;
    let d = tc * SPEED;
    const visible = d <= p.len;
    p.dot.setAttribute('opacity', visible ? 1 : 0);
    if (p.flash) {
      const f = (d - p.len) / 60;                     // absorption flash after arrival
      p.flash.setAttribute('opacity', f > 0 && f < 1 ? 1 - f : 0);
      p.flash.setAttribute('r', 4 + 14 * Math.max(0, Math.min(f, 1)));
    }
    if (!visible) return;
    let k = 0;
    while (k < p.seg.length - 1 && d > p.seg[k]) d -= p.seg[k++];
    const a = p.pts[k], b = p.pts[k + 1], u = Math.min(d / p.seg[k], 1);
    p.dot.setAttribute('cx', a[0] + u * (b[0] - a[0]));
    p.dot.setAttribute('cy', a[1] + u * (b[1] - a[1]));
    if (p.color2) {
      p.dot.setAttribute('fill', k > 0 ? p.color2 : p.color);
      p.label.setAttribute('opacity', k > 0 ? 1 : 0);
    }
  }

  // ---------- spectrum ----------
  const S = window.SPECTRUM;
  $('an-spec').setAttribute('points', S.main);
  $('an-ray').setAttribute('points', S.rayleigh);
  $('an-inset').setAttribute('points', S.inset);
  const xOf = l => (l - 400) / 2000 * 680;
  const bandsG = $('an-bands');
  S.bands.forEach(b => el('rect', {
    x: xOf(b.lo), y: 0, width: Math.max(xOf(b.hi) - xOf(b.lo), 2), height: 170,
    fill: GASES[b.gas].color, opacity: 0, 'data-gas': b.gas, class: 'band',
  }, bandsG));
  [['O₃', 590], ['O₂ γ', 629], ['O₂ B', 688], ['O₂ A', 762], ['H₂O', 940], ['H₂O', 1140], ['O₂ ¹Δ', 1270],
   ['H₂O', 1380], ['CO₂', 1600], ['H₂O', 1880], ['CO₂', 2060], ['CH₄', 2330]].forEach(([t, l], i) => {
    const tx = el('text', { x: xOf(l), y: 12 + (i % 3) * 12, 'font-size': 10.5, 'text-anchor': 'middle',
      fill: '#5b6b7b', 'font-family': 'Inter, sans-serif' }, bandsG);
    tx.textContent = t;
  });

  // ---------- interaction ----------
  function highlightGas(gas) {
    svg.querySelectorAll('.band').forEach(r => r.setAttribute('opacity', r.dataset.gas === gas ? 0.35 : 0));
    svg.querySelectorAll('.mol').forEach(m => m.classList.toggle('hl', gas !== null &&
      (m.dataset.gas === gas || (gas === 'rayleigh' && (m.dataset.gas === 'N2' || m.dataset.gas === 'O2')))));
    $('an-ray').setAttribute('opacity', gas === 'rayleigh' ? 1 : 0);
  }
  function highlightProc(id) {
    PROCESSES.forEach(p => {
      const on = id === null || p.id === id || (id === 'canopy' && p.id === 'sif');
      p.line.setAttribute('opacity', id === null ? 0.28 : on ? 0.95 : 0.08);
      p.line.setAttribute('stroke-width', id !== null && on ? 2 : 1.2);
    });
  }

  const chips = $('an-chips');
  let cx = 0;
  [...Object.entries(GASES), ['rayleigh', { label: 'Rayleigh', color: '#3a7bd5' }]].forEach(([key, g]) => {
    const w = key === 'rayleigh' ? 72 : 52;
    const c = el('g', { transform: `translate(${cx},0)`, class: 'chip', tabindex: 0 }, chips);
    el('rect', { width: w - 6, height: 24, rx: 12, fill: '#fff', stroke: g.color, 'stroke-width': 1.5 }, c);
    const t = el('text', { x: (w - 6) / 2, y: 16, 'text-anchor': 'middle', 'font-size': 12, fill: '#0d1b2a' }, c);
    t.textContent = g.label;
    const on = () => { highlightGas(key); if (key === 'rayleigh') highlightProc('rayleigh'); };
    const off = () => { highlightGas(null); highlightProc(null); };
    c.addEventListener('mouseenter', on); c.addEventListener('focus', on);
    c.addEventListener('mouseleave', off); c.addEventListener('blur', off);
    cx += w;
  });

  const legend = $('an-legend');
  PROCESSES.filter(p => p.name).forEach((p, i) => {
    const g = el('g', { transform: `translate(0,${i * 19})`, class: 'chip', tabindex: 0 }, legend);
    el('rect', { x: 0, y: -9, width: 16, height: 4, rx: 2, fill: p.swatch || p.color }, g);
    if (p.color2) el('rect', { x: 8, y: -9, width: 8, height: 4, rx: 2, fill: p.color2 }, g);
    if (p.id === 'canopy') el('rect', { x: 10, y: -9, width: 6, height: 4, rx: 2, fill: '#ff3b3b' }, g);
    const t = el('text', { x: 22, y: -3, fill: '#1f2933' }, g);
    t.textContent = p.name;
    const on = () => highlightProc(p.id), off = () => highlightProc(null);
    g.addEventListener('mouseenter', on); g.addEventListener('focus', on);
    g.addEventListener('mouseleave', off); g.addEventListener('blur', off);
  });
  const lt = el('text', { x: 0, y: -24, 'font-size': 12, 'font-weight': 600, fill: '#0d1b2a' }, legend);
  lt.textContent = 'Processes along the light path';

  // ---------- animation ----------
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused = still, simT = 2.5, last = null;
  svg.addEventListener('click', e => { if (e.clientX < svg.getBoundingClientRect().left + svg.getBoundingClientRect().width * 0.43) paused = !paused; });
  function tick(t) {
    if (last !== null && !paused) simT += (t - last) / 1000;
    last = t;
    PROCESSES.forEach(p => place(p, simT));
    requestAnimationFrame(tick);
  }
  PROCESSES.forEach(p => place(p, simT));
  requestAnimationFrame(tick);
})();
