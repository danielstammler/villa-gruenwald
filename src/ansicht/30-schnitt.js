  // Teil der Ansichten (src/ansicht/, siehe 00-kern.js): Schnitt A–A durch das Haus
  function offsetPolyline(pts, d) {
    const seg = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const [a, b] = pts[i], [c, e] = pts[i + 1], len = Math.hypot(c - a, e - b), nx = (e - b) / len, ny = -(c - a) / len;
      seg.push([[a + nx * d, b + ny * d], [c + nx * d, e + ny * d]]);
    }
    const isect = ([[x1, y1], [x2, y2]], [[x3, y3], [x4, y4]]) => {
      const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(den) < 1e-9) return null;
      const p = x1 * y2 - y1 * x2, q = x3 * y4 - y3 * x4;
      return [(p * (x3 - x4) - (x1 - x2) * q) / den, (p * (y3 - y4) - (y1 - y2) * q) / den];
    };
    const out = [seg[0][0]];
    for (let i = 0; i < seg.length - 1; i++) out.push(isect(seg[i], seg[i + 1]) || seg[i][1]);
    out.push(seg[seg.length - 1][1]);
    return out;
  }
  // Schnitt A–A durch die Hausmitte (x = 8,00), Blick nach Westen: links Süden, rechts Norden.
  function section(opt) {
    const D = HOUSE.D, t = HOUSE.wall, tan1 = HOUSE.tan1;
    const S1 = HOUSE.fas.S.dormers.find(d => d.zwerch), N1 = HOUSE.fas.N.dormers.find(d => d.zwerch), b = HOUSE.balkon, bd = HOUSE.balkonDG, pk = HOUSE.fas.N.portikus;
    const sB = (S1.top - Z.wand) / tan1, nB = (N1.top - Z.wand) / tan1;
    // Im Süden schneidet die Ebene das Zwerchhaus: Fassade läuft bis unter dessen Dach durch
    const southPart = [[0, Z.gesimsU]];
    const prof = [...southPart, [S1.front, S1.top], [sB, S1.top], [r1, Z.knick], [D / 2, Z.first],
      [D - r1, Z.knick], [D - nB, N1.top], [D, N1.top], [D, Z.gesimsU]];
    const inner = offsetPolyline(prof, 0.3);
    const x0 = -6.4, x1 = D + 6.8;
    const G = HOUSE.tg, uT0 = HOUSE.balkon.y0 + D, uV = Plans.CORE.VOID[0][2] + D;
    let s = r(x0 + 0.3, Z.ffbUG - 0.7, x1 - 0.3, 0, 'e-earth');
    s += r(t, Z.ffbUG, D - t, -0.15, 'e-room') + r(HOUSE.terrasse.y0 + D, 0, 0, HOUSE.terrasse.z, 'e-stone') + r(D, 0, D + 1.0, HOUSE.podest.z, 'e-stone');
    s += r(0, Z.ffbUG - 0.3, D, Z.ffbUG, 'e-cut');
    // Tiefgarage unter der Terrasse: 2,70 m lichte Höhe, Decke 30 cm, darüber der Aufbau der Terrasse
    s += r(uT0 + 0.3, Z.ffbUG, 0, G.decke, 'e-room') + r(uT0, Z.ffbUG - 0.3, 0, Z.ffbUG, 'e-cut') + r(uT0, Z.ffbUG - 0.3, uT0 + 0.3, G.decke + G.platte, 'e-cut') + r(uT0, G.decke, 0, G.decke + G.platte, 'e-cut');
    s += tx(uT0 / 2 + 0.15, (Z.ffbUG + G.decke) / 2 + 0.2, 'Tiefgarage', 'e-label') + tx(uT0 / 2 + 0.15, (Z.ffbUG + G.decke) / 2 - 0.3, `lichte Höhe ${num(G.lichte)} m`, 'e-dimtxt');
    // Decken; im OG fehlt die Decke über der Halle (Luftraum)
    for (const [z0, z1] of [[-0.15, Z.ffbEG], [Z.gurtU, Z.ffbOG], [Z.deckeDG, Z.ffbDG]]) s += r(t, z0, z0 === Z.gurtU ? uV : D - t, z1, 'e-cut');
    s += tx((uV + D) / 2, 4.6, 'Halle', 'e-label') + tx((uV + D) / 2, 4.15, 'Luftraum', 'e-dimtxt');
    for (const [a, b] of [[0, t], [D - t, D]]) for (const [z0, z1] of [[Z.ffbUG - 0.3, Z.ffbEG], [2.85, Z.ffbOG], [Z.sturzOG, 7.0]]) s += r(a, z0, b, z1, 'e-cut');
    for (const [a, b] of [[0, t], [D - t, D]]) for (const [z0, z1] of [[Z.ffbEG, 2.85], [Z.ffbOG, Z.sturzOG]]) s += r(a, z0, b, z1, 'e-beyond') + ln((a + b) / 2, z0, (a + b) / 2, z1, 'e-glassline');
    s += poly([...prof, ...inner.slice().reverse()], 'e-cutroof');
    // Balkontüren im Zwerchhaus (geschnitten) und Gaubenfenster im Norden (dahinter)
    const sw = S1.win.find(w => w.u0 < 8 && w.u1 > 8) || S1.win[1];
    s += r(0, sw.z0, 0.3, sw.z1, 'e-room') + ln(0.15, sw.z0, 0.15, sw.z1, 'e-glassline');
    const nw = N1.win.find(w => w.u0 < 8 && w.u1 > 8) || N1.win[1];
    s += r(D - 0.3, nw.z0, D, nw.z1, 'e-room') + ln(D - 0.15, nw.z0, D - 0.15, nw.z1, 'e-glassline') + rail(D + 0.02, D + 0.06, nw.z0 + 0.05, nw.rail);
    // Portikus vor dem Eingang: Dach geschnitten, Pfeiler dahinter
    s += r(D, pk.z0, D + pk.depth, pk.z1 - 0.12, 'e-cut') + r(D, pk.z1 - 0.12, D + pk.depth + 0.08, pk.z1, 'e-cut') + r(D + pk.py - pk.pw / 2, HOUSE.podest.z, D + pk.py + pk.pw / 2, pk.z0, 'e-beyond');
    // OG-Balkon und DG-Balkon: Platten geschnitten, seitliches Geländer, Pfeiler und Konsolen dahinter
    s += r(b.y0 + D, b.slab[0], 0, b.slab[1], 'e-cut') + rail(b.y0 + D + 0.06, -0.02, b.slab[1], b.rail) + r(b.colY + D - b.colW / 2, HOUSE.terrasse.z, b.colY + D + b.colW / 2, b.slab[0], 'e-beyond');
    s += r(bd.y0 + D, bd.slab[0], 0, bd.slab[1], 'e-cut') + rail(bd.y0 + D + 0.06, -0.02, bd.slab[1], bd.rail);
    // DG-Balkon 10 cm unter FFB DG: vor der Türschwelle die Rinne mit Gitterrost, geschnitten
    s += r(-bd.rinne[2], bd.slab[1] - 0.1, 0, bd.slab[1], 'e-room') + r(-bd.rinne[2], bd.slab[1] - 0.02, 0, bd.slab[1], 'e-sill');
    s += r(bd.colY + D - bd.colW / 2, b.slab[1], bd.colY + D + bd.colW / 2, bd.slab[0], 'e-beyond');
    s += tx((bd.y0 + D) / 2, bd.slab[1] + 1.25, 'Balkon', 'e-dimtxt') + tx((b.y0 + D) / 2, b.slab[1] + 1.25, 'Balkon', 'e-dimtxt');
    // Flache Decke im DG wie im 3D-Modell (lichte Höhe 2,60 m, in den Zwerchhäusern bis an die Front), darüber der Spitzboden;
    // sie reicht bis an die Innenseite des Dachs. Die Linie für 2,30 m lichte Höhe unter dem offenen Dach entfällt damit.
    const zD = Z.deckeSpitz, xs = [];
    for (let i = 0; i < inner.length - 1; i++) {
      const [a, b] = inner[i], [c, e] = inner[i + 1];
      if ((b - zD) * (e - zD) < 0) xs.push(a + (c - a) * (zD - b) / (e - b));
    }
    if (xs.length >= 2) s += r(Math.min(...xs), zD, Math.max(...xs), zD + 0.12, 'e-cut') + tx(D / 2, zD + 0.6, 'Spitzboden', 'e-label');
    s += tx(D / 2, -1.75, 'UG · Annahme', 'e-label') + tx(D / 2, 1.5, 'EG · lichte Höhe ≈ 3,00 m', 'e-label') +
      tx(D / 2, 4.85, 'OG · lichte Höhe ≈ 2,75 m', 'e-label') + tx(D / 2, 7.7, `DG · lichte Höhe ${num(zD - Z.ffbDG)} m`, 'e-label');
    s += ln(x0 + 0.3, 0, x1 - 0.3, 0, 'e-ground');
    if (opt.mass) s += chain([0, D], -4.8 + 0.4);
    if (opt.koten) s += koten([[Z.ffbUG, 'FFB UG'], ...LEVELS, [zD, 'Decke über DG']], -4.6, -0.4);
    return { svg: s, vb: [x0, -12.6, x1 - x0, 17.9] };
  }
