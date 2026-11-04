// Ferrari F8 Tributo (2019–2023): Mittelmotor-Coupé in Rosso Corsa, prozedural mit dem Baukasten aus src/cars.js.
// Eigenes Profil mit 22 Punkten je Station (Rollen wie k.section): 0 Bodenmitte, 1–2 Boden, 3 Schweller, 4–8 untere Flanke,
// 9–11 Schulter, 12 Gürtellinie bzw. Kotflügelkamm, 13–15 Seitenscheibe, 16 Scheibenoberkante (ohne Scheibe = 12),
// 17 Innenkante (Haubenrand, Rand der Frontscheibe, Dachkante, Rand der Motorabdeckung), 18–20 Bogen zur Mitte, 21 Mitte oben.
// Auto-Koordinaten: x von der Frontspitze nach hinten, y Höhe, z quer; +z ist geometrisch die linke Fahrzeugseite (Fahrer).
CAR_MODELS.ferrari = k => {
  // LH: Heckfläche der Karosserie; Leuchten, Abrisskante und Endrohre stehen bis L vor
  const L = 4.611, W = 1.979, H = 1.206, xf = 1.04, xr = 3.69, rf = 0.34, rr = 0.345, X0 = 0.025, LH = L - 0.045;
  CAR_MODELS.ferrari.spec = { L, W, H, wheelbase: +(xr - xf).toFixed(3) };
  const C = k.curve, sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  // Seitenansicht: Mittellinie oben (Haube, Frontscheibe, Dach, Motorabdeckung, Abrisskante), Gürtellinie, Boden, Schweller
  const yTop = C([[X0, 0.375], [0.045, 0.455], [0.07, 0.505], [0.11, 0.545], [0.2, 0.585], [0.4, 0.628], [0.7, 0.676], [1.0, 0.722], [1.3, 0.772],
    [1.47, 0.812], [1.62, 0.9], [1.85, 1.04], [2.06, 1.152], [2.2, 1.192], [2.36, 1.206], [2.52, 1.199], [2.68, 1.178], [2.9, 1.142], [3.25, 1.092],
    [3.6, 1.045], [3.95, 1.005], [4.25, 0.985], [4.42, 0.992], [4.5, 1.02], [4.55, 1.042], [LH, 1.05]]);
  const yBelt = C([[X0, 0.365], [0.05, 0.45], [0.09, 0.525], [0.16, 0.61], [0.3, 0.675], [0.5, 0.735], [0.8, 0.792], [1.04, 0.818], [1.3, 0.835],
    [1.55, 0.845], [2.0, 0.866], [2.4, 0.89], [2.8, 0.93], [3.2, 0.955], [3.7, 0.968], [4.1, 0.966], [4.4, 0.975], [4.52, 0.995], [L, 0.985]]);
  const yBot = C([[X0, 0.17], [0.06, 0.135], [0.15, 0.122], [0.5, 0.115], [1.6, 0.11], [3.85, 0.11], [4.05, 0.125], [4.3, 0.19], [4.5, 0.24], [L, 0.27]]);
  const ySill = C([[X0, 0.2], [0.08, 0.17], [0.3, 0.16], [1.5, 0.175], [3.3, 0.175], [3.9, 0.19], [4.25, 0.24], [4.5, 0.29], [L, 0.31]]);
  // breiteste Stelle; an der Tür zugleich die schräg ansteigende Kante unter der Mulde
  const yWid = C([[X0, 0.3], [0.1, 0.36], [0.4, 0.43], [1.0, 0.47], [1.42, 0.45], [1.6, 0.41], [2.0, 0.44], [2.6, 0.51], [3.05, 0.575], [3.2, 0.585], [3.7, 0.6], [4.3, 0.63], [L, 0.66]]);
  // Draufsicht: halbe Breiten an Schweller, breitester Stelle, Gürtellinie und Innenkante
  const wSill = C([[X0, 0.42], [0.06, 0.58], [0.12, 0.7], [0.25, 0.8], [0.45, 0.875], [0.8, 0.91], [1.4, 0.905], [2.0, 0.895], [2.8, 0.9],
    [3.2, 0.925], [3.7, 0.945], [4.2, 0.93], [4.45, 0.885], [L, 0.8]]);
  const wWid = C([[X0, 0.5], [0.05, 0.62], [0.09, 0.72], [0.15, 0.81], [0.25, 0.885], [0.4, 0.935], [0.6, 0.962], [0.85, 0.974], [1.1, 0.976],
    [1.4, 0.965], [1.8, 0.948], [2.2, 0.94], [2.6, 0.935], [2.9, 0.94], [3.12, 0.962], [3.4, 0.984], [3.7, 0.9895], [4.0, 0.985], [4.3, 0.968],
    [4.48, 0.935], [4.58, 0.89], [L, 0.86]]);
  const wBelt = C([[X0, 0.46], [0.05, 0.56], [0.09, 0.64], [0.16, 0.72], [0.3, 0.785], [0.6, 0.83], [1.04, 0.845], [1.55, 0.822], [2.0, 0.8],
    [2.5, 0.79], [2.8, 0.8], [3.1, 0.845], [3.5, 0.882], [3.9, 0.89], [4.3, 0.88], [4.5, 0.85], [L, 0.8]]);
  const wEdge = C([[X0, 0.36], [0.06, 0.4], [0.15, 0.45], [0.4, 0.515], [0.8, 0.555], [1.2, 0.6], [1.42, 0.66], [1.56, 0.772], [1.75, 0.7],
    [1.95, 0.622], [2.14, 0.575], [2.42, 0.56], [2.7, 0.545], [3.0, 0.53], [3.5, 0.505], [3.9, 0.515], [4.2, 0.57], [4.45, 0.66], [L, 0.71]]);
  const dEdge = C([[X0, -0.005], [0.2, 0.004], [1.0, 0.012], [1.4, 0.008], [1.56, -0.01], [1.8, -0.022], [2.14, -0.03], [2.42, -0.032],
    [2.7, -0.03], [3.0, -0.02], [3.6, -0.012], [4.2, -0.005], [4.3, 0], [L, 0.012]]);
  // Seitenscheibe (Tropfenform): Oberkante von der A-Säule über das Dach bis zur Spitze hinten
  const xA = 1.56, xT = 2.8;
  const yWinTop = C([[xA, 0.842], [1.75, 0.95], [1.95, 1.055], [2.14, 1.135], [2.3, 1.155], [2.42, 1.152], [2.55, 1.125], [2.66, 1.07], [2.74, 1.0], [xT, 0.932]]);
  const wWinTop = C([[xA, 0.82], [1.75, 0.74], [1.95, 0.66], [2.14, 0.6], [2.3, 0.585], [2.42, 0.585], [2.55, 0.6], [2.66, 0.65], [2.74, 0.73], [xT, 0.798]]);
  const win = x => {
    const yl = yBelt(x), wl = wBelt(x);
    if (x <= xA || x >= xT) return [wl - 0.001, yl + 0.001];
    return [Math.min(wWinTop(x), wl - 0.001), Math.max(yWinTop(x), yl + 0.001)];
  };
  // Radläufe und Lufteinlass hinter der Tür (Flanke weicht nach innen, scharfe Kante am hinteren Kotflügel)
  const arch = x => { let y = -1; for (const [c, r, ra] of [[xf, rf, 0.378], [xr, rr, 0.388]]) { const d = Math.abs(x - c); if (d < ra) y = Math.max(y, r + Math.sqrt(ra * ra - d * d)); } return y; };
  // Mulde in der Tür: beginnt flach vorn unten und steigt nach hinten zum Einlass an
  // Vorderkante des hinteren Kotflügels als scharfe, senkrechte Stufe bei xW
  // Mulde nur über der Kante (Profilpunkte 9–12), nach hinten tiefer; Punkt 11 bleibt weiter außen: scharfe Lippe über dem Einlass
  const xW = 3.08, dJ = { 9: 1, 10: 1.1, 11: 0.3, 12: 0.15 };
  const dipD = x => 0.088 * Math.pow(Math.max(0, x - 1.7) / (xW - 1.7), 1.4);
  const dip = (x, j) => (dJ[j] || 0) * (x <= xW ? dipD(x) : x < xW + 0.03 ? dipD(xW) * (xW + 0.03 - x) / 0.03 : 0);
  // Schulter: vorn und hinten schärfer (Kotflügelkamm), an der Tür weicher
  const pS = C([[X0, 2.2], [0.5, 3.4], [1.3, 3.4], [1.8, 2.4], [2.8, 2.4], [3.3, 3.2], [4.3, 3.2], [L, 2.6]]);
  function prof(x) {
    const yb = yBot(x), ys = ySill(x), yw = yWid(x), yl = yBelt(x), yc = yTop(x);
    const ws = wSill(x), wb = ws - 0.1, ww = wWid(x), wl = wBelt(x), [wu, yu] = win(x), we = wEdge(x), ye = yc + dEdge(x);
    const P = [[0, yb], [wb * 0.55, yb], [wb, yb + 0.004], [ws, ys]];
    for (let q = 1; q <= 5; q++) { const t = q / 5; P.push([ws + (ww - ws) * Math.sin(t * Math.PI / 2), ys + (yw - ys) * t]); }
    const ps = pS(x);
    for (let q = 1; q <= 3; q++) { const t = q / 4; P.push([ww + (wl - ww) * t ** ps, yw + (yl - yw) * t]); }
    P.push([wl, yl]);
    // Seitenscheibe: schmaler Rahmen unten und oben, dazwischen leicht nach außen gewölbt
    const len = Math.hypot(wu - wl, yu - yl), fr = Math.min(0.3, 0.012 / Math.max(len, 1e-4)), bo = 0.012 * Math.min(1, len / 0.1);
    for (const t of [fr, 0.5, 1 - fr]) P.push([wl + (wu - wl) * t + bo * Math.sin(Math.PI * t), yl + (yu - yl) * t]);
    P.push([wu, yu], [we, ye]);
    for (let q = 1; q <= 3; q++) { const z = we * Math.cos(q / 4 * Math.PI / 2); P.push([z, yc - (yc - ye) * (z / we) ** 2]); }
    P.push([0, yc]);
    const ac = arch(x);
    for (let j = 9; j <= 12; j++) P[j][0] -= dip(x, j);
    if (ac > 0) for (const p of P) if (p[1] < ac) p[1] = ac;
    return P;
  }
  // Stationen: vorn und hinten dicht, am Lufteinlass sehr dicht (scharfe Kante)
  const xs = [];
  for (let x = X0; x < 0.16; x += 0.009) xs.push(x);
  for (let x = 0.16; x < 4.46; x += 0.022) xs.push(x);
  for (let x = 4.46; x < LH - 0.004; x += 0.01) xs.push(x);
  xs.push(LH);
  for (const x of [3.07, 3.08, 3.09, 3.1, 3.11, 3.12]) xs.push(x);
  // an den steilen Flanken der Radläufe dicht, damit die Bogenkante glatt wird
  for (const [c, ra] of [[xf, 0.378], [xr, 0.388]]) for (let d = 0.25; d <= ra + 0.012; d += 0.006) xs.push(c - d, c + d);
  xs.sort((a, b) => a - b);
  const st = xs.filter((x, i) => i === 0 || x - xs[i - 1] > 0.004).map(x => ({ x, p: prof(x) }));
  // Frontscheibe in der Draufsicht gekrümmt (Mitte weiter vorn): Unter- und Oberkante je Profilstelle j (17 Rand … 21 Mitte)
  const cj = j => Math.cos((j - 17) * Math.PI / 8) ** 2, wsC = j => 1.47 + 0.085 * cj(j), wsH = j => 2.065 + 0.055 * cj(j);
  const H1 = k.hull(st, { caps: ['grille', 'paint'], mat: (i, j, side, c) => {
    const x = c.x, az = Math.abs(c.z), ac = arch(x);
    if (j <= 1) return 'underbody';
    if (ac > 0 && c.y < ac + 0.003 && j <= 11) return 'liner';
    if (j <= 3 && ((x > 1.4 && x < 3.32) || x < 0.5)) return 'carbon';
    if (j <= 4 && x > 4.08) return 'carbon';
    if (j >= 8 && j <= 10 && x > xW && x < xW + 0.03) return 'liner';   // Stufe am Kotflügel: Innenseite des Einlasses
    if (j >= 12 && j <= 15 && win(x)[1] - yBelt(x) > 0.004) return j === 12 || j === 15 ? 'trim' : 'glass';
    if (j >= 17 && x > wsC(j + 0.5) && x < wsH(j + 0.5)) return null;
    if (j >= 17 && x > 2.8 && x < 4.12) return 'glassDark';
    return 'paint';
  } });
  const T = k.THREE;
  // Flächenstück mit veränderlichen Grenzen j0(x)…j1(x) auf der Karosserie (Leuchten, Einlässe in Keil- oder Tropfenform)
  // allgemeines Gitter: f(u, v) → [x, j] mit u, v von 0 bis 1
  function patchG(m, f, nx, nj, { side = 0, off = 0.004, Hh = H1 } = {}) {
    for (const sg of side ? [side] : [1, -1]) {
      const pts = [], nor = [], id = (a, b) => a * (nj + 1) + b;
      for (let a = 0; a <= nx; a++) for (let b = 0; b <= nj; b++) {
        const [x, j] = f(a / nx, b / nj), q = Hh.at(x, j, sg); pts.push(q.p.addScaledVector(q.n, off)); nor.push(q.n);
      }
      const p = [], nn = [];
      for (let a = 0; a < nx; a++) for (let b = 0; b < nj; b++) {
        let tri = [[id(a, b), id(a + 1, b), id(a + 1, b + 1)], [id(a, b), id(a + 1, b + 1), id(a, b + 1)]];
        const [p0, p1, p2] = tri[0].map(q => pts[q]), fn = p1.clone().sub(p0).cross(p2.clone().sub(p0));
        if (fn.dot(nor[id(a, b)]) < 0) tri = tri.map(([u, v, w]) => [u, w, v]);
        for (const t of tri) for (const q of t) { p.push(pts[q].x, pts[q].y, pts[q].z); nn.push(nor[q].x, nor[q].y, nor[q].z); }
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nn, 3));
      k.add(m, g);
    }
  }
  const patchV = (m, x0, x1, j0, j1, { nx = 16, nj = 4, ...o } = {}) =>
    patchG(m, (u, v) => { const x = x0 + (x1 - x0) * u; return [x, j0(x) + (j1(x) - j0(x)) * v]; }, nx, nj, o);
  // Frontscheibe als eigenes Flächenstück mit glatten Rändern, schwarzer Siebdruckrand unten, oben und seitlich
  const wsF = (a, b) => (u, v) => { const j = 17 + 4 * v; return [wsC(j) + a + (wsH(j) - wsC(j) + b - a) * u, j]; };
  patchG('glass', wsF(-0.004, 0.004), 24, 8, { off: 0.0015 });
  patchG('trim', (u, v) => { const j = 17 + 4 * v; return [wsC(j) - 0.014 + 0.05 * u, j]; }, 2, 8, { off: 0.003 });
  patchG('trim', (u, v) => { const j = 17 + 4 * v; return [wsH(j) - 0.035 + 0.05 * u, j]; }, 2, 8, { off: 0.003 });
  patchG('trim', (u, v) => { const j = 17 + 0.28 * v; return [wsC(j) + (wsH(j) - wsC(j)) * u, j]; }, 20, 1, { off: 0.003 });
  const lin = (a, b) => x => a[1] + (b[1] - a[1]) * Math.min(1, Math.max(0, (x - a[0]) / (b[0] - a[0])));
  // Lufteinlass hinter der Tür: schwarze Öffnung in der Mulde bis an die scharfe Kante des Kotflügels
  // Vorderkante schräg hinter der Türfuge, oben unter der Lippe; dazu drei waagrechte Stege
  const xLo = j => 2.74 + Math.max(0, 10.9 - j) / 2.9 * 0.3;
  patchG('liner', (u, v) => { const j = 8.0 + 2.8 * v, a = xLo(j), b = xW; return [a + (b - a) * u, j]; }, 24, 10, { off: 0.002 });
  for (const j of [8.7, 9.35, 10.0]) patchV('rimDark', xLo(j) + 0.01, xW - 0.006, () => j - 0.035, () => j + 0.035, { off: 0.005, nx: 12, nj: 1 });
  // Scheinwerfer: schmal, nach hinten gezogen, oben am Kotflügelkamm; Tagfahrlicht als Streifen unten und vorn hochgezogen
  const hlLo = lin([0.09, 10.2], [0.54, 11.35]), hlHi = x => 12 - 0.25 * sm(0.4, 0.54, x);
  patchV('lampHousing', 0.09, 0.54, hlLo, hlHi, { off: 0.002, nx: 20 });
  patchV('lens', 0.092, 0.535, x => hlLo(x) + 0.05, x => hlHi(x) - 0.03, { off: 0.006, nx: 20 });
  patchV('drl', 0.1, 0.5, x => hlLo(x) + 0.08, x => hlLo(x) + 0.26, { off: 0.0045, nx: 20, nj: 1 });
  patchV('drl', 0.095, 0.115, x => hlLo(x) + 0.08, x => hlHi(x) - 0.15, { off: 0.0045, nx: 1, nj: 3 });
  for (const [a, b] of [[0.23, 0.275], [0.33, 0.375]]) patchV('headlight', a, b, x => hlLo(x) + 0.5, x => hlHi(x) - 0.25, { off: 0.004, nx: 4, nj: 3 });
  patchV('chrome', 0.15, 0.45, x => hlLo(x) + 0.38, x => hlLo(x) + 0.42, { off: 0.0042, nx: 12, nj: 1 });
  // seitliche Einlässe vorn unter den Scheinwerfern, mit waagrechter Lamelle
  patchV('grille', 0.04, 0.3, lin([0.04, 4.3], [0.3, 4.6]), lin([0.04, 8.6], [0.3, 7.4]), { off: 0.002, nx: 14, nj: 5 });
  patchV('paint', 0.05, 0.27, lin([0.05, 6.2], [0.27, 5.9]), lin([0.05, 6.55], [0.27, 6.2]), { off: 0.006, nx: 10, nj: 1 });
  // S-Duct: Luftauslass quer über die Fronthaube kurz hinter der Spitze, dahinter eine flache Mulde
  patchV('liner', 0.12, 0.35, x => 18.55 + 0.35 * sm(0.12, 0.35, x), () => 21, { off: 0.002, nx: 10, nj: 4 });
  patchV('trimMatte', 0.2, 0.34, x => 19.2 + 0.2 * sm(0.2, 0.34, x), () => 21, { off: 0.0035, nx: 6, nj: 3 });
  patchV('trim', 0.35, 0.362, () => 18.85, () => 21, { off: 0.003, nx: 1, nj: 4 });
  // Splitter (Carbon) und Lippe unter dem großen mittleren Einlass
  const spl = [];
  for (let q = 0; q <= 16; q++) { const z = -0.78 + 1.56 * q / 16; spl.push([0.004 + 0.26 * Math.pow(Math.abs(z) / 0.78, 2.2), z]); }
  spl.push([0.4, 0.76], [0.4, -0.76]);
  k.shape('carbon', 'xz', spl, 0.108, 0.02);
  k.box('trimMatte', X0 - 0.008, X0 + 0.01, 0.245, 0.262, -0.44, 0.44);   // Querstrebe im Mitteleinlass
  // Gitterstruktur: feine waagrechte Stege im Mitteleinlass und in den seitlichen Einlässen
  for (const y of [0.195, 0.222, 0.292, 0.318, 0.344]) k.box('rimDark', X0 - 0.004, X0 + 0.002, y, y + 0.005, -0.42, 0.42);
  for (let q = 0; q < 4; q++) patchV('rimDark', 0.045, 0.29, lin([0.045, 4.6 + q * 0.95], [0.29, 4.85 + q * 0.6]), lin([0.045, 4.66 + q * 0.95], [0.29, 4.91 + q * 0.6]), { off: 0.004, nx: 12, nj: 1 });
  k.box('plate', X0 - 0.012, X0 - 0.004, 0.262, 0.372, -0.26, 0.26);      // Kennzeichen vorn (ohne Schrift)
  k.box('trimMatte', X0 - 0.004, X0 + 0.004, 0.258, 0.376, -0.265, 0.265);
  // Heck: Abrisskante als kräftige Lippe in Wagenfarbe entlang der Heckkontur (Flanke über das Deck), steht bis L über,
  // läuft an den Enden dünn in die Kotflügel aus; Hinterkante leicht hochgezogen
  const xe = LH - 0.002, ring = (m, R, tube, x, y, z) => { const g = new T.TorusGeometry(R, tube, 8, 36); g.rotateY(Math.PI / 2); g.translate(x, y, z); k.add(m, g); };
  const lipT = y => 0.008 + 0.047 * sm(0.9, 0.99, y), lipTop = [], lipBot = [];
  for (const s of [1, -1]) for (let q = 0; q <= 40; q++) {
    const p = H1.at(LH, s > 0 ? 11 + q * 0.25 : 21 - q * 0.25, s).p, l = lipTop[lipTop.length - 1];
    if (l && Math.hypot(l[0] - p.z, l[1] - p.y) < 0.004) continue;
    lipTop.push([p.z, p.y]); lipBot.push([p.z, p.y - lipT(p.y)]);
  }
  const half = lipBot.filter(p => p[0] >= 0).sort((p, q) => p[0] - q[0]);
  const yLipB = z => { for (let i = 1; i < half.length; i++) if (half[i][0] >= z) { const [z0, y0] = half[i - 1], [z1, y1] = half[i]; return y0 + (y1 - y0) * (z - z0) / ((z1 - z0) || 1); } return half[half.length - 1][1]; };
  const lip = k.shape('paint', 'zy', [...lipTop, ...[...lipBot].reverse()], LH - 0.003, L - LH + 0.003, { curve: 2 }), lp = lip.attributes.position;
  // hinter LH: Oberseite steigt weiter an, die Enden folgen der Rundung der Heckecken nach innen
  for (let i = 0; i < lp.count; i++) {
    const d = Math.max(0, lp.getX(i) - LH), z = lp.getZ(i);
    lp.setY(i, lp.getY(i) + 0.22 * d); lp.setZ(i, z - Math.sign(z) * 0.55 * d * sm(0.6, 0.84, Math.abs(z)));
  }
  lip.computeVertexNormals();
  const yu = yLipB(0);
  // darunter zwischen den Leuchtenpaaren ein schwarzer Auslass mit Schattenfuge, mittig die dritte Bremsleuchte
  k.box('grille', LH - 0.01, LH + 0.006, 0.9, yu - 0.01, -0.44, 0.44);
  k.box('trim', LH, LH + 0.04, yu - 0.012, yu + 0.002, -0.45, 0.45);
  k.box('taillight', LH + 0.006, LH + 0.009, 0.924, 0.932, -0.14, 0.14);
  // je Leuchtenpaar ein vorstehendes Gehäuse in Wagenfarbe (oben in die Lippe übergehend), Leuchten als kurze Röhren
  const xp = LH + 0.033;
  k.both(s => {
    const pod = [[s * 0.46, yLipB(0.46) + 0.006]];
    for (let q = 0; q <= 6; q++) { const a = Math.PI + q / 6 * Math.PI / 2; pod.push([s * (0.548 + 0.088 * Math.cos(a)), 0.885 + 0.088 * Math.sin(a)]); }
    for (let q = 0; q <= 6; q++) { const a = -Math.PI / 2 + q / 6 * Math.PI / 2; pod.push([s * (0.712 + 0.088 * Math.cos(a)), 0.885 + 0.088 * Math.sin(a)]); }
    for (let q = 0; q < 6; q++) { const z = 0.8 - 0.34 * q / 6; pod.push([s * z, yLipB(z) + 0.006]); }
    k.shape('paint', 'zy', pod, LH - 0.005, 0.03, { bevel: 0.008, curve: 2 });
    for (const zc of [0.548, 0.712]) {
      const z = s * zc, y = 0.885;
      k.lathe('lampHousing', 'x', [[0.074, xp - 0.012], [0.074, xp + 0.008], [0.064, xp + 0.008], [0.064, xp - 0.006]], y, z, 32);
      k.cyl('taillightDark', 'x', xp - 0.006, xp - 0.003, y, z, 0.064, 0.064, 32);
      ring('taillight', 0.047, 0.0075, xp - 0.002, y, z);
      k.cyl('taillight', 'x', xp - 0.004, xp + 0.001, y, z, 0.016, 0.016, 16);
    }
    // schwarze Einsätze unter den Leuchten (Luftauslässe), schräg nach außen
    k.shape('carbon', 'zy', [[s * 0.42, 0.79], [s * 0.82, 0.79], [s * 0.85, 0.64], [s * 0.56, 0.6]], xe - 0.008, 0.012);
  });
  // Rückfahr-/Nebelleuchte mittig auf der Heckschürze, Rückstrahler seitlich (xa: Rückseite der Schürze)
  const xa = LH + 0.018;
  k.box('taillight', xa - 0.004, xa + 0.004, 0.3, 0.34, -0.035, 0.035);
  k.both(s => k.box('taillightDark', xa - 0.003, xa + 0.003, 0.405, 0.418, s * 0.6, s * 0.76));
  // Ansaugöffnungen für den Motor neben der Abrisskante, innen an den hinteren Kotflügeln
  patchV('liner', 4.27, 4.47, () => 17.0, x => 17.55 + 0.15 * sm(4.27, 4.47, x), { off: 0.002, nx: 8, nj: 3 });
  // Kennzeichen hinten (weiß, ohne Schrift) in schwarzer Mulde
  k.box('trimMatte', xe - 0.006, xe + 0.004, 0.462, 0.592, -0.275, 0.275);
  k.box('plate', xe, xe + 0.008, 0.47, 0.584, -0.26, 0.26);
  // Diffusor: schwarze Heckschürze als Volumen (steht 2 cm vor), Finnen bis an ihre Rückseite
  k.shape('carbon', 'zy', [[-0.78, 0.26], [0.78, 0.26], [0.81, 0.43], [0.3, 0.45], [-0.3, 0.45], [-0.81, 0.43]], LH - 0.008, 0.02, { bevel: 0.006, curve: 2 });
  for (const z of [-0.52, -0.26, 0, 0.26, 0.52]) {
    const fin = [[4.05, 0.12], [xa - 0.004, 0.175]];
    for (let q = 0; q <= 8; q++) { const x = xa - 0.004 - (xa - 4.054) * q / 8; fin.push([x, Math.min(yBot(x), 0.258) + 0.004]); }
    k.shape('carbon', 'xy', fin, z - 0.006, 0.012);
  }
  // zwei große runde Endrohre: Chromrohr mit gerundetem Rand, innen dunkel und tief geschlossen
  const xt = L - 0.006;
  k.both(s => {
    const z = s * 0.4, y = 0.365;
    k.lathe('chrome', 'x', [[0.058, LH - 0.06], [0.058, xt], [0.049, xt], [0.049, xt - 0.012]], y, z, 32);
    k.lathe('trimMatte', 'x', [[0.049, xt - 0.012], [0.049, xt - 0.07]], y, z, 32);
    k.cyl('trimMatte', 'x', xt - 0.075, xt - 0.07, y, z, 0.05, 0.05, 24);
    ring('chrome', 0.0535, 0.0045, xt, y, z);
  });
  // Stab zwischen zwei Punkten (Spiegelfuß, Wischer, Lenkradspeichen)
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const rod = (m, a, b, r, seg = 10, sc = [1, 1]) => {
    const A = V(...a), B = V(...b), d = B.clone().sub(A), g = new T.CylinderGeometry(r, r, d.length(), seg);
    g.scale(sc[0], 1, sc[1]); g.applyQuaternion(new T.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()));
    g.translate((A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2); return k.add(m, g);
  };
  // Außenspiegel: tropfenförmiges Gehäuse in Wagenfarbe auf schlankem schwarzem Stiel an der Tür
  k.both(s => {
    const cx = 1.835, cy = 0.985, cz = s * 0.955;
    const h = new T.SphereGeometry(1, 22, 12, -Math.PI / 2, Math.PI); h.scale(0.085, 0.047, 0.092); h.translate(cx, cy, cz); k.add('paint', h);
    const gl = new T.CircleGeometry(1, 24); gl.rotateY(Math.PI / 2); gl.scale(1, 0.04, 0.083); gl.translate(cx - 0.002, cy, cz); k.add('chrome', gl);
    const rim = new T.CircleGeometry(1, 24); rim.rotateY(Math.PI / 2); rim.scale(1, 0.047, 0.092); rim.translate(cx - 0.004, cy, cz); k.add('trim', rim);
    rod('trim', [1.73, 0.855, s * 0.83], [1.8, 0.95, s * 0.915], 0.011, 8, [1.6, 0.7]);
    rod('trim', [1.75, 0.86, s * 0.83], [1.86, 0.955, s * 0.915], 0.008, 8);
  });
  // Fugen: Tür, Fronthaube, Motorhaube; Türgriff oben in der Mulde
  const fuge = { w: 0.005, off: 0.0022 };
  for (const x of [1.49, 2.71]) k.lineX('trim', H1, x, 3.7, 11.95, { ...fuge, n: 33 });
  k.lineJ('trim', H1, 1.49, 2.71, 3.7, { dj: 0.05, off: 0.0022 });
  for (const x of [0.34, 1.425]) k.lineX('trim', H1, x, 17.02, 21, { ...fuge, n: 6 });
  k.lineJ('trim', H1, 0.34, 1.425, 17.05, { dj: 0.07, off: 0.0022 });
  k.lineJ('trim', H1, 2.79, 4.46, 16.9, { dj: 0.035, off: 0.0022 });
  k.lineX('trim', H1, 4.46, 16.9, 21, { ...fuge, n: 6 });
  patchV('trim', 2.42, 2.53, () => 11.1, () => 11.32, { off: 0.0025, nx: 3, nj: 1 });
  // Wischer (einer, in Ruhestellung an der Scheibenwurzel)
  rod('trimMatte', [1.508, 0.84, -0.5], [1.49, 0.832, 0.32], 0.007, 6);
  rod('trimMatte', [1.49, 0.828, 0.06], [1.505, 0.838, -0.28], 0.009, 6);
  // Motorabdeckung aus Lexan mit drei breiten Lamellen quer über die Abdeckung
  for (const x0 of [3.0, 3.35, 3.7]) {
    patchV('carbon', x0, x0 + 0.21, () => 17.25, () => 21, { off: 0.016, nx: 6, nj: 6 });
    patchV('trim', x0 + 0.205, x0 + 0.215, () => 17.25, () => 21, { off: 0.008, nx: 1, nj: 6 });
  }
  // Innenraum (Fahrer links, +z): Boden, Rückwand, Türverkleidung, Himmel, Armaturenbrett, Lenkrad, Mittelkonsole, Schalensitze
  k.box('carpet', 1.55, 2.84, 0.12, 0.14, -0.76, 0.76);
  k.shape('interior', 'zy', [[-0.78, 0.14], [0.78, 0.14], [0.78, 0.84], [0.52, 1.04], [-0.52, 1.04], [-0.78, 0.84]], 2.82, 0.04);
  k.box('interior', 2.06, 2.72, 1.128, 1.142, -0.54, 0.54);
  k.both(s => { k.box('interior', 1.6, 2.74, 0.2, 0.82, s * 0.76, s * 0.78); k.box('interiorLight', 1.9, 2.5, 0.52, 0.64, s * 0.75, s * 0.762); });
  k.shape('interior', 'xy', [[1.56, 0.81], [1.94, 0.805], [2.03, 0.73], [2.0, 0.6], [1.62, 0.56]], -0.77, 1.54);
  k.box('interior', 1.86, 2.0, 0.79, 0.85, 0.17, 0.5);
  k.box('trimMatte', 1.995, 2.0, 0.795, 0.84, 0.19, 0.48);
  const sw = new T.TorusGeometry(0.17, 0.02, 8, 32); sw.rotateY(Math.PI / 2); sw.rotateZ(-0.38); sw.translate(2.09, 0.72, 0.335); k.add('interior', sw);
  k.cyl('interior', 'x', 2.02, 2.1, 0.72, 0.335, 0.045, 0.055, 14);
  for (const a of [Math.PI / 2 + 0.3, -Math.PI / 2 - 0.3, Math.PI * 1.5]) rod('interior', [2.09, 0.72, 0.335], [2.09 - Math.sin(-0.38) * 0.16 * Math.cos(a), 0.72 + 0.16 * Math.cos(-0.38) * Math.cos(a), 0.335 + 0.16 * Math.sin(a)], 0.014, 6);
  rod('interior', [1.95, 0.64, 0.335], [2.06, 0.7, 0.335], 0.03, 10);
  k.box('interior', 1.92, 2.46, 0.14, 0.4, -0.1, 0.1);
  k.box('carbon', 2.0, 2.3, 0.4, 0.43, -0.09, 0.09);
  k.both(s => {
    const zc = s * 0.335;
    k.box('interiorLight', 2.3, 2.72, 0.15, 0.3, zc - 0.22, zc + 0.22);
    for (const d of [-1, 1]) k.box('interiorLight', 2.32, 2.7, 0.24, 0.38, zc + d * 0.2 - 0.04, zc + d * 0.2 + 0.04);
    const bk = new T.BoxGeometry(0.11, 0.66, 0.46); bk.rotateZ(-0.3); bk.translate(2.78, 0.62, zc); k.add('interiorLight', bk);
    const wing = new T.BoxGeometry(0.12, 0.42, 0.06); wing.rotateZ(-0.3);
    for (const d of [-1, 1]) { const g = wing.clone(); g.translate(2.74, 0.6, zc + d * 0.21); k.add('interior', g); }
  });
  // Motor unter der Lexan-Abdeckung (dunkel, mit Ansaugbrücken), damit die Abdeckung Tiefe hat
  k.box('trimMatte', 2.92, 3.95, 0.3, 0.82, -0.42, 0.42);
  k.both(s => { k.box('alu', 3.0, 3.85, 0.82, 0.88, s * 0.12, s * 0.34); k.box('carbon', 3.05, 3.8, 0.88, 0.895, s * 0.16, s * 0.3); });
  // Räder: vorn 245/35 R20, hinten 305/30 R20, geschmiedete Felgen mit fünf Doppelspeichen, gelbe Bremssättel
  // Eigenes Rad: flache Reifenflanke, tiefes Felgenbett, fünf schlanke Doppelspeichen mit Schüssel (außen weiter vorn als an der Nabe)
  function f8Wheel(x, r, w, zc, calA) {
    const s = Math.sign(zc), hw = w / 2, R = 0.254, zf = zc + s * hw * 0.8;
    const tp = [[R - 0.004, -hw * 0.84], [r - 0.045, -hw], [r - 0.012, -hw * 0.92], [r, -hw * 0.62], [r, hw * 0.62], [r - 0.012, hw * 0.92], [r - 0.045, hw], [R - 0.004, hw * 0.84]];
    k.lathe('tire', 'z', tp.map(([a, b]) => [a, zc + b]), x, r, 56);
    k.lathe('rimDark', 'z', [[R - 0.006, zc - hw * 0.8], [R - 0.006, zc + hw * 0.8]], x, r, 48);
    const lip = new T.TorusGeometry(R - 0.002, 0.011, 8, 56); lip.translate(x, r, zf); k.add('rim', lip);
    // Doppelspeichen: V-Form je Paar, Schüssel durch Verschieben in z abhängig vom Abstand zur Nabe
    const zh = zf - s * 0.07, uh = 0.07, uo = R - 0.008;
    for (let q = 0; q < 5; q++) {
      const a = q * 2 * Math.PI / 5 + Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a);
      const uv = [[uh, -0.03], [uh, 0.03], [uo, 0.07], [uo, 0.041], [0.135, 0.006], [0.135, -0.006], [uo, -0.041], [uo, -0.07]];
      const g = k.shape('rim', 'xy', uv.map(([u, v]) => [x + u * ca - v * sa, r + u * sa + v * ca]), s > 0 ? zh - 0.024 : zh, 0.024, { curve: 2 });
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const rho = Math.hypot(p.getX(i) - x, p.getY(i) - r); p.setZ(i, p.getZ(i) + s * 0.064 * Math.min(1, Math.max(0, (rho - uh) / (uo - uh)))); }
      g.computeVertexNormals();
    }
    // Nabe, Zentralkappe, Radschrauben
    k.cyl('rim', 'z', zh - s * 0.03, zh + s * 0.004, x, r, 0.068, 0.062, 28);
    k.lathe('rimDark', 'z', s > 0 ? [[0.036, zh], [0.03, zh + 0.012], [0.001, zh + 0.016]] : [[0.001, zh - 0.016], [0.03, zh - 0.012], [0.036, zh]], x, r, 20);
    for (let q = 0; q < 5; q++) { const a = q * 2 * Math.PI / 5 + Math.PI / 2 + Math.PI / 5; k.cyl('chrome', 'z', zh, zh + s * 0.012, x + Math.cos(a) * 0.052, r + Math.sin(a) * 0.052, 0.009, 0.008, 8); }
    // Bremsscheibe mit Topf und gelber Sattel hinter den Speichen (mind. 2 cm Luft), davor Nabe mit Schrauben und Kappe frei
    const zd = zc - s * hw * 0.2;
    k.cyl('disc', 'z', zd - 0.016, zd + 0.016, x, r, 0.195, 0.195, 40);
    k.cyl('alu', 'z', zd - s * 0.03, zd + s * 0.012, x, r, 0.09, 0.09, 24);
    k.cyl('alu', 'z', zd + s * 0.012, zh - s * 0.03, x, r, 0.062, 0.062, 20);
    const arc = (a0, a1, rr, rev) => { const pp = []; for (let q = 0; q <= 8; q++) { const t = a0 + (a1 - a0) * q / 8; pp.push([x + Math.cos(t) * rr, r + Math.sin(t) * rr]); } return rev ? pp.reverse() : pp; };
    k.shape('calYellow', 'xy', [...arc(calA[0], calA[1], 0.16, false), ...arc(calA[0], calA[1], 0.235, true)], zd - 0.032, 0.064, { curve: 2, bevel: 0.006 });
  }
  for (const [x, r, w, tz, ca] of [[xf, rf, 0.245, 0.8385, [0.1 * Math.PI, 0.36 * Math.PI]], [xr, rr, 0.305, 0.823, [0.64 * Math.PI, 0.9 * Math.PI]]]) {
    k.arch(x, r, 0.95, { ra: r + 0.03 });
    k.both(s => f8Wheel(x, r, w, s * tz, ca));
  }
};
