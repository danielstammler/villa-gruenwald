// Parametrisches Hausmodell in Metern.
// Grundriss, Fensterachsen Süd, Freisitz, Terrasse und Podest: Konzeptplan Chaline Deutsch (M 1:100).
// Wandhöhe 7,25 m und Firsthöhe 11,12 m: Proportionen des Renderings (Hausbreite 16,00 m als Maßstab). Gliederung der Fassade: Rendering
// und Daniels Referenzbild (weißer Glattputz, schwarze Rahmen, Zwerchhaus mit Balkon, eckige Pfeiler, Kamine).
// Alles andere (Geschosshöhen, Dachneigungen, Nord-/Ost-/Westfassade) ist eine plausible Annahme.
const HOUSE = (() => {
  const W = 16.0, D = 11.65, wall = 0.36;
  const Z = {
    ffbUG: -3.1, gelaende: 0, sockel: 0.2, ffbEG: 0.2, gurtU: 3.2, gurtO: 3.45, ffbOG: 3.55,
    sturzOG: 6.05, deckeDG: 6.3, ffbDG: 6.65, gesimsU: 6.55, gesimsO: 6.83, wand: 7.25, knick: 10.35, first: 11.12,
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
  const op = (u0, u1, z0, z1, kind, extra = {}) => ({ u0, u1, z0, z1, kind, leaves: u1 - u0 > 1.5 ? 2 : 1, ...extra });
  const gaube = (u0, u1, win, extra = {}) => ({ u0, u1, top: 9.4, clad: 'putz', front: 0.2, win, ...extra });
  const gWin = (c, w = 0.9, z1 = 9.05) => ({ u0: c - w / 2, u1: c + w / 2, z0: 7.9, z1, leaves: w > 1.5 ? 2 : 1 });
  // Dachfenster in der steilen Dachfläche: Mitte c entlang der Traufe, v0..v1 die Fläche hinauf (Meter ab Traufe)
  const dachfenster = (c, w = 0.9) => ({ u0: c - w / 2, u1: c + w / 2, v0: 1.15, v1: 2.6 });

  // u läuft von links nach rechts, so wie man vor der jeweiligen Fassade steht.
  const fas = {
    S: {
      name: 'Süd', titel: 'Ansicht Süd · Garten', len: W, pil: pilLang, quelle: 'plan',
      open: [
        ...ax7.map(([a, b]) => op(a, b, Z.ffbEG, 2.85, 'tuer')),
        ...ax7.map(([a, b], i) => i >= 2 && i <= 4 ? op(a, b, Z.ffbOG, Z.sturzOG, 'tuer') : op(a, b, Z.ffbOG, Z.sturzOG, 'franz', { rail: 4.5 })),
      ],
      dormers: [
        // Zwerchhaus in der Fassadenflucht über den Pilastern der Mittelachse; davor tritt der DG-Balkon nach vorne (siehe balkonDG)
        { u0: 4.45, u1: 11.55, top: 9.75, clad: 'putz', front: 0, zwerch: true,
          win: [[5.3, 6.1], [7.1, 8.9], [9.9, 10.7]].map(([a, b]) => ({ u0: a, u1: b, z0: 6.75, z1: 9.0, leaves: b - a > 1.5 ? 2 : 1, kind: 'tuer' })) },
      ],
      // Links und rechts keine Gauben, sondern flache Dachfenster wie im Rendering
      roofWindows: [dachfenster(3.3), dachfenster(12.7)],
      lamps: [4.675, 11.325],
    },
    N: {
      name: 'Nord', titel: 'Ansicht Nord · Eingang', len: W, pil: pilLang, quelle: 'annahme',
      open: [
        // Haustür 1,80 m mit zwei verglasten Seitenteilen je 0,50 m und durchgehendem Oberlicht
        op(6.6, 9.4, Z.ffbEG, 2.85, 'eingang', { side: 0.5 }),
        ...[0, 1, 5, 6].map(i => op(ax7[i][0], ax7[i][1], 1.1, 2.85, 'fenster')),
        ...[0, 1, 2, 4, 5, 6].map(i => op(ax7[i][0], ax7[i][1], 4.25, Z.sturzOG, 'fenster')),
        op(7.0, 9.0, Z.ffbOG, Z.sturzOG, 'franz', { rail: 4.5 }),
      ],
      // Auch hinten ein Zwerchhaus in der Mitte (französische Fenster mit Geländer), daneben Dachfenster wie im Süden
      dormers: [{ u0: 4.45, u1: 11.55, top: 9.75, clad: 'putz', front: 0, zwerch: true,
        win: [[5.3, 6.1], [7.1, 8.9], [9.9, 10.7]].map(([a, b]) => ({ u0: a, u1: b, z0: 6.9, z1: 9.0, leaves: b - a > 1.5 ? 2 : 1, kind: 'franz', rail: 7.85 })) }],
      roofWindows: [dachfenster(3.3), dachfenster(12.7)],
      // Eingang: Portikus auf zwei quadratischen Pfeilern vor dem Podest, Laterne unter dem Vordach statt Wandleuchten
      portikus: { u0: 5.4, u1: 10.6, depth: 1.15, z0: 3.02, z1: 3.38, pillars: [5.75, 10.25], pw: 0.35, py: 0.8 },
      lamps: [],
    },
    E: {
      name: 'Ost', titel: 'Ansicht Ost · Freisitz', len: D, pil: pilKurz, quelle: 'annahme',
      open: [
        op(2.325, 4.325, Z.ffbEG, 2.85, 'tuer'), op(8.825, 9.825, 1.1, 2.85, 'fenster'),
        op(2.825, 3.825, Z.ffbOG, Z.sturzOG, 'tuer'), op(5.325, 6.325, 4.25, Z.sturzOG, 'fenster'),
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
  const terrasse = { x0: 4.5, x1: 11.5, y0: -14.652, y1: -11.65, z: 0.18 };
  const podest = { x0: 5.5, x1: 10.5, y0: 0, y1: 1.0, z: 0.18 };
  // Balkon über der Terrasse, vorne nur auf den beiden äußeren, quadratischen Pfeilern
  const balkon = { x0: 4.5, x1: 11.5, y0: -14.652, y1: -11.65, slab: [3.1, 3.5], rail: 4.5, cols: [4.75, 11.25], colY: -14.38, colW: 0.4 };
  // Balkon im DG vor dem Zwerchhaus: tritt 1,00 m nach vorne, gleiche Breite wie Terrasse und OG-Balkon, auf Konsolen
  const balkonDG = { x0: 4.5, x1: 11.5, y0: -12.65, y1: -11.65, slab: [6.45, 6.75], rail: 7.75, consoles: [4.75, 6.6, 9.4, 11.25] };
  // Zwei Kamine auf der oberen Dachfläche, wie im Referenzbild links und rechts der Mitte
  const kamine = [{ x: 4.0, y: -D / 2, w: 0.75, d: 0.55, top: 11.9 }, { x: 12.0, y: -D / 2, w: 0.75, d: 0.55, top: 11.9 }];

  // Offene Rampe in der Zufahrt, so wie Zufahrt, Poolhaus und Tiefgarage im Konzept aneinanderstoßen: beginnt knapp 2 m hinter der Grenze,
  // läuft zwischen Betonwänden nach Norden, unter dem Poolhaus hindurch und erreicht im Anschluss der Tiefgarage deren Boden.
  // Oben und unten je 3 m Übergang mit 8 %, dazwischen 16 %. Unter dem Poolhaus (Decke −0,15) bleiben gut 2 m lichte Höhe.
  const rampe = { x0: 19.73, x1: 22.53, wand: 0.35, y0: -48.8, yPortal: -33.651, yPH: -27.652, yTor: -24.151, s: 0.16, s0: 0.08, lu: 3.0, zTG: Z.ffbUG, decke: -0.15 };
  rampe.lm = (-rampe.zTG - 2 * rampe.lu * rampe.s0) / rampe.s;
  rampe.y1 = rampe.y0 + 2 * rampe.lu + rampe.lm;
  rampe.z = y => {
    const t = Math.min(Math.max(y - rampe.y0, 0), rampe.y1 - rampe.y0), { lu, lm, s, s0 } = rampe;
    return -(Math.min(t, lu) * s0 + Math.min(Math.max(t - lu, 0), lm) * s + Math.max(t - lu - lm, 0) * s0);
  };
  rampe.lichte = rampe.decke - rampe.z(rampe.yPortal);

  return { W, D, wall, Z, run1, run2, tan1, tan2, ueberstand, traufe, roofZ, roofIn, dachwinkel, fas, frame, freisitz, terrasse, podest, balkon, balkonDG, kamine, rampe };
})();
