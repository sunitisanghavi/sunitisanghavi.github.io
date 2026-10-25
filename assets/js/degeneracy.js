// Radius–albedo degeneracy explorer.
// For a fixed measured planet/star contrast C ∝ A_g R², every geometric albedo A_g
// implies a different radius R = R_ref * sqrt(A_ref / A_g). Schematic only.
(function () {
  const root = document.getElementById('degeneracy');
  if (!root) return;

  const A_REF = 0.3, R_REF = 1.0;          // Earth-like reference: A_g = 0.3, R = 1 R⊕
  const A_MIN = 0.05, A_MAX = 0.8;
  const radius = a => R_REF * Math.sqrt(A_REF / a);

  const slider = root.querySelector('input');
  const out = root.querySelector('.readout');
  const planet = root.querySelector('#dg-planet');
  const marker = root.querySelector('#dg-marker');
  const label = root.querySelector('#dg-label');

  // Radius axis: 0.5–2.6 R⊕ mapped to x = 40–560
  const x = r => 40 + (r - 0.5) / (2.6 - 0.5) * 520;
  root.querySelector('#dg-range').setAttribute('x', x(radius(A_MAX)));
  root.querySelector('#dg-range').setAttribute('width', x(radius(A_MIN)) - x(radius(A_MAX)));

  function update() {
    const a = parseFloat(slider.value);
    const r = radius(a);
    planet.setAttribute('r', 22 * r);
    // dark slate (low albedo) → pale blue (high albedo)
    const t = (a - A_MIN) / (A_MAX - A_MIN);
    const mix = (lo, hi) => Math.round(lo + t * (hi - lo));
    planet.setAttribute('fill', `rgb(${mix(30, 205)}, ${mix(45, 228)}, ${mix(75, 255)})`);
    marker.setAttribute('cx', x(r));
    label.setAttribute('x', x(r));
    label.textContent = r.toFixed(2) + ' R⊕';
    out.textContent = `geometric albedo ${a.toFixed(2)} → inferred radius ${r.toFixed(2)} R⊕ (same brightness)`;
  }
  slider.addEventListener('input', update);
  update();
})();
