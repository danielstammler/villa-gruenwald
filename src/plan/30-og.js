    // Teil der Grundrisse (src/plan/, siehe 00-kern.js): Obergeschoss
    OG: {
      titel: 'Obergeschoss', ffb: HOUSE.Z.ffbOG,
      rooms: [
        // vier größere Kinderzimmer (Daniel, 4.11.2026: kein Wohnzimmer im OG) und zwei Bäder mit Wanne, die sich je zwei Kinder teilen
        { n: 'Kind 1', r: [0.36, 4.48, -11.29, -7.24], ext: [[4.72, 6.48, -11.29, -6.56]], at: [2.5, -9.7] },
        { n: 'Bad West', r: [0.36, 4.48, -7.0, RUECKWAND.s], at: [2.4, -6.06] },
        { n: 'Kind 2', r: [0.36, 6.01, -2.84, -0.36], ext: [[0.36, 2.68, RUECKWAND.n, -2.84], [4.72, 6.01, VORDERWAND.n, -2.84]], at: [3.4, -1.75] },
        { n: 'Kind 3', r: [11.52, 15.64, -11.29, -7.24], ext: [[9.52, 11.28, -11.29, -6.56]], at: [13.5, -9.7] },
        { n: 'Bad Ost', r: [11.52, 15.64, -7.0, RUECKWAND.s], at: [13.6, -6.06] },
        { n: 'Kind 4', r: [11.92, 15.64, RUECKWAND.n, -0.36], at: [13.8, -2.4] },
        // Flur mit Treppenbahn: die Haupttreppe kommt im Westen an, die Dachtreppe beginnt im Osten; Mittelgang bis zur Balkontür
        { n: 'Flur', r: [4.72, 11.28, -6.32, RUECKWAND.s], ext: [[6.72, 9.28, -11.29, -6.32], LINE], core: true, at: [8.0, -9.2] },
      ],
      open: [...VOID, [LINE[0], FLIGHTS.EG.x1, RUECKWAND.s, RUECKWAND.n], [FLIGHTS.OG.x0, 11.28, RUECKWAND.s, RUECKWAND.n]],
      doors: [
        { x: 5.2, y: -6.44, w: 0.85, o: 'h', s: -1, h: 0 }, { x: 4.6, y: -6.2, w: 0.75, o: 'v', s: -1, h: 0 },
        { x: 4.9, y: VORDERWAND.m, w: 0.8, o: 'h', s: 1, h: 0 }, { x: 10.0, y: -6.44, w: 0.85, o: 'h', s: -1, h: 1 },
        { x: 11.4, y: -6.2, w: 0.75, o: 'v', s: 1, h: 0 }, { x: 11.8, y: -4.8, w: 0.8, o: 'v', s: 1, h: 0 },
      ],
      furn: () => [
        fu.bed(1.0, 2.4, -9.24, -7.24, 'N'), fu.desk(2.7, 4.1, -11.29, -10.6, 'N'), fu.shelf(3.0, 4.48, -7.84, -7.24), fu.shelf(4.72, 5.32, -11.0, -8.6),
        fu.tub(0.5, 2.2, -7.0, -6.25), fu.basin(3.0, RUECKWAND.s, 1.2, 'N'), fu.wc(4.48, -6.65, 'E'),
        fu.bed(0.5, 2.5, -4.78, -3.38, 'W'), fu.desk(2.8, 4.2, -1.06, -0.36, 'S'), fu.shelf(5.41, 6.01, -2.8, -0.6),
        fu.bed(13.64, 15.04, -9.24, -7.24, 'N'), fu.desk(11.92, 13.32, -11.29, -10.6, 'N'), fu.shelf(11.52, 13.0, -7.84, -7.24), fu.shelf(10.68, 11.28, -11.0, -8.6),
        fu.tub(13.8, 15.5, -7.0, -6.25), fu.basin(12.8, RUECKWAND.s, 1.2, 'N'), fu.wc(11.52, -6.65, 'W'),
        fu.bed(13.9, 15.3, RUECKWAND.n, mm(RUECKWAND.n + 2), 'S'), fu.desk(12.2, 13.6, -1.06, -0.36, 'S'), fu.shelf(11.92, 12.52, -4.2, -1.6),
        fu.box(6.72, 7.17, -10.6, -8.6, 'Bank'),
        // draußen auf dem Balkon über der Terrasse
        fu.table(7.4, 8.6, -13.6, -12.9, 1, false),
      ],
    },
