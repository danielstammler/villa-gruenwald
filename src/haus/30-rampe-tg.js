  // Teil des Hausmodells (src/haus/, siehe 00-grund.js): Rampe und Tiefgarage
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

