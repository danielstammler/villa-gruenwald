// Maßstäbliche Ansichten und Schnitt als SVG. Einheit: Meter; Höhe z wird zu SVG-y = -z.
// Teile in src/ansicht/, von tools/bauen.js nach Namen sortiert zu einer Datei zusammengesetzt: 00 Kern, 10 Bauteile, 20 Fassaden,
// 30 Schnitt A–A, 40 Schnitt B–B (Rampe), 90 Ausgabe.
const Elev = (() => {
  const Z = HOUSE.Z, o = HOUSE.ueberstand, r1 = HOUSE.run1, r2 = HOUSE.run2;
  const f = v => +v.toFixed(3);
  const num = v => v.toFixed(2).replace('.', ',');
  const kote = v => (Math.abs(v) < 0.005 ? '±' : v > 0 ? '+' : '−') + num(Math.abs(v));
  const r = (x0, z0, x1, z1, cls) => `<rect x="${f(Math.min(x0, x1))}" y="${f(-Math.max(z0, z1))}" width="${f(Math.abs(x1 - x0))}" height="${f(Math.abs(z1 - z0))}" class="${cls}"/>`;
  const poly = (pts, cls) => `<polygon points="${pts.map(p => `${f(p[0])},${f(-p[1])}`).join(' ')}" class="${cls}"/>`;
  const pline = (pts, cls) => `<polyline points="${pts.map(p => `${f(p[0])},${f(-p[1])}`).join(' ')}" class="${cls}"/>`;
  const ln = (x0, z0, x1, z1, cls) => `<line x1="${f(x0)}" y1="${f(-z0)}" x2="${f(x1)}" y2="${f(-z1)}" class="${cls}"/>`;
  const tx = (x, z, s, cls) => `<text x="${f(x)}" y="${f(-z)}" class="${cls}">${s}</text>`;

  const DEFS = `<defs>
    <pattern id="pSlate" width="0.8" height="0.4" patternUnits="userSpaceOnUse"><rect width="0.8" height="0.4" class="e-roof"/><path d="M0 0.2H0.8M0 0.4H0.8M0.4 0V0.2M0 0.2V0.4M0.8 0.2V0.4" class="e-roof-line"/></pattern>
    <linearGradient id="gGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a4830"/><stop offset="0.35" stop-color="#d9a466"/><stop offset="0.75" stop-color="#c48b51"/><stop offset="1" stop-color="#7a563a"/></linearGradient>
    <pattern id="pZink" width="0.32" height="1" patternUnits="userSpaceOnUse"><rect width="0.32" height="1" class="e-zink"/><path d="M0 0V1" class="e-roof-line"/></pattern>
    <pattern id="pEarth" width="0.32" height="0.32" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V0.32" class="e-hatch"/></pattern>
  </defs>`;

