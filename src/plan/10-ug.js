  // Teil der Grundrisse (src/plan/, siehe 00-kern.js): Untergeschoss mit Gym, Foyer und Technik
  // ---------- Grundrisse ----------
  const FL = {
    UG: {
      titel: 'Untergeschoss mit Tiefgarage', ffb: HOUSE.Z.ffbUG,
      rooms: [
        // Gym im Westen mit Sportboden und Lichthof davor (Daniel, 4.11.2026)
        { n: 'Gym', r: [0.36, 6.48, -11.29, -6.56], ext: [[0.36, 4.48, -6.56, -5.12]], at: [3.0, -8.9] },
        // Zugang von der Tiefgarage mittig, wo früher die Fahrräder standen: Foyer, Flur und Treppenbahn
        { n: 'Foyer', r: [6.72, 9.28, -11.29, -6.32], ext: [[4.72, 11.68, -6.32, -5.12], LINE], core: true, at: [8.0, -8.9] },
        { n: 'Ruheraum', r: [9.52, 15.64, -8.26, -6.56], ext: [[11.92, 15.64, -6.56, -5.12]], at: [12.6, -7.0] },
        { n: 'Sauna', r: [9.52, 12.2, -11.29, -8.5], at: [10.86, -9.9] }, { n: 'Dusche / WC', r: [12.44, 15.64, -11.29, -8.5], at: [13.9, -9.9] },
        { n: 'Technik', r: [11.92, 15.64, -4.88, -0.36], at: [13.8, -2.6] },
        // Waschen und ein richtiger Abstellraum nebeneinander (Hauswirtschaft); der Aufzug sitzt im Wandblock daneben
        { n: 'Waschen', r: [0.36, 4.48, -2.84, -0.36], ext: [[0.36, 2.68, -4.88, -2.84]], at: [2.3, -1.6] },
        { n: 'Abstellraum', r: [4.72, 11.68, -3.34, -0.36], at: [8.2, -1.85] },
      ],
      // Durchgänge vom Flur zur Treppenbahn: im Westen zum Aufzug und Abstellraum, im Osten zum Antritt der Kellertreppe
      open: [[4.72, FLIGHTS.UG.x1, -5.12, -4.88], [FLIGHTS.UG.x0, 11.68, -5.12, -4.88]],
      doors: [
        { x: 7.3, y: -11.47, w: 0.7, o: 'h', s: 1, h: 0, t: 0.5 }, { x: 8.0, y: -11.47, w: 0.7, o: 'h', s: 1, h: 1, t: 0.5 },
        { x: 6.6, y: -8.0, w: 0.9, o: 'v', s: -1, h: 0 }, { x: 11.8, y: -6.2, w: 0.85, o: 'v', s: 1, h: 0 },
        { x: 10.4, y: -8.38, w: 0.7, o: 'h', s: -1, h: 0 }, { x: 13.4, y: -8.38, w: 0.8, o: 'h', s: -1, h: 0 },
        { x: 11.8, y: -4.8, w: 0.85, o: 'v', s: 1, h: 0 }, { x: 4.85, y: -3.46, w: 0.8, o: 'h', s: 1, h: 0 },
        { x: 4.6, y: -2.6, w: 0.85, o: 'v', s: -1, h: 0 },
      ],
      furn: () => [
        fu.box(0.9, 1.7, -10.9, -9.0, 'Laufband'), fu.box(2.3, 3.1, -10.9, -9.3, 'Rad'), fu.box(3.9, 6.1, -10.9, -9.8, 'Matte'),
        fu.box(1.0, 2.8, -6.9, -5.6, 'Kraftstation'),
        fu.box(6.72, 7.17, -10.5, -8.6, 'Bank'), fu.shelf(8.68, 9.28, -10.7, -7.2),
        fu.box(9.52, 12.2, -11.29, -10.69, '', 'saunabank'), fu.box(9.52, 10.12, -10.69, -8.9, '', 'saunabank'), fu.box(11.4, 11.9, -9.2, -8.7, 'Ofen'),
        fu.shower(14.44, 15.64, -11.29, -10.09), fu.wc(15.64, -9.3, 'E'), fu.basin(13.2, -11.29, 0.6, 'S'),
        fu.box(9.9, 11.5, -7.9, -7.2, 'Liege'), fu.box(12.0, 13.6, -7.9, -7.2, 'Liege'), fu.shelf(15.04, 15.64, -8.0, -5.5),
        fu.box(12.2, 13.8, -1.5, -0.6, 'Wärmepumpe'), Ci(14.8, -1.25, 0.5, 'g-furn'), T(14.8, -1.33, 'Speicher', 'g-ftxt'), fu.box(12.2, 13.4, -3.6, -2.8, 'Anschluss'),
        fu.box(0.6, 1.2, -1.0, -0.4, 'WM'), fu.box(1.3, 1.9, -1.0, -0.4, 'TR'), fu.box(2.1, 3.3, -0.96, -0.4, 'Spüle', 'spuelzeile'), fu.shelf(0.36, 0.86, -4.6, -2.2),
        fu.shelf(5.0, 11.4, -0.96, -0.36), fu.shelf(9.2, 11.68, -3.34, -2.74),
      ],
    },
