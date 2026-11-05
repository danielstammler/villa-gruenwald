  // Teil des Hausmodells (src/haus/, siehe 00-grund.js): Pool, Poolterrasse, Poolhaus, Zaun und Lichthof; Rückgabe aller Werte
  // Pool aus dem Konzept: Wasser 12 cm unter dem Rand, 1,40 m tief, an der Nordseite vier Stufen über die ganze Breite,
  // gleichmäßig je etwa 29 cm vom Rand (+0,06) bis zum Boden.
  // Ringsum eine Natursteinterrasse, im Osten breit mit Liegen und bis an die Veranda des Poolhauses; ein Weg führt von der Terrasse herüber.
  const pool = { rand: 0.06, wasser: -0.12, boden: -1.4, stufen: [-0.23, -0.52, -0.82, -1.11], tritt: 0.35 };
  const poolDeck = { z: 0.04, poly: [[4.5, -23.15], [13.5, -23.15], [13.5, -27.652], [19.384, -27.652], [19.384, -33.651], [13.5, -33.651], [13.5, -38.15], [4.5, -38.15]] };
  const poolWeg = { x0: 7.4, x1: 8.6, y0: -23.15, y1: -15.65 };
  // Poolhaus auf der Fläche aus dem Konzept (3,50 × 6,00 m) im Stil des Hauses: weißer Putz, Gesims, flaches Walmdach mit Schiefer.
  // Zum Pool ganz offen: eine 5,40 m breite Glas-Schiebewand (zwei Flügel zur Seite geschoben), nach Norden ein großes Fenster,
  // davor eine überdachte Veranda auf zwei Pfeilern. Darunter führt die Rampe in die Tiefgarage.
  // Boden eine Stufe über der Poolterrasse (+0,15, vor der Schiebewand eine Stufe aus Naturstein): über der Durchfahrt (Unterkante −0,15)
  // bleiben 30 cm für Decke und Belag. Gesims und Traufe bleiben auf ihrer Höhe, innen wird es 10 cm niedriger.
  // ueberstand: Dachüberstand rundum wie im 3D (buildPoolhaus), für die Wandhöhe nach Ortsgestaltungssatzung § 6 in tools/regeln.js
  const poolhaus = { x0: 19.384, x1: 22.885, y0: -33.651, y1: -27.652, z: 0.15, wand: 0.25, gesims: 2.75, traufe: 2.95, neigung: 27,
    veranda: 1.8, pfeiler: 0.3, front: [0.3, 5.7], fenster: [20.75, 22.45], stufe: 0.32, ueberstand: 0.25 };
  // Zaun über die ganze Straßenseite (an Stämmen auf der Grenze eng vorbei): weißer Sockel mit schwarzen Stäben zwischen Pfeilern;
  // Einfahrtstor zweiflügelig, daneben die Gartentür. Alles höchstens 1,60 m über dem Pflaster (Ortsgestaltungssatzung Grünwald § 9 Abs. 4):
  // Pfeiler mit Abdeckung 1,60 m, Stäbe mit Spitzen 1,55 m, Torbogen bis 1,60 m, Leuchten vorn an den Torpfeilern statt obenauf.
  // Hecken und Spielplatz in HOUSE.garten (unten).
  const zaun = { hoehe: 1.6, stab: 1.55, sockel: 0.3, pfeiler: 0.42, tor: [19.732, 23.33], tuer: [23.75, 24.73] };

  // Lichthof vor dem Gym im UG (Westseite, u wie in der Westansicht von Norden gemessen): bis zum UG-Boden, Fenster bis zum Boden.
  // Ortsgestaltungssatzung Grünwald § 8: Lichtschächte höchstens 1,50 m tief und höchstens ein Drittel der Ansichtsbreite (11,65 / 3 = 3,88 m)
  // sturz: Oberkante der Fenster (vom UG-Boden an), gelaender: Höhe des Geländers über der Abdeckung, beides wie im 3D (für tools/regeln.js)
  const lichthof = { side: 'W', u0: 6.6, u1: 10.45, tief: 1.5, win: [[6.9, 8.4], [8.65, 10.15]], sturz: -0.62, gelaender: 1.0 };
  return { W, D, wall, Z, run1, run2, tan1, tan2, ueberstand, traufe, roofZ, roofIn, dachwinkel, rahmen, fas, frame, freisitz, terrasse, podest, balkon, balkonDG, kamine, rampe,
    tg, pool, poolDeck, poolWeg, poolhaus, zaun, lichthof };
})();
