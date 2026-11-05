  // Teil der Grundrisse (src/plan/, siehe 00-kern.js): Erdgeschoss
  // EG-Achsen (siehe 10-ug.js); die Halle reicht von GARDEROBE_HALLE bis an die STIRNWAND und muss am Aufzug (LINE[0]) bleiben
  FL.EG = (() => {
    const GARDEROBE_HALLE = wandX(4.6), WOHNEN_ESSEN = wandX(6.6), ESSEN_KUECHE = wandX(11.4);  // die beiden letzten mit Durchgang
    const KUECHE_BACK = wandY(-4.0);  // Küche | Backkitchen
    return {
      titel: 'Erdgeschoss', ffb: HOUSE.Z.ffbEG,
      rooms: [
        { n: 'Wohnen', r: [0.36, WOHNEN_ESSEN.w, -11.29, RUECKWAND.s] }, { n: 'Essen', r: [WOHNEN_ESSEN.o, ESSEN_KUECHE.w, -11.29, RUECKWAND.s], at: [9.0, -10.6] },
        // Küche L-förmig: 1 m weiter nach Norden, dafür ist die Backkitchen kleiner (Daniel, 4.11.2026)
        { n: 'Küche', r: [ESSEN_KUECHE.o, 15.64, -11.29, RUECKWAND.s], ext: [[STIRNWAND.o, 15.64, RUECKWAND.s, KUECHE_BACK.s]], at: [13.6, -10.4] },
        // Halle mit der Treppenbahn an der Rückwand: beim Hereinkommen steigt die Haupttreppe quer vor einem auf
        { n: 'Halle', r: [GARDEROBE_HALLE.o, STIRNWAND.w, RUECKWAND.n, -0.36], core: true, at: [7.6, -2.2] },
        // Gäste-WC dort, wo früher der kleine Abstellraum war; an der alten WC-Stelle sitzt jetzt der Aufzug
        { n: 'Garderobe', r: [0.36, GARDEROBE_HALLE.w, SCHACHT_N.n, -0.36], at: [2.4, -1.65] }, { n: 'Gäste-WC', r: [0.36, SCHACHT_W.w, RUECKWAND.n, SCHACHT_N.s], at: [1.52, -3.98] },
        { n: 'Backkitchen', r: [STIRNWAND.o, 15.64, KUECHE_BACK.n, -0.36], at: [13.75, -1.65] },
      ],
      open: [[WOHNEN_ESSEN.w, WOHNEN_ESSEN.o, -10.4, -5.9], [ESSEN_KUECHE.w, ESSEN_KUECHE.o, -10.4, -6.2]],
      doors: [
        { x: GARDEROBE_HALLE.m, y: -1.85, w: 0.9, o: 'v', s: -1, h: 1 }, { x: 1.1, y: SCHACHT_N.m, w: 0.8, o: 'h', s: -1, h: 0 },
        { x: STIRNWAND.m, y: -4.84, w: 0.7, o: 'v', s: 1, h: 0 }, { x: 12.3, y: KUECHE_BACK.m, w: 0.9, o: 'h', s: 1, h: 1 },
        // vom Podest unter dem Treppenaustritt ins Wohnzimmer
        { x: 4.95, y: RUECKWAND.m, w: 0.9, o: 'h', s: -1, h: 0 },
        // Haustür: Lage und Breite kommen aus der Nordfassade (HAUSTUER in 00-kern.js)
        { ...HAUSTUER, o: 'h', s: -1, h: 0, t: 0.5 },
      ],
      furn: () => [
        fu.box(0.36, 0.86, -8.2, -6.95, 'Kamin'), fu.sofa(2.9, 3.85, -8.9, -6.3, 'E'), fu.box(1.45, 2.35, -8.15, -7.05, '', 'couchtisch'),
        fu.box(1.25, 2.05, -9.55, -8.75, '', 'sessel-S'), fu.box(1.25, 2.05, -6.45, -5.65, '', 'sessel-N'),
        fu.table(8.47, 9.53, -9.5, -6.9, 3),
        // Küchenzeile als L an der Wand zur Backkitchen und an der Außenwand, wandert ganz mit KUECHE_BACK
        fu.box(13.3, 15.64, mm(KUECHE_BACK.s - 0.65), KUECHE_BACK.s, '', 'zeile'), fu.box(14.99, 15.64, mm(KUECHE_BACK.s - 2.03), mm(KUECHE_BACK.s - 0.65), '', 'zeile'), fu.hob(14.3, mm(KUECHE_BACK.s - 0.33)),
        fu.box(12.6, 14.6, -7.2, -6.2, 'Insel'),
        // kleiner Esstisch für vier vor den Gartentüren der Küche
        fu.table(12.75, 13.95, -10.45, -9.65, 2, false),
        fu.shelf(1.8, 3.1, SCHACHT_N.n, mm(SCHACHT_N.n + 0.6)), fu.box(mm(GARDEROBE_HALLE.w - 0.53), GARDEROBE_HALLE.w, -2.8, -2.05, 'Bank'),
        fu.wc(1.6, RUECKWAND.n, 'S'), fu.basin(0.36, -3.7, 0.45, 'W'),
        fu.box(12.2, 15.64, -1.0, -0.36, '', 'zeile'), fu.box(12.8, 13.6, -0.95, -0.42, 'Spüle'), fu.box(15.0, 15.64, -3.6, -1.0, '', 'hochschrank'),
        fu.shelf(STIRNWAND.o, mm(STIRNWAND.o + 0.58), mm(KUECHE_BACK.n + 0.03), mm(KUECHE_BACK.n + 2.48)), fu.box(13.2, 14.6, -2.9, -2.1, 'Arbeitsfläche'),
        // Halle: Konsole mit Spiegel an der Nordwand neben dem Eingang (1,40 m, 0,20 m westlich der Öffnung, wandert mit der Haustür),
        // Garderobenschrank für Gäste in der Nordostecke
        fu.box(mm(EINGANG.x0 - 1.6), mm(EINGANG.x0 - 0.2), -0.76, -0.36, '', 'konsole'), fu.box(mm(STIRNWAND.w - 0.6), STIRNWAND.w, -2.9, -0.36, '', 'hochschrank'),
        // draußen: Lounge mittig unter dem Balkon (Blick in den Garten, vor der Fassade bleibt ein Gang), Esstisch auf dem Freisitz;
        // Liegen stehen am Pool, nicht am Haus
        fu.sofa(6.8, 9.2, -13.95, -13.1, 'N'), fu.box(7.4, 8.6, -14.85, -14.35, '', 'couchtisch'),
        fu.box(5.75, 6.55, -14.85, -14.05, '', 'sessel-W'), fu.box(9.45, 10.25, -14.85, -14.05, '', 'sessel-E'),
        fu.table(17.05, 17.95, -9.3, -7.3, 3),
      ],
    };
  })();
