// Parametrisches Hausmodell in Metern.
// Grundriss, Fensterachsen Süd, Freisitz, Terrasse und Podest: Konzeptplan Chaline Deutsch (M 1:100).
// Wandhöhe 7,25 m und Firsthöhe 11,12 m: Baurecht-Skizze Vogel+Partner. Gliederung der Fassade: Rendering.
// Alles andere (Geschosshöhen, Dachneigungen, Nord-/Ost-/Westfassade) ist eine plausible Annahme.
const HOUSE = (() => {
  const W = 16.0, D = 11.65, wall = 0.36;
  const Z = {
    ffbUG: -3.1, gelaende: 0, sockel: 0.2, ffbEG: 0.2, gurtU: 3.2, gurtO: 3.45, ffbOG: 3.55,
    sturzOG: 6.05, deckeDG: 6.3, ffbDG: 6.65, gesimsU: 6.55, gesimsO: 6.83, wand: 7.25, knick: 10.25, first: 11.12,
  };
  const run1 = 2.52, ueberstand = 0.35;
  const tan1 = (Z.knick - Z.wand) / run1;              // untere Dachfläche ~50°
  const run2 = (D - 2 * run1) / 2;                     // 3,305 m bis zum First
  const tan2 = (Z.first - Z.knick) / run2;             // obere Dachfläche ~15°
  const roofZ = s => Z.wand + s * tan1;                // Höhe der Dachhaut s Meter hinter der Außenwand
  const traufe = roofZ(-ueberstand);                   // Traufkante 6,83 m (Oberkante Gesims)
  const dachwinkel = [Math.atan(tan1) * 180 / Math.PI, Math.atan(tan2) * 180 / Math.PI];

  const ax7 = [[0.9, 1.9], [2.8, 3.8], [5.2, 6.2], [7.0, 9.0], [9.8, 10.8], [12.2, 13.2], [14.1, 15.1]];
  const pilLang = [[0, 0.5], [4.4, 4.95], [11.05, 11.6], [15.5, 16]];
  const pilKurz = [[0, 0.5], [11.15, 11.65]];
  const op = (u0, u1, z0, z1, kind, extra = {}) => ({ u0, u1, z0, z1, kind, leaves: u1 - u0 > 1.5 ? 2 : 1, ...extra });
  const gaube = (u0, u1, win, extra = {}) => ({ u0, u1, top: 9.4, clad: 'zink', front: 0.2, win, ...extra });
  const gWin = (c, w = 0.9, z1 = 9.05) => ({ u0: c - w / 2, u1: c + w / 2, z0: 7.65, z1, leaves: w > 1.5 ? 2 : 1 });

  // u läuft von links nach rechts, so wie man vor der jeweiligen Fassade steht.
  const fas = {
    S: {
      name: 'Süd', titel: 'Ansicht Süd · Garten', len: W, pil: pilLang, quelle: 'plan',
      open: [
        ...ax7.map(([a, b]) => op(a, b, Z.ffbEG, 2.85, 'tuer')),
        ...ax7.map(([a, b], i) => i >= 2 && i <= 4 ? op(a, b, Z.ffbOG, Z.sturzOG, 'tuer') : op(a, b, Z.ffbOG, Z.sturzOG, 'franz', { rail: 4.5 })),
      ],
      dormers: [
        gaube(2.65, 3.95, [gWin(3.3)]),
        { u0: 4.95, u1: 11.05, top: 9.75, clad: 'putz', front: 0.2, win: [gWin(5.7, 0.8, 9.35), gWin(8.0, 1.8, 9.35), gWin(10.3, 0.8, 9.35)] },
        gaube(12.05, 13.35, [gWin(12.7)]),
      ],
      eaveRail: { u0: 4.95, u1: 11.05, z0: Z.gesimsO, z1: 7.6 }, piers: [[4.45, 4.95], [11.05, 11.55]],
      lamps: [4.675, 11.325],
    },
    N: {
      name: 'Nord', titel: 'Ansicht Nord · Eingang', len: W, pil: pilLang, quelle: 'annahme',
      open: [
        op(7.1, 8.9, Z.ffbEG, 2.85, 'eingang'),
        ...[0, 1, 5, 6].map(i => op(ax7[i][0], ax7[i][1], 1.1, 2.85, 'fenster')),
        op(5.4, 6.0, 1.65, 2.85, 'fenster'), op(10.0, 10.6, 1.65, 2.85, 'fenster'),
        ...[0, 1, 2, 4, 5, 6].map(i => op(ax7[i][0], ax7[i][1], 4.25, Z.sturzOG, 'fenster')),
        op(7.0, 9.0, Z.ffbOG, Z.sturzOG, 'franz', { rail: 4.5 }),
      ],
      dormers: [gaube(2.65, 3.95, [gWin(3.3)]), gaube(7.35, 8.65, [gWin(8.0)]), gaube(12.05, 13.35, [gWin(12.7)])],
      portal: { u0: 6.85, u1: 9.15, z1: 3.05 }, canopy: { u0: 6.6, u1: 9.4, z0: 3.05, z1: 3.17, depth: 1.2 },
      lamps: [6.45, 9.55],
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
  // Balkon über der Terrasse, getragen von vier Säulen in den Achsen der Fensterpfeiler
  const balkon = { x0: 4.5, x1: 11.5, y0: -14.652, y1: -11.65, slab: [3.1, 3.5], rail: 4.5, cols: [4.75, 6.6, 9.4, 11.25], colY: -14.35, colR: 0.17 };

  // Rampe zur Tiefgarage in der Zufahrt: beginnt 1,70 m hinter der Grenze, läuft unter dem Poolhaus bis zur Tiefgarage (ca. 14 %)
  const rampe = { x0: 19.73, x1: 22.53, y0: -48.8, yPH: -33.65, y1: -27.65, gefaelle: 0.142 };

  return { W, D, wall, Z, run1, run2, tan1, tan2, ueberstand, traufe, roofZ, dachwinkel, fas, frame, freisitz, terrasse, podest, balkon, rampe };
})();
