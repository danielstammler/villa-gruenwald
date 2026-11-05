  // Teil der Grundrisse (src/plan/, siehe 00-kern.js): Dachgeschoss
  // DG-Achsen (siehe 10-ug.js)
  FL.DG = (() => {
    const SCHLAF_BUERO = wandX(4.6), BUERO_GAESTE = wandX(11.4);  // beide auch am Flur, mit Tür
    const ANKLEIDE_BAD = wandX(4.6), BAD_ABSTELL = wandX(9.4), BUERO_FLUR = wandY(-6.44);
    return {
      titel: 'Dachgeschoss', ffb: HOUSE.Z.ffbDG,
      rooms: [
        // Büro vorne mittig im Zwerchhaus mit Balkon (Daniel, 4.11.2026); Elternbereich im Westen, en suite: Flur → Schlafzimmer → Ankleide → Bad
        { n: 'Büro', r: [SCHLAF_BUERO.o, BUERO_GAESTE.w, -11.29, BUERO_FLUR.s], at: [8.0, -10.4] },
        { n: 'Flur', r: [SCHLAF_BUERO.o, BUERO_GAESTE.w, BUERO_FLUR.n, RUECKWAND.s], ext: [LINE], core: true, at: [8.0, -5.72] },
        { n: 'Schlafzimmer', r: [0.36, SCHLAF_BUERO.w, -11.29, RUECKWAND.s], at: [2.4, -9.9] },
        { n: 'Ankleide', r: [0.36, ANKLEIDE_BAD.w, SCHACHT_N.n, -0.36], ext: [[0.36, SCHACHT_W.w, RUECKWAND.n, SCHACHT_N.n]], at: [2.6, -1.75] },
        { n: 'Bad', r: [ANKLEIDE_BAD.o, BAD_ABSTELL.w, VORDERWAND.n, -0.36], at: [6.9, -2.1] },
        // die Ostseite ist frei geworden: Gästezimmer und Abstellraum
        { n: 'Gäste', r: [BUERO_GAESTE.o, 15.64, -11.29, RUECKWAND.s], at: [13.6, -9.9] },
        { n: 'Abstellraum', r: [STIRNWAND.o, 15.64, RUECKWAND.n, -0.36], ext: [[BAD_ABSTELL.o, STIRNWAND.o, VORDERWAND.n, -0.36]], wf: 0, at: [13.8, -2.6] },
      ],
      // Durchgänge vom Flur zum Podest und zur Treppe, so breit, wie Flur und Treppenbahn sich gegenüberliegen
      open: [[Math.max(LINE[0], SCHLAF_BUERO.o), FLIGHTS.OG.x1, RUECKWAND.s, RUECKWAND.n], [HOLES.DG[1], BUERO_GAESTE.w, RUECKWAND.s, RUECKWAND.n]],
      doors: [
        { x: 7.6, y: BUERO_FLUR.m, w: 0.9, o: 'h', s: -1, h: 0 }, { x: SCHLAF_BUERO.m, y: -6.2, w: 0.85, o: 'v', s: -1, h: 0 },
        { x: 1.0, y: RUECKWAND.m, w: 0.8, o: 'h', s: 1, h: 0 }, { x: ANKLEIDE_BAD.m, y: -1.2, w: 0.8, o: 'v', s: 1, h: 0 },
        { x: BUERO_GAESTE.m, y: -6.2, w: 0.85, o: 'v', s: 1, h: 0 }, { x: STIRNWAND.m, y: -4.8, w: 0.8, o: 'v', s: 1, h: 0 },
      ],
      furn: () => [
        fu.desk(7.2, 8.8, -9.3, -8.5, 'N'), fu.shelf(SCHLAF_BUERO.o, mm(SCHLAF_BUERO.o + 0.5), -10.15, -8.0), fu.box(10.1, 10.9, -10.15, -9.35, '', 'sessel-E'),
        fu.shelf(mm(BUERO_GAESTE.w - 1.48), BUERO_GAESTE.w, mm(BUERO_FLUR.s - 0.5), BUERO_FLUR.s),
        fu.bed(mm(SCHLAF_BUERO.w - 2.1), SCHLAF_BUERO.w, -9.1, -7.3, 'E'),
        fu.box(mm(SCHLAF_BUERO.w - 0.48), SCHLAF_BUERO.w, -7.3, -6.82, '', 'nacht'), fu.box(mm(SCHLAF_BUERO.w - 0.48), SCHLAF_BUERO.w, -9.58, -9.1, '', 'nacht'),
        fu.box(1.6, 3.2, -11.0, -10.5, '', 'kommode'), fu.box(1.2, 2.0, -6.6, -5.8, '', 'sessel-W'),
        fu.shelf(1.0, 4.4, -1.6, -1.1), fu.shelf(mm(ANKLEIDE_BAD.w - 2.48), ANKLEIDE_BAD.w, SCHACHT_N.n, mm(SCHACHT_N.n + 0.5)), fu.shelf(0.9, 1.5, -4.8, -2.9),
        fu.tub(6.6, 8.4, -1.2, -0.45), fu.shower(ANKLEIDE_BAD.o, mm(ANKLEIDE_BAD.o + 1.2), VORDERWAND.n, mm(VORDERWAND.n + 1.2)), fu.basin(BAD_ABSTELL.w, -2.0, 1.4, 'E'), fu.wc(7.0, VORDERWAND.n, 'S'),
        fu.bed(12.6, 14.4, -8.7, -6.7, 'N'), fu.desk(13.9, 15.3, -11.29, -10.6, 'N'), fu.shelf(BUERO_GAESTE.o, mm(BUERO_GAESTE.o + 0.5), -10.6, -8.8),
        fu.shelf(12.2, 15.4, -1.6, -1.1), fu.shelf(BAD_ABSTELL.o, mm(BAD_ABSTELL.o + 2.08), VORDERWAND.n, mm(VORDERWAND.n + 0.5)),
        // draußen auf dem Balkon vor dem Büro, neben der Tür
        fu.table(9.15, 9.55, -12.45, -11.85, 1, false),
      ],
    };
  })();

