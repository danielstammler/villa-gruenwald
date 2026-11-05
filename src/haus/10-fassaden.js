  // Teil des Hausmodells (src/haus/, siehe 00-grund.js): Fassaden mit allen Fenstern und Türen, Lage der Fassaden im Plan
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

