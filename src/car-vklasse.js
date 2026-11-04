// Mercedes-Benz V-Klasse lang (W447, Modell 2024) in Obsidianschwarz: Großraumlimousine mit kurzer, steiler Haube, langer
// Frontscheibe, flachem Dach, Schiebetüren auf beiden Seiten und senkrechten Rückleuchten in den D-Säulen. Ohne Stern und Schriftzüge.
CAR_MODELS.vklasse = k => {
  const L = 5.14, W = 1.928, H = 1.9, xa = 0.925, xb = 4.125, r = 0.351;
  CAR_MODELS.vklasse.spec = { L, W, H, wheelbase: xb - xa };
  const { curve, V3 } = k;
  // Mittellinie oben (Seitenansicht): Bug, Haube, Frontscheibe, Dach, Heckklappe, Ladekante
  const yc = curve([[0, 0.55], [0.012, 0.62], [0.03, 0.69], [0.06, 0.78], [0.1, 0.875], [0.15, 0.955], [0.2, 1.015], [0.25, 1.05], [0.32, 1.075],
    [0.6, 1.15], [0.95, 1.237], [1.06, 1.284], [1.14, 1.33], [1.5, 1.578], [1.8, 1.792], [1.9, 1.855], [2.0, 1.88], [2.15, 1.89], [4.75, 1.89],
    [4.9, 1.885], [4.95, 1.875], [4.972, 1.855], [4.982, 1.8], [5.05, 1.22], [5.068, 1.0], [5.08, 0.8], [5.088, 0.75], [5.13, 0.738], [5.137, 0.7], [5.14, 0.62]]);
  // Unterkante Mitte
  const yb = curve([[0, 0.33], [0.012, 0.28], [0.035, 0.245], [0.08, 0.22], [0.18, 0.2], [0.45, 0.185], [4.6, 0.185], [4.85, 0.215], [5.0, 0.265], [5.1, 0.3], [5.14, 0.37]]);
  // Gürtellinie (Fensterunterkante) steigt leicht nach hinten; Oberkante Seitenscheibe: A-Säule (Scheibenmitte um 0,15 m versetzt), sonst Dachkante
  const belt = x => 1.215 + 0.024 * (Math.max(1.2, Math.min(x, 4.85)) - 1.2);
  const yA = x => Math.max(belt(x), Math.min(1.8, yc(x - 0.15)));
  // Lage von Front- und Heckfläche (Mitte) je Höhe; daraus die Rundung der Ecken in der Draufsicht
  const xfT = curve([[0.55, 0], [0.62, 0.012], [0.69, 0.03], [0.78, 0.06], [0.875, 0.1], [0.955, 0.15], [1.015, 0.2], [1.05, 0.25], [1.2, 0.34]]);
  const xf = y => (y < 0.55 ? 0.012 * Math.max(0, 0.33 - y) / 0.14 : xfT(y));
  const xeT = curve([[0.42, 5.14], [0.62, 5.14], [0.7, 5.137], [0.738, 5.13], [0.75, 5.088], [0.8, 5.08], [1.0, 5.068], [1.22, 5.05], [1.8, 4.982], [1.855, 4.972], [1.875, 4.95], [1.89, 4.86]]);
  const xe = y => (y < 0.42 ? 5.14 - 0.3 * (0.42 - y) ** 2 : xeT(y));
  const planF = d => (d <= 0 ? 0 : Math.min(1, (d / 0.3) ** (1 / 2.2)));
  const planR = d => (d <= 0 ? 0 : Math.min(1, (d / 0.14) ** (1 / 3)));
  // Radläufe
  const archY = x => { let y = -1; for (const c of [xa, xb]) { const d = Math.abs(x - c), R = 0.4; if (d < R) y = Math.max(y, r + Math.sqrt(R * R - d * d)); } return y; };
  // Querschnitt: halbe Breiten j 0–12 (Boden, Schweller, Flanke, Schulter, Gürtellinie), Seitenscheiben mit Einzug, Dach als Superellipse
  const ZN = [0, 0.45, 0.84, 0.895, 0.932, 0.952, 0.961, 0.964, 0.964, 0.962, 0.958, 0.948, 0.932];
  const zg = (y, b) => 0.925 - (y - b) * 0.2;
  const soft = curve([[0, 0.03], [0.25, 0.1], [0.95, 0.1], [1.2, 0.06], [4.9, 0.06], [5.0, 0.05]]);
  const capOff = curve([[0, 0.004], [0.2, 0.01], [0.35, 0.03], [1.0, 0.03], [1.15, 0], [4.9, 0], [4.97, 0.004]]);
  const mTop = curve([[0, 2], [0.3, 3], [1.0, 3], [1.2, 2.5], [1.85, 2.5], [2.1, 4], [4.85, 4], [4.98, 2.2]]);
  const FT = [0.95, 0.84, 0.62, 0.32, 0];
  // Rundung der Ecken je Höhe: oben weiter hinten (vorn) bzw. weiter vorn (hinten), gedämpft gegen Falten
  // hinten ohne die Stufe der Ladekante, damit die Ecken des Stoßfängers glatt bleiben
  const xeS = curve([[0.42, 5.14], [0.62, 5.14], [0.7, 5.134], [0.85, 5.085], [1.0, 5.068], [1.22, 5.05], [1.8, 4.982], [1.855, 4.972], [1.875, 4.95], [1.89, 4.86]]);
  const xfE = y => 0.35 * xf(y), xeE = y => { const e = y < 0.42 ? xe(y) : xeS(y); return e + 0.6 * (L - e); };
  function prof(x) {
    const top = yc(x), bot = yb(x), b = belt(x), ya = yA(x), ay = archY(x), c = top - capOff(x), s = soft(x);
    const comp = y => (y <= c - s ? y : c - s * Math.exp(-(y - (c - s)) / s));
    const fr = planF(x) * planR(L - x), P = [];
    for (let j = 0; j < 3; j++) P.push([ZN[j] * fr, Math.max(bot + (j === 2 ? 0.01 : 0), ay)]);
    const lv = [0.255, 0.3, 0.38, 0.5, 0.62, 0.76, 0.76 + (b - 0.76) * 0.35, 0.76 + (b - 0.76) * 0.66, 0.76 + (b - 0.76) * 0.88, b];
    for (let t = 1; t <= 4; t++) lv.push(b + (ya - b) * t / 4);
    let yp = P[2][1];
    lv.forEach((y0, q) => {
      const j = q + 3, y = Math.max(comp(y0), bot + 0.004 * (j - 2), yp + 0.0004, ay);
      P.push([(j <= 12 ? ZN[j] : zg(y0, b)) * planF(x - xfE(y)) * planR(xeE(y) - x), y]);
      yp = y;
    });
    const [z16, y16] = P[16], m = mTop(x), tp = Math.max(top, y16 + 0.001);
    FT.forEach(f => P.push([z16 * f, y16 + (tp - y16) * (1 - f ** m) ** (1 / m)]));
    return P;
  }
  // Halbe Breite des Querschnitts bei Länge x und Höhe y (−1 außerhalb)
  function hwAt(x, y) {
    const P = prof(x);
    if (y < P[2][1]) return -1;
    for (let j = 2; j < 21; j++) { const [z0, y0] = P[j], [z1, y1] = P[j + 1]; if (y >= y0 && y <= y1 && y1 > y0) return z0 + (z1 - z0) * (y - y0) / (y1 - y0); }
    return -1;
  }
  // Punkt auf der Front- (e = −1) oder Heckfläche (e = 1) bei Höhe y und Querlage z, mit Normale; off nach außen
  function faceX(y, z, e) {
    let a = e < 0 ? 0 : 4.6, b2 = e < 0 ? 0.5 : L;   // vor bzw. hinter den Radläufen suchen
    for (let q = 0; q < 24; q++) { const m = (a + b2) / 2, ok = hwAt(m, y) >= z; if (e < 0 ? ok : !ok) b2 = m; else a = m; }
    return (a + b2) / 2;
  }
  function facePt(e, y, z, off = 0.004) {
    const s = Math.sign(z) || 1, d = 0.004, az = Math.min(Math.abs(z), hwAt(e < 0 ? 0.5 : 4.62, y) - d - 0.001); z = s * az;
    const p = V3(faceX(y, az, e), y, z);
    const ty = V3(faceX(y + d, az, e), y + d, z).sub(p), tz = V3(faceX(y, az + d, e), y, s * (az + d)).sub(p);
    const n = ty.cross(tz).normalize(); if (n.x * e < 0) n.negate();
    return { p: p.addScaledVector(n, off), n };
  }
  // Gitter aus Punkten {p, n} (nu+1 × nv+1) als Fläche, Dreiecke zur Normale hin ausgerichtet
  function skin(m, G, nu, nv) {
    const p = [], nn = [], id = (a, b2) => a * (nv + 1) + b2;
    for (let a = 0; a < nu; a++) for (let b2 = 0; b2 < nv; b2++) {
      let tri = [[id(a, b2), id(a + 1, b2), id(a + 1, b2 + 1)], [id(a, b2), id(a + 1, b2 + 1), id(a, b2 + 1)]];
      const [p0, p1, p2] = tri[0].map(q => G[q].p), fn = p1.clone().sub(p0).cross(p2.clone().sub(p0));
      if (fn.dot(G[id(a, b2)].n) < 0) tri = tri.map(([u, v, w]) => [u, w, v]);
      for (const t of tri) for (const q of t) { p.push(G[q].p.x, G[q].p.y, G[q].p.z); nn.push(G[q].n.x, G[q].n.y, G[q].n.z); }
    }
    const g = new k.THREE.BufferGeometry(); g.setAttribute('position', new k.THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new k.THREE.Float32BufferAttribute(nn, 3));
    k.add(m, g);
  }
  // Flächenstück auf Front/Heck: fn(u, v) → [y, z] (z ≥ 0), beidseitig gespiegelt oder nur eine Seite
  function face(m, e, fn, { nu = 8, nv = 4, off = 0.004, sides = [1, -1] } = {}) {
    for (const s of sides) {
      const G = [];
      for (let a = 0; a <= nu; a++) for (let b2 = 0; b2 <= nv; b2++) { const [y, z] = fn(a / nu, b2 / nv); G.push(facePt(e, y, s * z, off)); }
      skin(m, G, nu, nv);
    }
  }
  // Stationen: vorn und hinten dicht, dazwischen alle 2,5 cm; Kanten der Scheiben als eigene Stationen
  const xs = new Set();
  for (let x = 0; x < 0.36; x += 0.004 + x * 0.05) xs.add(+x.toFixed(4));
  for (let x = 0.36; x < 4.93; x += 0.025) xs.add(+x.toFixed(4));
  for (let x = 4.93; x < L; x += 0.005) xs.add(+x.toFixed(4));
  [1.1, 1.42, 1.88, 2.42, 2.52, 3.6, 3.68, 4.8, 4.88, L].forEach(x => xs.add(x));
  const st = [...xs].sort((a, b) => a - b).map(x => ({ x, p: prof(x) }));
  // Scheiben: vorn klar (Innenraum sichtbar), ab B-Säule Privacy-Glas; Säulen schwarz; Frontscheibe über den Dachpunkten
  const sideGlass = [[1.42, 2.42, 'glass'], [2.52, 3.6, 'glassDark'], [3.68, 4.88, 'glassDark']];
  const H1 = k.hull(st, { mat: (i, j, side, c) => {
    if (j <= 1 || (j <= 3 && (c.x < 0.5 || c.x > 4.75))) return 'underbody';   // vorn und hinten auch die Unterkante der Stoßfänger
    if (j >= 12 && j <= 15 && c.x > 1.1 && c.x < 4.88) { for (const [a, e, m] of sideGlass) if (c.x > a && c.x < e) return m; return 'trim'; }
    if (j >= 17 && c.x > 1.1 && c.x < 1.88) return 'glass';
    return 'paint';
  } });
  // ---- Front: großer, aufrechter Kühlergrill (Trapez) mit Chromrahmen und waagrechten Chromlamellen, ohne Stern
  const gB = 0.55, gT = 0.995, gz = y => 0.53 - (y - gB) / (gT - gB) * 0.085;   // halbe Breite des Grills je Höhe
  face('grille', -1, (u, v) => { const y = gB + (gT - gB) * u; return [y, gz(y) * v]; }, { nu: 8, nv: 6, off: 0.006 });
  const fr = 0.03;   // Rahmenbreite
  face('chrome', -1, (u, v) => [gB + fr * u, (gz(gB) - 0.012) * v], { nu: 1, nv: 8, off: 0.017 });
  face('chrome', -1, (u, v) => [gT - fr * u, (gz(gT) - 0.012) * v], { nu: 1, nv: 8, off: 0.017 });
  face('chrome', -1, (u, v) => { const y = gB + (gT - gB) * u, e = gz(y); return [y, e - fr * (1 - v) - 0.013 * (1 - Math.min(1, Math.min(u, 1 - u) * 13)) ** 2]; }, { nu: 14, nv: 1, off: 0.017 });
  for (let q = 0; q < 6; q++) {
    const y = gB + 0.058 + q * 0.064;
    face('chrome', -1, (u, v) => [y + 0.024 * u, (gz(y) - fr) * v], { nu: 1, nv: 8, off: 0.013 });
    face('trim', -1, (u, v) => [y - 0.006 + 0.006 * u, (gz(y) - fr) * v], { nu: 1, nv: 6, off: 0.01 });
  }
  // Große MULTIBEAM-Scheinwerfer: Oberkante an der Haubenfuge, Unterkante steigt nach außen, Innenkante am Grillrahmen;
  // um die Ecke weit auf den Kotflügel gezogen, hinten spitz; Tagfahrlicht als Lichtband oben, sechs LED-Module
  const hz0 = 0.458, hz1 = 0.935, hyB = u => 0.835 + 0.06 * u ** 1.3, hyT = u => 0.998 + 0.018 * u;
  const hzA = (u, y) => { const z0 = gz(Math.min(y, gT)) + 0.016; return z0 + (hz1 - z0) * u; };
  const hl = (u, v) => { const y = hyB(u) + (hyT(u) - hyB(u)) * v; return [y, hzA(u, y)]; };
  face('lampHousing', -1, hl, { nu: 16, nv: 4, off: 0.006 });
  face('drl', -1, (u, v) => { const t = 0.03 + 0.97 * u, y = hyT(t) - 0.024 + 0.012 * v; return [y, hzA(t, y)]; }, { nu: 16, nv: 1, off: 0.011 });
  face('drl', -1, (u, v) => { const t = 0.02 + 0.3 * u, y = hyB(t) + 0.012 + 0.01 * v; return [y, hzA(t, y)]; }, { nu: 4, nv: 1, off: 0.011 });
  for (let q = 0; q < 6; q++) { const t = 0.05 + q * 0.09; face('headlight', -1, (u, v) => hl(t + 0.062 * u, 0.3 + 0.3 * v), { nu: 1, nv: 1, off: 0.01 }); }
  face('chrome', -1, (u, v) => hl(0.6 + 0.32 * u, 0.36 + 0.2 * v), { nu: 4, nv: 1, off: 0.009 });
  face('lens', -1, hl, { nu: 16, nv: 4, off: 0.015 });
  // Seitlicher Teil auf dem Kotflügel: Gitter über H1.at, nach außen versetzt
  const flank = (m, x0, x1, jB, jT, off, nu = 10, nv = 2) => k.both(s => {
    const G = [];
    for (let a = 0; a <= nu; a++) for (let b2 = 0; b2 <= nv; b2++) {
      const u = a / nu, q = H1.at(x0 + (x1 - x0) * u, jB(u) + (jT(u) - jB(u)) * b2 / nv, s); q.p.addScaledVector(q.n, off); G.push(q);
    }
    skin(m, G, nu, nv);
  });
  const sjT = u => 10 - 0.1 * u, sjB = u => 8.85 + 0.97 * u ** 1.6;
  flank('lampHousing', 0.34, 0.585, sjB, sjT, 0.006);
  flank('drl', 0.34, 0.54, u => sjT(u * 0.816) - 0.24, u => sjT(u * 0.816) - 0.12, 0.011, 8, 1);
  flank('lens', 0.34, 0.585, sjB, sjT, 0.015);
  // Stoßfänger: Kennzeichen (weiß, ohne Schrift), breiter unterer Lufteinlass mit Chromleiste, seitliche Einlässe
  face('trim', -1, (u, v) => [0.418 + 0.124 * u, 0.268 * v], { nu: 2, nv: 4, off: 0.006 });
  face('plate', -1, (u, v) => [0.425 + 0.11 * u, 0.26 * v], { nu: 2, nv: 4, off: 0.01 });
  face('grille', -1, (u, v) => { const y = 0.272 + 0.12 * u; return [y, (0.6 - 0.08 * u) * v]; }, { nu: 3, nv: 8, off: 0.005 });
  face('chrome', -1, (u, v) => [0.252 + 0.013 * u, 0.64 * v], { nu: 1, nv: 8, off: 0.008 });
  // Vorderkante der Motorhaube als Fuge über Grill und Scheinwerfern
  face('trim', -1, (u, v) => { const z = 0.93 * u; return [hyT(Math.max(0, (z - hz0) / (hz1 - hz0))) + 0.012 + 0.005 * v, z]; }, { nu: 18, nv: 1, off: 0.003 });
  face('grille', -1, (u, v) => { const y = 0.3 + 0.24 * u; return [y, 0.665 + 0.035 * u + (0.2 - 0.05 * u) * v]; }, { nu: 4, nv: 3, off: 0.005 });
  for (const y of [0.37, 0.45]) face('chrome', -1, (u, v) => [y + 0.012 * u, 0.67 + 0.035 * (y - 0.3) / 0.24 + (0.19 - 0.05 * (y - 0.3) / 0.24) * v], { nu: 1, nv: 3, off: 0.009 });
  // ---- Heck: große Heckscheibe (Privacy-Glas) mit schwarzem Rand, Dachspoiler mit dritter Bremsleuchte, Fugen der Heckklappe
  const gw = y => 0.712 - (y - 1.17) * 0.05;   // halbe Breite der Scheibe je Höhe
  face('trim', 1, (u, v) => { const y = 1.165 + 0.645 * u; return [y, (gw(y) + 0.012) * v]; }, { nu: 10, nv: 8, off: 0.003 });
  face('glassDark', 1, (u, v) => { const y = 1.19 + 0.59 * u; return [y, (gw(y) - 0.012) * v]; }, { nu: 10, nv: 8, off: 0.007 });
  // Dachkantenspoiler als Körper: Profil der Seitenansicht entlang z extrudiert und der Dachwölbung nachgeführt;
  // schwarze Unterseite, dritte Bremsleuchte an der Hinterkante
  const roofZ = []; for (let j = 16.6; j < 21.05; j += 0.2) { const q = H1.at(4.9, j, 1).p; roofZ.push([q.z, q.y]); }
  const drop = z => {
    const a = Math.abs(z), c = roofZ[roofZ.length - 1][1];
    for (let q = 0; q < roofZ.length - 1; q++) { const [z0, y0] = roofZ[q], [z1, y1] = roofZ[q + 1]; if (a <= z0 && a >= z1) return c - (y0 + (y1 - y0) * (a - z0) / (z1 - z0 || 1)); }
    return a > roofZ[0][0] ? c - roofZ[0][1] : 0;
  };
  const extr = (m, pts, z0, z1) => {
    const g = new k.THREE.ExtrudeGeometry(new k.THREE.Shape(pts.map(([x, y]) => new k.THREE.Vector2(x, y))), { depth: z1 - z0, steps: 16, bevelEnabled: false });
    g.translate(0, 0, z0);
    const p = g.attributes.position; for (let q = 0; q < p.count; q++) p.setY(q, p.getY(q) - drop(p.getZ(q)));
    g.computeVertexNormals(); k.add(m, g);
  };
  const spTop = [[4.84, 1.886], [4.88, 1.8895], [4.92, 1.892], [4.96, 1.8935], [5.0, 1.893], [5.025, 1.8905], [5.038, 1.886], [5.045, 1.879], [5.046, 1.872]];
  const spBot = [[5.043, 1.866], [5.03, 1.861], [5.0, 1.855], [4.975, 1.852], [4.95, 1.858], [4.9, 1.872], [4.84, 1.878]];
  extr('paint', [...spTop, ...spBot], -0.71, 0.71);
  const lip = spBot.slice(0, 4);
  extr('trim', [...lip.map(([x, y]) => [x, y + 0.002]), ...lip.slice().reverse().map(([x, y]) => [x, y - 0.004])], -0.7, 0.7);
  k.box('taillight', 5.04, 5.049, 1.869, 1.876, -0.22, 0.22);
  face('trim', 1, (u, v) => [0.8 + 1.018 * u, 0.742 + 0.006 * v], { nu: 12, nv: 1, off: 0.002 });
  face('trim', 1, (u, v) => [0.775 + 0.006 * u, 0.745 * v], { nu: 1, nv: 8, off: 0.002 });
  // Senkrechte Rückleuchten in den D-Säulen: rauchrotes Gehäuse mit Chromrand, zwei Lichtleiter mit Bögen, Blinker, Rückfahrlicht
  const tz0 = 0.755, tz1 = 0.948, ty0 = 0.855, ty1 = 1.34;
  const tl = (u, v) => [ty0 + (ty1 - ty0) * u, tz0 + (tz1 - tz0) * v];
  face('lampHousing', 1, (u, v) => tl(-0.015 + 1.03 * u, -0.03 + 1.03 * v), { nu: 10, nv: 6, off: 0.003 });
  face('taillightDark', 1, tl, { nu: 10, nv: 6, off: 0.006 });
  // Rauchglas dominiert; zwei schmale senkrechte Lichtleiter, oben mit einem Bogen verbunden; Blinker und Rückfahrlicht als Streifen
  const gA = tz0 + 0.035, gB2 = tz1 - 0.04, gm = (gA + gB2) / 2, grz = (gB2 - gA) / 2, gyA = ty1 - 0.095, gry = 0.045;
  for (const zc of [gA, gB2]) face('taillight', 1, (u, v) => [ty0 + 0.17 + (gyA - ty0 - 0.17) * u, zc - 0.005 + 0.01 * v], { nu: 6, nv: 1, off: 0.01 });
  face('taillight', 1, (u, v) => { const a = Math.PI * u, d = 0.01 * (v - 0.5); return [gyA + (gry + d) * Math.sin(a), gm + (grz + d) * Math.cos(a)]; }, { nu: 10, nv: 1, off: 0.01 });
  face('indicator', 1, (u, v) => [ty0 + 0.06 + 0.025 * u, tz0 + 0.02 + (tz1 - tz0 - 0.04) * v], { nu: 1, nv: 4, off: 0.009 });
  face('headlight', 1, (u, v) => [ty0 + 0.11 + 0.025 * u, tz0 + 0.02 + (tz1 - tz0 - 0.04) * v], { nu: 1, nv: 4, off: 0.009 });
  // Kennzeichen mit Rahmen, Chromleiste mit Griff darüber
  face('trim', 1, (u, v) => [0.858 + 0.124 * u, 0.268 * v], { nu: 2, nv: 4, off: 0.005 });
  face('plate', 1, (u, v) => [0.865 + 0.11 * u, 0.26 * v], { nu: 2, nv: 4, off: 0.009 });
  face('chrome', 1, (u, v) => [1.03 + 0.03 * u, 0.42 * v], { nu: 1, nv: 8, off: 0.009 });
  // Heckstoßfänger: schwarze Ladekantenschutzleiste mit Rippen, schwarzer Diffusor unten, Rückstrahler
  k.box('trimMatte', 5.088, 5.134, 0.733, 0.745, -0.66, 0.66);
  for (let q = 0; q < 6; q++) k.box('trim', 5.094 + q * 0.0065, 5.097 + q * 0.0065, 0.745, 0.748, -0.64, 0.64);
  // Diffusor nur auf der senkrechten Heckfläche (darunter rundet die Unterseite), dazu ein eigener Körper unter dem Stoßfänger
  face('trimMatte', 1, (u, v) => [0.37 + 0.06 * u, 0.72 * v], { nu: 2, nv: 10, off: 0.004 });
  k.box('trimMatte', 5.05, 5.115, 0.282, 0.34, -0.48, 0.48);
  face('chrome', 1, (u, v) => [0.435 + 0.01 * u, 0.62 * v], { nu: 1, nv: 8, off: 0.007 });
  face('taillightDark', 1, (u, v) => [0.46 + 0.03 * u, 0.7 + 0.16 * v], { nu: 1, nv: 2, off: 0.006 });
  // Heckwischer auf der Scheibe
  face('trim', 1, (u, v) => [1.225 + 0.08 * u - 0.008 + 0.016 * v, 0.03 + 0.5 * u], { nu: 6, nv: 1, off: 0.022, sides: [-1] });
  k.cyl('trim', 'x', 5.03, 5.065, 1.215, 0.0, 0.025, 0.02, 12);
  // Endrohr links unter dem Stoßfänger
  k.cyl('chrome', 'x', 4.98, 5.11, 0.245, -0.52, 0.034, 0.034, 16, true); k.cyl('trimMatte', 'x', 4.98, 5.105, 0.245, -0.52, 0.03, 0.03, 16);
  // ---- Flanke: Chromleiste an der Fensterunterkante, Führungsschiene der Schiebetür, Fugen, Griffe, Schwellerleiste
  k.lineJ('chrome', H1, 1.42, 4.87, 12, { dj: 0.16, off: 0.004 });
  // Scheibenecken: D-Säule schräg mit stark gerundeter oberer Ecke (Lack), obere Ecken an B- und C-Säule gerundet (schwarz).
  // Masken zwischen Scheibenkante und Ecke als waagrechte Streifen auf der Fläche (Seitenscheibe j 12–16 = Gürtel bis Oberkante)
  const jW = (x, y) => 12 + 4 * (y - belt(x)) / (yA(x) - belt(x));
  const mask = (m, pts, x1, off = 0.002, nv = 2) => k.both(s => {
    const G = [];
    for (const [x0, y] of pts) for (let b2 = 0; b2 <= nv; b2++) { const x = x0 + (x1 - x0) * b2 / nv, q = H1.at(x, jW(x, y), s); q.p.addScaledVector(q.n, off); G.push(q); }
    skin(m, G, pts.length - 1, nv);
  });
  const arcPts = (cx, cy, r, a0, a1, n = 8) => Array.from({ length: n + 1 }, (_, q) => { const a = a0 + (a1 - a0) * q / n; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; });
  {
    const R = 0.13, P = [4.77, 1.8], B0 = [4.87, belt(4.87)], l = Math.hypot(B0[0] - P[0], B0[1] - P[1]), d1 = [(B0[0] - P[0]) / l, (B0[1] - P[1]) / l];
    const th = Math.acos(-d1[0]), t = R / Math.tan(th / 2), bl = Math.hypot(d1[0] - 1, d1[1]), cd = R / Math.sin(th / 2);
    const T1 = [P[0] + d1[0] * t, P[1] + d1[1] * t], C = [P[0] + (d1[0] - 1) / bl * cd, P[1] + d1[1] / bl * cd];
    const line = [0, 1, 2, 3].map(q => [B0[0] + (T1[0] - B0[0]) * q / 3, B0[1] + (T1[1] - B0[1]) * q / 3]);
    mask('paint', [...line, ...arcPts(C[0], C[1], R, Math.atan2(T1[1] - C[1], T1[0] - C[0]), Math.PI / 2, 8).slice(1)], 4.885);
  }
  const rc = 0.045;
  for (const xc of [2.42, 3.6]) mask('trim', arcPts(xc - rc, 1.8 - rc, rc, 0, Math.PI / 2, 6), xc + 0.002);
  for (const xc of [2.52, 3.68]) mask('trim', arcPts(xc + rc, 1.8 - rc, rc, Math.PI, Math.PI / 2, 6), xc - 0.002);
  k.lineJ('trim', H1, 3.66, 4.86, 9.85, { dj: 0.2, off: 0.004 });
  k.lineJ('chrome', H1, 1.45, 3.62, 3.6, { dj: 0.3, off: 0.003 });
  for (const x of [1.4, 2.465, 2.535, 3.645]) k.lineX('trim', H1, x, 3.1, 12, { w: 0.006 });
  k.lineJ('trim', H1, 0.3, 1.07, 16.3, { dj: 0.08, off: 0.002 });   // Haubenfugen
  k.both(s => {
    for (const x of [2.24, 2.71]) {
      const q = H1.at(x, 10.4, s);
      k.box('paint', x - 0.085, x + 0.085, q.p.y - 0.016, q.p.y + 0.016, s > 0 ? q.p.z - 0.004 : q.p.z - 0.018, s > 0 ? q.p.z + 0.018 : q.p.z + 0.004);
      k.box('chrome', x - 0.08, x + 0.08, q.p.y + 0.01, q.p.y + 0.015, s > 0 ? q.p.z : q.p.z - 0.021, s > 0 ? q.p.z + 0.021 : q.p.z);
    }
    // Außenspiegel am Türeck: Gehäuse als Loft (hinten abgerundetes Rechteck mit fallender Oberkante, nach vorn zur runden
    // Nase eingezogen), Spiegelglas mit schwarzem Rand hinten, Blinker als Band unten außen, schwarzer Fuß
    const mz = 1.055, my = 1.35, mhz = 0.085, mhy = 0.088, mx0 = 1.525, mx1 = 1.645, NU = 7, NV = 24, e = 2 / 4.5;
    const ring = (t, sc) => {
      const zr = Math.sign(Math.cos(t)) * Math.abs(Math.cos(t)) ** e, yr = Math.sign(Math.sin(t)) * Math.abs(Math.sin(t)) ** e;
      return [s * (mz + mhz * sc * zr), my + sc * (mhy * yr - (yr > 0 ? 0.012 * zr * yr : 0))];
    };
    const MP = [];
    for (let a = 0; a <= NU; a++) {
      const ph = Math.PI / 2 * (0.04 + 0.96 * a / NU), x = mx1 - (mx1 - mx0) * Math.cos(ph), sc = Math.sin(ph) ** 0.55;
      MP.push(Array.from({ length: NV + 1 }, (_, b2) => { const [z, y] = ring(2 * Math.PI * b2 / NV, sc); return V3(x, y, z); }));
    }
    const MG = [];
    for (let a = 0; a <= NU; a++) for (let b2 = 0; b2 <= NV; b2++) {
      const ta = MP[Math.min(NU, a + 1)][b2].clone().sub(MP[Math.max(0, a - 1)][b2]), tb = MP[a][(b2 + 1) % NV].clone().sub(MP[a][(b2 + NV - 1) % NV]);
      const n = ta.cross(tb).normalize(); if (n.dot(MP[a][b2].clone().sub(V3(mx1, my, s * mz))) < 0) n.negate();
      MG.push({ p: MP[a][b2], n });
    }
    skin('paint', MG, NU, NV);
    const MI = []; for (let a = 2; a <= 5; a++) for (let b2 = 19; b2 <= 23; b2++) { const q = MG[a * (NV + 1) + b2]; MI.push({ p: q.p.clone().addScaledVector(q.n, 0.0015), n: q.n }); }
    skin('indicator', MI, 3, 4);
    const outl = sc => Array.from({ length: NV }, (_, b2) => ring(2 * Math.PI * b2 / NV, sc));
    k.shape('trim', 'zy', outl(1), mx1 - 0.004, 0.006);
    k.shape('glassDark', 'zy', outl(0.9), mx1 + 0.001, 0.0025);
    k.box('trim', 1.56, 1.63, 1.25, 1.3, s > 0 ? 0.905 : -0.99, s > 0 ? 0.99 : -0.905);
    k.box('trim', 1.12, 1.42, belt(1.3) - 0.004, belt(1.3) + 0.012, s > 0 ? 0.9 : -0.935, s > 0 ? 0.935 : -0.9);
  });
  // Windlauf schwarz, Scheibenwischer, Haifischflosse
  k.patch('trimMatte', H1, 1.045, 1.1, 15.5, 21, { nx: 3, nj: 8, off: 0.003 });
  for (const s of [1, -1]) k.patch('trim', H1, 1.115, 1.13, s > 0 ? 17.6 : 18.2, 20.9, { side: s, nx: 1, nj: 6, off: 0.014 });
  k.shape('trim', 'xy', [[4.52, 1.888], [4.74, 1.888], [4.735, 1.905], [4.68, 1.935], [4.64, 1.937]], -0.035, 0.07, { bevel: 0.006 });
  // ---- Innenraum (durch die Scheiben sichtbar): Boden, Armaturenbrett, Lenkrad, Mittelkonsole, Sitze in drei Reihen
  k.box('carpet', 1.34, 3.7, 0.42, 0.45, -0.86, 0.86); k.box('carpet', 3.7, 4.92, 0.76, 0.79, -0.86, 0.86);
  // Innenverkleidung (doppelseitig): der einseitige Lack ist von innen unsichtbar, sonst sähe man durch die Gegenseite hindurch
  k.both(s => {
    const zz = (a, b2) => [Math.min(s * a, s * b2), Math.max(s * a, s * b2)];
    k.box('interior', 1.32, 3.7, 0.45, 1.205, ...zz(0.885, 0.905));   // Türen
    k.box('interior', 3.7, 4.95, 0.8, 1.26, ...zz(0.885, 0.905));     // Seitenwand über dem Radhaus
    for (const [x0, x1] of [[2.42, 2.52], [3.6, 3.68], [4.86, 4.92]]) k.box('interior', x0, x1, 1.2, 1.75, ...zz(0.79, 0.81));   // B-, C-, D-Säule
  });
  k.box('interiorLight', 1.95, 4.93, 1.8, 1.82, -0.8, 0.8);   // Dachhimmel
  k.box('interior', 5.03, 5.045, 0.8, 1.16, -0.72, 0.72);      // Heckklappe innen
  k.box('interior', 1.12, 1.58, 0.82, 1.13, -0.86, 0.86);
  // Kombiinstrument, Lenkrad und Lenksäule auf der Fahrerseite links (+z), wie bei Ferrari und Cayenne
  k.box('interior', 1.4, 1.56, 1.13, 1.2, 0.18, 0.62);
  k.box('interiorLight', 1.15, 1.45, 1.12, 1.135, -0.8, 0.8);
  k.box('interior', 1.6, 2.2, 0.45, 0.74, -0.13, 0.13);
  const sw = new k.THREE.TorusGeometry(0.19, 0.02, 8, 30); sw.rotateY(Math.PI / 2); sw.rotateZ(0.55); sw.translate(1.7, 1.13, 0.43); k.add('interior', sw);
  k.cyl('interior', 'x', 1.5, 1.7, 1.06, 0.43, 0.03, 0.03, 10);
  // Sitz: Kissen, Lehne, Kopfstütze, Sockel; y0 = Boden (dritte Reihe auf erhöhtem Boden über der Hinterachse)
  const seat = (x0, zc, wz, y0 = 0.45) => {
    k.box('interiorLight', x0, x0 + 0.5, y0 + 0.1, y0 + 0.23, zc - wz, zc + wz);
    k.box('interiorLight', x0 + 0.44, x0 + 0.56, y0 + 0.21, y0 + 0.86, zc - wz, zc + wz);
    k.box('interior', x0 + 0.46, x0 + 0.54, y0 + 0.88, y0 + 1.04, zc - wz * 0.55, zc + wz * 0.55);
    k.box('interior', x0 + 0.05, x0 + 0.45, y0, y0 + 0.1, zc - wz * 0.8, zc + wz * 0.8);
  };
  for (const zc of [-0.43, 0.43]) { seat(1.85, zc, 0.26); seat(2.95, zc, 0.27); }
  seat(3.9, 0, 0.8, 0.79);
  // Unterboden: Achsen und Tank verdecken den Durchblick unter dem Wagen
  k.box('underbody', 0.45, 1.3, 0.2, 0.5, -0.62, 0.62);
  k.box('underbody', 3.7, 4.5, 0.22, 0.5, -0.66, 0.66);
  k.box('underbody', 1.9, 3.4, 0.19, 0.3, -0.5, 0.5);
  // Räder 245/45 R19 mit Vielspeichenfelgen, Sättel silbern; Radhäuser
  for (const x of [xa, xb]) {
    k.arch(x, r, 0.95, { ra: 0.392 });
    k.both(s => k.wheel({ x, r, w: 0.245, zc: s * 0.833, rimR: 0.243, style: 'multi', rim: 'rim', cal: 'calSilver', dish: 0.045 }));
  }
};
