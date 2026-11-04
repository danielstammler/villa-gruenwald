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
  // Treppenhalle: zweiläufige Treppe mit 1,29 m breiten Läufen und massiver Mittelwand, Aufzug als Turm in der Halle.
  // Über Eingang und Halle ein zweigeschossiger Luftraum (im OG eine Galerie mit Geländer).
  const STAIR = [8.9, 11.68, -3.9, -0.36], LIFT = [4.72, 6.72, -3.98, -1.98];
  const VOID = [[6.72, 8.9, -3.98, -0.36], [4.72, 6.72, -1.98, -0.36]];
  const CORE = area(STAIR) + area(LIFT), VOIDA = VOID.reduce((t, r) => t + area(r), 0);
  const STAIR_SP = { spine: 0.2, land: 1.2, n: 10, flare: 0.4 };

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
        { n: 'Technik', r: [11.92, 15.64, -4.88, -0.36] }, { n: 'Waschen', r: [0.36, 4.48, -4.88, -0.36] },
        { n: 'Vorraum', r: [4.72, 11.68, -4.88, -0.36], core: true, at: [7.8, -1.2] },
      ],
      open: [[7.0, 9.0, -5.12, -4.88]],
      doors: [
        { x: 4.6, y: -1.85, w: 0.9, o: 'v', s: -1, h: 1 }, { x: 11.8, y: -4.78, w: 0.85, o: 'v', s: 1, h: 0 },
        { x: 6.6, y: -7.6, w: 0.9, o: 'v', s: -1, h: 0 }, { x: 7.3, y: -7.94, w: 0.7, o: 'h', s: -1, h: 0 },
        { x: 9.9, y: -7.94, w: 0.8, o: 'h', s: -1, h: 0 }, { x: 11.4, y: -6.02, w: 0.9, o: 'v', s: 1, h: 0 },
        { x: 13.46, y: -8.6, w: 0.8, o: 'v', s: 1, h: 0 }, { x: 12.1, y: -11.47, w: 0.9, o: 'h', s: -1, h: 0, t: 0.5 },
      ],
      furn: () => [
        fu.box(0.9, 1.7, -10.9, -9.0, 'Laufband'), fu.box(2.3, 3.1, -10.9, -9.3, 'Rad'), fu.box(3.9, 6.1, -10.9, -9.8, 'Matte'),
        fu.box(4.3, 6.0, -7.2, -5.6, 'Kraftstation'),
        fu.box(6.72, 9.4, -11.29, -10.69, '', 'saunabank'), fu.box(6.72, 7.32, -10.69, -8.7, '', 'saunabank'), fu.box(8.5, 9.0, -9.0, -8.5, 'Ofen'),
        fu.shower(9.52, 10.72, -11.29, -10.09), fu.wc(11.28, -9.1, 'E'), fu.basin(10.5, -8.0, 0.6, 'N'),
        fu.box(9.5, 11.0, -7.55, -7.0, 'Liege'), fu.box(9.5, 11.0, -6.6, -6.05, 'Liege'),
        fu.shelf(13.52, 14.02, -11.0, -5.4), fu.shelf(15.14, 15.64, -11.0, -5.4),
        fu.box(12.2, 13.8, -1.5, -0.6, 'Wärmepumpe'), Ci(14.8, -1.25, 0.5, 'g-furn'), T(14.8, -1.33, 'Speicher', 'g-ftxt'), fu.box(12.2, 13.4, -3.6, -2.8, 'Anschluss'),
        fu.box(0.6, 1.2, -1.0, -0.4, 'WM'), fu.box(1.3, 1.9, -1.0, -0.4, 'TR'), fu.box(2.1, 3.3, -0.96, -0.4, 'Spüle', 'spuelzeile'), fu.shelf(0.36, 0.86, -4.6, -2.2),
      ],
    },
    EG: {
      titel: 'Erdgeschoss', ffb: HOUSE.Z.ffbEG,
      rooms: [
        { n: 'Wohnen', r: [0.36, 6.48, -11.29, -5.12] }, { n: 'Essen', r: [6.72, 11.28, -11.29, -5.12], at: [9.0, -10.6] },
        { n: 'Küche', r: [11.52, 15.64, -11.29, -5.12], at: [13.6, -10.4] },
        { n: 'Halle', r: [4.72, 11.68, -4.88, -0.36], core: true, at: [7.8, -4.15] },
        { n: 'Garderobe', r: [0.36, 4.48, -2.95, -0.36], at: [2.4, -1.75] }, { n: 'Gäste-WC', r: [2.74, 4.48, -4.88, -3.07], at: [3.6, -3.75] },
        { n: 'Abstellraum', r: [0.36, 2.62, -4.88, -3.07], at: [1.5, -3.75] },
        { n: 'Backkitchen', r: [11.92, 15.64, -4.88, -0.36], at: [13.75, -1.9] },
      ],
      open: [[7.0, 9.0, -5.12, -4.88], [6.48, 6.72, -10.4, -5.9], [11.28, 11.52, -10.4, -6.2]],
      doors: [
        { x: 4.6, y: -1.85, w: 0.9, o: 'v', s: -1, h: 1 }, { x: 3.2, y: -3.01, w: 0.8, o: 'h', s: -1, h: 0 },
        { x: 0.95, y: -3.01, w: 0.8, o: 'h', s: -1, h: 0 }, { x: 11.8, y: -4.78, w: 0.85, o: 'v', s: 1, h: 0 },
        { x: 12.3, y: -5.0, w: 0.9, o: 'h', s: 1, h: 0 },
        { x: 7.1, y: -0.18, w: 0.9, o: 'h', s: -1, h: 0, t: 0.5 }, { x: 8.0, y: -0.18, w: 0.9, o: 'h', s: -1, h: 1, t: 0.5 },
      ],
      furn: () => [
        fu.box(0.36, 0.86, -8.2, -6.95, 'Kamin'), fu.sofa(2.9, 3.85, -8.9, -6.3, 'E'), fu.box(1.45, 2.35, -8.15, -7.05, '', 'couchtisch'),
        fu.box(1.25, 2.05, -9.55, -8.75, '', 'sessel-S'), fu.box(1.25, 2.05, -6.45, -5.65, '', 'sessel-N'),
        fu.table(8.47, 9.53, -9.5, -6.9, 3),
        fu.box(13.3, 15.64, -5.77, -5.12, '', 'zeile'), fu.box(14.99, 15.64, -7.15, -5.77, '', 'zeile'), fu.hob(14.3, -5.45),
        fu.box(12.6, 14.6, -8.3, -7.3, 'Insel'),
        // kleiner Esstisch für vier vor den Gartentüren der Küche
        fu.table(12.75, 13.95, -10.45, -9.65, 2, false),
        fu.shelf(1.8, 3.1, -2.95, -2.35), fu.box(3.95, 4.48, -2.9, -2.15, 'Bank'),
        fu.wc(3.65, -4.88, 'S'), fu.basin(2.74, -3.95, 0.45, 'W'), fu.shelf(0.36, 0.81, -4.7, -3.2),
        fu.box(12.2, 15.64, -1.0, -0.36, '', 'zeile'), fu.box(12.8, 13.6, -0.95, -0.42, 'Spüle'), fu.box(15.0, 15.64, -4.6, -1.0, '', 'hochschrank'),
        fu.shelf(11.92, 12.5, -3.85, -1.4), fu.box(13.2, 14.6, -3.4, -2.6, 'Arbeitsfläche'),
        // Halle: Konsole mit Spiegel an der Nordwand neben dem Eingang
        fu.box(5.0, 6.4, -0.76, -0.36, '', 'konsole'),
        // draußen auf der Terrasse: Lounge unter dem Balkon (die Mittelachse zum Pool bleibt frei), Liegen im Osten, Esstisch auf dem Freisitz
        fu.sofa(3.6, 6.0, -13.95, -13.1, 'N'), fu.box(4.2, 5.4, -14.85, -14.35, '', 'couchtisch'),
        fu.box(2.6, 3.4, -14.8, -14.0, '', 'sessel-W'), fu.box(6.15, 6.95, -14.8, -14.0, '', 'sessel-E'),
        fu.box(12.0, 14.0, -14.05, -13.35, '', 'liege'), fu.box(12.0, 14.0, -15.15, -14.45, '', 'liege'),
        fu.table(17.05, 17.95, -9.3, -7.3, 3),
      ],
    },
    OG: {
      titel: 'Obergeschoss', ffb: HOUSE.Z.ffbOG,
      rooms: [
        { n: 'Kind 1', r: [0.36, 4.48, -11.29, -7.5], at: [2.4, -10.2] }, { n: 'Kinderbad West', r: [0.36, 4.48, -7.26, -5.2], at: [2.2, -6.5] },
        { n: 'Kind 2', r: [0.36, 4.48, -4.96, -0.36], at: [2.4, -2.2] },
        { n: 'Familienraum', r: [4.72, 11.28, -11.29, -6.24], at: [8.0, -10.5] }, { n: 'Flur', r: [4.72, 11.28, -6.0, -4.96], at: [6.0, -5.55] },
        { n: 'Galerie', r: [4.72, 11.68, -4.96, -0.36], core: true, at: [7.8, -4.4] },
        { n: 'Kind 3', r: [11.52, 15.64, -11.29, -7.5], at: [13.6, -9.9] }, { n: 'Kinderbad Ost', r: [11.52, 15.64, -7.26, -5.2], at: [13.8, -6.5] },
        { n: 'Kind 4', r: [11.92, 15.64, -4.96, -0.36], at: [13.8, -2.4] },
      ],
      open: [[7.0, 9.0, -6.24, -6.0]],
      doors: [
        { x: 4.6, y: -9.6, w: 0.9, o: 'v', s: -1, h: 0 }, { x: 4.6, y: -5.95, w: 0.75, o: 'v', s: -1, h: 0 },
        { x: 4.6, y: -4.92, w: 0.85, o: 'v', s: -1, h: 0 }, { x: 11.4, y: -9.6, w: 0.9, o: 'v', s: 1, h: 0 },
        { x: 11.4, y: -5.95, w: 0.75, o: 'v', s: 1, h: 0 }, { x: 11.8, y: -4.92, w: 0.85, o: 'v', s: 1, h: 0 },
      ],
      furn: () => [
        fu.bed(1.0, 2.0, -9.5, -7.5, 'N'), fu.desk(2.7, 4.1, -11.29, -10.6, 'N'), fu.shelf(2.3, 4.4, -8.1, -7.5),
        fu.shower(3.28, 4.48, -7.26, -6.06), fu.wc(0.36, -6.75, 'W'), fu.basin(2.0, -5.2, 1.4, 'N'),
        fu.bed(1.0, 2.0, -4.96, -2.96, 'S'), fu.desk(2.7, 4.1, -1.06, -0.36, 'S'), fu.shelf(3.88, 4.48, -2.9, -1.3),
        fu.sofa(6.8, 9.2, -8.1, -7.2, 'N'), fu.box(7.4, 8.6, -9.2, -8.5, '', 'couchtisch'), fu.shelf(10.68, 11.28, -8.4, -6.5),
        fu.bed(11.52, 13.52, -8.7, -7.7, 'W'), fu.desk(13.9, 15.3, -11.29, -10.6, 'N'), fu.shelf(11.52, 12.12, -11.2, -9.7),
        fu.shower(11.52, 12.72, -7.26, -6.06), fu.wc(15.64, -6.75, 'E'), fu.basin(14.0, -5.2, 1.4, 'N'),
        fu.bed(14.0, 15.0, -4.96, -2.96, 'S'), fu.desk(12.2, 13.6, -1.06, -0.36, 'S'), fu.shelf(11.92, 12.52, -3.8, -1.6),
        // draußen auf dem Balkon über der Terrasse
        fu.table(7.4, 8.6, -13.6, -12.9, 1, false),
      ],
    },
    DG: {
      titel: 'Dachgeschoss', ffb: HOUSE.Z.ffbDG,
      rooms: [
        { n: 'Büro', r: [4.72, 11.28, -11.29, -7.8], at: [8.0, -10.4] }, { n: 'Flur', r: [4.72, 11.68, -4.0, -0.36], core: true, at: [7.8, -1.2] },
        { n: 'Lesezone', r: [4.72, 11.28, -7.56, -4.0], at: [8.0, -5.4] },
        { n: 'Lounge', r: [0.36, 4.48, -11.29, -4.88], at: [2.0, -10.4] }, { n: 'Abstellraum', r: [0.36, 4.48, -4.64, -0.36], wf: 0, at: [2.5, -3.2] },
        // Elternsuite: vom Flur ins Schlafzimmer, dahinter Ankleide und Bad (en suite, nur über das Schlafzimmer erreichbar)
        { n: 'Eltern', r: [11.52, 15.64, -11.29, -6.6], at: [13.6, -10.4] }, { n: 'Ankleide', r: [11.52, 15.64, -6.36, -4.2], at: [13.9, -5.3] },
        { n: 'Elternbad', r: [11.92, 15.64, -3.96, -0.36], at: [13.2, -2.0] },
      ],
      doors: [
        { x: 6.15, y: -7.68, w: 0.9, o: 'h', s: -1, h: 0 }, { x: 4.6, y: -5.95, w: 0.9, o: 'v', s: -1, h: 0 },
        { x: 4.6, y: -1.85, w: 0.9, o: 'v', s: -1, h: 1 }, { x: 11.4, y: -7.45, w: 0.8, o: 'v', s: 1, h: 0 },
        { x: 11.6, y: -6.48, w: 0.85, o: 'h', s: -1, h: 0 }, { x: 12.0, y: -4.08, w: 0.85, o: 'h', s: 1, h: 0 },
      ],
      furn: () => [
        fu.desk(7.2, 8.8, -9.3, -8.5, 'N'), fu.shelf(4.72, 5.22, -10.9, -8.0), fu.box(10.1, 10.9, -10.6, -9.8, '', 'sessel-E'),
        fu.shelf(8.6, 10.6, -7.56, -7.1), fu.box(8.7, 9.5, -7.0, -6.2, '', 'sessel-S'), fu.box(9.7, 10.5, -7.0, -6.2, '', 'sessel-S'),
        fu.bed(12.6, 14.4, -8.7, -6.6, 'N'), fu.box(12.08, 12.56, -7.08, -6.6, '', 'nacht'), fu.box(14.44, 14.92, -7.08, -6.6, '', 'nacht'),
        fu.box(11.52, 12.02, -10.6, -9.0, '', 'kommode'),
        fu.shelf(13.0, 15.64, -4.8, -4.2), fu.shelf(12.6, 15.64, -6.36, -5.76),
        fu.tub(12.6, 14.4, -1.36, -0.56), fu.shower(13.2, 14.4, -3.96, -2.76), fu.basin(11.92, -2.4, 1.2, 'W'), fu.wc(15.0, -3.96, 'S'),
        fu.sofa(3.58, 4.48, -9.8, -7.4, 'E'), fu.box(2.4, 3.2, -9.1, -8.1, '', 'couchtisch'), fu.box(1.0, 1.8, -9.0, -8.2, '', 'sessel-W'),
        fu.shelf(1.0, 3.8, -5.48, -4.88), fu.shelf(1.2, 3.9, -1.65, -1.15),
        // draußen auf dem Balkon vor dem Büro, neben der Tür
        fu.table(10.1, 10.5, -12.45, -11.85, 1, false),
      ],
    },
  };

  // Dachgeschoss: lichte Höhe hängt vom Abstand s zur Außenwand ab (steile Mansarde, Dachaufbau 30 cm); im Zwerchhaus volle Höhe
  const h0 = HOUSE.Z.wand - 0.3 / Math.cos(Math.atan(HOUSE.tan1)) - HOUSE.Z.ffbDG;
  const sAt = h => (h - h0) / HOUSE.tan1;
  const inset = s => [s, W - s, -D + s, -s];
  const clip = (r, z) => Math.max(0, Math.min(r[1], z[1]) - Math.max(r[0], z[0])) * Math.max(0, Math.min(r[3], z[3]) - Math.max(r[2], z[2]));
  const inter = (a, b) => [Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.min(a[3], b[3])];
  const ZWERCH = ['S', 'N'].flatMap(side => (HOUSE.fas[side].dormers || []).filter(d => d.zwerch).map(d => {
    const back = (d.top - HOUSE.Z.wand) / HOUSE.tan1;
    return side === 'S' ? [d.u0, d.u1, -D, -D + back] : [W - d.u1, W - d.u0, -back, 0];
  }));
  const tall = (r, inner) => clip(r, inner) + ZWERCH.reduce((t, z) => t + clip(r, z) - clip(r, inter(inner, z)), 0);
  function roomArea(fl, rm) {
    let a = area(rm.r);
    if (rm.core) a -= CORE + (fl === 'OG' ? VOIDA : 0);
    if (fl !== 'DG') return { a, wf: fl === 'UG' ? 0 : (rm.wf ?? 1) * a };
    // Wohnfläche nach WoFlV: unter 1 m lichter Höhe 0 %, 1–2 m 50 %, ab 2 m 100 %; Zwerchhäuser zählen voll, Gauben nicht (eher zu niedrig)
    const full = tall(rm.r, inset(sAt(2))), half = tall(rm.r, inset(sAt(1))) - full;
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
        if (o.z0 < za || o.z0 >= zb) continue;
        // Haustür kommt aus der Türliste, hier nur die verglasten Seitenteile
        if (o.kind === 'eingang') {
          for (const [a, b] of o.side ? [[o.u0, o.u0 + o.side], [o.u1 - o.side, o.u1]] : []) s += R(...planSeg(side, a, b, -0.01, 0.37), 'g-gap') + R(...planSeg(side, a, b, 0.13, 0.19), 'g-glass');
          continue;
        }
        s += R(...planSeg(side, o.u0, o.u1, -0.01, 0.37), 'g-gap') + R(...planSeg(side, o.u0, o.u1, 0.13, 0.19), 'g-glass');
        if (o.kind === 'fenster') s += R(...planSeg(side, o.u0, o.u1, 0, 0.05), 'g-sill');
      }
    }
    if (fl === 'DG') for (const side of ['S', 'N', 'E', 'W']) {
      const F = HOUSE.fas[side], cosA = Math.cos(Math.atan(HOUSE.tan1)), o = HOUSE.ueberstand;
      for (const d of F.dormers || []) {
        const back = (d.top - HOUSE.Z.wand) / HOUSE.tan1;
        s += R(...planSeg(side, d.u0, d.u1, d.front, back), 'g-dormer', d.zwerch ? 'Zwerchhaus · volle Raumhöhe' : 'Gaube');
        // Zwerchhaus steht in der Fassadenflucht: Öffnungen gehen durch die Außenwand
        for (const w of d.win) s += d.zwerch ? R(...planSeg(side, w.u0, w.u1, -0.01, 0.37), 'g-gap') + R(...planSeg(side, w.u0, w.u1, 0.13, 0.19), 'g-glass')
          : R(...planSeg(side, w.u0, w.u1, d.front, d.front + 0.12), 'g-glass');
      }
      for (const w of F.roofWindows || []) s += R(...planSeg(side, w.u0, w.u1, w.v0 * cosA - o, w.v1 * cosA - o), 'g-skylight', 'Dachfenster in der steilen Dachfläche');
    }
    return s;
  }
  // Treppenläufe eines Geschosses (für Grundriss und 3D): Lauf 1 im Westen nach Norden, Podest, Lauf 2 im Osten zurück nach Süden.
  // Je Lauf zehn Steigungen; im EG beginnt Lauf 1 mit einer 40 cm tiefen, nach Westen ausschwingenden Antrittsstufe.
  function stairFlights(fl) {
    const [x0, x1, y0, y1] = STAIR, { spine, land, n, flare } = STAIR_SP, fw = (x1 - x0 - spine) / 2, yl = y1 - land;
    const span = { UG: [HOUSE.Z.ffbUG, HOUSE.Z.ffbEG], EG: [HOUSE.Z.ffbEG, HOUSE.Z.ffbOG], OG: [HOUSE.Z.ffbOG, HOUSE.Z.ffbDG] }[fl];
    if (!span) return null;
    const [za, zb] = span, rise = (zb - za) / (2 * n), zm = za + n * rise, big = fl === 'EG';
    const a = big ? [y0 - flare, ...Array.from({ length: n - 1 }, (_, i) => y0 + (yl - y0) * i / (n - 2))] : Array.from({ length: n }, (_, i) => y0 + (yl - y0) * i / (n - 1));
    const b = Array.from({ length: n }, (_, i) => yl - (yl - y0) * i / (n - 1));
    return { x0, x1, y0, y1, yl, fw, spine, za, zb, zm, rise, n, flare: big ? flare : 0, a, b };
  }
  function stair(fl) {
    const [x0, x1, y0, y1] = STAIR, F = stairFlights(fl) || stairFlights('OG'), { fw, spine, yl } = F;
    let s = R(x0, x1, y0, y1, 'g-stair');
    if (F.flare && fl === 'EG') s += `<path d="M${f(x0 + fw)} ${f(-F.a[0])} H${f(x0 - 0.3)} A0.2 0.2 0 0 1 ${f(x0 - 0.3)} ${f(-y0)} H${f(x0 + fw)} Z" class="g-stair" data-tip="Antrittsstufe · 40 cm tief, nach Westen ausschwingend"/>`;
    const tr = fl === 'EG' ? F.a : stairFlights('OG').a;
    for (let i = 1; i < tr.length; i++) if (tr[i] > y0 + 0.01) s += L(x0, tr[i], x0 + fw, tr[i], 'g-tread');
    for (const y of F.b.slice(1, -1)) s += L(x1 - fw, y, x1, y, 'g-tread');
    s += L(x0, yl, x1, yl, 'g-tread') + R(x0 + fw, x0 + fw + spine, y0, yl, 'g-wall', 'Massive Mittelwand der Treppe');
    // geschlossene Brüstung an der offenen Westseite (zur Halle)
    s += L(x0 + 0.06, y0 + 0.05, x0 + 0.06, y1 - 0.02, 'g-railing');
    const xa = x0 + fw / 2, xb = x1 - fw / 2, ym = yl + STAIR_SP.land / 2;
    if (fl !== 'DG') s += `<polyline points="${pts([[xa, (fl === 'EG' ? F.a[0] : y0) + 0.2], [xa, ym], [xb, ym], [xb, y0 + 0.45]])}" class="g-walk"/>` +
      `<polygon points="${pts([[xb - 0.14, y0 + 0.5], [xb + 0.14, y0 + 0.5], [xb, y0 + 0.22]])}" class="g-walkhead"/>`;
    const lbl = { UG: '↑ EG', EG: '↑ OG  ↓ UG', OG: '↑ DG  ↓ EG', DG: '↓ OG' }[fl];
    return s + T((x0 + x1) / 2 + 0.3, y1 - 0.75, lbl, 'g-stairtxt') + (fl === 'DG' ? L(x0 + 0.05, y0 + 0.08, x0 + fw, y0 + 0.08, 'g-railing') : '');
  }
  // Luftraum über der Halle (im OG): schraffiert, Geländer an der Galerie
  function voidArea() {
    const [a, b] = VOID, P = [[a[0], a[2]], [a[1], a[2]], [a[1], a[3]], [b[0], b[3]], [b[0], b[2]], [b[1], b[2]]];
    let s = `<polygon points="${pts(P)}" class="g-void" data-tip="Luftraum über der Halle · Halle zweigeschossig, 6,10 m hoch"/>`;
    s += L(a[0], a[3], a[1], a[2], 'g-thin') + L(a[0], a[2], a[1], a[3], 'g-thin');
    return s + L(a[0], a[2] - 0.06, a[1], a[2] - 0.06, 'g-railing') + T((a[0] + a[1]) / 2, -1.25, 'Luftraum', 'g-ftxt');
  }
  function lift() {
    const [x0, x1, y0, y1] = LIFT, t = 0.2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    return R(x0, x1, y0, y1, 'g-wall') + R(x0 + t, x1 - t, y0 + t, y1 - t, 'g-shaft', 'Glasaufzug in der Halle · Stahlrahmen, Glas nach drei Seiten · Kabine 1,40 × 1,60 m · UG bis DG') +
      L(x0 + t, y0 + t, x1 - t, y1 - t, 'g-thin') + L(x0 + t, y1 - t, x1 - t, y0 + t, 'g-thin') +
      R(cx - 0.55, cx + 0.55, cy - 0.7, cy + 0.7, 'g-cabin') + R(cx - 0.45, cx + 0.45, y0 - 0.02, y0 + t + 0.02, 'g-gap') + T(cx, cy - 0.08, 'Aufzug', 'g-ftxt g-lifttxt');
  }
  function tiefgarage() {
    const tg = C.tg, ph = C.poolhaus, rp = HOUSE.rampe, PL = SITE.plot, wx0 = rp.x0 - rp.wand, wx1 = rp.x1 + rp.wand, rc = (rp.x0 + rp.x1) / 2;
    const kote = v => (Math.abs(v) < 0.005 ? '±' : v > 0 ? '+' : '−') + num(Math.abs(v), 2);
    let s = `<polygon points="${pts(tg)}" class="g-tgfloor" data-tip="Tiefgarage · ${num(area2(tg))} m² · vier Stellplätze, unter der Terrasse Fahrräder und Lager"/>`;
    // Rampe: offen in der Zufahrt, dann unter dem Poolhaus bis in den Anschluss der Tiefgarage
    s += R(rp.x0, rp.x1, rp.y0, rp.y1, 'g-ramp', `Rampe · offen in der Zufahrt, dann unter dem Poolhaus · 2,80 m breit · ${num(rp.y1 - rp.y0)} m lang · oben und unten ${num(rp.s0 * 100, 0)} %, dazwischen ${num(rp.s * 100, 0)} %`);
    for (let y = rp.y0 + 1; y < rp.y1 - 0.2; y += 1) s += L(rp.x0, y, rp.x1, y, 'g-furn-l');
    s += R(wx0, rp.x0, rp.y0, rp.yTor, 'g-wall') + R(rp.x1, wx1, rp.y0, rp.yTor, 'g-wall');
    // Außenwand der Tiefgarage, zur Rampe hin offen; darüber das Poolhaus
    const i0 = tg.findIndex(p => p[0] === 22.885 && p[1] === rp.yPH);
    s += `<polyline points="${pts([...tg.slice(i0 + 1), ...tg.slice(0, i0 + 1)])}" class="g-tgwall"/>`;
    s += `<polygon points="${pts(ph)}" class="g-above" data-tip="Poolhaus darüber · lichte Höhe der Durchfahrt ca. ${num(rp.lichte, 2)} m"/>`;
    s += R(rp.x0, rp.x1, rp.yTor - 0.05, rp.yTor + 0.05, 'g-gate', 'Tor zur Tiefgarage am Fuß der Rampe') + T(rc, rp.yTor - 0.5, 'Tor', 'g-ftxt');
    s += `<polyline points="${pts([[16, -50.123], PL[2], PL[3]])}" class="g-grenze"/>` + T(17.4, -50.75, 'Grenze · Ebertstraße', 'g-ftxt');
    s += T(rc, rp.y0 - 0.45, 'Einfahrt', 'g-ftxt') + T(rc, -30.75, 'unter dem Poolhaus', 'g-ftxt');
    s += `<text x="${f(rc)}" y="41.3" class="g-ftxt" transform="rotate(-90 ${f(rc)} 41.3)">offene Rampe · ${num(rp.s * 100, 0)} %</text>`;
    for (const y of [rp.y0, rp.yPortal, rp.y1]) s += T(wx0 - 0.75, y - 0.08, kote(rp.z(y)), 'g-ftxt');
    for (const y of [-36.9, -21.4]) s += `<polygon points="${pts([[rc - 0.35, y], [rc + 0.35, y], [rc, y + 0.9]])}" class="g-walkhead"/>`;
    // Vier Stellplätze 2,70 × 5,20 m an der 6 m breiten Fahrgasse, die Autos mit der Front zur Holzwand; nördlich davon der Gang zur Schleuse
    const G = HOUSE.tg;
    for (let i = 0; i <= 4; i++) s += L(G.x0, G.y0 + G.bucht * i, G.x1, G.y0 + G.bucht * i, 'g-park');
    G.autos.forEach((c, i) => {
      const cy = G.mitte(i), x0 = G.x0 + 0.05;
      s += `<rect x="${f(x0)}" y="${f(-cy - c.W / 2)}" width="${f(c.L)}" height="${f(c.W)}" rx="0.35" class="g-car" data-tip="${c.name} · ${num(c.L, 2)} × ${num(c.W, 2)} m"/>` +
        L(x0 + c.L * 0.3, cy - c.W / 2 + 0.12, x0 + c.L * 0.3, cy + c.W / 2 - 0.12, 'g-furn-l') + L(x0 + c.L * 0.72, cy - c.W / 2 + 0.12, x0 + c.L * 0.72, cy + c.W / 2 - 0.12, 'g-furn-l') +
        T(x0 + c.L / 2, cy - 0.1, c.name.replace(/^(Ferrari|Porsche|VW|Mercedes) /, ''), 'g-ftxt') + T(G.x1 + 0.55, cy - 0.1, `P${i + 1}`, 'g-ftxt');
    });
    for (let x = 5.2; x < 11.0; x += 0.65) s += L(x, -12.0, x, -13.7, 'g-furn-l');
    s += T(8.0, -14.2, 'Fahrräder · Lager', 'g-ftxt') + T(14.7, -12.45, 'Gang zur Schleuse', 'g-ftxt') + T(20.2, -18.2, 'Fahrgasse 6,00 m', 'g-ftxt');
    s += T(20.2, -15.0, 'Tiefgarage', 'g-roomtxt') + T(20.2, -15.7, `${num(area2(tg))} m² · lichte Höhe ${num(G.lichte, 2)} m`, 'g-areatxt');
    return s;
  }
  function context(fl) {
    const t = HOUSE.terrasse, b = HOUSE.balkon, fz = HOUSE.freisitz, p = HOUSE.podest;
    const sq = (x, y, w, tip) => R(x - w / 2, x + w / 2, y - w / 2, y + w / 2, 'g-col', tip);
    const pk = HOUSE.fas.N.portikus, bd = HOUSE.balkonDG;
    const rails = B => L(B.x0 + 0.06, B.y0 + 0.06, B.x1 - 0.06, B.y0 + 0.06, 'g-railing') + L(B.x0 + 0.06, B.y0 + 0.06, B.x0 + 0.06, B.y1, 'g-railing') + L(B.x1 - 0.06, B.y0 + 0.06, B.x1 - 0.06, B.y1, 'g-railing');
    if (fl === 'EG') return `<polygon points="${pts(t.poly)}" class="g-outside" data-tip="Terrasse · durchgehend 19,00 × 4,00 m bis an den Freisitz · Naturstein · Lounge unter dem Balkon, Liegen"/>` +
      R(t.stufe[0], t.stufe[1], t.y0 - 0.35, t.y0, 'g-outside', 'Stufe zum Weg an den Pool') + L(t.stufe[0], t.y0, t.stufe[1], t.y0, 'g-tread') +
      b.cols.map(x => sq(x, b.colY, b.colW, 'Pfeiler · 40 × 40 cm')).join('') +
      R(fz.x0, fz.x1, fz.y0, fz.y1, 'g-outside', 'Freisitz · 3,00 × 5,00 m · überdacht, Esstisch') + sq(fz.x1 - 0.175, fz.y0 + 0.175, 0.35) + sq(fz.x1 - 0.175, fz.y1 - 0.175, 0.35) +
      R(p.x0, p.x1, p.y0, p.y1, 'g-outside', 'Podest am Eingang') + R(W - pk.u1, W - pk.u0, 0, pk.depth, 'g-above', 'Portikus über dem Eingang') +
      pk.pillars.map(u => sq(W - u, pk.py, pk.pw, 'Pfeiler des Portikus')).join('') + T(8, -15.25, 'Terrasse', 'g-ftxt') + T(17.5, -6.25, 'Freisitz', 'g-ftxt') + T(8, 0.4, 'Eingang', 'g-ftxt');
    if (fl === 'OG') return R(b.x0, b.x1, b.y0, b.y1, 'g-outside', 'Balkon · 7,00 × 3,00 m') + rails(b) + T(8, -14.3, 'Balkon', 'g-ftxt') +
      bd.cols.map(x => sq(x, bd.colY, bd.colW, 'Pfeiler · 34 × 34 cm · trägt den Balkon im DG')).join('') +
      R(fz.x0, fz.x1, fz.y0, fz.y1, 'g-outside', 'Dachterrasse auf dem Freisitz · 3,00 × 5,00 m') + T(17.5, -8.4, 'Dachterrasse', 'g-ftxt');
    if (fl === 'DG') return R(bd.x0, bd.x1, bd.y0, bd.y1, 'g-outside', 'Balkon vor dem Büro · 7,00 × 1,00 m · tritt nach vorne, auf zwei Pfeilern') + rails(bd) +
      bd.cols.map(x => sq(x, bd.colY, bd.colW)).join('') + T(9.6, -12.25, 'Balkon', 'g-ftxt');
    return '';
  }
  function heightLines() {
    let s = '';
    const zs = ZWERCH.find(z => z[2] === -D), zn = ZWERCH.find(z => z[3] === 0), t = HOUSE.wall;
    for (const [h, lbl] of [[1, '1,00 m'], [2, '2,00 m']]) {
      const [x0, x1, y0, y1] = inset(sAt(h));
      // Linie springt an den Zwerchhäusern bis an die Außenwand zurück
      const P = [[x0, y0], ...(zs ? [[zs[0], y0], [zs[0], -D + t], [zs[1], -D + t], [zs[1], y0]] : []), [x1, y0], [x1, y1],
        ...(zn ? [[zn[1], y1], [zn[1], -t], [zn[0], -t], [zn[0], y1]] : []), [x0, y1], [x0, y0]];
      s += `<polyline points="${pts(P)}" class="g-hline"/>` + T(x0 + 0.15, y0 + 0.08, `lichte Höhe ${lbl}`, 'g-htxt');
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
    s += stair(fl) + lift() + (fl === 'OG' ? voidArea() : '');
    if (opt.flaechen) for (const rm of F.rooms) {
      const { a, wf } = roomArea(fl, rm), at = rm.at || [(rm.r[0] + rm.r[1]) / 2, (rm.r[2] + rm.r[3]) / 2];
      const sm = rm.r[1] - rm.r[0] < 2.6 ? ' g-sm' : '';
      const txt = fl === 'DG' && rm.wf !== 0 && Math.abs(wf - a) > 0.2 ? `${num(a)} m² · WoFl. ${num(wf)}` : `${num(a)} m²`;
      s += T(at[0], at[1] + 0.12, rm.n, `g-roomtxt${sm}`) + T(at[0], at[1] - (sm ? 0.32 : 0.42), txt, `g-areatxt${sm}`);
    }
    // Außenmaße und Nordpfeil
    // Im UG liegt südlich des Hauses die Tiefgarage, dort steht die Breite an der Nordseite
    const dy = fl === 'UG' ? 0.9 : -D - 0.9;
    s += `<g class="g-dims">${L(0, dy, W, dy, 'g-dim')}${L(-0.9, -D, -0.9, 0, 'g-dim')}${T(W / 2, dy + 0.15, '16,00', 'g-dimtxt')}` +
      `<text x="-0.75" y="${f(D / 2)}" class="g-dimtxt" transform="rotate(-90 -0.75 ${f(D / 2)})">11,65</text></g>`;
    const na = (rot => { const a = rot * Math.PI / 180, c = [-1.6, 1.9], Rt = p => [c[0] + p[0] * Math.cos(a) - p[1] * Math.sin(a), c[1] + p[0] * Math.sin(a) + p[1] * Math.cos(a)]; return `<polygon points="${pts([[0, 0.9], [0.32, -0.55], [-0.32, -0.55]].map(Rt))}" class="g-north"/>` + T(...Rt([0, 1.35]), 'N', 'g-ntxt'); })(SITE.north.grid);
    s += na;
    const vb = fl === 'UG' ? [-2.6, -2.2, 28.6, 53.8] : [-2.6, -1.6, 22.2, 17.2];
    return { svg: s, vb };
  }
  function table(fl) {
    const rows = FL[fl].rooms.map(rm => ({ n: rm.n, ...roomArea(fl, rm) }));
    return { rows, sum: rows.reduce((t, r) => t + r.a, 0), wf: rows.reduce((t, r) => t + r.wf, 0) };
  }
  // Möbel als Daten für das 3D-Modell: dieselben Aufrufe wie im Grundriss, nur mitgeschrieben statt gezeichnet
  function items(fl) {
    const out = [], saved = { ...fu };
    for (const k of Object.keys(fu)) fu[k] = (...a) => { out.push({ t: k, a }); return ''; };
    try { FL[fl].furn(); } finally { Object.assign(fu, saved); }
    return out;
  }
  function wohnflaeche() {
    const part = ['EG', 'OG', 'DG'].map(fl => table(fl).wf);
    const B = HOUSE.balkon, BD = HOUSE.balkonDG;
    const aussen = 0.25 * (area([B.x0, B.x1, B.y0, B.y1]) + 15.0 + area([BD.x0, BD.x1, BD.y0, BD.y1]));
    return { eg: part[0], og: part[1], dg: part[2], aussen, sum: part[0] + part[1] + part[2] + aussen };
  }
  return { render, table, wohnflaeche, items, FL, num, CORE: { STAIR, LIFT, VOID }, stairFlights };
})();
