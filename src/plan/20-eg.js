    // Teil der Grundrisse (src/plan/, siehe 00-kern.js): Erdgeschoss
    EG: {
      titel: 'Erdgeschoss', ffb: HOUSE.Z.ffbEG,
      rooms: [
        { n: 'Wohnen', r: [0.36, 6.48, -11.29, -5.12] }, { n: 'Essen', r: [6.72, 11.28, -11.29, -5.12], at: [9.0, -10.6] },
        // Küche L-förmig: 1 m weiter nach Norden, dafür ist die Backkitchen kleiner (Daniel, 4.11.2026)
        { n: 'Küche', r: [11.52, 15.64, -11.29, -5.12], ext: [[11.92, 15.64, -5.12, -4.12]], at: [13.6, -10.4] },
        // Halle mit der Treppenbahn an der Rückwand: beim Hereinkommen steigt die Haupttreppe quer vor einem auf
        { n: 'Halle', r: [4.72, 11.68, -4.88, -0.36], core: true, at: [7.6, -2.2] },
        // Gäste-WC dort, wo früher der kleine Abstellraum war; an der alten WC-Stelle sitzt jetzt der Aufzug
        { n: 'Garderobe', r: [0.36, 4.48, -2.84, -0.36], at: [2.4, -1.65] }, { n: 'Gäste-WC', r: [0.36, 2.68, -4.88, -3.08], at: [1.52, -3.98] },
        { n: 'Backkitchen', r: [11.92, 15.64, -3.88, -0.36], at: [13.75, -1.65] },
      ],
      open: [[6.48, 6.72, -10.4, -5.9], [11.28, 11.52, -10.4, -6.2]],
      doors: [
        { x: 4.6, y: -1.85, w: 0.9, o: 'v', s: -1, h: 1 }, { x: 1.1, y: -2.96, w: 0.8, o: 'h', s: -1, h: 0 },
        { x: 11.8, y: -4.84, w: 0.7, o: 'v', s: 1, h: 0 }, { x: 12.3, y: -4.0, w: 0.9, o: 'h', s: 1, h: 1 },
        // vom Podest unter dem Treppenaustritt ins Wohnzimmer
        { x: 4.95, y: -5.0, w: 0.9, o: 'h', s: -1, h: 0 },
        { x: 7.35, y: -0.18, w: 1.3, o: 'h', s: -1, h: 0, t: 0.5 },
      ],
      furn: () => [
        fu.box(0.36, 0.86, -8.2, -6.95, 'Kamin'), fu.sofa(2.9, 3.85, -8.9, -6.3, 'E'), fu.box(1.45, 2.35, -8.15, -7.05, '', 'couchtisch'),
        fu.box(1.25, 2.05, -9.55, -8.75, '', 'sessel-S'), fu.box(1.25, 2.05, -6.45, -5.65, '', 'sessel-N'),
        fu.table(8.47, 9.53, -9.5, -6.9, 3),
        fu.box(13.3, 15.64, -4.77, -4.12, '', 'zeile'), fu.box(14.99, 15.64, -6.15, -4.77, '', 'zeile'), fu.hob(14.3, -4.45),
        fu.box(12.6, 14.6, -7.2, -6.2, 'Insel'),
        // kleiner Esstisch für vier vor den Gartentüren der Küche
        fu.table(12.75, 13.95, -10.45, -9.65, 2, false),
        fu.shelf(1.8, 3.1, -2.84, -2.24), fu.box(3.95, 4.48, -2.8, -2.05, 'Bank'),
        fu.wc(1.6, -4.88, 'S'), fu.basin(0.36, -3.7, 0.45, 'W'),
        fu.box(12.2, 15.64, -1.0, -0.36, '', 'zeile'), fu.box(12.8, 13.6, -0.95, -0.42, 'Spüle'), fu.box(15.0, 15.64, -3.6, -1.0, '', 'hochschrank'),
        fu.shelf(11.92, 12.5, -3.85, -1.4), fu.box(13.2, 14.6, -2.9, -2.1, 'Arbeitsfläche'),
        // Halle: Konsole mit Spiegel an der Nordwand neben dem Eingang, Garderobenschrank für Gäste in der Nordostecke
        fu.box(5.0, 6.4, -0.76, -0.36, '', 'konsole'), fu.box(11.08, 11.68, -2.9, -0.36, '', 'hochschrank'),
        // draußen: Lounge mittig unter dem Balkon (Blick in den Garten, vor der Fassade bleibt ein Gang), Esstisch auf dem Freisitz;
        // Liegen stehen am Pool, nicht am Haus
        fu.sofa(6.8, 9.2, -13.95, -13.1, 'N'), fu.box(7.4, 8.6, -14.85, -14.35, '', 'couchtisch'),
        fu.box(5.75, 6.55, -14.85, -14.05, '', 'sessel-W'), fu.box(9.45, 10.25, -14.85, -14.05, '', 'sessel-E'),
        fu.table(17.05, 17.95, -9.3, -7.3, 3),
      ],
    },
