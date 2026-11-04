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
  // Treppenhalle (Daniel, 4.11.2026: „so, dass man beim Reinkommen auf sie zuschaut, nicht so zick zack“): eine gerade, 1,30 m
  // breite Treppenbahn an der Rückwand der Halle (LINE). Kellertreppe UG→EG, Haupttreppe EG→OG und Dachtreppe OG→DG sind je ein
  // gerader Lauf, steigen nach Westen und liegen genau übereinander, je ein Geschoss versetzt (Kopfhöhe überall über 2,9 m).
  // Antritt im Osten, Austritt im Westen auf das Podest vor dem Aufzug. Der Aufzug sitzt im Wandblock westlich davon, Türen nach Osten.
  const LINE = [4.72, 11.68, -4.88, -3.58];
  const FLIGHTS = {
    UG: { x0: 10.69, x1: 6.01, n: 19, za: HOUSE.Z.ffbUG, zb: HOUSE.Z.ffbEG },   // 19 Steigungen à 18,9 cm, Auftritt 26 cm
    EG: { x0: 10.6, x1: 6.01, n: 18, za: HOUSE.Z.ffbEG, zb: HOUSE.Z.ffbOG },    // 18 à 18,6 cm, Auftritt 27 cm
    OG: { x0: 10.6, x1: 6.28, n: 17, za: HOUSE.Z.ffbOG, zb: HOUSE.Z.ffbDG },    // 17 à 18,2 cm, Auftritt 27 cm
  };
  // Deckenöffnung über einem Lauf: so weit, wie man unter der Decke sonst keine 2,00 m Kopfhöhe hätte
  const holeOver = (fl, under) => { const F = FLIGHTS[fl]; return [F.x1, F.x0 - (under - 2 - F.za) / (F.zb - F.za) * (F.x0 - F.x1), LINE[2], LINE[3]]; };
  const HOLES = { EG: holeOver('UG', HOUSE.Z.ffbEG - 0.35), OG: holeOver('EG', HOUSE.Z.gurtU), DG: holeOver('OG', HOUSE.Z.deckeDG) };
  const LIFT = [2.92, 4.72, -4.88, -3.08];
  // Luftraum über dem vorderen Teil der Halle, im OG mit Geländer an der Treppe
  const VOID = [[6.25, 11.68, -3.58, -0.36]];
  // Fläche eines Raums ohne Treppe, Aufzug und (im OG) Luftraum, soweit sie darin liegen
  const cutA = (a, b) => Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[2], b[2]));
  const STAIRUSE = { UG: [FLIGHTS.UG.x1, FLIGHTS.UG.x0, LINE[2], LINE[3]], EG: [FLIGHTS.EG.x1, FLIGHTS.EG.x0, LINE[2], LINE[3]],
    OG: [FLIGHTS.EG.x1, FLIGHTS.OG.x0, LINE[2], LINE[3]], DG: HOLES.DG };
  const coreIn = (fl, r) => cutA(r, STAIRUSE[fl]) + cutA(r, LIFT) + (fl === 'OG' ? VOID.reduce((t, v) => t + cutA(r, v), 0) : 0);

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
        // Gym im Westen mit Sportboden und Lichthof davor (Daniel, 4.11.2026)
        { n: 'Gym', r: [0.36, 6.48, -11.29, -6.56], ext: [[0.36, 4.48, -6.56, -5.12]], at: [3.0, -8.9] },
        // Zugang von der Tiefgarage mittig, wo früher die Fahrräder standen: Foyer, Flur und Treppenbahn
        { n: 'Foyer', r: [6.72, 9.28, -11.29, -6.32], ext: [[4.72, 11.68, -6.32, -5.12], LINE], core: true, at: [8.0, -8.9] },
        { n: 'Ruheraum', r: [9.52, 15.64, -8.26, -6.56], ext: [[11.92, 15.64, -6.56, -5.12]], at: [12.6, -7.0] },
        { n: 'Sauna', r: [9.52, 12.2, -11.29, -8.5], at: [10.86, -9.9] }, { n: 'Dusche / WC', r: [12.44, 15.64, -11.29, -8.5], at: [13.9, -9.9] },
        { n: 'Technik', r: [11.92, 15.64, -4.88, -0.36], at: [13.8, -2.6] },
        // Waschen und ein richtiger Abstellraum nebeneinander (Hauswirtschaft); der Aufzug sitzt im Wandblock daneben
        { n: 'Waschen', r: [0.36, 4.48, -2.84, -0.36], ext: [[0.36, 2.68, -4.88, -2.84]], at: [2.3, -1.6] },
        { n: 'Abstellraum', r: [4.72, 11.68, -3.34, -0.36], at: [8.2, -1.85] },
      ],
      // Durchgänge vom Flur zur Treppenbahn: im Westen zum Aufzug und Abstellraum, im Osten zum Antritt der Kellertreppe
      open: [[4.72, FLIGHTS.UG.x1, -5.12, -4.88], [FLIGHTS.UG.x0, 11.68, -5.12, -4.88]],
      doors: [
        { x: 7.3, y: -11.47, w: 0.7, o: 'h', s: 1, h: 0, t: 0.5 }, { x: 8.0, y: -11.47, w: 0.7, o: 'h', s: 1, h: 1, t: 0.5 },
        { x: 6.6, y: -8.0, w: 0.9, o: 'v', s: -1, h: 0 }, { x: 11.8, y: -6.2, w: 0.85, o: 'v', s: 1, h: 0 },
        { x: 10.4, y: -8.38, w: 0.7, o: 'h', s: -1, h: 0 }, { x: 13.4, y: -8.38, w: 0.8, o: 'h', s: -1, h: 0 },
        { x: 11.8, y: -4.8, w: 0.85, o: 'v', s: 1, h: 0 }, { x: 4.85, y: -3.46, w: 0.8, o: 'h', s: 1, h: 0 },
        { x: 4.6, y: -2.6, w: 0.85, o: 'v', s: -1, h: 0 },
      ],
      furn: () => [
        fu.box(0.9, 1.7, -10.9, -9.0, 'Laufband'), fu.box(2.3, 3.1, -10.9, -9.3, 'Rad'), fu.box(3.9, 6.1, -10.9, -9.8, 'Matte'),
        fu.box(1.0, 2.8, -6.9, -5.6, 'Kraftstation'),
        fu.box(6.72, 7.17, -10.5, -8.6, 'Bank'), fu.shelf(8.68, 9.28, -10.7, -7.2),
        fu.box(9.52, 12.2, -11.29, -10.69, '', 'saunabank'), fu.box(9.52, 10.12, -10.69, -8.9, '', 'saunabank'), fu.box(11.4, 11.9, -9.2, -8.7, 'Ofen'),
        fu.shower(14.44, 15.64, -11.29, -10.09), fu.wc(15.64, -9.3, 'E'), fu.basin(13.2, -11.29, 0.6, 'S'),
        fu.box(9.9, 11.5, -7.9, -7.2, 'Liege'), fu.box(12.0, 13.6, -7.9, -7.2, 'Liege'), fu.shelf(15.04, 15.64, -8.0, -5.5),
        fu.box(12.2, 13.8, -1.5, -0.6, 'Wärmepumpe'), Ci(14.8, -1.25, 0.5, 'g-furn'), T(14.8, -1.33, 'Speicher', 'g-ftxt'), fu.box(12.2, 13.4, -3.6, -2.8, 'Anschluss'),
        fu.box(0.6, 1.2, -1.0, -0.4, 'WM'), fu.box(1.3, 1.9, -1.0, -0.4, 'TR'), fu.box(2.1, 3.3, -0.96, -0.4, 'Spüle', 'spuelzeile'), fu.shelf(0.36, 0.86, -4.6, -2.2),
        fu.shelf(5.0, 11.4, -0.96, -0.36), fu.shelf(9.2, 11.68, -3.34, -2.74),
      ],
    },
    EG: {
      titel: 'Erdgeschoss', ffb: HOUSE.Z.ffbEG,
      rooms: [
        { n: 'Wohnen', r: [0.36, 6.48, -11.29, -5.12] }, { n: 'Essen', r: [6.72, 11.28, -11.29, -5.12], at: [9.0, -10.6] },
        // Küche L-förmig: 1 m weiter nach Norden, dafür ist die Backkitchen kleiner (Daniel, 4.11.2026)
        { n: 'Küche', r: [11.52, 15.64, -11.29, -5.12], ext: [[11.92, 15.64, -5.12, -4.12]], at: [13.6, -10.4] },
        // Halle mit der Treppenbahn an der Rückwand: beim Hereinkommen steigt die Haupttreppe quer vor einem auf
        { n: 'Halle', r: [4.72, 11.68, -4.88, -0.36], core: true, at: [7.6, -2.2] },
        // Gäste-WC dort, wo früher der kleine Abstellraum war; an der alten WC-Stelle sitzt jetzt der Aufzug
        { n: 'Garderobe', r: [0.36, 4.48, -2.84, -0.36], at: [2.4, -1.65] }, { n: 'Gäste-WC', r: [0.36, 2.68, -4.88, -3.08], at: [1.52, -3.98] },
        { n: 'Backkitchen', r: [11.92, 15.64, -3.88, -0.36], at: [13.75, -1.65] },
      ],
      open: [[6.48, 6.72, -10.4, -5.9], [11.28, 11.52, -10.4, -6.2]],
      doors: [
        { x: 4.6, y: -1.85, w: 0.9, o: 'v', s: -1, h: 1 }, { x: 1.1, y: -2.96, w: 0.8, o: 'h', s: -1, h: 0 },
        { x: 11.8, y: -4.84, w: 0.7, o: 'v', s: 1, h: 0 }, { x: 12.3, y: -4.0, w: 0.9, o: 'h', s: 1, h: 1 },
        // vom Podest unter dem Treppenaustritt ins Wohnzimmer
        { x: 4.95, y: -5.0, w: 0.9, o: 'h', s: -1, h: 0 },
        { x: 7.35, y: -0.18, w: 1.3, o: 'h', s: -1, h: 0, t: 0.5 },
      ],
      furn: () => [
        fu.box(0.36, 0.86, -8.2, -6.95, 'Kamin'), fu.sofa(2.9, 3.85, -8.9, -6.3, 'E'), fu.box(1.45, 2.35, -8.15, -7.05, '', 'couchtisch'),
        fu.box(1.25, 2.05, -9.55, -8.75, '', 'sessel-S'), fu.box(1.25, 2.05, -6.45, -5.65, '', 'sessel-N'),
        fu.table(8.47, 9.53, -9.5, -6.9, 3),
        fu.box(13.3, 15.64, -4.77, -4.12, '', 'zeile'), fu.box(14.99, 15.64, -6.15, -4.77, '', 'zeile'), fu.hob(14.3, -4.45),
        fu.box(12.6, 14.6, -7.2, -6.2, 'Insel'),
        // kleiner Esstisch für vier vor den Gartentüren der Küche
        fu.table(12.75, 13.95, -10.45, -9.65, 2, false),
        fu.shelf(1.8, 3.1, -2.84, -2.24), fu.box(3.95, 4.48, -2.8, -2.05, 'Bank'),
        fu.wc(1.6, -4.88, 'S'), fu.basin(0.36, -3.7, 0.45, 'W'),
        fu.box(12.2, 15.64, -1.0, -0.36, '', 'zeile'), fu.box(12.8, 13.6, -0.95, -0.42, 'Spüle'), fu.box(15.0, 15.64, -3.6, -1.0, '', 'hochschrank'),
        fu.shelf(11.92, 12.5, -3.85, -1.4), fu.box(13.2, 14.6, -2.9, -2.1, 'Arbeitsfläche'),
        // Halle: Konsole mit Spiegel an der Nordwand neben dem Eingang, Garderobenschrank für Gäste in der Nordostecke
        fu.box(5.0, 6.4, -0.76, -0.36, '', 'konsole'), fu.box(11.08, 11.68, -2.9, -0.36, '', 'hochschrank'),
        // draußen: Lounge mittig unter dem Balkon (Blick in den Garten, vor der Fassade bleibt ein Gang), Esstisch auf dem Freisitz;
        // Liegen stehen am Pool, nicht am Haus
        fu.sofa(6.8, 9.2, -13.95, -13.1, 'N'), fu.box(7.4, 8.6, -14.85, -14.35, '', 'couchtisch'),
        fu.box(5.75, 6.55, -14.85, -14.05, '', 'sessel-W'), fu.box(9.45, 10.25, -14.85, -14.05, '', 'sessel-E'),
        fu.table(17.05, 17.95, -9.3, -7.3, 3),
      ],
    },
    OG: {
      titel: 'Obergeschoss', ffb: HOUSE.Z.ffbOG,
      rooms: [
        // vier größere Kinderzimmer (Daniel, 4.11.2026: kein Wohnzimmer im OG) und zwei Bäder mit Wanne, die sich je zwei Kinder teilen
        { n: 'Kind 1', r: [0.36, 4.48, -11.29, -7.24], ext: [[4.72, 6.48, -11.29, -6.56]], at: [2.5, -9.7] },
        { n: 'Bad West', r: [0.36, 4.48, -7.0, -5.12], at: [2.4, -6.06] },
        { n: 'Kind 2', r: [0.36, 6.01, -2.84, -0.36], ext: [[0.36, 2.68, -4.88, -2.84], [4.72, 6.01, -3.34, -2.84]], at: [3.4, -1.75] },
        { n: 'Kind 3', r: [11.52, 15.64, -11.29, -7.24], ext: [[9.52, 11.28, -11.29, -6.56]], at: [13.5, -9.7] },
        { n: 'Bad Ost', r: [11.52, 15.64, -7.0, -5.12], at: [13.6, -6.06] },
        { n: 'Kind 4', r: [11.92, 15.64, -4.88, -0.36], at: [13.8, -2.4] },
        // Flur mit Treppenbahn: die Haupttreppe kommt im Westen an, die Dachtreppe beginnt im Osten; Mittelgang bis zur Balkontür
        { n: 'Flur', r: [4.72, 11.28, -6.32, -5.12], ext: [[6.72, 9.28, -11.29, -6.32], LINE], core: true, at: [8.0, -9.2] },
      ],
      open: [...VOID, [4.72, FLIGHTS.EG.x1, -5.12, -4.88], [FLIGHTS.OG.x0, 11.28, -5.12, -4.88]],
      doors: [
        { x: 5.2, y: -6.44, w: 0.85, o: 'h', s: -1, h: 0 }, { x: 4.6, y: -6.2, w: 0.75, o: 'v', s: -1, h: 0 },
        { x: 4.9, y: -3.46, w: 0.8, o: 'h', s: 1, h: 0 }, { x: 10.0, y: -6.44, w: 0.85, o: 'h', s: -1, h: 1 },
        { x: 11.4, y: -6.2, w: 0.75, o: 'v', s: 1, h: 0 }, { x: 11.8, y: -4.8, w: 0.8, o: 'v', s: 1, h: 0 },
      ],
      furn: () => [
        fu.bed(1.0, 2.4, -9.24, -7.24, 'N'), fu.desk(2.7, 4.1, -11.29, -10.6, 'N'), fu.shelf(3.0, 4.48, -7.84, -7.24), fu.shelf(4.72, 5.32, -11.0, -8.6),
        fu.tub(0.5, 2.2, -7.0, -6.25), fu.basin(3.0, -5.12, 1.2, 'N'), fu.wc(4.48, -6.65, 'E'),
        fu.bed(0.5, 2.5, -4.78, -3.38, 'W'), fu.desk(2.8, 4.2, -1.06, -0.36, 'S'), fu.shelf(5.41, 6.01, -2.8, -0.6),
        fu.bed(13.64, 15.04, -9.24, -7.24, 'N'), fu.desk(11.92, 13.32, -11.29, -10.6, 'N'), fu.shelf(11.52, 13.0, -7.84, -7.24), fu.shelf(10.68, 11.28, -11.0, -8.6),
        fu.tub(13.8, 15.5, -7.0, -6.25), fu.basin(12.8, -5.12, 1.2, 'N'), fu.wc(11.52, -6.65, 'W'),
        fu.bed(13.9, 15.3, -4.88, -2.88, 'S'), fu.desk(12.2, 13.6, -1.06, -0.36, 'S'), fu.shelf(11.92, 12.52, -4.2, -1.6),
        fu.box(6.72, 7.17, -10.6, -8.6, 'Bank'),
        // draußen auf dem Balkon über der Terrasse
        fu.table(7.4, 8.6, -13.6, -12.9, 1, false),
      ],
    },
    DG: {
      titel: 'Dachgeschoss', ffb: HOUSE.Z.ffbDG,
      rooms: [
        // Büro vorne mittig im Zwerchhaus mit Balkon (Daniel, 4.11.2026); Elternbereich im Westen, en suite: Flur → Schlafzimmer → Ankleide → Bad
        { n: 'Büro', r: [4.72, 11.28, -11.29, -6.56], at: [8.0, -10.4] },
        { n: 'Flur', r: [4.72, 11.28, -6.32, -5.12], ext: [LINE], core: true, at: [8.0, -5.72] },
        { n: 'Schlafzimmer', r: [0.36, 4.48, -11.29, -5.12], at: [2.4, -9.9] },
        { n: 'Ankleide', r: [0.36, 4.48, -2.84, -0.36], ext: [[0.36, 2.68, -4.88, -2.84]], at: [2.6, -1.75] },
        { n: 'Bad', r: [4.72, 9.28, -3.34, -0.36], at: [6.9, -2.1] },
        // die Ostseite ist frei geworden: Gästezimmer und Abstellraum
        { n: 'Gäste', r: [11.52, 15.64, -11.29, -5.12], at: [13.6, -9.9] },
        { n: 'Abstellraum', r: [11.92, 15.64, -4.88, -0.36], ext: [[9.52, 11.92, -3.34, -0.36]], wf: 0, at: [13.8, -2.6] },
      ],
      open: [[4.72, FLIGHTS.OG.x1, -5.12, -4.88], [HOLES.DG[1], 11.28, -5.12, -4.88]],
      doors: [
        { x: 7.6, y: -6.44, w: 0.9, o: 'h', s: -1, h: 0 }, { x: 4.6, y: -6.2, w: 0.85, o: 'v', s: -1, h: 0 },
        { x: 1.0, y: -5.0, w: 0.8, o: 'h', s: 1, h: 0 }, { x: 4.6, y: -1.2, w: 0.8, o: 'v', s: 1, h: 0 },
        { x: 11.4, y: -6.2, w: 0.85, o: 'v', s: 1, h: 0 }, { x: 11.8, y: -4.8, w: 0.8, o: 'v', s: 1, h: 0 },
      ],
      furn: () => [
        fu.desk(7.2, 8.8, -9.3, -8.5, 'N'), fu.shelf(4.72, 5.22, -10.15, -8.0), fu.box(10.1, 10.9, -10.15, -9.35, '', 'sessel-E'), fu.shelf(9.8, 11.28, -7.06, -6.56),
        fu.bed(2.38, 4.48, -9.1, -7.3, 'E'), fu.box(4.0, 4.48, -7.3, -6.82, '', 'nacht'), fu.box(4.0, 4.48, -9.58, -9.1, '', 'nacht'),
        fu.box(1.6, 3.2, -11.0, -10.5, '', 'kommode'), fu.box(1.2, 2.0, -6.6, -5.8, '', 'sessel-W'),
        fu.shelf(1.0, 4.4, -1.6, -1.1), fu.shelf(2.0, 4.48, -2.84, -2.34), fu.shelf(0.9, 1.5, -4.8, -2.9),
        fu.tub(6.6, 8.4, -1.2, -0.45), fu.shower(4.72, 5.92, -3.34, -2.14), fu.basin(9.28, -2.0, 1.4, 'E'), fu.wc(7.0, -3.34, 'S'),
        fu.bed(12.6, 14.4, -8.7, -6.7, 'N'), fu.desk(13.9, 15.3, -11.29, -10.6, 'N'), fu.shelf(11.52, 12.02, -10.6, -8.8),
        fu.shelf(12.2, 15.4, -1.6, -1.1), fu.shelf(9.52, 11.6, -3.34, -2.84),
        // draußen auf dem Balkon vor dem Büro, neben der Tür
        fu.table(9.15, 9.55, -12.45, -11.85, 1, false),
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
    // ext: weitere Rechtecke desselben Raums (L-förmige Räume, z. B. die Küche); Treppe, Aufzug und Luftraum zählen bei core nicht
    const rs = [rm.r, ...(rm.ext || [])], core = q => (rm.core ? coreIn(fl, q) : 0);
    const a = rs.reduce((t, q) => t + area(q) - core(q), 0);
    if (fl !== 'DG') return { a, wf: fl === 'UG' ? 0 : (rm.wf ?? 1) * a };
    // Wohnfläche nach WoFlV: unter 1 m lichter Höhe 0 %, 1–2 m 50 %, ab 2 m 100 %; Zwerchhäuser zählen voll, Gauben nicht (eher zu niedrig)
    const wf = rs.reduce((t, q) => { const full = tall(q, inset(sAt(2))), half = tall(q, inset(sAt(1))) - full; return t + full - core(q) + 0.5 * half; }, 0);
    return { a, wf: (rm.wf ?? 1) * wf };
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
    if (fl === 'UG') {
      // Lichthof vor dem Gym: große Fenster bis zum Boden in der Westwand
      const LH = HOUSE.lichthof;
      s += R(...planSeg(LH.side, LH.u0, LH.u1, -LH.tief, 0), 'g-outside', `Lichthof vor dem Gym · ${num(LH.u1 - LH.u0, 2)} × ${num(LH.tief, 2)} m, bis zum UG-Boden, Steinbelag, oben Geländer`);
      for (const [a, b] of LH.win) s += R(...planSeg(LH.side, a, b, -0.01, 0.37), 'g-gap') + R(...planSeg(LH.side, a, b, 0.13, 0.19), 'g-glass');
    }
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
  // Treppenbahn eines Geschosses: der Lauf nach oben mit Stufen und Laufpfeil (Antritt im Osten, Austritt im Westen); im EG eine
  // breitere, zur Halle ausschwingende Antrittsstufe; im DG die Öffnung über dem heraufkommenden Lauf mit Geländer
  const TREPPE = { UG: 'Kellertreppe', EG: 'Haupttreppe', OG: 'Treppe ins DG' };
  function stair(fl) {
    const ly0 = LINE[2], ly1 = LINE[3], ym = (ly0 + ly1) / 2, up = FLIGHTS[fl];
    let s = '';
    if (up) {
      const g = (up.x0 - up.x1) / (up.n - 1), h = (up.zb - up.za) / up.n;
      s += R(up.x1, up.x0, ly0, ly1, 'g-stair', `${TREPPE[fl]} · gerade, 1,30 m breit · ${up.n} Steigungen à ${num(h * 100)} cm, Auftritt ${num(g * 100, 0)} cm`);
      for (let i = 1; i < up.n - 1; i++) s += L(up.x1 + i * g, ly0, up.x1 + i * g, ly1, 'g-tread');
      if (fl === 'EG') s += `<path d="M${f(up.x0)} ${f(-ly0)} V${f(-(ly1 + 0.2))} A0.2 0.2 0 0 0 ${f(up.x0 - 0.2)} ${f(-(ly1 + 0.4))} H${f(up.x0 - g)} V${f(-ly1)} H${f(up.x0)} Z" class="g-stair" data-tip="Antrittsstufe · zur Halle hin 40 cm breiter, gerundet"/>`;
      // geschlossene Brüstung an der Nordseite (zur Halle bzw. zum Luftraum)
      s += L(up.x1, ly1 + 0.04, up.x0, ly1 + 0.04, 'g-railing');
      s += `<polyline points="${pts([[up.x0 - 0.15, ym], [up.x1 + 0.5, ym]])}" class="g-walk"/>` +
        `<polygon points="${pts([[up.x1 + 0.55, ym + 0.14], [up.x1 + 0.55, ym - 0.14], [up.x1 + 0.27, ym]])}" class="g-walkhead"/>`;
    } else {
      const [h0, h1] = HOLES[fl], F = FLIGHTS.OG, g = (F.x0 - F.x1) / (F.n - 1);
      s += R(h0, h1, ly0, ly1, 'g-void', 'Öffnung über der Treppe aus dem OG');
      for (let i = 1; F.x1 + i * g < h1; i++) s += L(F.x1 + i * g, ly0, F.x1 + i * g, ly1, 'g-tread');
      s += L(h1 + 0.03, ly0, h1 + 0.03, ly1, 'g-railing');
    }
    // Beschriftung: aufwärts auf dem Lauf, abwärts am Podest im Westen, wo der Lauf von unten ankommt
    const [hoch, runter] = { UG: ['↑ EG', ''], EG: ['↑ OG', '↓ UG'], OG: ['↑ DG', '↓ EG'], DG: ['', '↓ OG'] }[fl];
    if (hoch) s += T((up.x1 + up.x0) / 2, ym + 0.3, hoch, 'g-stairtxt');
    if (runter) s += T((LINE[0] + FLIGHTS.EG.x1) / 2 + 0.05, ym - 0.08, runter, 'g-stairtxt');
    return s;
  }
  // Luftraum über der Halle (im OG): schraffiert; Geländer am Antritt der Dachtreppe
  function voidArea() {
    const [a] = VOID;
    let s = R(a[0], a[1], a[2], a[3], 'g-void', 'Luftraum über der Halle · zweigeschossig, 6,10 m hoch, mit dem Fenster über der Haustür');
    s += L(a[0], a[3], a[1], a[2], 'g-thin') + L(a[0], a[2], a[1], a[3], 'g-thin');
    return s + L(FLIGHTS.OG.x0, a[2] - 0.04, a[1], a[2] - 0.04, 'g-railing') + T((a[0] + a[1]) / 2, -1.25, 'Luftraum', 'g-ftxt');
  }
  // Aufzug im Wandblock westlich der Treppenbahn, Tür nach Osten auf das Podest
  function lift() {
    const [x0, x1, y0, y1] = LIFT, t = 0.2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, dy = -4.2;
    return R(x0, x1, y0, y1, 'g-wall') + R(x0 + t, x1 - t, y0 + t, y1 - t, 'g-shaft', 'Personenaufzug · Kabine 1,10 × 1,40 m · UG bis DG · im Wandblock am Treppenpodest, wandbündige Türen nach Osten') +
      L(x0 + t, y0 + t, x1 - t, y1 - t, 'g-thin') + L(x0 + t, y1 - t, x1 - t, y0 + t, 'g-thin') +
      R(cx - 0.55, cx + 0.55, cy - 0.7, cy + 0.7, 'g-cabin') + R(x1 - t - 0.02, x1 + 0.02, dy - 0.45, dy + 0.45, 'g-gap') + T(cx, cy - 0.08, 'Aufzug', 'g-ftxt g-lifttxt');
  }
  function tiefgarage() {
    const tg = C.tg, ph = C.poolhaus, rp = HOUSE.rampe, PL = SITE.plot, wx0 = rp.x0 - rp.wand, wx1 = rp.x1 + rp.wand, rc = (rp.x0 + rp.x1) / 2;
    const kote = v => (Math.abs(v) < 0.005 ? '±' : v > 0 ? '+' : '−') + num(Math.abs(v), 2);
    const pct = v => num(v * 100, Math.round(v * 1000) % 10 ? 1 : 0), gr = rp.grenze;
    let s = `<polygon points="${pts(tg)}" class="g-tgfloor" data-tip="Tiefgarage · ${num(area2(tg))} m² · drei Stellplätze, mittig unter der Terrasse der Eingangsbereich zum Haus, östlich daneben die Fahrräder"/>`;
    // Vorplatz ab der Grenze bis zur Rinne, dann die Rampe: offen in der Zufahrt, unter dem Poolhaus bis in den Anschluss der Tiefgarage (GaStellV § 3)
    s += `<polygon points="${pts(rp.vorplatz)}" class="g-ramp" data-tip="Vorplatz · ${num(rp.vor.l, 2)} m ab der Grenze (Westkante, an der Ostkante ${num(rp.y0 - gr(rp.x1), 2)} m) mit ${pct(rp.vor.s)} % bis zur Rinne"/>`;
    s += R(rp.x0, rp.x1, rp.y0, rp.y1, 'g-ramp', `Rampe · offen in der Zufahrt, dann unter dem Poolhaus · 2,80 m breit · ${num(rp.lm, 2)} m mit ${pct(rp.s)} %, unten ${num(rp.unten.l, 2)} m mit ${pct(rp.unten.s)} %, dann ${num(rp.eben, 2)} m eben bis zum Tor`);
    for (let y = rp.y0 + 1; y < rp.y1 - 0.2; y += 1) s += L(rp.x0, y, rp.x1, y, 'g-furn-l');
    s += R(wx0, rp.x0, rp.y0, rp.yTor, 'g-wall') + R(rp.x1, wx1, rp.y0, rp.yTor, 'g-wall');
    for (const [a, b] of [[wx0, rp.x0], [rp.x1, wx1]]) s += R(a, b, Math.max(gr(a), gr(b)) + 0.02, rp.y0, 'g-furn', 'Randstein am Vorplatz, bündig mit Pflaster und Rasen');
    // Rinnen mit Rost: am Ende des Vorplatzes und vor dem Tor, dort am Westrand der Pumpensumpf
    for (const [y, xa, t] of [[rp.y0 - 0.09, rp.x0, 'Rinne am Ende des Vorplatzes · fängt das Wasser vor der Rampe ab'], [rp.y1 + 0.15, rp.x0 + 0.5, 'Rinne vor dem Tor · Wasser der Rampe zum Pumpensumpf']]) {
      s += R(xa, rp.x1, y - 0.08, y + 0.08, 'g-furn', t);
      for (let x = xa + 0.1; x < rp.x1 - 0.05; x += 0.12) s += L(x, y - 0.08, x, y + 0.08, 'g-thin');
    }
    s += R(rp.x0 + 0.04, rp.x0 + 0.46, rp.y1 - 0.06, rp.y1 + 0.36, 'g-furn', 'Pumpensumpf mit Deckel') + L(rp.x0 + 0.04, rp.y1 - 0.06, rp.x0 + 0.46, rp.y1 + 0.36, 'g-thin');
    // Wände der Tiefgarage wie im 3D-Modell (innen am Umriss, mit den Leibungen der Toröffnung), zur Rampe hin offen; darüber das Poolhaus
    for (const w of HOUSE.tg.waende) s += R(w[0], w[1], w[2], w[3], 'g-wall');
    s += `<polygon points="${pts(ph)}" class="g-above" data-tip="Poolhaus darüber · lichte Höhe der Durchfahrt ca. ${num(rp.lichte, 2)} m"/>`;
    // Sektionaltor hinter der Öffnung an der Innenseite der Wand; offen liegt es unter der Decke (Laufschienen und Antrieb gestrichelt)
    s += R(rp.x0 - 0.05, rp.x1 + 0.05, rp.yE, rp.yE + 0.05, 'g-gate', `Sektionaltor ${num(rp.tor.b, 2)} × ${num(rp.tor.h, 2)} m · hinter der Öffnung, läuft offen unter die Decke · Sturz ${num(rp.tor.sturz, 2)} m`) + T(rc, rp.yTor - 0.55, 'Tor', 'g-ftxt');
    for (const x of [rp.x0 - 0.085, rp.x1 + 0.085, rc]) s += L(x, rp.yE + 0.05, x, rp.yE + (x === rc ? 3.35 : 2.75), 'g-above');
    s += `<polyline points="${pts([[16, -50.123], PL[2], PL[3]])}" class="g-grenze"/>` + T(17.4, -50.75, 'Grenze · Ebertstraße', 'g-ftxt');
    s += T(rc, rp.yG + 0.45, 'Einfahrt', 'g-ftxt') + T(rc, rp.y0 - 0.75, `Vorplatz ${pct(rp.vor.s)} %`, 'g-ftxt') + T(rc, -30.75, 'unter dem Poolhaus', 'g-ftxt');
    s += `<text x="${f(rc)}" y="41.3" class="g-ftxt" transform="rotate(-90 ${f(rc)} 41.3)">offene Rampe · ${pct(rp.s)} %</text>`;
    for (const [y, d] of [[rp.y0, 0], [rp.yPortal, 0], [rp.y1, -0.45]]) s += T(wx0 - 0.75, y - 0.08 + d, kote(rp.z(y)), 'g-ftxt');
    for (const y of [-36.9, -20.3]) s += `<polygon points="${pts([[rc - 0.35, y], [rc + 0.35, y], [rc, y + 0.9]])}" class="g-walkhead"/>`;
    // Drei Stellplätze 2,85 × 5,20 m an der 6 m breiten Fahrgasse, die Autos mit der Front zur Holzwand; davor der offene Eingangsbereich (ohne Glas)
    const G = HOUSE.tg, U = G.unterzug;
    for (let i = 0; i <= G.autos.length; i++) s += L(G.x0, G.y0 + G.bucht * i, G.x1, G.y0 + G.bucht * i, 'g-park');
    // Unterzüge über der Schnittebene (gestrichelt): an der Kante Stellplätze/Fahrgasse und unter der Nordwand des Poolhauses
    s += R(U.x - U.b / 2, U.x + U.b / 2, -23.851, -11.95, 'g-above', `Unterzug ${num(U.b * 100, 0)} × ${num(U.h * 100, 0)} cm unter der Decke · halbiert deren Spannweite · lichte Höhe darunter ${num(U.lichte, 2)} m`);
    s += R(wx0, wx1, rp.yPH - rp.unterzug.b, rp.yPH, 'g-above', `Unterzug unter der Nordwand des Poolhauses · Unterkante wie die Decke der Tiefgarage · lichte Höhe darunter ${num(rp.unterzug.lichte, 2)} m`);
    const E = G.schleuse;
    s += R(E.x0, E.x1, E.y0, E.y1, 'g-room', `Eingangsbereich · ${num(E.x1 - E.x0, 2)} × ${num(E.y1 - E.y0, 2)} m · offen zur Tiefgarage, Steinboden, Garderobe mit Schuhbank, Spiegel, Tür ins Foyer`);
    s += T((E.x0 + E.x1) / 2, -13.15, 'Eingangsbereich', 'g-roomtxt');
    G.autos.forEach((c, i) => {
      const cy = G.mitte(i), x0 = G.x0 + 0.05;
      s += `<rect x="${f(x0)}" y="${f(-cy - c.W / 2)}" width="${f(c.L)}" height="${f(c.W)}" rx="0.35" class="g-car" data-tip="${c.name} · ${num(c.L, 2)} × ${num(c.W, 2)} m"/>` +
        L(x0 + c.L * 0.3, cy - c.W / 2 + 0.12, x0 + c.L * 0.3, cy + c.W / 2 - 0.12, 'g-furn-l') + L(x0 + c.L * 0.72, cy - c.W / 2 + 0.12, x0 + c.L * 0.72, cy + c.W / 2 - 0.12, 'g-furn-l') +
        T(x0 + c.L / 2, cy - 0.1, c.name.replace(/^(Ferrari|Porsche|Mercedes) /, ''), 'g-ftxt') + T(G.x1 + 0.55, cy - 0.1, `P${i + 1}`, 'g-ftxt');
    });
    // Fahrräder halb hochgestellt an der Hauswand östlich des Eingangsbereichs (Lenker als Querstrich), davor der Weg von den Stellplätzen zum Eingang
    const Rd = G.raeder;
    s += `<g data-tip="Fahrräder · ${Rd.x.length} Stück, halb hochgestellt (Vorderrad im Wandhalter) · ${num(Rd.tief, 2)} m tief, davor der Weg zum Eingang">` +
      Rd.x.map(x => { const w = Rd.wand(x); return L(x, w - 0.06, x, w - Rd.tief, 'g-furn-l') + L(x - 0.25, w - 1.04, x + 0.25, w - 1.04, 'g-furn-l'); }).join('') + '</g>';
    s += T(14.6, -13.6, 'Fahrräder', 'g-ftxt') + T(20.2, -18.2, 'Fahrgasse 6,00 m', 'g-ftxt');
    s += T(20.2, -14.85, 'Tiefgarage', 'g-roomtxt') + T(20.2, -15.5, `${num(area2(tg))} m² · lichte Höhe ${num(G.lichte, 2)} m`, 'g-areatxt');
    return s;
  }
  function context(fl) {
    const t = HOUSE.terrasse, b = HOUSE.balkon, fz = HOUSE.freisitz, p = HOUSE.podest;
    const sq = (x, y, w, tip) => R(x - w / 2, x + w / 2, y - w / 2, y + w / 2, 'g-col', tip);
    const pk = HOUSE.fas.N.portikus, bd = HOUSE.balkonDG;
    const rails = B => L(B.x0 + 0.06, B.y0 + 0.06, B.x1 - 0.06, B.y0 + 0.06, 'g-railing') + L(B.x0 + 0.06, B.y0 + 0.06, B.x0 + 0.06, B.y1, 'g-railing') + L(B.x1 - 0.06, B.y0 + 0.06, B.x1 - 0.06, B.y1, 'g-railing');
    if (fl === 'EG') return `<polygon points="${pts(t.poly)}" class="g-outside" data-tip="Terrasse · durchgehend 19,00 × 4,00 m bis an den Freisitz · Naturstein · Lounge mittig unter dem Balkon"/>` +
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
    for (const rm of F.rooms) for (const q of [rm.r, ...(rm.ext || [])]) s += R(...q, 'g-room', `${rm.n} · ${num(rm.r[1] - rm.r[0], 2)} × ${num(rm.r[3] - rm.r[2], 2)} m`);
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
  return { render, table, wohnflaeche, items, FL, num, CORE: { LINE, FLIGHTS, HOLES, LIFT, VOID } };
})();
