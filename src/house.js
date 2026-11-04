// Parametrisches Hausmodell in Metern.
// Grundriss, Fensterachsen Süd, Freisitz, Terrasse und Podest: Konzeptplan Chaline Deutsch (M 1:100).
// Wandhöhe 7,25 m und Firsthöhe 11,12 m: Proportionen des Renderings (Hausbreite 16,00 m als Maßstab). Gliederung der Fassade: Rendering
// und Daniels Referenzbild (weißer Glattputz, schwarze Rahmen, Zwerchhaus mit Balkon, eckige Pfeiler, Kamine).
// Alles andere (Geschosshöhen, Dachneigungen, Nord-/Ost-/Westfassade) ist eine plausible Annahme.
const HOUSE = (() => {
  const W = 16.0, D = 11.65, wall = 0.36;
  // deckeSpitz: Unterseite der flachen Decke im DG (lichte Höhe 2,60 m), darüber der Spitzboden
  const Z = {
    ffbUG: -3.4, gelaende: 0, sockel: 0.2, ffbEG: 0.2, gurtU: 3.2, gurtO: 3.45, ffbOG: 3.55,
    sturzOG: 6.05, deckeDG: 6.3, ffbDG: 6.65, gesimsU: 6.55, gesimsO: 6.83, wand: 7.25, deckeSpitz: 9.25, knick: 10.35, first: 11.12,
  };
  // Klassisches Mansarddach wie im Rendering: unten steil (~70°), oben flach (~9°)
  const run1 = 1.15;
  const tan1 = (Z.knick - Z.wand) / run1;              // untere Dachfläche
  const ueberstand = (Z.wand - Z.gesimsO) / tan1;      // Traufe genau auf der Oberkante des Gesimses
  const run2 = (D - 2 * run1) / 2;                     // bis zum First
  const tan2 = (Z.first - Z.knick) / run2;             // obere Dachfläche
  const roofZ = s => Z.wand + s * tan1;                // Höhe der Dachhaut s Meter hinter der Außenwand
  const roofIn = s => roofZ(s) - 0.3 / Math.cos(Math.atan(tan1));   // Unterseite des 30 cm starken Dachaufbaus
  const traufe = roofZ(-ueberstand);                   // Traufkante 6,83 m
  const dachwinkel = [Math.atan(tan1) * 180 / Math.PI, Math.atan(tan2) * 180 / Math.PI];

  const ax7 = [[0.9, 1.9], [2.8, 3.8], [5.2, 6.2], [7.0, 9.0], [9.8, 10.8], [12.2, 13.2], [14.1, 15.1]];
  const pilLang = [[0, 0.5], [4.4, 4.95], [11.05, 11.6], [15.5, 16]];
  const pilKurz = [[0, 0.5], [11.15, 11.65]];
  // Alle Fenster und Fenstertüren mit senkrechter Mittelsprosse, also zwei Glasfelder (Daniel, 4.11.2026); die Haustür bleibt einflügelig.
  // Türen bis 1,10 m Breite einflügelig mit aufgesetzter Sprosse (zwei Flügel à ~0,37 m wären unbrauchbar), sonst zwei Flügel
  const fluegel = (u0, u1, kind) => kind === 'tuer' && u1 - u0 <= 1.1 ? { leaves: 1, sprosse: true } : { leaves: 2 };
  const op = (u0, u1, z0, z1, kind, extra = {}) => ({ u0, u1, z0, z1, kind, ...fluegel(u0, u1, kind), ...extra });
  const gaube = (u0, u1, win, extra = {}) => ({ u0, u1, top: 9.4, clad: 'putz', front: 0.2, win, ...extra });
  const gWin = (c, w = 0.9, z1 = 9.05) => ({ u0: c - w / 2, u1: c + w / 2, z0: 7.9, z1, leaves: 2 });
  // Dachfenster in der steilen Dachfläche: Mitte c entlang der Traufe, v0..v1 die Fläche hinauf (Meter ab Traufe)
  const dachfenster = (c, w = 0.9) => ({ u0: c - w / 2, u1: c + w / 2, v0: 1.15, v1: 2.6 });

  // u läuft von links nach rechts, so wie man vor der jeweiligen Fassade steht.
  const fas = {
    S: {
      name: 'Süd', titel: 'Ansicht Süd · Garten', len: W, pil: pilLang, quelle: 'plan',
      open: [
        // Die mittlere Gartentür öffnet sich beim Rundgang (move)
        ...ax7.map(([a, b], i) => op(a, b, Z.ffbEG, 2.85, 'tuer', i === 3 ? { move: true } : {})),
        ...ax7.map(([a, b], i) => i >= 2 && i <= 4 ? op(a, b, Z.ffbOG, Z.sturzOG, 'tuer') : op(a, b, Z.ffbOG, Z.sturzOG, 'franz', { rail: 4.5 })),
      ],
      dormers: [
        // Zwerchhaus in der Fassadenflucht über den Pilastern der Mittelachse; davor tritt der DG-Balkon nach vorne (siehe balkonDG).
        // Seitliche Balkontüren 1,00 m breit in den Achsen der OG-Türen darunter; alle Türen ab FFB DG
        { u0: 4.45, u1: 11.55, top: 9.75, clad: 'putz', front: 0, zwerch: true,
          win: [ax7[2], [7.1, 8.9], ax7[4]].map(([a, b]) => op(a, b, Z.ffbDG, 9.0, 'tuer', { move: a === 7.1 })) },
      ],
      // Links und rechts keine Gauben, sondern flache Dachfenster wie im Rendering
      roofWindows: [dachfenster(3.3), dachfenster(12.7)],
      lamps: [4.675, 11.325],
    },
    N: {
      name: 'Nord', titel: 'Ansicht Nord · Eingang', len: W, pil: pilLang, quelle: 'annahme',
      open: [
        // Haustür einflügelig, 1,30 m breit, mit zwei verglasten Seitenteilen je 0,75 m und durchgehendem Oberlicht
        op(6.6, 9.4, Z.ffbEG, 2.85, 'eingang', { side: 0.75, single: true }),
        ...[0, 1, 5, 6].map(i => op(ax7[i][0], ax7[i][1], 1.1, 2.85, 'fenster')),
        // OG-Fenster mit 0,80 m Brüstung über FFB OG (BayBO Art. 36), Sturz wie bei allen OG-Öffnungen
        ...[0, 1, 2, 4, 5, 6].map(i => op(ax7[i][0], ax7[i][1], Z.ffbOG + 0.8, Z.sturzOG, 'fenster')),
        op(7.0, 9.0, Z.ffbOG, Z.sturzOG, 'franz', { rail: 4.5 }),
      ],
      // Auch hinten ein Zwerchhaus in der Mitte (französische Fenster mit Geländer), daneben Dachfenster wie im Süden
      dormers: [{ u0: 4.45, u1: 11.55, top: 9.75, clad: 'putz', front: 0, zwerch: true,
        win: [[5.3, 6.1], [7.1, 8.9], [9.9, 10.7]].map(([a, b]) => ({ u0: a, u1: b, z0: 6.9, z1: 9.0, leaves: 2, kind: 'franz', rail: 7.85 })) }],
      roofWindows: [dachfenster(3.3), dachfenster(12.7)],
      // Eingang: Portikus auf zwei quadratischen Pfeilern vor dem Podest, Laterne unter dem Vordach statt Wandleuchten
      portikus: { u0: 5.4, u1: 10.6, depth: 1.15, z0: 3.02, z1: 3.38, pillars: [5.75, 10.25], pw: 0.35, py: 0.8 },
      lamps: [],
    },
    E: {
      name: 'Ost', titel: 'Ansicht Ost · Freisitz', len: D, pil: pilKurz, quelle: 'annahme',
      open: [
        op(2.325, 4.325, Z.ffbEG, 2.85, 'tuer'), op(8.825, 9.825, 1.1, 2.85, 'fenster'),
        op(2.825, 3.825, Z.ffbOG, Z.sturzOG, 'tuer'), op(5.325, 6.325, Z.ffbOG + 0.8, Z.sturzOG, 'fenster'),
        op(8.825, 9.825, Z.ffbOG, Z.sturzOG, 'franz', { rail: 4.5 }),
      ],
      dormers: [gaube(5.175, 6.475, [gWin(5.825)])],
    },
    W: {
      name: 'West', titel: 'Ansicht West', len: D, pil: pilKurz, quelle: 'annahme',
      open: [
        op(1.825, 2.825, 1.1, 2.85, 'fenster'), ...[5.825, 9.325].map(c => op(c - 0.5, c + 0.5, Z.ffbEG, 2.85, 'tuer')),
        ...[2.325, 5.825, 9.325].map(c => op(c - 0.5, c + 0.5, Z.ffbOG, Z.sturzOG, 'franz', { rail: 4.5 })),
      ],
      dormers: [gaube(5.175, 6.475, [gWin(5.825)])],
    },
  };

  // Lage der Fassaden im Plan (x = Ost, y = Nord): Ursprung bei u = 0 und Richtung von u.
  const frame = {
    S: { o: [0, -D], r: [1, 0], n: [0, -1] },
    N: { o: [W, 0], r: [-1, 0], n: [0, 1] },
    E: { o: [W, -D], r: [0, 1], n: [1, 0] },
    W: { o: [0, 0], r: [0, -1], n: [-1, 0] },
  };

  const freisitz = { x0: 16, x1: 19, y0: -10.825, y1: -5.825, z: 0.18, slab: [3.0, 3.45], rail: 4.45, col: 0.35 };
  // Durchgehende Terrasse vor der ganzen Gartenseite, 4,00 m tief und im Osten bis an den Freisitz; in der Mitte eine Stufe zum Weg an den Pool
  const terrasse = { x0: 0, x1: 19, y0: -15.65, y1: -11.65, z: 0.18, stufe: [6.6, 9.4] };
  terrasse.poly = [[0, -11.65], [16, -11.65], [16, -10.825], [19, -10.825], [19, -15.65], [0, -15.65]];
  const podest = { x0: 5.5, x1: 10.5, y0: 0, y1: 1.0, z: 0.18 };
  // Balkon über der Terrasse, vorne nur auf den beiden äußeren, quadratischen Pfeilern
  const balkon = { x0: 4.5, x1: 11.5, y0: -14.652, y1: -11.65, slab: [3.1, 3.5], rail: 4.5, cols: [4.75, 11.25], colY: -14.38, colW: 0.4 };
  // Balkon im DG vor dem Zwerchhaus: tritt 1,00 m nach vorne, gleiche Breite wie Terrasse und OG-Balkon;
  // getragen von zwei schlankeren quadratischen Pfeilern, die auf dem OG-Balkon stehen (wie unten).
  // Belag 10 cm unter FFB DG, vor den Türen eine Rinne mit Gitterrost (rinne: von x, bis x, Breite), Geländer 1,00 m über dem Belag
  const balkonDG = { x0: 4.5, x1: 11.5, y0: -12.65, y1: -11.65, slab: [6.25, 6.55], rail: 7.55, cols: [4.75, 11.25], colY: -12.47, colW: 0.34, rinne: [5.05, 10.95, 0.15] };
  // Zwei Kamine auf der oberen Dachfläche, wie im Referenzbild links und rechts der Mitte
  const kamine = [{ x: 4.0, y: -D / 2, w: 0.75, d: 0.55, top: 11.9 }, { x: 12.0, y: -D / 2, w: 0.75, d: 0.55, top: 11.9 }];

  // Rampe in der Zufahrt, so wie Zufahrt, Poolhaus und Tiefgarage im Konzept aneinanderstoßen; Längsprofil nach GaStellV § 3 (Bayern):
  // ab der Grenze 3,00 m Vorplatz mit 4 % bis zur Rinne (y0), dann 15 % zwischen Betonwänden nach Norden und unter dem Poolhaus hindurch
  // (Unterkante Decke −0,15), unten 2,77 m Übergang mit 7,5 % und 0,40 m eben vor dem Tor mit Rinne und Pumpensumpf. Das Sektionaltor
  // (2,80 × 2,30 m, Sturz 0,40 m) sitzt hinter der Öffnung an der Innenseite der Wand (yE); so reicht die Länge für Boden der Tiefgarage =
  // Boden UG (−3,40, stufenlos ins Haus), mit dem Tor in der Außenflucht wäre der Übergang unten nur 2,17 m lang. Knicke für den Ferrari
  // (Rampenwinkel ≈ 9,5°, Böschungswinkel ≈ 6,0°): oben 6,2°, unten zweimal 4,3°, der Übergang länger als sein Radstand (2,65 m); am Modell
  // nachgerechnet bleiben unter ihm mindestens 3 cm. Am Portal −2,197: mehr Gefälle erlaubt die Strecke ab der Grenze nicht (3,00 × 4 % +
  // 13,85 × 15 %), lichte Höhe 2,047 m, die V-Klasse (1,94 m) hat dort 8 cm Luft. Die Grenze läuft schräg (Westkante der Fahrbahn −50,50,
  // Ostkante −50,97), gemessen wird an der Westkante (kürzester Vorplatz).
  const PL = SITE.plot, grenze = x => PL[2][1] + (x - PL[2][0]) * (PL[3][1] - PL[2][1]) / (PL[3][0] - PL[2][0]);
  const rampe = { x0: 19.73, x1: 22.53, wand: 0.35, yPortal: -33.651, yPH: -27.652, yTor: -24.151, zTG: Z.ffbUG, decke: -0.15, grenze,
    vor: { l: 3.0, s: 0.04 }, s: 0.15, unten: { s: 0.075 }, eben: 0.4, tor: { b: 2.8, h: 2.3 }, unterzug: { b: 0.3 } };
  rampe.yG = grenze(rampe.x0);                 // Beginn des Vorplatzes an der Grenze
  rampe.y0 = rampe.yG + rampe.vor.l;           // Rinne am Rampenkopf, ab hier Wände mit Geländer
  rampe.yE = rampe.yTor + 0.3;                 // Torblatt an der Innenseite der 30 cm starken Wand
  rampe.y1 = rampe.yE - rampe.eben;            // Fuß der Rampe, dahinter eben bis zum Tor
  rampe.zR = -rampe.vor.l * rampe.vor.s;       // Höhe an der Rinne
  // Übergang unten so lang, dass die Rampe genau auf dem Boden der Tiefgarage ankommt; lm = Länge mit 15 %
  rampe.unten.l = (rampe.zR - rampe.zTG - rampe.s * (rampe.y1 - rampe.y0)) / (rampe.unten.s - rampe.s);
  rampe.lm = rampe.y1 - rampe.y0 - rampe.unten.l;
  rampe.vorplatz = [[rampe.x0, rampe.yG], [rampe.x1, grenze(rampe.x1)], [rampe.x1, rampe.y0], [rampe.x0, rampe.y0]];
  rampe.z = y => y <= rampe.yG ? 0 : y <= rampe.y0 ? -(y - rampe.yG) * rampe.vor.s
    : Math.max(rampe.zTG, rampe.zR - Math.min(y - rampe.y0, rampe.lm) * rampe.s - Math.max(Math.min(y, rampe.y1) - rampe.y0 - rampe.lm, 0) * rampe.unten.s);
  rampe.lichte = rampe.decke - rampe.z(rampe.yPortal);

  // Tiefgarage: Boden auf Höhe des Untergeschosses, Decke 30 cm, darüber 40 cm Aufbau für Terrasse und Rasen; 2,70 m lichte Höhe.
  // Die Decke spannt 11,40 m von Wand zu Wand; ein Unterzug 30 × 50 cm an der Kante Stellplätze/Fahrgasse (x 17,20, von der Süd- bis zur
  // Nordwand) halbiert die Spannweite, darunter 2,20 m. Drei Stellplätze 2,85 × 5,20 m an der 6,00 m breiten Fahrgasse, die Autos mit der
  // Front zur Holzwand; seit 4.11.2026 0,95 m weiter nördlich (y0 −22,90), damit neben P1 1,39 m bis zur Südwand bleiben (Fahrertür des
  // Ferrari ganz offen). Nördlich von P3 an der Hauswand die Fahrräder, halb hochgestellt (1,35 m tief), davor 1,35 m Weg zum Eingangsbereich.
  // Der Eingangsbereich (schleuse, 7,00 × 2,70 m, seit 4.11.2026 mittig und ohne Glaswände) hat Steinboden und eine zweiflügelige Tür ins Foyer.
  const tg = { decke: -0.7, platte: 0.3, bucht: 2.85, y0: -22.9, x0: 12.0, x1: 17.2,
    unterzug: { x: 17.2, b: 0.3, h: 0.5 },
    // Fahrräder östlich des Eingangsbereichs (wo bis 4.11.2026 der Eingang war): Mitte je Rad, Vorderrad am Wandhalter, tief = Abstand ab der Wand
    raeder: { x: [12.4, 13.05, 13.7, 14.35, 15.0, 15.65, 16.3, 16.95], tief: 1.35 },
    // Eingangsbereich (seit 4.11.2026 mittig, wo vorher die Fahrräder standen)
    schleuse: { x0: 4.8, x1: 11.8, y0: -14.352, y1: -11.65, hausTuer: [7.3, 8.7] },
    autos: [
      { k: 'ferrari', name: 'Ferrari F8 Tributo', L: 4.61, W: 1.98 }, { k: 'cayenne', name: 'Porsche Cayenne Coupé', L: 4.93, W: 1.98 },
      { k: 'vklasse', name: 'Mercedes V-Klasse', L: 5.14, W: 1.93 },
    ] };
  tg.lichte = tg.decke - Z.ffbUG;
  tg.mitte = i => tg.y0 + tg.bucht * (i + 0.5);
  tg.unterzug.lichte = tg.decke - tg.unterzug.h - Z.ffbUG;
  // Hauswand bzw. Nordwand der Tiefgarage hinter dem Rad bei x (die Hauswand endet bei x 16,00)
  tg.raeder.wand = x => x < W ? -D : -D - 0.3;
  // Wände [x0, x1, y0, y1], 30 cm innen am Umriss aus dem Konzept (3D-Modell und Grundriss); an der Toröffnung die Leibungen bis zur Innenseite
  tg.waende = [[W, 23.499, -D - 0.3, -D], [23.199, 23.499, -24.151, -D], [22.885, 23.499, -24.151, -23.851], [11.498, 19.38, -24.151, -23.851],
    [11.498, 11.798, -24.151, -14.652], [4.5, 11.798, -14.652, -14.352], [4.5, 4.8, -14.652, -D],
    [rampe.x0 - rampe.wand, rampe.x0, rampe.yTor, rampe.yE], [rampe.x1, rampe.x1 + rampe.wand + 0.01, rampe.yTor, rampe.yE]];
  // Torsturz bis zur Decke und lichte Höhe unter dem Unterzug unter der Nordwand des Poolhauses (Unterkante = Decke der Tiefgarage)
  rampe.tor.sturz = tg.decke - rampe.zTG - rampe.tor.h;
  rampe.unterzug.lichte = Math.min(...[rampe.yPH - rampe.unterzug.b, rampe.yPH].map(y => tg.decke - rampe.z(y)));

  // Pool aus dem Konzept: Wasser 12 cm unter dem Rand, 1,40 m tief, an der Nordseite vier Stufen über die ganze Breite,
  // gleichmäßig je etwa 29 cm vom Rand (+0,06) bis zum Boden.
  // Ringsum eine Natursteinterrasse, im Osten breit mit Liegen und bis an die Veranda des Poolhauses; ein Weg führt von der Terrasse herüber.
  const pool = { wasser: -0.12, boden: -1.4, stufen: [-0.23, -0.52, -0.82, -1.11], tritt: 0.35 };
  const poolDeck = { z: 0.04, poly: [[4.5, -23.15], [13.5, -23.15], [13.5, -27.652], [19.384, -27.652], [19.384, -33.651], [13.5, -33.651], [13.5, -38.15], [4.5, -38.15]] };
  const poolWeg = { x0: 7.4, x1: 8.6, y0: -23.15, y1: -15.65 };
  // Poolhaus auf der Fläche aus dem Konzept (3,50 × 6,00 m) im Stil des Hauses: weißer Putz, Gesims, flaches Walmdach mit Schiefer.
  // Zum Pool ganz offen: eine 5,40 m breite Glas-Schiebewand (zwei Flügel zur Seite geschoben), nach Norden ein großes Fenster,
  // davor eine überdachte Veranda auf zwei Pfeilern. Darunter führt die Rampe in die Tiefgarage.
  // Boden eine Stufe über der Poolterrasse (+0,15, vor der Schiebewand eine Stufe aus Naturstein): über der Durchfahrt (Unterkante −0,15)
  // bleiben 30 cm für Decke und Belag. Gesims und Traufe bleiben auf ihrer Höhe, innen wird es 10 cm niedriger.
  const poolhaus = { x0: 19.384, x1: 22.885, y0: -33.651, y1: -27.652, z: 0.15, wand: 0.25, gesims: 2.75, traufe: 2.95, neigung: 27,
    veranda: 1.8, pfeiler: 0.3, front: [0.3, 5.7], fenster: [20.75, 22.45], stufe: 0.32 };
  // Zaun über die ganze Straßenseite (an Stämmen auf der Grenze eng vorbei): weißer Sockel mit schwarzen Stäben zwischen Pfeilern;
  // Einfahrtstor zweiflügelig, daneben die Gartentür. Alles höchstens 1,60 m über dem Pflaster (Ortsgestaltungssatzung Grünwald § 9 Abs. 4):
  // Pfeiler mit Abdeckung 1,60 m, Stäbe mit Spitzen 1,55 m, Torbogen bis 1,60 m, Leuchten vorn an den Torpfeilern statt obenauf.
  // Hecken und Spielplatz in HOUSE.garten (unten).
  const zaun = { hoehe: 1.6, stab: 1.55, sockel: 0.3, pfeiler: 0.42, tor: [19.732, 23.33], tuer: [23.75, 24.73] };

  // Lichthof vor dem Gym im UG (Westseite, u wie in der Westansicht von Norden gemessen): bis zum UG-Boden, Fenster bis zum Boden.
  // Ortsgestaltungssatzung Grünwald § 8: Lichtschächte höchstens 1,50 m tief und höchstens ein Drittel der Ansichtsbreite (11,65 / 3 = 3,88 m)
  const lichthof = { side: 'W', u0: 6.6, u1: 10.45, tief: 1.5, win: [[6.9, 8.4], [8.65, 10.15]] };
  return { W, D, wall, Z, run1, run2, tan1, tan2, ueberstand, traufe, roofZ, roofIn, dachwinkel, fas, frame, freisitz, terrasse, podest, balkon, balkonDG, kamine, rampe,
    tg, pool, poolDeck, poolWeg, poolhaus, zaun, lichthof };
})();

// Garten (Daniel, 4.11.2026): Hecken an allen Grenzen und an der Rampe, Spielplatz im Vorgarten. Gemeinsame Daten für 3D-Modell und Lageplan.
HOUSE.garten = (() => {
  const P0 = SITE.plot;
  // Hecken als Läufe entlang der Punkte: Mitte off Meter links der Laufrichtung (innen), Breite b, Höhe h bis h + dh über z0, t0 und t1 kürzen
  // Anfang und Ende. Seitlich hoch als Sichtschutz, im Norden niedrig (Blick auf den Eingang), an der Straße hinter dem Zaun, an der Rampe.
  const hecken = [
    { name: 'Hecke', tip: 'Sichtschutz an der Westgrenze', pts: [P0[6], P0[0]], off: 0.5, b: 0.6, h: 2.6, dh: 0.25, t1: 0.45 },
    { name: 'Hecke', tip: 'Sichtschutz an der Ostgrenze, entlang der Zuwegung', pts: [[25.059, -44.0], P0[4]], off: 0.45, b: 0.5, h: 2.6, dh: 0.25 },
    // Vor dem Zaun an der Ostgrenze bis kurz hinter die Gartentür: Pflanztröge auf dem Pflaster, ohne Aushub im Wurzelschutzbereich des Schutzbaums
    { name: 'Hecke in Pflanztrögen', tip: 'vor dem Zaun an der Ostgrenze bis zur Gartentür · Tröge auf dem Pflaster, ohne Aushub im Wurzelschutzbereich',
      pts: [[25.058, -49.95], [25.059, -44.0]], off: 0.54, b: 0.4, h: 2.15, dh: 0.2, z0: 0.45, trog: 0.32 },
    { name: 'Hecke', tip: 'Nordgrenze, niedrig für den Blick auf den Eingang', pts: [P0[4], P0[5], P0[6]], off: 0.5, b: 0.6, h: 1.2, dh: 0.18 },
    { name: 'Hecke hinter dem Zaun', tip: 'über die ganze Straßenseite bis zur Rampe', pts: [P0[0], P0[1], P0[2]], off: 1.0, b: 0.7, h: 1.8, dh: 0.15, t0: 0.7 },
    { name: 'Hecke an der Rampe', tip: 'westlich der offenen Rampe zur Tiefgarage, verdeckt Betonwand und Geländer', pts: [[18.98, -49.75], [18.98, -34.0]], off: 0, b: 0.74, h: 1.62, dh: 0.12 },
  ];
  // Mittellinie: Punkte um off nach links versetzt, Ecken auf Gehrung, Anfang und Ende um t0 und t1 gekürzt
  for (const H of hecken) {
    const P = H.pts, n = P.length, dir = i => { const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
    H.linie = P.map((p, i) => {
      const a = dir(Math.max(0, i - 1)), b = dir(Math.min(n - 2, i)), m = [-a[1] - b[1], a[0] + b[0]], ml = Math.hypot(m[0], m[1]), k = H.off / ((m[1] * a[0] - m[0] * a[1]) / ml);
      return [p[0] + m[0] / ml * k, p[1] + m[1] / ml * k];
    });
    const d0 = dir(0), d1 = dir(n - 2), q0 = H.linie[0], q1 = H.linie[n - 1], t0 = H.t0 || 0, t1 = H.t1 || 0;
    H.linie[0] = [q0[0] + d0[0] * t0, q0[1] + d0[1] * t0]; H.linie[n - 1] = [q1[0] - d1[0] * t1, q1[1] - d1[1] * t1];
  }
  // Spielplatz südlich der Poolterrasse zwischen drei Bäumen, mit Abstand zu den Stämmen. Spielturm mit Podest 1,50 × 1,50 m in 1,50 m Höhe
  // (= freie Fallhöhe), Satteldach und Sandkasten; Kletterwand nach Norden, Kletternetz nach Süden, Rutsche nach Osten; im Westen eine Doppelschaukel.
  const turm = { x: 9.55, y: -41.45, a: 0.75, podest: 1.5, traufe: 2.55, first: 3.25 };
  const spiel = { turm, wand: { tief: 0.7, b: 0.9 }, netz: { tief: 1.2, b: 1.1 }, rutsche: { len: 2.71, b: 0.47, aus: 0.25 },
    schaukel: { x0: 4.35, x1: 7.05, y: -41.5, h: 2.05, sitze: [5.15, 6.25], sitz: 0.42 } };
  // Fallräume nach DIN EN 1176: Turm, Wand und Netz 1,50 m rundum, Rutsche 1,00 m seitlich und 2,00 m hinter dem Auslauf, Schaukel
  // 0,867 × Seillänge + 1,75 m in Schwingrichtung und 1,75 m breit je Sitz. Zusammengefasst mit 12 cm Zugabe und runden Ecken; im Norden bis an die Poolterrasse.
  // Fallschutz aus Holzhackschnitzeln, 30 cm (DIN EN 1177): wasser- und luftdurchlässig, gut für die Wurzeln.
  const S = spiel.schaukel, T = turm, R = spiel.rutsche, lang = 0.867 * (S.h - 0.05 - S.sitz) + 1.75, by = R.b / 2 + 1.0 + 0.12;
  const xa = S.sitze[0] - 0.875 - 0.12, xb = T.x + T.a + 1.5 + 0.12, xc = T.x + T.a + R.len + 2.0 + 0.12;
  const yS = Math.min(S.y - lang, T.y - T.a - spiel.netz.tief - 1.5) - 0.12, yN = -38.17;
  const rund = (P, r) => P.flatMap((p, i) => {
    const a = P[(i + P.length - 1) % P.length], b = P[(i + 1) % P.length], la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const k = Math.min(r, la / 2, lb / 2), A = [0, 1].map(j => p[j] + (a[j] - p[j]) * k / la), B = [0, 1].map(j => p[j] + (b[j] - p[j]) * k / lb);
    return [0, 0.25, 0.5, 0.75, 1].map(t => [0, 1].map(j => (1 - t) * (1 - t) * A[j] + 2 * t * (1 - t) * p[j] + t * t * B[j]));
  });
  spiel.flaeche = rund([[xa, yN], [xb, yN], [xb, T.y + by], [xc, T.y + by], [xc, T.y - by], [xb, T.y - by], [xb, yS], [xa, yS]], 0.5);
  spiel.schwing = lang;
  return { hecken, spiel };
})();
