  // Teil der Grundrisse (src/plan/, siehe 00-kern.js): Obergeschoss
  // OG-Achsen (siehe 10-ug.js); Kind 2 endet im Osten an der LUFTWAND, Kind 4 im Westen an der STIRNWAND (beide 00-kern.js)
  FL.OG = (() => {
    const BADWEST_FLUR = wandX(4.6), FLUR_BADOST = wandX(11.4);  // im Süden zwischen den Teilen von Kind 1 bzw. Kind 3 (gemeldet)
    const KIND1_FLUR = wandX(6.6), FLUR_KIND3 = wandX(9.4);  // am Mittelgang zur Balkontür
    const KIND1_BAD = wandY(-7.12), KIND3_BAD = wandY(-7.12), KINDER_FLUR = wandY(-6.44);  // KINDER_FLUR: Kind 1 und Kind 3 | Flur
    return {
      titel: 'Obergeschoss', ffb: HOUSE.Z.ffbOG,
      rooms: [
        // vier größere Kinderzimmer (Daniel, 4.11.2026: kein Wohnzimmer im OG) und zwei Bäder mit Wanne, die sich je zwei Kinder teilen
        { n: 'Kind 1', r: [0.36, BADWEST_FLUR.w, -11.29, KIND1_BAD.s], ext: [[BADWEST_FLUR.o, KIND1_FLUR.w, -11.29, KINDER_FLUR.s]], at: [2.5, -9.7] },
        { n: 'Bad West', r: [0.36, BADWEST_FLUR.w, KIND1_BAD.n, RUECKWAND.s], at: [2.4, -6.06] },
        { n: 'Kind 2', r: [0.36, LUFTWAND.w, SCHACHT_N.n, -0.36], ext: [[0.36, SCHACHT_W.w, RUECKWAND.n, SCHACHT_N.n], [LINE[0], LUFTWAND.w, VORDERWAND.n, SCHACHT_N.n]], at: [3.4, -1.75] },
        { n: 'Kind 3', r: [FLUR_BADOST.o, 15.64, -11.29, KIND3_BAD.s], ext: [[FLUR_KIND3.o, FLUR_BADOST.w, -11.29, KINDER_FLUR.s]], at: [13.5, -9.7] },
        { n: 'Bad Ost', r: [FLUR_BADOST.o, 15.64, KIND3_BAD.n, RUECKWAND.s], at: [13.6, -6.06] },
        { n: 'Kind 4', r: [STIRNWAND.o, 15.64, RUECKWAND.n, -0.36], at: [13.8, -2.4] },
        // Flur mit Treppenbahn: die Haupttreppe kommt im Westen an, die Dachtreppe beginnt im Osten; Mittelgang bis zur Balkontür
        { n: 'Flur', r: [BADWEST_FLUR.o, FLUR_BADOST.w, KINDER_FLUR.n, RUECKWAND.s], ext: [[KIND1_FLUR.o, FLUR_KIND3.w, -11.29, KINDER_FLUR.n], LINE], core: true, at: [8.0, -9.2] },
      ],
      // Durchgänge vom Flur zum Podest und zum Antritt der Dachtreppe, so breit, wie Flur und Treppenbahn sich gegenüberliegen
      open: [...VOID, [Math.max(LINE[0], BADWEST_FLUR.o), FLIGHTS.EG.x1, RUECKWAND.s, RUECKWAND.n], [FLIGHTS.OG.x0, FLUR_BADOST.w, RUECKWAND.s, RUECKWAND.n]],
      doors: [
        { x: 5.2, y: KINDER_FLUR.m, w: 0.85, o: 'h', s: -1, h: 0 }, { x: BADWEST_FLUR.m, y: -6.2, w: 0.75, o: 'v', s: -1, h: 0 },
        { x: 4.9, y: VORDERWAND.m, w: 0.8, o: 'h', s: 1, h: 0 }, { x: 10.0, y: KINDER_FLUR.m, w: 0.85, o: 'h', s: -1, h: 1 },
        { x: FLUR_BADOST.m, y: -6.2, w: 0.75, o: 'v', s: 1, h: 0 }, { x: STIRNWAND.m, y: -4.8, w: 0.8, o: 'v', s: 1, h: 0 },
      ],
      furn: () => [
        fu.bed(1.0, 2.4, mm(KIND1_BAD.s - 2), KIND1_BAD.s, 'N'), fu.desk(2.7, 4.1, -11.29, -10.6, 'N'),
        fu.shelf(mm(BADWEST_FLUR.w - 1.48), BADWEST_FLUR.w, mm(KIND1_BAD.s - 0.6), KIND1_BAD.s), fu.shelf(BADWEST_FLUR.o, mm(BADWEST_FLUR.o + 0.6), -11.0, -8.6),
        // WC je an der Wand zum Flur, 0,35 m vor der Wand zum Kinderzimmer (die Ecke wandert mit beiden Wänden)
        fu.tub(0.5, 2.2, KIND1_BAD.n, mm(KIND1_BAD.n + 0.75)), fu.basin(3.0, RUECKWAND.s, 1.2, 'N'), fu.wc(BADWEST_FLUR.w, mm(KIND1_BAD.n + 0.35), 'E'),
        fu.bed(0.5, 2.5, -4.78, -3.38, 'W'), fu.desk(2.8, 4.2, -1.06, -0.36, 'S'), fu.shelf(mm(LUFTWAND.w - 0.6), LUFTWAND.w, -2.8, -0.6),
        fu.bed(13.64, 15.04, mm(KIND3_BAD.s - 2), KIND3_BAD.s, 'N'), fu.desk(11.92, 13.32, -11.29, -10.6, 'N'),
        fu.shelf(FLUR_BADOST.o, mm(FLUR_BADOST.o + 1.48), mm(KIND3_BAD.s - 0.6), KIND3_BAD.s), fu.shelf(mm(FLUR_BADOST.w - 0.6), FLUR_BADOST.w, -11.0, -8.6),
        fu.tub(13.8, 15.5, KIND3_BAD.n, mm(KIND3_BAD.n + 0.75)), fu.basin(12.8, RUECKWAND.s, 1.2, 'N'), fu.wc(FLUR_BADOST.o, mm(KIND3_BAD.n + 0.35), 'W'),
        fu.bed(13.9, 15.3, RUECKWAND.n, mm(RUECKWAND.n + 2), 'S'), fu.desk(12.2, 13.6, -1.06, -0.36, 'S'), fu.shelf(STIRNWAND.o, mm(STIRNWAND.o + 0.6), -4.2, -1.6),
        fu.box(KIND1_FLUR.o, mm(KIND1_FLUR.o + 0.45), -10.6, -8.6, 'Bank'),
        // draußen auf dem Balkon über der Terrasse
        fu.table(7.4, 8.6, -13.6, -12.9, 1, false),
      ],
    };
  })();
