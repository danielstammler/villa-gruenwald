    // Teil der Grundrisse (src/plan/, siehe 00-kern.js): Dachgeschoss
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

