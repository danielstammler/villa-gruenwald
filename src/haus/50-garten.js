// Teil des Hausmodells (src/haus/, siehe 00-grund.js): Garten mit Hecken und Spielplatz (HOUSE.garten)

// Garten (Daniel, 4.11.2026): Hecken an allen Grenzen und an der Rampe, Spielplatz im Vorgarten. Gemeinsame Daten für 3D-Modell und Lageplan.
HOUSE.garten = (() => {
  const P0 = SITE.plot;
  // Hecken als Läufe entlang der Punkte: Mitte off Meter links der Laufrichtung (innen), Breite b, Höhe h bis h + dh über z0, t0 und t1 kürzen
  // Anfang und Ende. Seitlich hoch als Sichtschutz, im Norden niedrig (Blick auf den Eingang), an der Straße hinter dem Zaun, an der Rampe.
  const hecken = [
    { name: 'Hecke', tip: 'Sichtschutz an der Westgrenze', pts: [P0[6], P0[0]], off: 0.5, b: 0.6, h: 2.6, dh: 0.25, t1: 0.45 },
    { name: 'Hecke', tip: 'Sichtschutz an der Ostgrenze, entlang der Zuwegung', pts: [[25.059, -44.0], P0[4]], off: 0.45, b: 0.5, h: 2.6, dh: 0.25 },
    // Vor dem Zaun an der Ostgrenze bis kurz hinter die Gartentür: Pflanztröge auf dem Pflaster, ohne Aushub im Wurzelschutzbereich des Schutzbaums
    { name: 'Hecke in Pflanztrögen', tip: 'vor dem Zaun an der Ostgrenze bis zur Gartentür · Tröge auf dem Pflaster, ohne Aushub im Wurzelschutzbereich',
      pts: [[25.058, -49.95], [25.059, -44.0]], off: 0.54, b: 0.4, h: 2.15, dh: 0.2, z0: 0.45, trog: 0.32 },
    { name: 'Hecke', tip: 'Nordgrenze, niedrig für den Blick auf den Eingang', pts: [P0[4], P0[5], P0[6]], off: 0.5, b: 0.6, h: 1.2, dh: 0.18 },
    { name: 'Hecke hinter dem Zaun', tip: 'über die ganze Straßenseite bis zur Rampe', pts: [P0[0], P0[1], P0[2]], off: 1.0, b: 0.7, h: 1.8, dh: 0.15, t0: 0.7 },
    { name: 'Hecke an der Rampe', tip: 'westlich der offenen Rampe zur Tiefgarage, verdeckt Betonwand und Geländer', pts: [[18.98, -49.75], [18.98, -34.0]], off: 0, b: 0.74, h: 1.62, dh: 0.12 },
  ];
  // Mittellinie: Punkte um off nach links versetzt, Ecken auf Gehrung, Anfang und Ende um t0 und t1 gekürzt
  for (const H of hecken) {
    const P = H.pts, n = P.length, dir = i => { const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1], l = Math.hypot(dx, dy); return [dx / l, dy / l]; };
    H.linie = P.map((p, i) => {
      const a = dir(Math.max(0, i - 1)), b = dir(Math.min(n - 2, i)), m = [-a[1] - b[1], a[0] + b[0]], ml = Math.hypot(m[0], m[1]), k = H.off / ((m[1] * a[0] - m[0] * a[1]) / ml);
      return [p[0] + m[0] / ml * k, p[1] + m[1] / ml * k];
    });
    const d0 = dir(0), d1 = dir(n - 2), q0 = H.linie[0], q1 = H.linie[n - 1], t0 = H.t0 || 0, t1 = H.t1 || 0;
    H.linie[0] = [q0[0] + d0[0] * t0, q0[1] + d0[1] * t0]; H.linie[n - 1] = [q1[0] - d1[0] * t1, q1[1] - d1[1] * t1];
  }
  // Spielplatz südlich der Poolterrasse zwischen drei Bäumen, mit Abstand zu den Stämmen. Spielturm mit Podest 1,50 × 1,50 m in 1,50 m Höhe
  // (= freie Fallhöhe), Satteldach und Sandkasten; Kletterwand nach Norden, Kletternetz nach Süden, Rutsche nach Osten; im Westen eine Doppelschaukel.
  const turm = { x: 9.55, y: -41.45, a: 0.75, podest: 1.5, traufe: 2.55, first: 3.25 };
  const spiel = { turm, wand: { tief: 0.7, b: 0.9 }, netz: { tief: 1.2, b: 1.1 }, rutsche: { len: 2.71, b: 0.47, aus: 0.25 },
    schaukel: { x0: 4.35, x1: 7.05, y: -41.5, h: 2.05, sitze: [5.15, 6.25], sitz: 0.42 } };
  // Fallräume nach DIN EN 1176: Turm, Wand und Netz 1,50 m rundum, Rutsche 1,00 m seitlich und 2,00 m hinter dem Auslauf, Schaukel
  // 0,867 × Seillänge + 1,75 m in Schwingrichtung und 1,75 m breit je Sitz. Zusammengefasst mit 12 cm Zugabe und runden Ecken; im Norden bis an die Poolterrasse.
  // Fallschutz aus Holzhackschnitzeln, 30 cm (DIN EN 1177): wasser- und luftdurchlässig, gut für die Wurzeln.
  const S = spiel.schaukel, T = turm, R = spiel.rutsche, lang = 0.867 * (S.h - 0.05 - S.sitz) + 1.75, by = R.b / 2 + 1.0 + 0.12;
  const xa = S.sitze[0] - 0.875 - 0.12, xb = T.x + T.a + 1.5 + 0.12, xc = T.x + T.a + R.len + 2.0 + 0.12;
  const yS = Math.min(S.y - lang, T.y - T.a - spiel.netz.tief - 1.5) - 0.12, yN = -38.17;
  const rund = (P, r) => P.flatMap((p, i) => {
    const a = P[(i + P.length - 1) % P.length], b = P[(i + 1) % P.length], la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const k = Math.min(r, la / 2, lb / 2), A = [0, 1].map(j => p[j] + (a[j] - p[j]) * k / la), B = [0, 1].map(j => p[j] + (b[j] - p[j]) * k / lb);
    return [0, 0.25, 0.5, 0.75, 1].map(t => [0, 1].map(j => (1 - t) * (1 - t) * A[j] + 2 * t * (1 - t) * p[j] + t * t * B[j]));
  });
  spiel.flaeche = rund([[xa, yN], [xb, yN], [xb, T.y + by], [xc, T.y + by], [xc, T.y - by], [xb, T.y - by], [xb, yS], [xa, yS]], 0.5);
  spiel.schwing = lang;
  return { hecken, spiel };
})();
