// Porsche Cayenne Coupé (E3, Baujahr 2021) in Anthrazit – prozedural aus Stützkurven und eigenen Querschnitten.
// Eigenes Profil je Station mit 26 Punkten (j) von der Bodenmitte über die rechte Seite zur Dachmitte:
// 0–2 Boden, 3–5 Schweller, 6–9 Flanke bis zur breitesten Stelle, 10–12 Schulter bis zur Kante, 13 Schulterfläche, 14 Gürtellinie,
// 15–18 Seitenscheibe (vorn: Kotflügelrücken), 19 Dachkante/A-Säule (vorn: Kamm über dem Kotflügel), 20–25 Dach bzw. Haube bis zur Mitte.
CAR_MODELS.cayenne = k => {
  const L = 4.931, W = 1.983, H = 1.676, xf = 0.98, xr = 3.875, rf = 0.381, rr = 0.377;
  CAR_MODELS.cayenne.spec = { L, W, H, wheelbase: xr - xf };
  const C = k.curve, T = k.THREE, V = (x, y, z) => new T.Vector3(x, y, z);
  // Seitenansicht: Boden, Schweller, breiteste Stelle, Schulterkante, Gürtellinie, Dachkante (vorn Kotflügelkamm), Dachmitte
  const yb = C([[0, 0.375], [0.01, 0.36], [0.04, 0.35], [0.12, 0.345], [0.3, 0.335], [0.6, 0.32], [1.45, 0.25], [1.7, 0.215], [3.35, 0.215], [3.6, 0.25], [4.3, 0.33], [4.6, 0.37], [4.75, 0.36], [4.85, 0.365], [4.91, 0.39], [L, 0.44]]);
  const ys = C([[0, 0.39], [0.03, 0.385], [0.1, 0.38], [0.3, 0.37], [0.6, 0.36], [1.45, 0.31], [1.7, 0.3], [3.35, 0.3], [3.6, 0.31], [4.3, 0.37], [4.6, 0.41], [4.8, 0.42], [4.9, 0.44], [L, 0.47]]);
  const yw = C([[0, 0.6], [0.1, 0.62], [0.5, 0.66], [1.0, 0.7], [1.5, 0.68], [2.5, 0.66], [3.3, 0.74], [3.9, 0.84], [4.5, 0.84], [4.75, 0.78], [4.9, 0.7], [L, 0.62]]);
  const ysh = C([[0, 0.74], [0.04, 0.8], [0.08, 0.84], [0.25, 0.885], [0.6, 0.91], [1.0, 0.94], [1.5, 0.965], [2.5, 0.99], [3.3, 1.0], [3.9, 1.025], [4.4, 1.035], [4.62, 1.03], [L, 1.0]]);
  const ybelt = C([[0, 0.72], [0.012, 0.78], [0.03, 0.835], [0.06, 0.88], [0.1, 0.91], [0.18, 0.94], [0.3, 0.96], [0.7, 0.99], [1.1, 1.03], [1.5, 1.075], [1.75, 1.1], [2.8, 1.137], [3.6, 1.177], [3.88, 1.208], [4.2, 1.205], [4.5, 1.19], [4.62, 1.18], [4.66, 1.17], [4.7, 1.1], [4.74, 1.0], [4.79, 0.88], [4.82, 0.82], [4.9, 0.79], [L, 0.76]]);
  const yre = C([[0, 0.74], [0.012, 0.8], [0.03, 0.86], [0.06, 0.915], [0.1, 0.945], [0.18, 0.975], [0.3, 0.995], [0.6, 1.025], [1.0, 1.06], [1.3, 1.088], [1.52, 1.1], [1.9, 1.355], [2.28, 1.615], [2.6, 1.64], [3.0, 1.615], [3.4, 1.55], [3.7, 1.5], [3.95, 1.455], [4.2, 1.37], [4.45, 1.28], [4.56, 1.235], [4.62, 1.19], [L, 0]]);
  // Oberkante der hinteren Seitenscheibe: läuft vor der C-Säule spitz auf die Gürtellinie zu
  const dloTop = C([[3.0, 1.8], [3.05, 1.6], [3.3, 1.545], [3.55, 1.47], [3.75, 1.37], [3.85, 1.275], [3.9, 1.222], [3.94, 1.0]]);
  const yr = C([[0, 0.74], [0.012, 0.8], [0.03, 0.85], [0.06, 0.902], [0.1, 0.925], [0.18, 0.945], [0.3, 0.96], [0.6, 0.995], [1.0, 1.04], [1.3, 1.075], [1.52, 1.115], [1.9, 1.4], [2.28, 1.655], [2.5, 1.676], [2.9, 1.668], [3.3, 1.63], [3.6, 1.585], [3.85, 1.54], [3.95, 1.52], [4.2, 1.42], [4.45, 1.3], [4.56, 1.248], [4.66, 1.218], [4.675, 1.17], [4.7, 1.1], [4.74, 1.0], [4.79, 0.88], [4.82, 0.82], [4.9, 0.79], [L, 0.76]]);
  // Draufsicht: halbe Breiten (breiteste Stelle, Schultereinzug, Gürtellinie, Dachkante bzw. Kotflügelkamm)
  const ww = C([[0, 0.36], [0.012, 0.5], [0.03, 0.62], [0.06, 0.73], [0.1, 0.81], [0.16, 0.88], [0.25, 0.925], [0.4, 0.955], [0.6, 0.972], [0.9, 0.982], [1.2, 0.976], [1.5, 0.96], [2.0, 0.948], [2.6, 0.948], [3.1, 0.958], [3.45, 0.978], [3.85, 0.9915], [4.2, 0.988], [4.45, 0.975], [4.62, 0.955], [4.72, 0.93], [4.8, 0.895], [4.87, 0.86], [L, 0.8]]);
  const dsh = C([[0, 0.01], [1.0, 0.012], [2.0, 0.03], [3.8, 0.035], [4.6, 0.03], [L, 0.02]]);
  const wbelt = C([[0, 0.52], [0.03, 0.7], [0.08, 0.79], [0.15, 0.835], [0.3, 0.862], [0.8, 0.874], [1.5, 0.878], [2.2, 0.875], [2.9, 0.865], [3.5, 0.85], [3.9, 0.84], [4.3, 0.84], [4.55, 0.83], [4.65, 0.81], [4.75, 0.78], [4.85, 0.74], [L, 0.66]]);
  const wre = C([[0, 0.4], [0.04, 0.55], [0.1, 0.6], [0.3, 0.635], [0.8, 0.655], [1.2, 0.68], [1.52, 0.72], [1.9, 0.68], [2.28, 0.625], [2.6, 0.625], [3.2, 0.632], [3.6, 0.645], [3.95, 0.655], [4.3, 0.675], [4.56, 0.7], [4.62, 0.76], [4.66, 0.84], [L, 0.84]]);
  const pexp = C([[1.5, 2], [2.4, 2.2], [3.3, 2.6], [3.9, 2.8], [4.4, 2.5], [4.7, 2.2]]);
  // Radläufe: alles darunter wird auf den Bogen angehoben
  const RA = 0.44, cut = x => { let y = -1; for (const [c, r] of [[xf, rf], [xr, rr]]) { const d = Math.abs(x - c); if (d < RA) y = Math.max(y, r + Math.sqrt(RA * RA - d * d)); } return y; };
  const ua = [1, 0.93, 0.8, 0.62, 0.42, 0.21, 0]; // Teilung des Dachs (j19…25) als Anteil der Halbbreite
  function prof(x) {
    const b = yb(x), wwx = ww(x), ybl = ybelt(x), yre_ = Math.max(yre(x), ybl);
    const ysh_ = Math.min(ysh(x), ybl - 0.015), ywx = Math.max(b + 0.02, Math.min(yw(x), ysh_ - 0.02));
    const s = Math.max(b + 0.004, Math.min(ys(x), ywx - 0.015)), sd = Math.min(s + 0.12, (s + ywx) / 2), ws = wwx - 0.05, wb = ws - 0.05;
    const wsh_ = wwx - dsh(x), wbl = Math.min(wbelt(x), wsh_ - 0.01), wre_ = Math.min(wre(x), wbl);
    const cr = yr(x) - yre_, pw = pexp(x), gl = Math.min(1, Math.max(0, (yre_ - ybl) / 0.12));
    const P = [[0, b], [wb * 0.6, b], [wb, b + 0.008], [ws, s], [ws + 0.012, s + 0.045], [ws + 0.022, sd]];
    for (let q = 1; q <= 4; q++) { const t = q / 4; P.push([ws + 0.022 + (wwx - ws - 0.022) * Math.sin(t * Math.PI / 2), sd + (ywx - sd) * t]); }
    for (let q = 1; q <= 3; q++) { const t = q / 3; P.push([wwx + (wsh_ - wwx) * t * t, ywx + (ysh_ - ywx) * t]); }
    P.push([wsh_ - (wsh_ - wbl) * 0.45, ysh_ + (ybl - ysh_) * 0.7], [wbl, ybl]);
    // Band Gürtel → Dachkante: Gürtelleiste, Scheibe, Rahmen bis zur Fensteroberkante yD, darüber C-Säule
    const yD = Math.min(yre_, Math.max(ybl, dloTop(x))), bY = [ybl, Math.min(ybl + 0.025, yD), 0, Math.max(ybl, yD - 0.03), yD, yre_];
    bY[1] = Math.min(bY[1], bY[3]); bY[2] = (bY[1] + bY[3]) / 2;
    for (let q = 1; q <= 5; q++) { const t = (bY[q] - ybl) / Math.max(1e-6, yre_ - ybl); P.push([wbl + (wre_ - wbl) * t + 0.01 * gl * Math.sin(t * Math.PI), bY[q]]); }
    for (let q = 1; q <= 6; q++) { const u = ua[q], f = cr >= 0 ? Math.pow(1 - Math.pow(u, pw), 1 / pw) : 1 - u * u; P.push([wre_ * u, yre_ + cr * f]); }
    const yc = cut(x); if (yc > 0) for (const p of P) if (p[1] < yc) p[1] = yc;
    return P;
  }
  // Stationen: dicht an Bug, Heck und Radläufen, dazu feste Stellen (Spoilerkante, Radlaufenden)
  const xs = [4.652, 4.658, 4.664, 4.67, 4.676, 4.682, xf - RA - 0.002, xf + RA + 0.002, xr - RA - 0.002, xr + RA + 0.002];
  for (let x = 0; x < L - 0.005;) { xs.push(x); const d = Math.min(Math.abs(x - xf), Math.abs(x - xr)); x += x < 0.22 || x > 4.6 ? 0.012 : d < RA + 0.02 ? 0.01 : d < 0.5 ? 0.02 : 0.03; }
  xs.sort((a, b) => a - b);
  const st = [];
  for (const x of [...xs, L]) if (!st.length || x - st[st.length - 1].x > 0.004) st.push({ x, p: prof(x) });
  // Materialien je Feld: Seitenscheiben mit schwarzen Rahmen, Frontscheibe, Panorama-Glasdach, Heckscheibe, Schweller
  const mat = (i, j, side, c) => {
    const x = c.x, yc = cut(x);
    if (yc > 0 && c.y < yc + 0.004 && j <= 13) return 'liner';   // auf den Radlauf angehobene Felder: Radhausdecke
    if (j <= 1) return 'underbody';
    if (j >= 14 && j <= 18) {
      if (x < 1.52 || x > 3.9 || j === 18) return 'paint';
      if (j === 14 || j === 17) return 'trim';
      if (x < 1.66 || Math.abs(x - 2.84) < 0.035 || Math.abs(x - 3.6) < 0.01) return 'trim';
      return 'glass';
    }
    if (j >= 19) {
      if (x > 1.53 && x < 2.27) return j === 19 ? 'trim' : 'glass';
      if (x > 2.36 && x < 3.72 && j >= 21) return 'glassDark';
      if (x > 3.97 && x < 4.555) return j === 19 ? 'trim' : 'glass';
      return 'paint';
    }
    if (j >= 2 && j <= 4 && ((x > 1.42 && x < 3.43) || x > 4.62)) return 'trimMatte';
    return 'paint';
  };
  const H1 = k.hull(st, { mat });
  // Flächenstück über eine Abbildung f(u, v) → [x, j] (u, v von 0 bis 1); off Abstand nach außen (Zahl oder Funktion)
  function patchF(m, f, { side = 0, off = 0.004, nu = 12, nv = 6 } = {}) {
    for (const s of side ? [side] : [1, -1]) {
      const pts = [], nor = [], id = (a, b) => a * (nv + 1) + b;
      for (let a = 0; a <= nu; a++) for (let b = 0; b <= nv; b++) {
        const [x, j] = f(a / nu, b / nv), q = H1.at(x, j, s), o = typeof off === 'function' ? off(a / nu, b / nv) : off;
        pts.push(q.p.addScaledVector(q.n, o)); nor.push(q.n);
      }
      grid(m, pts, nor, nu, nv);
    }
  }
  // Gitter aus (nu+1)·(nv+1) Punkten mit Normalen je Ecke (weich schattiert statt facettiert), Drehsinn nach der Normalen
  function grid(m, pts, nor, nu, nv) {
    const id = (a, b) => a * (nv + 1) + b, p = [], nn = [];
    for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) {
      let tri = [[id(a, b), id(a + 1, b), id(a + 1, b + 1)], [id(a, b), id(a + 1, b + 1), id(a, b + 1)]];
      const [p0, p1, p2] = tri[0].map(q => pts[q]), fn = p1.clone().sub(p0).cross(p2.clone().sub(p0));
      if (fn.dot(nor[id(a, b)]) < 0) tri = tri.map(([u, v, w]) => [u, w, v]);
      for (const t of tri) for (const q of t) { p.push(pts[q].x, pts[q].y, pts[q].z); nn.push(nor[q].x, nor[q].y, nor[q].z); }
    }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nn, 3)); k.add(m, g);
  }
  // Querschnitt sec = [[dx, h], …] (geschlossen, Länge ab x0 und Höhe über der Fläche) quer über das Profil von ja bis jb gezogen
  function sweep(m, x0, sec, ja, jb, { nj = 12, side = 0, caps = [false, false] } = {}) {
    for (const s of side ? [side] : [1, -1]) {
      const rows = [];
      for (let b = 0; b <= nj; b++) { const jj = ja + (jb - ja) * b / nj; rows.push(sec.map(([dx, h]) => { const q = H1.at(x0 + dx, jj, s); return q.p.addScaledVector(q.n, h); })); }
      const p = [], n = sec.length;
      for (let b = 0; b < nj; b++) {
        const cen = V(0, 0, 0); for (const v of rows[b]) cen.add(v); cen.multiplyScalar(1 / n);
        for (let a = 0; a < n; a++) {
          const A = rows[b][a], B = rows[b][(a + 1) % n], Cc = rows[b + 1][(a + 1) % n], D = rows[b + 1][a];
          const fn = B.clone().sub(A).cross(Cc.clone().sub(A)), mid = A.clone().add(Cc).multiplyScalar(0.5).sub(cen);
          const q = fn.dot(mid) >= 0 ? [A, B, Cc, A, Cc, D] : [A, Cc, B, A, D, Cc];
          for (const v of q) p.push(v.x, v.y, v.z);
        }
      }
      // Stirnflächen an den Enden (caps: [Anfang, Ende])
      [[0, 1], [nj, nj - 1]].forEach(([b, nb], e) => {
        if (!caps[e]) return;
        const cen = V(0, 0, 0), cn = V(0, 0, 0); for (const v of rows[b]) cen.add(v); for (const v of rows[nb]) cn.add(v); cen.multiplyScalar(1 / n); cn.multiplyScalar(1 / n);
        const out = cen.clone().sub(cn);
        for (let a = 0; a < n; a++) { let A = rows[b][a], B = rows[b][(a + 1) % n]; if (B.clone().sub(cen).cross(A.clone().sub(cen)).dot(out) < 0) [A, B] = [B, A]; p.push(cen.x, cen.y, cen.z, B.x, B.y, B.z, A.x, A.y, A.z); }
      });
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); k.add(m, smooth(g));
    }
  }
  // Normalen glätten, Kanten über 0,6 rad bleiben scharf (toCreasedNormals aus BufferGeometryUtils)
  function smooth(g) { if (k.utils && k.utils.toCreasedNormals) return k.utils.toCreasedNormals(g, 0.6); g.computeVertexNormals(); return g; }
  // Profilstelle j zu einer Höhe y an der Flanke; Länge x zu einer Höhe auf der Mittellinie am Heck
  const jAt = (x, y) => { let a = 2, b = 19; for (let q = 0; q < 28; q++) { const m = (a + b) / 2; if (H1.at(x, m, 1).p.y < y) a = m; else b = m; } return (a + b) / 2; };
  const xTail = y => { let a = 4.6, b = L; for (let q = 0; q < 28; q++) { const m = (a + b) / 2; if (yr(m) > y) a = m; else b = m; } return (a + b) / 2; };
  // Heck: Leuchtenband unter der Spoilerlippe, Rückleuchten um die Ecken, Kennzeichen, Diffusor, vier Endrohre
  patchF('trim', (u, v) => [4.562 + 0.005 * v, 19.3 + 5.7 * u], { nu: 16, nv: 1, off: 0.0015 });   // Fuge des ausfahrbaren Heckspoilers
  const sub = (f, u0, u1, v0, v1) => (u, v) => f(u0 + (u1 - u0) * u, v0 + (v1 - v0) * v);
  // Höhenlinie bei Höhe y um die Heckecke: Flanke (x ab 4.3), Rundung bis zur Gürtellinie (j 14), Heckfläche (j 19 → 25; 14…19 fallen
  // hinten zusammen). Je Punkt [x, j, s], s = Bogenlänge in der Draufsicht ab der Ecke (Flanke negativ, Heckfläche positiv)
  const xAtJ = (j, y) => { let a = 4.3, b = L; for (let q = 0; q < 26; q++) { const m = (a + b) / 2; if (H1.at(m, j, 1).p.y > y) a = m; else b = m; } return (a + b) / 2; };
  const hlC = new Map();
  function hline(y) {
    const key = Math.round(y * 4000); if (hlC.has(key)) return hlC.get(key);
    const xe = xAtJ(14, y), P = [];
    for (let q = 0; q < 24; q++) { const x = 4.3 + (xe - 0.006 - 4.3) * q / 23; P.push([x, jAt(x, y)]); }
    const j0 = P[P.length - 1][1];
    for (let q = 1; q <= 8; q++) { const j = j0 + (14 - j0) * q / 8; P.push([xAtJ(j, y), j]); }
    const i0 = P.length - 1;
    for (let q = 0; q <= 24; q++) { const j = 19 + 6 * q / 24; P.push([xAtJ(j, y), j]); }
    let s = 0; P[0].push(0);
    for (let q = 1; q < P.length; q++) { const a = H1.at(P[q - 1][0], P[q - 1][1], 1).p, b = H1.at(P[q][0], P[q][1], 1).p; s += Math.hypot(b.x - a.x, b.z - a.z); P[q].push(s); }
    const s0 = P[i0][2]; for (const p of P) p[2] -= s0;
    hlC.set(key, P); return P;
  }
  // Punkt bei Bogenlänge s auf der Höhenlinie y → [x, j]
  const onH = (s, y) => {
    const P = hline(y); let q = 0; while (q < P.length - 2 && P[q + 1][2] < s) q++;
    const a = P[q], b = P[q + 1], t = Math.min(1, Math.max(0, (s - a[2]) / ((b[2] - a[2]) || 1)));
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };
  // Rückleuchte als ein Stück: Spitze auf der Flanke (s −0.30), um die Ecke bis s 0.32 auf der Heckklappe; Unterkante 1.078, Oberkante 1.163
  const sT = -0.3, sE = 0.32;
  const yHi = s => (s >= -0.06 ? 1.163 : 1.163 - 0.012 * Math.pow((-0.06 - s) / 0.24, 1.3));
  const yLo = s => (s >= -0.04 ? 1.078 : 1.078 + 0.073 * Math.pow(Math.min(1, (-0.04 - s) / 0.26), 0.75));
  const tlF = (s0, s1, v0, v1) => (u, v) => { const s = s0 + (s1 - s0) * u, a = yLo(s), b = yHi(s); return onH(s, a + (b - a) * (v0 + (v1 - v0) * v)); };
  const tlY = (s0, s1, y0, y1) => (u, v) => { const s = s0 + (s1 - s0) * u; return onH(s, y0 + (y1 - y0) * v); };
  const sFrom = y => { let s = sT; while (yLo(s) > y && s < 0) s += 0.002; return s; };
  patchF('taillightDark', tlF(sT, sE, 0, 1), { nu: 44, nv: 4, off: 0.004 });
  patchF('taillight', tlF(sT + 0.01, sE, 0.86, 1), { nu: 44, nv: 1, off: 0.006 });   // Kontur am oberen Rand
  patchF('taillight', tlY(sFrom(1.128), sE - 0.012, 1.134, 1.142), { nu: 36, nv: 1, off: 0.006 });
  patchF('taillight', tlY(sFrom(1.09), sE - 0.012, 1.096, 1.104), { nu: 30, nv: 1, off: 0.006 });
  patchF('lens', tlF(sT, sE, 0, 1), { nu: 44, nv: 4, off: 0.0085 });
  // Leuchtenband quer über die Heckklappe, beginnt unter den Rückleuchten
  const jE = onH(sE - 0.03, 1.14)[1];
  const band = (v0, v1) => (u, v) => { const j = jE + (25 - jE) * u, y = 1.118 + 0.045 * (v0 + (v1 - v0) * v); return [xAtJ(j, y), j]; };
  patchF('taillightDark', band(0, 1), { nu: 24, nv: 2, off: 0.003 });
  patchF('taillight', band(0.3, 0.7), { nu: 24, nv: 1, off: 0.0045 });
  // Heckklappenfuge unten und seitlich
  patchF('trim', (u, v) => [xTail(0.835) + 0.004 * v, 13.6 + 11.4 * u], { nu: 20, nv: 1, off: 0.002 });
  // Kennzeichen im Stoßfänger, Diffusor schwarz, Rückstrahler
  k.box('trimMatte', L - 0.002, L + 0.0008, 0.617, 0.753, -0.272, 0.272);
  k.box('plate', L - 0.0005, L + 0.003, 0.63, 0.74, -0.26, 0.26);
  // Diffusor als Block mit Tiefe (unten sichtbar), senkrechte Rippen, je Seite ein dunkler Ausschnitt mit zwei ovalen Endrohren
  k.box('trimMatte', L - 0.14, L + 0.002, 0.40, 0.57, -0.78, 0.78);
  for (const z of [-0.3, -0.12, 0.12, 0.3]) k.box('trimMatte', L - 0.12, L + 0.012, 0.395, 0.52, z - 0.004, z + 0.004);
  patchF('taillightDark', (u, v) => [4.84 + 0.06 * u, jAt(4.87, 0.6) + 0.5 * v], { nu: 4, nv: 1, off: 0.003 });
  const ell = (g, x, y, z, sy, sz) => { g.rotateY(Math.PI / 2); g.scale(1, sy, sz); g.translate(x, y, z); return g; };
  k.both(s => {
    k.box('trim', L + 0.002, L + 0.005, 0.435, 0.535, s > 0 ? 0.43 : -0.70, s > 0 ? 0.70 : -0.43);
    for (const zc of [0.5, 0.63]) {
      const g = new T.CylinderGeometry(1, 1, 0.062, 28, 1, true); g.rotateZ(Math.PI / 2); g.scale(1, 0.036, 0.052); g.translate(L - 0.019, 0.485, s * zc); k.add('chrome', g);
      k.add('chrome', ell(new T.RingGeometry(0.84, 1, 28), L + 0.012, 0.485, s * zc, 0.036, 0.052));
      k.add('liner', ell(new T.CircleGeometry(1, 28), L + 0.010, 0.485, s * zc, 0.03, 0.046));
    }
  });
  // Dachkantenspoiler über der Heckscheibe
  sweep('paint', 3.9, [[0, 0], [0.05, 0.011], [0.1, 0.018], [0.15, 0.021], [0.155, 0.01], [0.1, 0.004], [0.05, 0.0005]], 19.2, 25, { nj: 14, caps: [true, false] });
  // Leiste entlang eines Pfades: fr = [{ p, a, b }] (Punkt, zwei Richtungen), sec = [[s, t], …] geschlossener Querschnitt
  function tube(m, fr, sec) {
    const rows = fr.map(({ p, a, b }) => sec.map(([s, t]) => p.clone().addScaledVector(a, s).addScaledVector(b, t))), n = sec.length, out = [];
    const cenOf = r => { const c = V(0, 0, 0); for (const v of r) c.add(v); return c.multiplyScalar(1 / n); };
    // Mantel mit gemeinsamen Punkten (weiche Normalen), Drehsinn nach Mehrheit nach außen
    const pos = [], idx = []; let vote = 0;
    for (const r of rows) for (const v of r) pos.push(v.x, v.y, v.z);
    for (let i = 0; i < rows.length - 1; i++) {
      const cen = cenOf(rows[i]);
      for (let q = 0; q < n; q++) {
        const A = rows[i][q], B = rows[i][(q + 1) % n], Cc = rows[i + 1][(q + 1) % n];
        vote += B.clone().sub(A).cross(Cc.clone().sub(A)).dot(A.clone().add(Cc).multiplyScalar(0.5).sub(cen)) >= 0 ? 1 : -1;
        const a = i * n + q, b = i * n + (q + 1) % n, c = (i + 1) * n + (q + 1) % n, d = (i + 1) * n + q;
        idx.push(a, b, c, a, c, d);
      }
    }
    if (vote < 0) for (let q = 0; q < idx.length; q += 3) { const t = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = t; }
    const gm = new T.BufferGeometry(); gm.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); gm.setIndex(idx); gm.computeVertexNormals(); k.add(m, gm);
    [[0, 1], [rows.length - 1, rows.length - 2]].forEach(([i, ni]) => {
      const cen = cenOf(rows[i]), dir = cen.clone().sub(cenOf(rows[ni]));
      for (let q = 0; q < n; q++) { let A = rows[i][q], B = rows[i][(q + 1) % n]; if (B.clone().sub(cen).cross(A.clone().sub(cen)).dot(dir) < 0) [A, B] = [B, A]; out.push(cen.x, cen.y, cen.z, B.x, B.y, B.z, A.x, A.y, A.z); }
    });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(out, 3)); g.computeVertexNormals(); k.add(m, g);
  }
  // Radlaufkanten: ausgestellte Lippe entlang des Bogens
  for (const [c, r] of [[xf, rf], [xr, rr]]) k.both(s => {
    // Lage quer aus der Fläche, über die Nachbarpunkte gemittelt; Rahmen fest (radial, quer), damit die Lippe nicht verdreht
    const n = 48, th = q => Math.PI * q / n, zs = [];
    for (let q = 0; q <= n; q++) { const x = c + (RA + 0.004) * Math.cos(th(q)), y = r + (RA + 0.004) * Math.sin(th(q)); zs.push(H1.at(x, jAt(x, y), s).p.z); }
    for (let it = 0; it < 2; it++) { const z0 = zs.slice(); for (let q = 0; q <= n; q++) zs[q] = (z0[Math.max(0, q - 1)] + z0[q] + z0[Math.min(n, q + 1)]) / 3; }
    const fr = [];
    for (let q = 0; q <= n; q++) fr.push({ p: V(c + (RA + 0.004) * Math.cos(th(q)), r + (RA + 0.004) * Math.sin(th(q)), zs[q]), a: V(Math.cos(th(q)), Math.sin(th(q)), 0), b: V(0, 0, s) });
    tube('paint', fr, [[-0.018, 0.002], [-0.014, 0.013], [0.012, 0.019], [0.04, 0.013], [0.075, 0.001], [0.03, -0.006], [-0.012, -0.004]]);
  });
  // Fugen: Türen, Haube
  const fuge = f => patchF('trim', f, { nu: 24, nv: 1, off: 0.0015 });
  const xLine = (x, y0, y1) => fuge((u, v) => [x - 0.003 + 0.006 * v, jAt(x, y0 + (y1 - y0) * u)]);
  xLine(1.555, 0.43, 1.098); xLine(2.8, 0.43, 1.134); xLine(3.585, 0.79, 1.17);
  fuge((u, v) => { const th = Math.PI * (0.73 + 0.25 * u), x = xr + 0.495 * Math.cos(th) - 0.003 + 0.006 * v; return [x, jAt(x, rr + 0.495 * Math.sin(th))]; });
  fuge((u, v) => [0.13 + 1.39 * u, 15.15 + 0.12 * v]);
  fuge((u, v) => [0.112 + 0.006 * v, 15.15 + 9.85 * u]);
  // Türgriffe mit Griffmulde
  k.both(s => { for (const x of [2.43, 3.3]) {
    const y = 0.985, j0 = jAt(x, y - 0.024), j1 = jAt(x, y + 0.024), z = Math.abs(H1.at(x, jAt(x, y), 1).p.z);
    patchF('trim', (u, v) => [x - 0.1 + 0.2 * u, j0 + (j1 - j0) * v], { side: s, nu: 4, nv: 2, off: 0.001 });
    const g = new T.BoxGeometry(0.18, 0.028, 0.02); g.translate(x, y, s * (z + 0.006)); k.add('paint', g);
  } });
  // Außenspiegel: Fuß an der Tür, Gehäuse in Wagenfarbe, Spiegelglas nach hinten
  k.both(s => {
    const x = 1.74, z0 = Math.abs(H1.at(x, jAt(x, 1.105), 1).p.z);
    const f = new T.BoxGeometry(0.12, 0.05, 0.12); f.translate(x + 0.04, 1.13, s * (z0 + 0.03)); k.add('trim', f);
    const hd = new T.SphereGeometry(1, 22, 14); hd.scale(0.055, 0.064, 0.112); hd.translate(x + 0.07, 1.195, s * (z0 + 0.112)); k.add('paint', hd);
    const gl = new T.CircleGeometry(1, 22); gl.rotateY(Math.PI / 2); gl.scale(1, 0.053, 0.096); gl.translate(x + 0.111, 1.195, s * (z0 + 0.112)); k.add('glassDark', gl);
  });
  // Scheibenwischer auf der Frontscheibe
  patchF('trimMatte', (u, v) => [1.575 + 0.012 * v, 19.6 + 5.4 * u], { nu: 10, nv: 1, off: 0.012 });
  // Front: Kennzeichen, Mitteleinlass mit Querstreben auf der Bugfläche, seitliche Einlässe an den Ecken mit Streben
  k.shape('grille', 'zy', [[-0.47, 0.385], [0.47, 0.385], [0.5, 0.62], [-0.5, 0.62]], -0.003, 0.003);
  for (const y of [0.45, 0.515, 0.58]) k.box('trim', -0.006, 0, y - 0.008, y + 0.008, -0.49, 0.49);
  k.box('trimMatte', -0.004, 0, 0.375, 0.392, -0.55, 0.55);
  k.box('trimMatte', -0.006, -0.001, 0.452, 0.568, -0.272, 0.272);
  k.box('plate', -0.009, -0.006, 0.46, 0.56, -0.26, 0.26);
  const si = (u, v) => { const x = 0.004 + 0.13 * u; return [x, jAt(x, 0.41 + 0.3 * v - 0.04 * u * v)]; };
  patchF('grille', si, { nu: 12, nv: 6, off: 0.002 });
  for (const t of [0.3, 0.55, 0.8]) patchF('trim', (u, v) => si(u, t + 0.04 * v), { nu: 12, nv: 1, off: 0.005 });
  for (const t of [0.35, 0.7]) patchF('trim', (u, v) => si(t + 0.05 * u, v), { nu: 1, nv: 6, off: 0.006 });
  // Punkt (z, y) der Frontansicht auf die Bugfläche abbilden → [x, j] (kleinste Station, deren Profil den Punkt enthält)
  const inProf = (P, z, y) => { let c = false; for (let a = 0, b = P.length - 1; a < P.length; b = a++) { const [za, ya] = P[a], [zb, yq] = P[b]; if ((ya > y) !== (yq > y) && z < (zb - za) * (y - ya) / (yq - ya) + za) c = !c; } return c; };
  const toXJ = (z, y) => {
    let lo = 0, hi = 0.8;
    for (let q = 0; q < 22; q++) { const m = (lo + hi) / 2; if (inProf(prof(m), z, y)) hi = m; else lo = m; }
    const P = prof(hi); let best = 1e9, bj = 0;
    for (let j = 0; j < P.length - 1; j++) {
      const [za, ya] = P[j], dz = P[j + 1][0] - za, dy = P[j + 1][1] - ya, t = Math.min(1, Math.max(0, ((z - za) * dz + (y - ya) * dy) / (dz * dz + dy * dy || 1e-9)));
      const d = (za + t * dz - z) ** 2 + (ya + t * dy - y) ** 2; if (d < best) { best = d; bj = j + t; }
    }
    return [hi, bj];
  };
  // Scheinwerfer: Umriss in der Frontansicht (u innen → außen, v unten → oben), seitlich spitz auslaufend
  const hlY = (u, v) => { const r = u < 0.18 ? (1 - u / 0.18) ** 2 : 0, yb_ = 0.772 + 0.05 * u + 0.035 * r, yt = 0.875 + 0.058 * u - 0.025 * r; return yb_ + (yt - yb_) * v; };
  const hl = (u, v) => toXJ(0.43 + 0.47 * u, hlY(u, v));
  const [hxo] = hl(1, 0.5), hs = (u, v) => { const x = hxo + (0.4 - hxo) * u; return [x, jAt(x, hlY(1, 0) + (0.05 * u) + (hlY(1, 1) - hlY(1, 0) - 0.06 * u) * v)]; };
  for (const f of [hl, hs]) { patchF('lampHousing', f, { nu: 14, nv: 5, off: 0.003 }); patchF('lens', f, { nu: 14, nv: 5, off: 0.009 }); }
  patchF('headlight', sub(hl, 0.62, 0.9, 0.3, 0.72), { nu: 6, nv: 3, off: 0.005 });
  patchF('headlight', sub(hl, 0.4, 0.48, 0.38, 0.62), { nu: 2, nv: 2, off: 0.005 });
  for (const [u0, v0] of [[0.3, 0.16], [0.52, 0.16], [0.3, 0.74], [0.52, 0.74]]) patchF('drl', sub(hl, u0, u0 + 0.045, v0, v0 + 0.13), { nu: 2, nv: 2, off: 0.006 });
  patchF('indicator', sub(hs, 0.1, 0.55, 0.15, 0.6), { nu: 4, nv: 1, off: 0.005 });
  // Innenraum: Sitze, Armaturenbrett, Mittelkonsole, Lenkrad (Fahrer links, +z)
  k.box('carpet', 1.55, 4.3, 0.3, 0.36, -0.82, 0.82);
  k.both(s => {
    k.box('interior', 2.5, 2.98, 0.4, 0.62, s * 0.18 + (s > 0 ? 0 : -0.36), s * 0.18 + (s > 0 ? 0.36 : 0));
    const bk = new T.BoxGeometry(0.12, 0.62, 0.5); bk.rotateZ(-0.2); bk.translate(3.02, 0.95, s * 0.38); k.add('interior', bk);
    const hr = new T.BoxGeometry(0.09, 0.16, 0.26); hr.translate(3.11, 1.33, s * 0.38); k.add('interior', hr);
    k.box('interiorLight', 2.55, 2.94, 0.62, 0.63, s * 0.38 - 0.15, s * 0.38 + 0.15);
    k.box('interior', 1.62, 3.9, 0.62, 1.05, s > 0 ? 0.8 : -0.86, s > 0 ? 0.86 : -0.8);
  });
  k.box('interior', 3.35, 3.78, 0.4, 0.64, -0.75, 0.75);
  const rb = new T.BoxGeometry(0.1, 0.5, 1.45); rb.rotateZ(-0.32); rb.translate(3.8, 0.9, 0); k.add('interior', rb);
  for (const z of [-0.45, 0, 0.45]) k.box('interior', 3.86, 3.94, 1.13, 1.27, z - 0.12, z + 0.12);
  k.box('carpet', 3.9, 4.75, 0.7, 0.74, -0.84, 0.84);
  k.box('interior', 1.6, 2.02, 0.75, 1.1, -0.8, 0.8);
  k.box('interiorLight', 1.95, 2.03, 0.96, 0.99, -0.8, 0.8);
  k.box('interior', 1.95, 2.95, 0.4, 0.72, -0.13, 0.13);
  const sw = new T.TorusGeometry(0.185, 0.02, 8, 28); sw.rotateY(Math.PI / 2); sw.rotateZ(0.42); sw.translate(2.2, 1.0, 0.38); k.add('interior', sw);
  const col = new T.CylinderGeometry(0.03, 0.04, 0.3, 10); col.rotateZ(Math.PI / 2 + 0.42); col.translate(2.07, 1.05, 0.38); k.add('interior', col);
  // Rad: Reifen, 21-Zoll-Felge in Dunkeltitan mit zehn Doppelspeichen, Bremsscheibe, roter Sattel
  function rad(x, r, w, zc) {
    const s = Math.sign(zc), hw = w / 2, rimR = 0.272, zf = zc + s * hw * 0.74, Z = q => zc + s * q;
    const tp = [[rimR - 0.006, -0.82], [r - 0.06, -0.98], [r - 0.025, -0.97], [r - 0.006, -0.8], [r, -0.45], [r, 0.45], [r - 0.006, 0.8], [r - 0.025, 0.97], [r - 0.06, 0.98], [rimR - 0.006, 0.82]];
    k.lathe('tire', 'z', tp.map(([a, b]) => [a, zc + b * hw]), x, r, 56);
    k.lathe('rimDark', 'z', [[rimR, zc - hw * 0.8], [rimR, zc + hw * 0.8]], x, r, 40);
    k.lathe('rimDark', 'z', [[rimR - 0.028, Z(hw * 0.74)], [rimR + 0.006, Z(hw * 0.8)]].sort((a, b) => a[1] - b[1]), x, r, 48);
    // fünf Doppelspeichen (je Paar zwei Stäbe ±0.1 rad), 5 → 3.4 cm breit, nach innen gewölbt: Nabe 3.5 cm tiefer als der Rand
    const d0 = 0.07, d1 = rimR - 0.016, zH = zf - s * 0.035, dz = t => -0.035 + 0.057 * t - 0.022 * t * t;
    for (let q = 0; q < 10; q++) {
      const a = (q >> 1) * 2 * Math.PI / 5 + (q & 1 ? 0.1 : -0.1) + 0.3, ca = Math.cos(a), sa = Math.sin(a), fr = [];
      for (let i = 0; i <= 4; i++) {
        const t = i / 4, d = d0 + (d1 - d0) * t, w = 0.05 - 0.016 * t;
        fr.push({ p: V(x + ca * d, r + sa * d, zf + s * dz(t)), a: V(-sa * w, ca * w, 0), b: V(0, 0, s) });
      }
      tube('rimDark', fr, [[-0.5, 0], [-0.32, 0.0035], [0.32, 0.0035], [0.5, 0], [0.42, -0.022], [-0.42, -0.022]]);
    }
    // Nabe, Zentralkappe, Radmuttern; Bremsscheibe mit dunklem Topf
    k.cyl('rimDark', 'z', zH - s * 0.024, zH + s * 0.006, x, r, 0.092, 0.092, 28);
    k.cyl('trim', 'z', zH, zH + s * 0.016, x, r, 0.042, 0.042, 20);
    for (let q = 0; q < 5; q++) { const a = q * 2 * Math.PI / 5 + 0.3 + Math.PI / 5; k.cyl('chrome', 'z', zH, zH + s * 0.012, x + Math.cos(a) * 0.064, r + Math.sin(a) * 0.064, 0.01, 0.01, 8); }
    k.cyl('disc', 'z', Z(0) - 0.017, Z(0) + 0.017, x, r, 0.19, 0.19, 36);
    k.cyl('rimDark', 'z', Z(0.017) - (s < 0 ? 0.02 : 0), Z(0.017) + (s > 0 ? 0.02 : 0), x, r, 0.105, 0.105, 28);
    const ar = (a0, a1, rr_) => { const p = []; for (let q = 0; q <= 8; q++) { const a = a0 + (a1 - a0) * q / 8; p.push([x + Math.cos(a) * rr_, r + Math.sin(a) * rr_]); } return p; };
    k.shape('calRed', 'xy', [...ar(Math.PI * 0.6, Math.PI * 0.9, 0.15), ...ar(Math.PI * 0.6, Math.PI * 0.9, 0.235).reverse()], Z(0.045) - 0.035, 0.07, { curve: 4 });
  }
  for (const [x, r, w, zc] of [[xf, rf, 0.285, 0.835], [xr, rr, 0.315, 0.825]]) { k.arch(x, r, 0.9, { ra: RA - 0.012 }); k.both(s => rad(x, r, w, s * zc)); }
};
