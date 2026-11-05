  // Teil des 3D-Modells (src/view3d/, siehe 00-kern.js): die Rundgänge TOURS. Abgefahren werden sie in 80-steuerung.js; hier steht nichts
  // mit three.js, damit tools/wege.js sie in Node genauso ausrechnen kann (./vg wege).
  // Wege in Augenhöhe: [x, y (Plan), Boden, { eye, label, wait, look: [x, y, Höhe], v, r }]. Ecken werden gerundet (bis r, sonst 0,7 m),
  // die Kamera schaut voraus und an Haltepunkten zum Blickziel. Türen und Tore öffnen sich von selbst, unter Wasser wird es blau.
  // Im Haus sind es Ziele, die weg() (75-wege.js) über den Grundriss zu Punkten macht: Räume, Außentüren, Treppenläufe; draußen feste Punkte.
  const UG = ZF.UG;
  // Rampe im Längsprofil (HOUSE.rampe.z) etwa im Metertakt abfahren, damit die Knicke stimmen
  const rampWay = (x = 21.13) => {
    const R = HOUSE.rampe, y1 = R.yTor - 0.4, n = Math.ceil(y1 - R.y0), iP = Math.round((R.yPortal - R.y0) / (y1 - R.y0) * n);
    return Array.from({ length: n + 1 }, (_, i) => { const y = R.y0 + (y1 - R.y0) * i / n; return [x, y, R.z(y), { v: 1.8, ...(i === iP ? { label: 'Unter dem Poolhaus' } : {}) }]; });
  };
  const zBalk = HOUSE.balkonDG.slab[1] + 0.02;
  const TOURS = rundgaenge({
    ankommen: () => [
      [24.25, -54.2, 0, { label: 'Ebertstraße', wait: 1.2, look: [24.0, -46, 1.4] }], [24.25, -52.4, 0, { label: 'Gartentür' }], [24.25, -50.4, 0.016],
      [23.64, -48.4, 0.016, { label: 'Weg zum Haus', v: 2.5 }], [23.64, -30.6, 0.016, { label: 'Am Poolhaus vorbei', v: 2.5 }], [23.64, 1.75, 0.016, { label: 'Nordseite', v: 2.1 }],
      // vor der Haustür stehen bleiben, übers Podest hinein und hinter dem Flügel auf die Treppe an der Rückwand schauen; dann am Westpodest
      // durch die Tür ins Wohnen und durchs Essen zur Gartentür
      [12.5, 1.75, 0.016], { bei: { tuer: 'EG N', a: 2.23 }, z: 0.016, label: 'Eingang', wait: 1.4, look: { tuer: 'EG N', h: 2.0 } },
      { rein: 'N', vor: 0.78, z: 0.18, label: 'Halle', wait: 2.2, look: { lauf: 'EG', h: 2.2 } },
      { raum: 'Wohnen', label: 'Wohnen' }, { raum: 'Essen', label: 'Essen' }, { raus: 'S', label: 'Gartentür', vor: 0.98, z: 0.18, aussen: { label: 'Terrasse' } },
      [10.75, -12.6, 0.18], [10.75, -15.0, 0.18],
      [9.1, -15.4, 0.18, { wait: 1.6, look: [8.0, -30.0, 0.6] }], [8.4, -16.1, 0.09], [8.1, -17.0, 0.03, { label: 'Weg zum Pool' }], [8.0, -22.9, 0.03], [8.0, -24.3, 0.04, { label: 'Pool', wait: 1.2, look: [8.0, -34, -0.6] }],
      ...HOUSE.pool.stufen.map((z, i) => [8.0, -25.05 - HOUSE.pool.tritt * i, z, { v: 0.8 }]),
      [8.0, -26.9, -1.4, { eye: 0.15, label: 'Im Pool' }], [8.0, -28.2, -1.4, { eye: -0.55, label: 'Abtauchen' }], [8.0, -33.4, -1.4, { eye: -0.75, v: 1.2 }],
      [8.0, -35.6, -1.4, { eye: 0.12, label: 'Aufgetaucht', wait: 3.2, look: [8.0, 3.0, 4.5] }],
    ],
    // Start am Garteneingang an der Straße, über die Zufahrt die Rampe hinunter (Höhen nach dem Längsprofil) und durchs Tor
    garage: () => [
      [24.25, -53.0, 0, { label: 'Garteneingang', wait: 1.4, look: [22.0, -40.0, 0.6] }], [24.25, -50.6, 0.016], [22.6, -50.1, 0.016],
      [21.13, -49.4, HOUSE.rampe.z(-49.4), { label: 'Rampe zur Tiefgarage' }],
      ...rampWay(),
      [21.0, -23.3, UG, { label: 'Tiefgarage', wait: 1.8, look: [14.0, -19.5, UG + 0.8] }], [19.2, -19.0, UG, { label: 'Ferrari F8 · Cayenne Coupé · V-Klasse' }],
      // Vom Fahrgassenende auf dem Gang zwischen P3 und den Fahrrädern nach Westen zum Eingangsbereich mittig vor dem Haus, durch die Doppeltür ins Foyer
      [18.6, -13.75, UG], [12.2, -13.75, UG], [9.6, -13.2, UG, { label: 'Eingang zum Haus', wait: 1.2, look: { tuer: 'UG S', h: 1.3 } }],
      { rein: 'S', vor: 0.93, label: 'Foyer' }, { label: 'Untergeschoss' }, { treppe: 'hoch', label: 'Treppe' },
      // Drei gerade Läufe übereinander, alle nach Westen: oben am Westpodest an, durch Halle bzw. Flur zurück zum nächsten Antritt im Osten;
      // im DG durch den Flur ins Büro und auf den Balkon
      { raum: 'Halle', label: 'Halle', bei: [0.33, 0.5], wait: 1.4, look: { lauf: 'EG', h: 1.8 } }, { treppe: 'hoch' },
      { treppe: 'hoch', label: 'Galerie', wait: 1.8, look: { raum: 'Halle', fl: 'EG', h: 0.8 } },
      { label: 'Dachgeschoss' }, { raum: 'Büro', label: 'Büro' }, { raus: 'S', vor: 0.48, z: zBalk, aussen: { label: 'Balkon im DG' } },
      [7.2, -12.25, zBalk, { wait: 3.0, look: [8.0, -32.0, 0.5] }],
    ],
    eg: () => [
      // Halle gleich hinter der Haustür mit Blick auf die Treppe, am Westpodest durch die Tür ins Wohnen (Blick zum Kamin), Essen, Küche,
      // Backkitchen und über die Küchentür zurück in die Halle, zum Schluss Blick auf die Haustür
      { raum: 'Halle', fl: 'EG', label: 'Halle', bei: { tuer: 'EG N', a: -0.72 }, wait: 1.5, look: { lauf: 'EG', h: 2.0 } },
      { raum: 'Wohnen', label: 'Wohnen', bei: [0.79, 0.63], wait: 1.6, look: { moebel: 'Kamin', h: 0.8 } },
      { raum: 'Essen', label: 'Essen' }, { raum: 'Küche', label: 'Küche', bei: [0.15, 0.35], wait: 1.6, look: { raum: 'Küche', h: 0.6 } },
      { raum: 'Backkitchen', label: 'Backkitchen', wait: 1.2, look: { raum: 'Backkitchen', h: 0.8 } },
      { raum: 'Halle', label: 'Halle', bei: { tuer: 'EG N', a: -1.22 }, wait: 2.0, look: { tuer: 'EG N', a: 0.68, h: 1.6 } },
    ],
    garten: () => [
      [2.0, -12.6, 0.18, { label: 'Terrasse', wait: 1.2, look: [16, -12.6, 1.4] }], [15.5, -12.6, 0.18], [17.5, -11.2, 0.18, { label: 'Freisitz' }],
      [17.5, -10.45, 0.18, { wait: 1.4, look: [17.5, -7.0, 1.0] }], [16.0, -12.6, 0.18], [10.75, -12.7, 0.18], [10.75, -15.0, 0.18], [9.1, -15.4, 0.18],
      [8.4, -16.1, 0.09], [8.2, -17.0, 0.03, { label: 'Garten' }], [8.0, -22.6, 0.03], [10.6, -23.6, 0.04, { label: 'Poolterrasse' }], [13.3, -24.5, 0.04], [13.9, -28.6, 0.04],
      [16.0, -29.0, 0.04], [18.0, -29.3, 0.04, { label: 'Poolhaus', wait: 1.6, look: [21.5, -30.6, 1.3] }], [19.0, -30.65, 0.04],
      [20.5, -30.65, HOUSE.poolhaus.z, { label: 'Im Poolhaus', wait: 1.6, look: [22.4, -30.6, 1.2] }], [19.0, -30.65, 0.04], [16.0, -31.3, 0.04], [13.3, -34.2, 0.04],
      [13.3, -37.2, 0.04], [10.5, -37.6, 0.04], [8.0, -37.6, 0.04, { label: 'Blick aufs Haus', wait: 3.0, look: [8.0, 2.0, 5.0] }],
    ],
  });
