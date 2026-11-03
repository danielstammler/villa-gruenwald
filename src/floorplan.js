// Vorgeschlagene Grundrisse: UG mit Tiefgarage, EG, OG, DG. Eigener Vorschlag auf Basis des Konzepts, keine Architektenplanung.
// Räume sind lichte Rechtecke im Plan (x Ost, y Nord, Meter). Was zwischen ihnen frei bleibt, wird als Wand gezeichnet.
const Plans = (() => {
  const W = HOUSE.W, D = HOUSE.D, C = SITE.concept;
  const f = v => +v.toFixed(3);
  const num = (v, d = 1) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const tipA = t => (t ? ` data-tip="${t}"` : '');
  const R = (x0, x1, y0, y1, cls, t) => `<rect x="${f(Math.min(x0, x1))}" y="${f(-Math.max(y0, y1))}" width="${f(Math.abs(x1 - x0))}" height="${f(Math.abs(y1 - y0))}" class="${cls}"${tipA(t)}/>`;
  const RR = (x0, x1, y0, y1, rx, cls) => `<rect x="${f(x0)}" y="${f(-y1)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" rx="${rx}" class="${cls}"/>`;
  const L = (x0, y0, x1, y1, cls = 'g-furn-l') => `<line x1="${f(x0)}" y1="${f(-y0)}" x2="${f(x1)}" y2="${f(-y1)}" class="${cls}"/>`;
  const T = (x, y, s, cls) => `<text x="${f(x)}" y="${f(-y)}" class="${cls}">${s}</text>`;
  const Ci = (x, y, r, cls) => `<circle cx="${f(x)}" cy="${f(-y)}" r="${f(r)}" class="${cls}"/>`;
  const El = (x, y, rx, ry, cls) => `<ellipse cx="${f(x)}" cy="${f(-y)}" rx="${f(rx)}" ry="${f(ry)}" class="${cls}"/>`;
  const pts = P => P.map(p => `${f(p[0])},${f(-p[1])}`).join(' ');
  const area = r => (r[1] - r[0]) * (r[3] - r[2]);
  const area2 = P => Math.abs(P.reduce((t, p, i) => { const q = P[(i + 1) % P.length]; return t + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const STAIR = [9.0, 11.28, -3.9, -0.36], LIFT = [4.72, 6.72, -4.88, -2.88];
  const CORE = area(STAIR) + area(LIFT);

  // ---------- Möbel und Ausstattung ----------
  const fu = {
    box: (x0, x1, y0, y1, label) => R(x0, x1, y0, y1, 'g-furn') + (label ? T((x0 + x1) / 2, (y0 + y1) / 2 - 0.08, label, 'g-ftxt') : ''),
    shelf: (x0, x1, y0, y1) => R(x0, x1, y0, y1, 'g-furn') + L(x0, y0, x1, y1),
    bed(x0, x1, y0, y1, head = 'N') {
      let s = R(x0, x1, y0, y1, 'g-furn');
      const vert = head === 'N' || head === 'S', span = vert ? x1 - x0 : y1 - y0, n = span > 1.4 ? 2 : 1, pw = (span - 0.2) / n;
      for (let i = 0; i < n; i++) {
        const a = (vert ? x0 : y0) + 0.1 + i * pw, b = a + pw - 0.08;
        if (head === 'N') s += R(a, b, y1 - 0.42, y1 - 0.1, 'g-furn'); else if (head === 'S') s += R(a, b, y0 + 0.1, y0 + 0.42, 'g-furn');
        else if (head === 'E') s += R(x1 - 0.42, x1 - 0.1, a, b, 'g-furn'); else s += R(x0 + 0.1, x0 + 0.42, a, b, 'g-furn');
      }
      if (head === 'N') s += L(x0, y1 - 0.75, x1, y1 - 0.75); else if (head === 'S') s += L(x0, y0 + 0.75, x1, y0 + 0.75);
      else if (head === 'E') s += L(x1 - 0.75, y0, x1 - 0.75, y1); else s += L(x0 + 0.75, y0, x0 + 0.75, y1);
      return s;
    },
    sofa(x0, x1, y0, y1, back) {
      const t = 0.24, a = 0.2;
      let s = R(x0, x1, y0, y1, 'g-furn');
      if (back === 'N' || back === 'S') s += R(x0, x1, back === 'N' ? y1 - t : y0, back === 'N' ? y1 : y0 + t, 'g-furn') + R(x0, x0 + a, y0, y1, 'g-furn') + R(x1 - a, x1, y0, y1, 'g-furn');
      else s += R(back === 'E' ? x1 - t : x0, back === 'E' ? x1 : x0 + t, y0, y1, 'g-furn') + R(x0, x1, y0, y0 + a, 'g-furn') + R(x0, x1, y1 - a, y1, 'g-furn');
      return s;
    },
    table(x0, x1, y0, y1, n = 3, ends = true) {
      let s = R(x0, x1, y0, y1, 'g-furn');
      const c = 0.42, g = 0.08, horiz = x1 - x0 >= y1 - y0;
      for (let i = 0; i < n; i++) {
        if (horiz) { const m = x0 + (i + 0.5) * (x1 - x0) / n; s += R(m - c / 2, m + c / 2, y1 + g, y1 + g + c, 'g-furn') + R(m - c / 2, m + c / 2, y0 - g - c, y0 - g, 'g-furn'); }
        else { const m = y0 + (i + 0.5) * (y1 - y0) / n; s += R(x1 + g, x1 + g + c, m - c / 2, m + c / 2, 'g-furn') + R(x0 - g - c, x0 - g, m - c / 2, m + c / 2, 'g-furn'); }
      }
      if (ends) {
        if (horiz) { const m = (y0 + y1) / 2; s += R(x0 - g - c, x0 - g, m - c / 2, m + c / 2, 'g-furn') + R(x1 + g, x1 + g + c, m - c / 2, m + c / 2, 'g-furn'); }
        else { const m = (x0 + x1) / 2; s += R(m - c / 2, m + c / 2, y1 + g, y1 + g + c, 'g-furn') + R(m - c / 2, m + c / 2, y0 - g - c, y0 - g, 'g-furn'); }
      }
      return s;
    },
    tub: (x0, x1, y0, y1) => R(x0, x1, y0, y1, 'g-furn') + RR(x0 + 0.08, x1 - 0.08, y0 + 0.08, y1 - 0.08, 0.22, 'g-furn'),
    shower: (x0, x1, y0, y1) => R(x0, x1, y0, y1, 'g-furn') + L(x0, y0, x1, y1) + L(x0, y1, x1, y0),
    // WC und Waschtisch stehen an der Wand (x, y liegt auf der Wand), dir = Wandseite
    wc(x, y, dir) {
      const d = { N: [0, -1], S: [0, 1], E: [-1, 0], W: [1, 0] }[dir], v = dir === 'N' || dir === 'S';
      return R(x + d[0] * 0 - (v ? 0.2 : 0), x + d[0] * 0.2 + (v ? 0.2 : 0), y - (v ? 0 : 0.2), y + d[1] * 0.2 + (v ? 0 : 0.2), 'g-furn') +
        El(x + d[0] * 0.5, y + d[1] * 0.5, v ? 0.19 : 0.28, v ? 0.28 : 0.19, 'g-furn');
    },
    basin(x, y, w, dir) {
      const d = { N: [0, -1], S: [0, 1], E: [-1, 0], W: [1, 0] }[dir], v = dir === 'N' || dir === 'S', h = 0.5;
      const x0 = v ? x - w / 2 : Math.min(x, x + d[0] * h), x1 = v ? x + w / 2 : Math.max(x, x + d[0] * h);
      const y0 = v ? Math.min(y, y + d[1] * h) : y - w / 2, y1 = v ? Math.max(y, y + d[1] * h) : y + w / 2;
      let s = R(x0, x1, y0, y1, 'g-furn');
      const n = w > 1.1 ? 2 : 1;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        s += v ? El(x0 + t * (x1 - x0), (y0 + y1) / 2, 0.2, 0.14, 'g-furn') : El((x0 + x1) / 2, y0 + t * (y1 - y0), 0.14, 0.2, 'g-furn');
      }
      return s;
    },
    desk(x0, x1, y0, y1, chair) {
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, o = { N: [0, 1], S: [0, -1], E: [1, 0], W: [-1, 0] }[chair];
      return R(x0, x1, y0, y1, 'g-furn') + Ci(cx + o[0] * ((x1 - x0) / 2 + 0.35), cy + o[1] * ((y1 - y0) / 2 + 0.35), 0.24, 'g-furn');
    },
    carH(cx, cy) {
      return RR(cx - 2.3, cx + 2.3, cy - 0.92, cy + 0.92, 0.35, 'g-car') + L(cx + 0.9, cy - 0.8, cx + 0.9, cy + 0.8, 'g-furn-l') + L(cx - 1.5, cy - 0.8, cx - 1.5, cy + 0.8, 'g-furn-l');
    },
    car(cx, cy) {
      return RR(cx - 0.92, cx + 0.92, cy - 2.3, cy + 2.3, 0.35, 'g-car') + L(cx - 0.8, cy + 0.9, cx + 0.8, cy + 0.9, 'g-furn-l') + L(cx - 0.8, cy - 1.5, cx + 0.8, cy - 1.5, 'g-furn-l');
    },
    hob: (cx, cy) => [[-0.14, 0.14], [0.14, 0.14], [-0.14, -0.14], [0.14, -0.14]].map(([a, b]) => Ci(cx + a, cy + b, 0.09, 'g-furn')).join(''),
  };

  // ---------- Grundrisse ----------
  const FL = {
    UG: {
      titel: 'Untergeschoss mit Tiefgarage', ffb: HOUSE.Z.ffbUG,
      rooms: [
        { n: 'Fitness', r: [0.36, 6.48, -11.29, -5.12] }, { n: 'Sauna', r: [6.72, 9.4, -11.29, -8.0] },
        { n: 'Dusche / WC', r: [9.52, 11.28, -11.29, -8.0] }, { n: 'Flur', r: [6.72, 11.28, -7.88, -5.12] },
        { n: 'Schleuse', r: [11.52, 13.4, -11.29, -5.12] }, { n: 'Lager', r: [13.52, 15.64, -11.29, -5.12] },
        { n: 'Technik', r: [11.52, 15.64, -4.88, -0.36] }, { n: 'Waschen', r: [0.36, 4.48, -4.88, -0.36] },
        { n: 'Vorraum', r: [4.72, 11.28, -4.88, -0.36], core: true, at: [7.85, -1.4] },
      ],
      open: [[7.0, 9.0, -5.12, -4.88]],
      doors: [
        { x: 4.6, y: -2.25, w: 0.9, o: 'v', s: -1, h: 1 }, { x: 11.4, y: -4.78, w: 0.85, o: 'v', s: 1, h: 0 },
        { x: 6.6, y: -7.6, w: 0.9, o: 'v', s: -1, h: 0 }, { x: 7.3, y: -7.94, w: 0.7, o: 'h', s: -1, h: 0 },
        { x: 9.9, y: -7.94, w: 0.8, o: 'h', s: -1, h: 0 }, { x: 11.4, y: -7.6, w: 0.9, o: 'v', s: 1, h: 0 },
        { x: 13.46, y: -8.6, w: 0.8, o: 'v', s: 1, h: 0 }, { x: 12.1, y: -11.47, w: 0.9, o: 'h', s: -1, h: 0, t: 0.5 },
      ],
      furn: () => [
        fu.box(0.9, 1.7, -10.9, -9.0, 'Laufband'), fu.box(2.3, 3.1, -10.9, -9.3, 'Rad'), fu.box(3.9, 6.1, -10.9, -9.8, 'Matte'),
        fu.box(4.3, 6.0, -7.2, -5.6, 'Kraftstation'),
        fu.box(6.72, 9.4, -11.29, -10.69), fu.box(6.72, 7.32, -10.69, -8.7), fu.box(8.5, 9.0, -9.0, -8.5, 'Ofen'),
        fu.shower(9.52, 10.72, -11.29, -10.09), fu.wc(11.28, -9.1, 'E'), fu.basin(10.5, -8.0, 0.6, 'N'),
        fu.box(9.5, 11.0, -7.55, -7.0, 'Liege'), fu.box(9.5, 11.0, -6.6, -6.05, 'Liege'),
        fu.shelf(13.52, 14.02, -11.0, -5.4), fu.shelf(15.14, 15.64, -11.0, -5.4),
        fu.box(11.9, 13.5, -1.5, -0.6, 'Wärmepumpe'), Ci(14.7, -1.25, 0.5, 'g-furn'), T(14.7, -1.33, 'Speicher', 'g-ftxt'), fu.box(11.9, 13.1, -4.6, -3.8, 'Anschluss'),
        fu.box(0.6, 1.2, -1.0, -0.4, 'WM'), fu.box(1.3, 1.9, -1.0, -0.4, 'TR'), fu.box(2.1, 3.3, -0.96, -0.4, 'Spüle'), fu.shelf(0.36, 0.86, -4.6, -2.2),
      ],
    },
    EG: {
      titel: 'Erdgeschoss', ffb: HOUSE.Z.ffbEG,
      rooms: [
        { n: 'Wohnen', r: [0.36, 6.48, -11.29, -5.12] }, { n: 'Essen', r: [6.72, 11.28, -11.29, -5.12], at: [9.0, -10.6] },
        { n: 'Küche', r: [11.52, 15.64, -11.29, -5.12], at: [13.6, -10.4] },
        { n: 'Diele', r: [4.72, 11.28, -4.88, -0.36], core: true, at: [8.0, -3.6] },
        { n: 'Garderobe', r: [0.36, 4.48, -2.95, -0.36], at: [2.5, -1.75] }, { n: 'Gäste-WC', r: [2.74, 4.48, -4.88, -3.07], at: [3.6, -3.75] },
        { n: 'Abstellraum', r: [0.36, 2.62, -4.88, -3.07], at: [1.5, -3.75] },
        { n: 'Backkitchen', r: [11.52, 15.64, -4.88, -0.36], at: [13.55, -2.9] },
      ],
      open: [[7.0, 9.0, -5.12, -4.88], [6.48, 6.72, -10.4, -5.9], [11.28, 11.52, -10.4, -6.2]],
      doors: [
        { x: 4.6, y: -2.25, w: 0.9, o: 'v', s: -1, h: 1 }, { x: 3.2, y: -3.01, w: 0.8, o: 'h', s: -1, h: 0 },
        { x: 0.95, y: -3.01, w: 0.8, o: 'h', s: -1, h: 0 }, { x: 11.4, y: -4.78, w: 0.85, o: 'v', s: 1, h: 0 },
        { x: 12.3, y: -5.0, w: 0.9, o: 'h', s: 1, h: 0 },
        { x: 7.1, y: -0.18, w: 0.9, o: 'h', s: -1, h: 0, t: 0.5 }, { x: 8.0, y: -0.18, w: 0.9, o: 'h', s: -1, h: 1, t: 0.5 },
      ],
      furn: () => [
        fu.box(0.36, 0.86, -8.2, -6.95, 'Kamin'), fu.sofa(2.9, 3.85, -8.9, -6.3, 'E'), fu.box(1.45, 2.35, -8.15, -7.05),
        fu.box(1.25, 2.05, -9.55, -8.75), fu.box(1.25, 2.05, -6.45, -5.65),
        fu.table(8.47, 9.53, -9.5, -6.9, 3),
        fu.box(13.3, 15.64, -5.77, -5.12), fu.box(14.99, 15.64, -7.15, -5.77), fu.hob(14.3, -5.45),
        fu.box(12.6, 14.6, -8.85, -7.85, 'Insel'),
        fu.shelf(1.8, 3.1, -2.95, -2.35), fu.box(3.95, 4.48, -1.25, -0.5, 'Bank'),
        fu.wc(3.65, -4.88, 'S'), fu.basin(2.74, -3.95, 0.45, 'W'), fu.shelf(0.36, 0.81, -4.7, -3.2),
        fu.box(11.8, 15.64, -1.0, -0.36), fu.box(12.6, 13.4, -0.95, -0.42, 'Spüle'), fu.box(15.0, 15.64, -4.6, -1.0),
        fu.shelf(11.52, 12.1, -3.85, -1.1), fu.box(13.0, 14.4, -3.2, -2.4, 'Arbeitsfläche'),
      ],
    },
    OG: {
      titel: 'Obergeschoss', ffb: HOUSE.Z.ffbOG,
      rooms: [
        { n: 'Eltern', r: [4.72, 11.28, -11.29, -6.24], at: [8.0, -9.6] }, { n: 'Kind 1', r: [0.36, 4.48, -11.29, -4.88], at: [2.0, -10.0] },
        { n: 'Bad', r: [0.36, 4.48, -4.76, -0.36], at: [2.6, -2.6] }, { n: 'Flur', r: [4.72, 11.28, -6.0, -0.36], core: true, at: [8.0, -5.25] },
        { n: 'Ankleide', r: [11.52, 15.64, -7.3, -5.24], at: [13.9, -6.27] }, { n: 'Elternbad', r: [11.52, 15.64, -11.29, -7.42], at: [13.4, -9.4] },
        { n: 'Kind 2', r: [11.52, 15.64, -5.12, -0.36], at: [13.9, -2.4] },
      ],
      doors: [
        { x: 4.6, y: -2.3, w: 0.9, o: 'v', s: -1, h: 1 }, { x: 4.6, y: -5.95, w: 0.9, o: 'v', s: -1, h: 0 },
        { x: 5.4, y: -6.12, w: 0.9, o: 'h', s: -1, h: 0 }, { x: 11.4, y: -7.2, w: 0.8, o: 'v', s: 1, h: 0 },
        { x: 12.85, y: -7.36, w: 0.8, o: 'h', s: -1, h: 0 }, { x: 11.4, y: -5.0, w: 0.85, o: 'v', s: 1, h: 0 },
      ],
      furn: () => [
        fu.bed(7.1, 8.9, -8.34, -6.24, 'N'), fu.box(6.5, 6.98, -6.72, -6.24), fu.box(9.02, 9.5, -6.72, -6.24), fu.box(4.72, 5.22, -10.4, -8.6),
        fu.bed(3.38, 4.38, -8.9, -6.9, 'N'), fu.desk(0.36, 1.06, -8.4, -6.9, 'E'), fu.shelf(0.5, 3.2, -5.48, -4.88),
        fu.tub(0.5, 2.3, -1.16, -0.36), fu.shower(0.36, 1.56, -4.76, -3.56), fu.basin(4.48, -3.2, 1.4, 'E'), fu.wc(0.36, -2.6, 'W'),
        fu.shelf(12.4, 15.64, -5.84, -5.24), fu.shelf(12.4, 15.64, -7.3, -6.7),
        fu.tub(12.6, 14.4, -10.85, -10.05), fu.shower(11.52, 12.72, -8.62, -7.42), fu.basin(14.6, -7.42, 1.4, 'N'), fu.wc(15.64, -10.2, 'E'),
        fu.bed(11.62, 12.62, -3.4, -1.4, 'N'), fu.desk(14.94, 15.64, -4.6, -3.2, 'W'), fu.shelf(12.7, 15.2, -5.12, -4.52),
      ],
    },
    DG: {
      titel: 'Dachgeschoss', ffb: HOUSE.Z.ffbDG,
      rooms: [
        { n: 'Gast', r: [4.72, 11.28, -10.03, -6.24], at: [8.0, -8.9] }, { n: 'Hobby', r: [0.36, 4.48, -11.29, -4.88], at: [2.4, -6.3] },
        { n: 'Abstellraum', r: [0.36, 4.48, -4.76, -0.36], wf: 0, at: [2.5, -3.2] }, { n: 'Flur', r: [4.72, 11.28, -6.0, -0.36], core: true, at: [8.0, -5.25] },
        { n: 'Bibliothek', r: [11.52, 15.64, -11.29, -5.0], at: [13.4, -8.6] }, { n: 'Duschbad', r: [11.52, 15.64, -4.88, -0.36], at: [13.0, -1.7] },
      ],
      doors: [
        { x: 4.6, y: -2.3, w: 0.9, o: 'v', s: -1, h: 1 }, { x: 4.6, y: -5.95, w: 0.9, o: 'v', s: -1, h: 0 },
        { x: 5.4, y: -6.12, w: 0.9, o: 'h', s: -1, h: 0 }, { x: 11.4, y: -5.95, w: 0.85, o: 'v', s: 1, h: 0 },
        { x: 11.4, y: -4.8, w: 0.85, o: 'v', s: 1, h: 0 },
        ...[[5.3, 6.1], [7.1, 8.9], [9.9, 10.7]].map(([a, b]) => ({ x: a, y: -10.09, w: b - a, o: 'h', s: 1, h: 0, t: 0.2 })),
      ],
      furn: () => [
        fu.bed(7.1, 8.9, -8.24, -6.24, 'N'), fu.box(6.5, 6.98, -6.72, -6.24), fu.box(9.02, 9.5, -6.72, -6.24),
        fu.table(7.5, 8.5, -11.25, -10.75, 1, false),
        fu.table(1.4, 3.2, -8.6, -7.6, 2), fu.sofa(1.5, 3.5, -10.6, -9.75, 'S'),
        fu.shelf(1.2, 3.9, -1.65, -1.15),
        fu.shelf(12.0, 15.1, -10.6, -10.1), fu.sofa(12.6, 14.6, -7.0, -6.1, 'N'), fu.box(13.1, 14.1, -8.3, -7.5),
        fu.shower(12.0, 13.2, -3.3, -2.1), fu.basin(13.6, -4.88, 0.6, 'S'), fu.wc(14.6, -4.88, 'S'),
      ],
    },
  };

  // Dachgeschoss: lichte Höhe hängt vom Abstand s zur Außenwand ab (Mansarde 50°, Dachaufbau 30 cm)
  const h0 = HOUSE.Z.wand - 0.3 / Math.cos(Math.atan(HOUSE.tan1)) - HOUSE.Z.ffbDG;
  const sAt = h => (h - h0) / HOUSE.tan1;
  const inset = s => [s, W - s, -D + s, -s];
  const clip = (r, z) => Math.max(0, Math.min(r[1], z[1]) - Math.max(r[0], z[0])) * Math.max(0, Math.min(r[3], z[3]) - Math.max(r[2], z[2]));
  function roomArea(fl, rm) {
    let a = area(rm.r);
    if (rm.core) a -= CORE;
    if (fl !== 'DG') return { a, wf: fl === 'UG' ? 0 : (rm.wf ?? 1) * a };
    // Wohnfläche nach WoFlV: unter 1 m lichter Höhe 0 %, 1–2 m 50 %, ab 2 m 100 % (ohne Gauben gerechnet, also eher zu niedrig)
    const full = clip(rm.r, inset(sAt(2))), half = clip(rm.r, inset(sAt(1))) - full;
    const coreFull = rm.core ? CORE : 0;
    return { a, wf: (rm.wf ?? 1) * (full - coreFull + 0.5 * half) };
  }

  // ---------- Zeichnen ----------
  function planSeg(side, u0, u1, t0, t1) {
    if (side === 'S') return [u0, u1, -D + t0, -D + t1];
    if (side === 'N') return [W - u1, W - u0, -t1, -t0];
    if (side === 'E') return [W - t1, W - t0, u0 - D, u1 - D];
    return [t0, t1, -u1, -u0];
  }
  function arc(H, A, B, r) {
    const a = [A[0] - H[0], -(A[1] - H[1])], b = [B[0] - H[0], -(B[1] - H[1])];
    const sw = a[0] * b[1] - a[1] * b[0] > 0 ? 1 : 0;
    return `<path d="M${f(A[0])} ${f(-A[1])} A${f(r)} ${f(r)} 0 0 ${sw} ${f(B[0])} ${f(-B[1])}" class="g-arc"/>`;
  }
  function door({ x, y, w, o, s, h, t = 0.3 }) {
    if (o === 'v') {
      const H = [x, h ? y + w : y], B = [x, h ? y : y + w], A = [x + s * w, H[1]];
      return R(x - t / 2, x + t / 2, y, y + w, 'g-gap') + L(H[0], H[1], A[0], A[1], 'g-leaf') + arc(H, A, B, w);
    }
    const H = [h ? x + w : x, y], B = [h ? x : x + w, y], A = [H[0], y + s * w];
    return R(x, x + w, y - t / 2, y + t / 2, 'g-gap') + L(H[0], H[1], A[0], A[1], 'g-leaf') + arc(H, A, B, w);
  }
  function outerOpenings(fl) {
    let s = '';
    if (fl === 'EG' || fl === 'OG') {
      const [za, zb] = fl === 'EG' ? [0, 3] : [3, 6.5];
      for (const side of ['S', 'N', 'E', 'W']) for (const o of HOUSE.fas[side].open) {
        if (o.z0 < za || o.z0 >= zb || o.kind === 'eingang') continue;
        s += R(...planSeg(side, o.u0, o.u1, -0.01, 0.37), 'g-gap') + R(...planSeg(side, o.u0, o.u1, 0.13, 0.19), 'g-glass');
        if (o.kind === 'fenster') s += R(...planSeg(side, o.u0, o.u1, 0, 0.05), 'g-sill');
      }
    }
    if (fl === 'DG') for (const side of ['S', 'N', 'E', 'W']) for (const d of HOUSE.fas[side].dormers || []) {
      const back = (d.top - HOUSE.Z.wand) / HOUSE.tan1;
      s += R(...planSeg(side, d.u0, d.u1, d.front, back), 'g-dormer', 'Gaube');
      for (const w of d.win) s += R(...planSeg(side, w.u0, w.u1, d.front, d.front + 0.12), 'g-glass');
    }
    return s;
  }
  function stair(fl) {
    const [x0, x1, y0, y1] = STAIR, eye = 0.12, fw = (x1 - x0 - eye) / 2, land = 1.2, run = y1 - land - y0, n = 9;
    let s = R(x0, x1, y0, y1, 'g-stair');
    for (let i = 1; i < n; i++) { const y = y0 + run * i / n; s += L(x0, y, x0 + fw, y, 'g-tread') + L(x1 - fw, y, x1, y, 'g-tread'); }
    s += L(x0, y1 - land, x1, y1 - land, 'g-tread') + R(x0 + fw, x0 + fw + eye, y0, y1 - land, 'g-eye');
    const xa = x0 + fw / 2, xb = x1 - fw / 2, ym = y1 - land / 2;
    if (fl !== 'DG') s += `<polyline points="${pts([[xa, y0 + 0.25], [xa, ym], [xb, ym], [xb, y0 + 0.45]])}" class="g-walk"/>` +
      `<polygon points="${pts([[xb - 0.14, y0 + 0.5], [xb + 0.14, y0 + 0.5], [xb, y0 + 0.22]])}" class="g-walkhead"/>`;
    const lbl = { UG: '↑ EG', EG: '↑ OG  ↓ UG', OG: '↑ DG  ↓ EG', DG: '↓ OG' }[fl];
    return s + T((x0 + x1) / 2, y0 + 0.75, lbl, 'g-stairtxt') + (fl === 'DG' ? L(x0 + 0.05, y0 + 0.1, x1 - 0.05, y0 + 0.1, 'g-railing') : '');
  }
  function lift() {
    const [x0, x1, y0, y1] = LIFT, t = 0.2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return R(x0, x1, y0, y1, 'g-wall') + R(x0 + t, x1 - t, y0 + t, y1 - t, 'g-shaft', 'Personenaufzug · Kabine 1,10 × 1,40 m · UG bis DG') +
      L(x0 + t, y0 + t, x1 - t, y1 - t, 'g-thin') + L(x0 + t, y1 - t, x1 - t, y0 + t, 'g-thin') +
      R(cx - 0.55, cx + 0.55, cy - 0.7, cy + 0.7, 'g-cabin') + R(cx - 0.45, cx + 0.45, y1 - t - 0.02, y1 + 0.02, 'g-gap') + T(cx, cy - 0.08, 'Aufzug', 'g-ftxt g-lifttxt');
  }
  function tiefgarage() {
    const tg = C.tg, ph = C.poolhaus, rp = HOUSE.rampe, len = -(rp.y0 - rp.y1);
    let s = `<polygon points="${pts(tg)}" class="g-tgfloor" data-tip="Tiefgarage · ${num(area2(tg))} m² · vier Stellplätze, einer davon längs unter der Terrasse"/>`;
    s += R(rp.x0, rp.x1, rp.y0, rp.y1, 'g-ramp', `Rampe · beginnt im Poolhaus · 2,80 m breit · ${num(len)} m lang · ca. ${num(rp.gefaelle * 100)} % Gefälle`);
    for (let y = rp.y0 + 0.5; y < rp.y1 - 0.2; y += 1.0) s += L(rp.x0, y, rp.x1, y, 'g-furn-l');
    s += `<polygon points="${pts(tg)}" class="g-tgwall"/><polygon points="${pts(ph)}" class="g-tgwall"/>` + R(rp.x0 - 0.2, rp.x0, rp.wandEnde, rp.y0, 'g-wall');
    s += R(19.95, 22.31, rp.y0 - 0.05, rp.y0 + 0.05, 'g-gate', 'Garagentor im Poolhaus');
    s += `<polygon points="${pts([[21.13 - 0.35, -21.4], [21.13 + 0.35, -21.4], [21.13, -20.5]])}" class="g-walkhead"/>`;
    s += `<text x="21.13" y="26.5" class="g-ftxt" transform="rotate(-90 21.13 26.5)">Rampe ca. ${num(rp.gefaelle * 100)} %</text>` + T(21.13, -32.4, 'Einfahrt im Poolhaus', 'g-ftxt');
    for (let i = 0; i <= 3; i++) s += L(11.9 + 2.5 * i, -22.65, 11.9 + 2.5 * i, -17.65, 'g-park');
    s += L(11.9, -17.65, 19.4, -17.65, 'g-park');
    for (let i = 0; i < 3; i++) s += fu.car(13.15 + 2.5 * i, -20.15) + T(13.15 + 2.5 * i, -22.95, `P${i + 1}`, 'g-ftxt');
    s += L(5.4, -14.5, 10.8, -14.5, 'g-park') + L(5.4, -14.5, 5.4, -11.95, 'g-park') + L(10.8, -14.5, 10.8, -11.95, 'g-park');
    s += fu.carH(8.1, -13.2) + T(8.1, -14.25, 'P4 · unter der Terrasse', 'g-ftxt');
    s += fu.box(11.9, 12.9, -16.9, -12.4, 'Räder') + T(15.6, -14.2, 'Fahrgasse', 'g-ftxt');
    s += T(15.6, -15.6, 'Tiefgarage', 'g-roomtxt') + T(15.6, -16.3, `${num(area2(tg))} m² · 4 Stellplätze`, 'g-areatxt');
    return s;
  }
  function context(fl) {
    const t = HOUSE.terrasse, b = HOUSE.balkon, fz = HOUSE.freisitz, p = HOUSE.podest;
    if (fl === 'EG') return R(t.x0, t.x1, t.y0, t.y1, 'g-outside', 'Terrasse · 7,00 × 3,00 m') + b.cols.map(x => Ci(x, b.colY, b.colR, 'g-col')).join('') +
      R(fz.x0, fz.x1, fz.y0, fz.y1, 'g-outside', 'Freisitz · 3,00 × 5,00 m') + Ci(fz.x1 - 0.175, fz.y0 + 0.175, 0.17, 'g-col') + Ci(fz.x1 - 0.175, fz.y1 - 0.175, 0.17, 'g-col') +
      R(p.x0, p.x1, p.y0, p.y1, 'g-outside', 'Podest am Eingang') + T(8, -13.25, 'Terrasse', 'g-ftxt') + T(17.5, -8.4, 'Freisitz', 'g-ftxt') + T(8, 0.45, 'Eingang', 'g-ftxt');
    if (fl === 'OG') return R(b.x0, b.x1, b.y0, b.y1, 'g-outside', 'Balkon · 7,00 × 3,00 m') + L(b.x0 + 0.06, b.y0 + 0.06, b.x1 - 0.06, b.y0 + 0.06, 'g-railing') +
      L(b.x0 + 0.06, b.y0 + 0.06, b.x0 + 0.06, b.y1, 'g-railing') + L(b.x1 - 0.06, b.y0 + 0.06, b.x1 - 0.06, b.y1, 'g-railing') + T(8, -13.25, 'Balkon', 'g-ftxt') +
      fu.table(7.4, 8.6, -13.6, -12.9, 1, false) +
      R(fz.x0, fz.x1, fz.y0, fz.y1, 'g-outside', 'Dachterrasse auf dem Freisitz · 3,00 × 5,00 m') + T(17.5, -8.4, 'Dachterrasse', 'g-ftxt');
    if (fl === 'DG') return R(4.95, 11.05, -11.65, -10.15, 'g-outside', 'Zurückversetzter Balkon im DG · 6,10 × 1,50 m') + T(8, -11.05, 'Balkon', 'g-ftxt');
    return '';
  }
  function heightLines() {
    let s = '';
    for (const [h, lbl] of [[1, '1,00 m'], [2, '2,00 m']]) {
      const [x0, x1, y0, y1] = inset(sAt(h));
      s += R(x0, x1, y0, y1, 'g-hline') + T(x0 + 0.15, y0 + 0.08, `lichte Höhe ${lbl}`, 'g-htxt');
    }
    return s;
  }
  function render(fl, opt) {
    const F = FL[fl];
    let s = fl === 'UG' ? tiefgarage() : '';
    s += context(fl);
    s += R(0, W, -D, 0, 'g-wall');
    for (const rm of F.rooms) s += R(...rm.r, 'g-room', `${rm.n} · ${num(rm.r[1] - rm.r[0], 2)} × ${num(rm.r[3] - rm.r[2], 2)} m`);
    for (const o of F.open || []) s += R(...o, 'g-room');
    s += outerOpenings(fl);
    for (const d of F.doors) s += door(d);
    if (fl === 'DG') s += heightLines();
    if (opt.moebel) s += `<g class="g-furniture">${F.furn().join('')}</g>`;
    s += stair(fl) + lift();
    if (opt.flaechen) for (const rm of F.rooms) {
      const { a, wf } = roomArea(fl, rm), at = rm.at || [(rm.r[0] + rm.r[1]) / 2, (rm.r[2] + rm.r[3]) / 2];
      const sm = rm.r[1] - rm.r[0] < 2.6 ? ' g-sm' : '';
      const txt = fl === 'DG' && rm.wf !== 0 && Math.abs(wf - a) > 0.2 ? `${num(a)} m² · WoFl. ${num(wf)}` : `${num(a)} m²`;
      s += T(at[0], at[1] + 0.12, rm.n, `g-roomtxt${sm}`) + T(at[0], at[1] - (sm ? 0.32 : 0.42), txt, `g-areatxt${sm}`);
    }
    // Außenmaße und Nordpfeil
    s += `<g class="g-dims">${L(0, -D - 0.9, W, -D - 0.9, 'g-dim')}${L(-0.9, -D, -0.9, 0, 'g-dim')}${T(W / 2, -D - 0.75, '16,00', 'g-dimtxt')}` +
      `<text x="-0.75" y="${f(D / 2)}" class="g-dimtxt" transform="rotate(-90 -0.75 ${f(D / 2)})">11,65</text></g>`;
    const na = (rot => { const a = rot * Math.PI / 180, c = [-1.6, 1.9], Rt = p => [c[0] + p[0] * Math.cos(a) - p[1] * Math.sin(a), c[1] + p[0] * Math.sin(a) + p[1] * Math.cos(a)]; return `<polygon points="${pts([[0, 0.9], [0.32, -0.55], [-0.32, -0.55]].map(Rt))}" class="g-north"/>` + T(...Rt([0, 1.35]), 'N', 'g-ntxt'); })(SITE.north.grid);
    s += na;
    const vb = fl === 'UG' ? [-2.6, -1.4, 28.6, 36.0] : [-2.6, -1.6, 22.2, 17.2];
    return { svg: s, vb };
  }
  function table(fl) {
    const rows = FL[fl].rooms.map(rm => ({ n: rm.n, ...roomArea(fl, rm) }));
    return { rows, sum: rows.reduce((t, r) => t + r.a, 0), wf: rows.reduce((t, r) => t + r.wf, 0) };
  }
  function wohnflaeche() {
    const part = ['EG', 'OG', 'DG'].map(fl => table(fl).wf);
    const aussen = 0.25 * (area([HOUSE.balkon.x0, HOUSE.balkon.x1, HOUSE.balkon.y0, HOUSE.balkon.y1]) + 15.0 + 6.1 * 1.5);
    return { eg: part[0], og: part[1], dg: part[2], aussen, sum: part[0] + part[1] + part[2] + aussen };
  }
  return { render, table, wohnflaeche, FL, num };
})();
