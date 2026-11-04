  // Teil des 3D-Modells (src/view3d/, siehe 00-kern.js): Lichthof vor dem Gym im UG (Westseite)
  // Lichthof vor dem Gym (Daniel, 4.11.2026; Größe nach Ortsgestaltungssatzung § 8, siehe house.js): bis zum UG-Boden, Stützwände aus Sichtbeton, unten heller Steinbelag, oben auf
  // Geländehöhe eine Abdeckung mit Geländer aus schwarzem Metall. Die Fenster sitzen in der Westwand des UG (siehe buildInterior).
  function lichthofPoly() {
    const LH = HOUSE.lichthof;
    return [[-LH.tief, -LH.u1], [-0.002, -LH.u1], [-0.002, -LH.u0], [-LH.tief, -LH.u0]];
  }
  function buildLichthof() {
    const LH = HOUSE.lichthof, y0 = -LH.u1, y1 = -LH.u0, x0 = -LH.tief, zb = Zh.ffbUG, t = 0.25;
    for (const [a, b, c, e] of [[x0 - t, x0, y0 - t, y1 + t], [x0, 0, y0 - t, y0], [x0, 0, y1, y1 + t]]) boxPlan(M.beton, a, b, c, e, zb - 0.3, 0.04);
    for (const [a, b, c, e] of [[x0 - t - 0.03, x0 + 0.02, y0 - t - 0.03, y1 + t + 0.03], [x0, 0, y0 - t - 0.03, y0 + 0.02], [x0, 0, y1 - 0.02, y1 + t + 0.03]]) boxPlan(M.coping, a, b, c, e, 0.04, 0.09);
    boxPlan(M.stone, x0, 0, y0, y1, zb - 0.3, zb - 0.02);
    // Geländer an den drei Seiten, auf der Abdeckung
    const zr = 0.09, hr = 1.0;
    railing(M.metal, new THREE.Matrix4().makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(x0 - t / 2, 0, 0)), y0 - t / 2, y1 + t / 2, zr, zr + hr, 0);
    for (const y of [y0 - t / 2, y1 + t / 2]) railing(M.metal, new THREE.Matrix4().makeTranslation(0, 0, -y), x0 - t / 2, -0.02, zr, zr + hr, 0);
  }
