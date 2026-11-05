  // Teil des Hausmodells (src/haus/, siehe 00-grund.js): Freisitz, Terrasse, Podest, Balkone und Kamine
  const freisitz = { x0: 16, x1: 19, y0: -10.825, y1: -5.825, z: 0.18, slab: [3.0, 3.45], rail: 4.45, col: 0.35 };
  // Durchgehende Terrasse vor der ganzen Gartenseite, 4,00 m tief und im Osten bis an den Freisitz; in der Mitte eine Stufe zum Weg an den Pool
  const terrasse = { x0: 0, x1: 19, y0: -15.65, y1: -11.65, z: 0.18, stufe: [6.6, 9.4] };
  terrasse.poly = [[0, -11.65], [16, -11.65], [16, -10.825], [19, -10.825], [19, -15.65], [0, -15.65]];
  const podest = { x0: 5.5, x1: 10.5, y0: 0, y1: 1.0, z: 0.18 };
  // Balkon über der Terrasse, vorne nur auf den beiden äußeren, quadratischen Pfeilern
  const balkon = { x0: 4.5, x1: 11.5, y0: -14.652, y1: -11.65, slab: [3.1, 3.5], rail: 4.5, cols: [4.75, 11.25], colY: -14.38, colW: 0.4 };
  // Balkon im DG vor dem Zwerchhaus: tritt 1,00 m nach vorne, gleiche Breite wie Terrasse und OG-Balkon;
  // getragen von zwei schlankeren quadratischen Pfeilern, die auf dem OG-Balkon stehen (wie unten).
  // Belag 10 cm unter FFB DG, vor den Türen eine Rinne mit Gitterrost (rinne: von x, bis x, Breite), Geländer 1,00 m über dem Belag
  const balkonDG = { x0: 4.5, x1: 11.5, y0: -12.65, y1: -11.65, slab: [6.25, 6.55], rail: 7.55, cols: [4.75, 11.25], colY: -12.47, colW: 0.34, rinne: [5.05, 10.95, 0.15] };
  // Zwei Kamine auf der oberen Dachfläche, wie im Referenzbild links und rechts der Mitte
  const kamine = [{ x: 4.0, y: -D / 2, w: 0.75, d: 0.55, top: 11.9 }, { x: 12.0, y: -D / 2, w: 0.75, d: 0.55, top: 11.9 }];

