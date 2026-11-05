// Vorgeschlagene Grundrisse: UG mit Tiefgarage, EG, OG, DG. Eigener Vorschlag auf Basis des Konzepts, keine Architektenplanung.
// Räume sind lichte Rechtecke im Plan (x Ost, y Nord, Meter). Was zwischen ihnen frei bleibt, wird als Wand gezeichnet.
// Teile in src/plan/, von tools/bauen.js nach Namen sortiert zu einer Datei zusammengesetzt: 00 Kern, Treppe, Aufzug und Möbel (fu),
// 10–40 die Geschosse UG, EG, OG, DG (Räume, Öffnungen, Türen, Möbel), 50 Flächen und Zeichnen, 60 Tiefgarage, 90 Ausgabe.
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
  // Treppenhalle (Daniel, 4.11.2026: „so, dass man beim Reinkommen auf sie zuschaut, nicht so zick zack“): eine gerade Treppenbahn
  // an der Rückwand der Halle (LINE = [Westende am Aufzug, Ostende, Südkante an der Rückwand, Nordkante zur Halle]). Kellertreppe UG→EG,
  // Haupttreppe EG→OG und Dachtreppe OG→DG sind je ein gerader Lauf, steigen nach Westen und liegen genau übereinander, je ein Geschoss
  // versetzt (Kopfhöhe an den Deckenöffnungen prüft die Regel treppe-kopf). Antritt im Osten, Austritt im Westen auf das Podest vor dem Aufzug. Der Aufzug sitzt im
  // Wandblock westlich davon, Türen nach Osten.
  // Breiter oder schmaler: nur LINE[2] (nach Süden) oder LINE[3] (nach Norden) ändern. Daraus folgen RUECKWAND und VORDERWAND (unten),
  // mit ihnen alle Räume, Durchgänge, Türen und Möbel an diesen Wänden in 10-ug … 40-dg, dazu LIFT, VOID, HOLES, 3D, Regeln und
  // Seitentext. Die x-Enden liegen an den Seitenwänden der Halle: LIFT, VOID und die Durchgänge in der Rückwand folgen ihnen, die Räume
  // dort tragen 4,72 und 11,68 als eigene Wandkanten.
  const LINE = [4.72, 11.68, -4.88, -3.58];
  const WAND = 0.24;                               // Innenwand, wie zwischen den Räumen der Geschosse
  const mm = v => Math.round(v * 1000) / 1000;     // auf Millimeter: −4,88 − 0,24 ergibt so genau −5,12, ohne Gleitkommarest
  // Wände an der Treppenbahn mit Südseite s, Mitte m (für Türen) und Nordseite n: die Rückwand südlich der Bahn läuft durchs ganze
  // Haus, die Vorderwand nördlich gibt es im UG (Abstellraum), im OG am Podest (Kind 2) und im DG (Bad, Abstellraum); im EG ist dort die Halle
  const RUECKWAND = { s: mm(LINE[2] - WAND), m: mm(LINE[2] - WAND / 2), n: LINE[2] };
  const VORDERWAND = { s: LINE[3], m: mm(LINE[3] + WAND / 2), n: mm(LINE[3] + WAND) };
  const FLIGHTS = {
    UG: { x0: 10.69, x1: 6.01, n: 19, za: HOUSE.Z.ffbUG, zb: HOUSE.Z.ffbEG },   // 19 Steigungen à 18,9 cm, Auftritt 26 cm
    EG: { x0: 10.6, x1: 6.01, n: 18, za: HOUSE.Z.ffbEG, zb: HOUSE.Z.ffbOG },    // 18 à 18,6 cm, Auftritt 27 cm
    OG: { x0: 10.6, x1: 6.28, n: 17, za: HOUSE.Z.ffbOG, zb: HOUSE.Z.ffbDG },    // 17 à 18,2 cm, Auftritt 27 cm
  };
  // Deckenöffnung über einem Lauf: so weit, wie man unter der Decke sonst keine 2,00 m Kopfhöhe hätte
  const holeOver = (fl, under) => { const F = FLIGHTS[fl]; return [F.x1, F.x0 - (under - 2 - F.za) / (F.zb - F.za) * (F.x0 - F.x1), LINE[2], LINE[3]]; };
  const HOLES = { EG: holeOver('UG', HOUSE.Z.ffbEG - 0.35), OG: holeOver('EG', HOUSE.Z.gurtU), DG: holeOver('OG', HOUSE.Z.deckeDG) };
  const LIFT = [2.92, LINE[0], LINE[2], -3.08];
  // Luftraum über dem vorderen Teil der Halle bis an die Treppenbahn, im OG mit Geländer an der Treppe
  const VOID = [[6.25, LINE[1], LINE[3], -0.36]];
  // Fläche eines Raums ohne Treppe, Aufzug und (im OG) Luftraum, soweit sie darin liegen
  const cutA = (a, b) => Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[2], b[2]));
  const STAIRUSE = { UG: [FLIGHTS.UG.x1, FLIGHTS.UG.x0, LINE[2], LINE[3]], EG: [FLIGHTS.EG.x1, FLIGHTS.EG.x0, LINE[2], LINE[3]],
    OG: [FLIGHTS.EG.x1, FLIGHTS.OG.x0, LINE[2], LINE[3]], DG: HOLES.DG };
  const coreIn = (fl, r) => cutA(r, STAIRUSE[fl]) + cutA(r, LIFT) + (fl === 'OG' ? VOID.reduce((t, v) => t + cutA(r, v), 0) : 0);
  // Haustür: Öffnung „eingang“ der Nordfassade (src/haus/10-fassaden.js, nur dort versetzen oder verbreitern; Nordseite x = W − u),
  // hier im Plan als EINGANG (x0 West-, x1 Ostkante samt Seitenteilen). HAUSTUER ist die Tür des EG-Grundrisses: das Türblatt zwischen
  // den Seitenteilen, mittig in der Außenwand. Ebenso folgen ihr die Konsole in der Halle (20-eg.js), die Pflanzkübel
  // (view3d/60-gelaende.js), der Pfeil im Lageplan, Laterne, Fußmatte und Rahmung, Ansicht „eingang“ und die Rundgänge (Tür 'EG N').
  const EINGANG = (o => ({ x0: mm(W - o.u1), x1: mm(W - o.u0), seite: o.side || 0 }))(HOUSE.fas.N.open.find(o => o.kind === 'eingang'));
  const HAUSTUER = { x: mm(EINGANG.x0 + EINGANG.seite), y: -HOUSE.wall / 2, w: mm(EINGANG.x1 - EINGANG.x0 - 2 * EINGANG.seite) };

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

