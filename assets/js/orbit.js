// Hero animation: a planet orbits its star (top view); the observer is far below the diagram.
// Phase angle α = angle star–planet–observer. Insets show the observer's view of the planet
// and where the current phase sits on schematic brightness (Lambert sphere) and
// polarization (Rayleigh single scattering) curves.
(function () {
  const svg = document.getElementById('orbit');
  if (!svg) return;
  const $ = id => svg.getElementById ? svg.getElementById(id) : document.getElementById(id);

  const CX = 170, CY = 140, RX = 135, RY = 62;   // orbit ellipse (matches the SVG)
  const PERIOD = 18;                             // seconds per orbit
  const VIEW_R = 30, PLOT_W = 156, PLOT_H = 62;

  const group = $('planet-group'), behind = $('behind'), front = $('front');
  const planet = $('planet'), day = $('planet-day');
  const rayIn = $('ray-in'), rayOut = $('ray-out'), arc = $('alpha-arc'), lbl = $('alpha-lbl');
  const viewDay = $('view-day'), pol = $('pol-vec'), read = $('phase-read');
  const curLine = $('cur-line'), curB = $('cur-b'), curP = $('cur-p');

  const deg = r => r * 180 / Math.PI;
  const lambert = a => (Math.sin(a) + (Math.PI - a) * Math.cos(a)) / Math.PI;
  const rayleighPol = a => Math.sin(a) ** 2 / (1 + Math.cos(a) ** 2);

  function draw(theta) {
    const px = CX + RX * Math.cos(theta), py = CY + RY * Math.sin(theta);
    // Observer is toward +y (down the page); star is at the orbit centre.
    const alpha = Math.acos(Math.max(-1, Math.min(1, -Math.sin(theta))));

    // Far half of the orbit passes behind the star.
    const parent = Math.sin(theta) < 0 ? behind : front;
    if (group.parentNode !== parent) parent.appendChild(group);

    // Day side faces the star.
    const phi = Math.atan2(CY - py, CX - px);
    planet.setAttribute('transform', `translate(${px},${py})`);
    day.setAttribute('d', 'M0,-11 A11,11 0 0 1 0,11 Z');
    day.setAttribute('transform', `rotate(${deg(phi)})`);

    // Incident starlight and light scattered toward the observer.
    const dist = Math.hypot(px - CX, py - CY);
    rayIn.setAttribute('x1', CX - 14 * (CX - px) / dist);
    rayIn.setAttribute('y1', CY - 14 * (CY - py) / dist);
    rayIn.setAttribute('x2', px + 13 * (CX - px) / dist);
    rayIn.setAttribute('y2', py + 13 * (CY - py) / dist);
    rayOut.setAttribute('x1', px); rayOut.setAttribute('y1', py + 14);
    rayOut.setAttribute('x2', px); rayOut.setAttribute('y2', py + 52);

    // Phase-angle arc between the star direction and the observer direction.
    const r = 24, a1 = phi, a2 = Math.PI / 2;
    let d = a2 - a1;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d <= -Math.PI) d += 2 * Math.PI;
    arc.setAttribute('d', `M${px + r * Math.cos(a1)},${py + r * Math.sin(a1)} ` +
      `A${r},${r} 0 0 ${d > 0 ? 1 : 0} ${px + r * Math.cos(a2)},${py + r * Math.sin(a2)}`);
    const am = a1 + d / 2;
    lbl.setAttribute('x', px + 34 * Math.cos(am) - 4);
    lbl.setAttribute('y', py + 34 * Math.sin(am) + 4);

    // Observer's view: lit limb toward the star, elliptical terminator with semi-axis |cos α|.
    const k = Math.cos(alpha), side = CX - px >= 0 ? 1 : -1;
    viewDay.setAttribute('d', `M0,${-VIEW_R} A${VIEW_R},${VIEW_R} 0 0 1 0,${VIEW_R} ` +
      `A${Math.abs(k) * VIEW_R},${VIEW_R} 0 0 ${k > 0 ? 1 : 0} 0,${-VIEW_R} Z`);
    viewDay.setAttribute('transform', `scale(${side},1)`);

    // E-vector is perpendicular to the scattering plane; length ∝ degree of polarization.
    const p = rayleighPol(alpha), L = 4 + 52 * p;
    pol.setAttribute('y1', 90 - L / 2); pol.setAttribute('y2', 90 + L / 2);
    read.textContent = `α = ${Math.round(deg(alpha))}°`;

    const x = deg(alpha) / 180 * PLOT_W;
    curLine.setAttribute('x1', x); curLine.setAttribute('x2', x);
    curB.setAttribute('cx', x); curB.setAttribute('cy', 70 - lambert(alpha) * PLOT_H);
    curP.setAttribute('cx', x); curP.setAttribute('cy', 70 - p * PLOT_H);
  }

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let theta = 0.35, last = null, paused = still;
  const fixed = location.hash.match(/theta=(-?[\d.]+)/);   // e.g. #theta=1.2 freezes a phase
  if (fixed) { theta = parseFloat(fixed[1]); paused = true; }
  svg.addEventListener('click', () => { paused = !paused; });
  function tick(t) {
    if (last !== null && !paused) theta += 2 * Math.PI * (t - last) / 1000 / PERIOD;
    last = t;
    draw(theta);
    requestAnimationFrame(tick);
  }
  draw(theta);
  requestAnimationFrame(tick);
})();
