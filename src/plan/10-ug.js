  // Teil der Grundrisse (src/plan/, siehe 00-kern.js): Untergeschoss mit Gym, Foyer und Technik
  // ---------- Grundrisse ----------
  // Jedes Geschoss nennt oben seine Innenwände als Achsen (wandX/wandY), benannt nach den Räumen beiderseits (West vor Ost, Süd vor
  // Nord): eine Wand verschieben heißt ihre Zahl ändern, Raumkanten, Türen und Möbel an der Wand folgen. Die Wände am Kern gelten in allen
  // Geschossen und kommen aus 00-kern.js (RUECKWAND, VORDERWAND, STIRNWAND, SCHACHT_W|N, LUFTWAND, dazu LINE und HAUSTUER)
  const FL = {};
  // UG-Achsen; Flur ist der Gang des Foyers an der Rückwand
  FL.UG = (() => {
    const GYM_FOYER = wandX(6.6), FOYER_SAUNA = wandX(9.4), SAUNA_DUSCHE = wandX(12.32);  // FOYER_SAUNA auch Foyer | Ruheraum
    const GYM_FLURENDE = wandX(4.6), FLURENDE_RUHERAUM = wandX(11.8);  // an den Enden des Flurs, zum Nordteil von Gym bzw. Ruheraum
    const WASCHEN_ABSTELL = wandX(4.6);
    const GYM_FLUR = wandY(-6.44), SAUNA_RUHERAUM = wandY(-8.38);  // GYM_FLUR auch Ruheraum | Flur, SAUNA_RUHERAUM auch Dusche / WC
    return {
      titel: 'Untergeschoss mit Tiefgarage', ffb: HOUSE.Z.ffbUG,
      rooms: [
        // Gym im Westen mit Sportboden und Lichthof davor (Daniel, 4.11.2026)
        { n: 'Gym', r: [0.36, GYM_FOYER.w, -11.29, GYM_FLUR.s], ext: [[0.36, GYM_FLURENDE.w, GYM_FLUR.s, RUECKWAND.s]], at: [3.0, -8.9] },
        // Zugang von der Tiefgarage mittig, wo früher die Fahrräder standen: Foyer, Flur und Treppenbahn
        { n: 'Foyer', r: [GYM_FOYER.o, FOYER_SAUNA.w, -11.29, GYM_FLUR.n], ext: [[GYM_FLURENDE.o, FLURENDE_RUHERAUM.w, GYM_FLUR.n, RUECKWAND.s], LINE], core: true, at: [8.0, -8.9] },
        { n: 'Ruheraum', r: [FOYER_SAUNA.o, 15.64, SAUNA_RUHERAUM.n, GYM_FLUR.s], ext: [[FLURENDE_RUHERAUM.o, 15.64, GYM_FLUR.s, RUECKWAND.s]], at: [12.6, -7.0] },
        { n: 'Sauna', r: [FOYER_SAUNA.o, SAUNA_DUSCHE.w, -11.29, SAUNA_RUHERAUM.s], at: [10.86, -9.9] }, { n: 'Dusche / WC', r: [SAUNA_DUSCHE.o, 15.64, -11.29, SAUNA_RUHERAUM.s], at: [13.9, -9.9] },
        { n: 'Technik', r: [STIRNWAND.o, 15.64, RUECKWAND.n, -0.36], at: [13.8, -2.6] },
        // Waschen und ein richtiger Abstellraum nebeneinander (Hauswirtschaft); der Aufzug sitzt im Wandblock daneben
        { n: 'Waschen', r: [0.36, WASCHEN_ABSTELL.w, SCHACHT_N.n, -0.36], ext: [[0.36, SCHACHT_W.w, RUECKWAND.n, SCHACHT_N.n]], at: [2.3, -1.6] },
        { n: 'Abstellraum', r: [WASCHEN_ABSTELL.o, STIRNWAND.w, VORDERWAND.n, -0.36], at: [8.2, -1.85] },
      ],
      // Durchgänge vom Flur zur Treppenbahn: im Westen zum Aufzug und Abstellraum, im Osten zum Antritt der Kellertreppe; so breit, wie
      // Flur und Bahn sich gegenüberliegen (sonst bliebe nach dem Verschieben eines Flurendes eine Nische in der Rückwand)
      open: [[Math.max(LINE[0], GYM_FLURENDE.o), FLIGHTS.UG.x1, RUECKWAND.s, RUECKWAND.n], [FLIGHTS.UG.x0, Math.min(LINE[1], FLURENDE_RUHERAUM.w), RUECKWAND.s, RUECKWAND.n]],
      doors: [
        { x: 7.3, y: -11.47, w: 0.7, o: 'h', s: 1, h: 0, t: 0.5 }, { x: 8.0, y: -11.47, w: 0.7, o: 'h', s: 1, h: 1, t: 0.5 },
        { x: GYM_FOYER.m, y: -8.0, w: 0.9, o: 'v', s: -1, h: 0 }, { x: FLURENDE_RUHERAUM.m, y: -6.2, w: 0.85, o: 'v', s: 1, h: 0 },
        { x: 10.4, y: SAUNA_RUHERAUM.m, w: 0.7, o: 'h', s: -1, h: 0 }, { x: 13.4, y: SAUNA_RUHERAUM.m, w: 0.8, o: 'h', s: -1, h: 0 },
        { x: STIRNWAND.m, y: -4.8, w: 0.85, o: 'v', s: 1, h: 0 }, { x: 4.85, y: VORDERWAND.m, w: 0.8, o: 'h', s: 1, h: 0 },
        { x: WASCHEN_ABSTELL.m, y: -2.6, w: 0.85, o: 'v', s: -1, h: 0 },
      ],
      furn: () => [
        fu.box(0.9, 1.7, -10.9, -9.0, 'Laufband'), fu.box(2.3, 3.1, -10.9, -9.3, 'Rad'), fu.box(3.9, 6.1, -10.9, -9.8, 'Matte'),
        fu.box(1.0, 2.8, -6.9, -5.6, 'Kraftstation'),
        fu.box(GYM_FOYER.o, mm(GYM_FOYER.o + 0.45), -10.5, -8.6, 'Bank'), fu.shelf(mm(FOYER_SAUNA.w - 0.6), FOYER_SAUNA.w, -10.7, -7.2),
        fu.box(FOYER_SAUNA.o, SAUNA_DUSCHE.w, -11.29, -10.69, '', 'saunabank'), fu.box(FOYER_SAUNA.o, mm(FOYER_SAUNA.o + 0.6), -10.69, -8.9, '', 'saunabank'),
        fu.box(mm(SAUNA_DUSCHE.w - 0.8), mm(SAUNA_DUSCHE.w - 0.3), mm(SAUNA_RUHERAUM.s - 0.7), mm(SAUNA_RUHERAUM.s - 0.2), 'Ofen'),  // mit Abstand in der Nordostecke
        fu.shower(14.44, 15.64, -11.29, -10.09), fu.wc(15.64, -9.3, 'E'), fu.basin(13.2, -11.29, 0.6, 'S'),
        fu.box(9.9, 11.5, -7.9, -7.2, 'Liege'), fu.box(12.0, 13.6, -7.9, -7.2, 'Liege'), fu.shelf(15.04, 15.64, -8.0, -5.5),
        fu.box(12.2, 13.8, -1.5, -0.6, 'Wärmepumpe'), Ci(14.8, -1.25, 0.5, 'g-furn'), T(14.8, -1.33, 'Speicher', 'g-ftxt'), fu.box(12.2, 13.4, -3.6, -2.8, 'Anschluss'),
        fu.box(0.6, 1.2, -1.0, -0.4, 'WM'), fu.box(1.3, 1.9, -1.0, -0.4, 'TR'), fu.box(2.1, 3.3, -0.96, -0.4, 'Spüle', 'spuelzeile'), fu.shelf(0.36, 0.86, -4.6, -2.2),
        fu.shelf(5.0, 11.4, -0.96, -0.36), fu.shelf(mm(STIRNWAND.w - 2.48), STIRNWAND.w, VORDERWAND.n, mm(VORDERWAND.n + 0.6)),
      ],
    };
  })();
