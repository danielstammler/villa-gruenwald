// Beispiel für den Auto-Baukasten (src/cars.js): eine schlichte Limousine. Nicht Teil der Seite, nur Vorlage und Test.
// Zeigt: Stützkurven entlang x, Querschnitte mit section(), Radläufe über ycut, Glas über die Profilstellen j 13–16,
// Leuchten und Gitter als patch() auf der Fläche, Türfugen mit lineX(), Räder, Radhäuser, Spiegel und Innenraum.
CAR_MODELS.demo = k => {
  const L = 4.7, W = 1.85, H = 1.45, wf = 0.95, wr = 3.75, r = 0.33;
  CAR_MODELS.demo.spec = { L, W, H, wheelbase: wr - wf };
  // Stützkurven über die Länge
  const yr = k.curve([[0, 0.62], [0.5, 0.86], [1.5, 0.98], [1.75, 1.0], [2.35, 1.44], [3.2, 1.45], [3.95, 1.12], [4.45, 1.06], [4.7, 0.95]]);
  const ybelt = k.curve([[0, 0.62], [0.5, 0.82], [1.6, 0.95], [3.9, 1.0], [4.7, 0.95]]);
  const yb = k.curve([[0, 0.3], [0.3, 0.2], [4.4, 0.2], [4.7, 0.3]]);
  const ww = k.curve([[0, 0.6], [0.35, 0.86], [0.9, 0.925], [3.8, 0.925], [4.4, 0.88], [4.7, 0.7]]);
  const wr_ = k.curve([[1.6, 0.62], [2.4, 0.66], [3.3, 0.66], [3.9, 0.6]]);
  const arch = x => { let y = -1; for (const c of [wf, wr]) { const d = Math.abs(x - c), ra = r + 0.06; if (d < ra) y = Math.max(y, r + Math.sqrt(ra * ra - d * d)); } return y; };
  const st = [];
  for (let x = 0; x <= L + 1e-6; x += 0.03) {
    const top = Math.max(yr(x), ybelt(x)), belt = Math.min(ybelt(x), top), wwx = ww(x), glass = top - belt > 0.05;
    st.push({ x, p: k.section({ yb: yb(x), ys: yb(x) + 0.12, yw: belt - 0.2, ybelt: belt, yr: top, wb: wwx - 0.12, ws: wwx - 0.05, ww: wwx, wbelt: wwx - 0.03,
      wr: glass ? Math.min(wr_(x), wwx - 0.1) : wwx * 0.9, crown: glass ? 0.05 : 0.03, ycut: arch(x) }) });
  }
  // Glas: Seitenscheiben (j 13–16) zwischen A- und C-Säule, Front- und Heckscheibe auf dem Dachprofil (j 17–21) über der Gürtellinie
  const H1 = k.hull(st, { mat: (i, j, side, c) => {
    if (j >= 13 && j <= 15 && c.x > 1.85 && c.x < 3.85) return Math.abs(c.x - 2.95) < 0.05 ? 'trim' : 'glass';
    if (j >= 16 && ((c.x > 1.62 && c.x < 2.3) || (c.x > 3.35 && c.x < 4.05))) return 'glass';
    if (j <= 2) return 'underbody';
    return 'paint';
  } });
  // Leuchten, Kühlergrill, Kennzeichen als Flächenstücke
  k.patch('headlight', H1, 0.06, 0.32, 9.2, 11.6, { nx: 8, nj: 4 });
  k.patch('grille', H1, 0.0, 0.08, 6, 8.6, { nx: 3, nj: 6, off: 0.003 });
  k.patch('taillight', H1, 4.5, 4.68, 9.4, 11.8, { nx: 6, nj: 4 });
  k.patch('plate', H1, 4.66, 4.7, 5.2, 6.4, { side: 1, nx: 2, nj: 3 }); k.patch('plate', H1, 4.66, 4.7, 5.2, 6.4, { side: -1, nx: 2, nj: 3 });
  // Türfugen und Griffe
  for (const x of [1.9, 2.95, 3.9]) k.lineX('trim', H1, x, 3.2, 12.4, {});
  k.both(s => { const q = H1.at(2.5, 10.4, s); k.box('chrome', q.p.x - 0.09, q.p.x + 0.09, q.p.y - 0.012, q.p.y + 0.012, q.p.z - 0.01 * s, q.p.z + 0.012 * s); });
  // Spiegel
  k.both(s => { const q = H1.at(1.95, 12.6, s); k.box('paint', q.p.x - 0.02, q.p.x + 0.14, q.p.y + 0.02, q.p.y + 0.12, s > 0 ? q.p.z : q.p.z - 0.2, s > 0 ? q.p.z + 0.2 : q.p.z); });
  // Räder und Radhäuser
  for (const x of [wf, wr]) { k.arch(x, r, W / 2 - 0.08); k.both(s => k.wheel({ x, r, w: 0.24, zc: s * (W / 2 - 0.15), style: 'fiveDouble', cal: 'calRed' })); }
  // Innenraum: Sitze, Armaturenbrett, Lenkrad (durch das Glas zu sehen)
  k.both(s => { k.box('interior', 2.35, 2.85, 0.35, 0.62, s * 0.18, s * 0.68); k.box('interior', 2.75, 2.9, 0.6, 1.2, s * 0.2, s * 0.66); });
  k.box('interior', 1.7, 2.05, 0.6, 0.95, -0.8, 0.8);
  const sw = new k.THREE.TorusGeometry(0.17, 0.018, 8, 28); sw.rotateY(Math.PI / 2); sw.rotateZ(0.35); sw.translate(2.1, 0.98, -0.37); k.add('interior', sw);
};
