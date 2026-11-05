  // Teil der Ansichten (src/ansicht/, siehe 00-kern.js): Fassadenansichten Süd, Nord, Ost, West
  const LEVELS = [[0, 'Gelände'], [Z.ffbEG, 'FFB EG'], [Z.ffbOG, 'FFB OG'], [Z.ffbDG, 'FFB DG'], [Z.wand, 'Wandhöhe'], [Z.knick, 'Dachknick'], [Z.first, 'First']];

  function facade(side, opt) {
    const F = HOUSE.fas[side], L = F.len, x0 = side === 'E' ? -13.4 : -5.6, x1 = L + (side === 'S' ? 8.0 : side === 'W' ? 13.0 : 5.4);
    // Untergeschoss und Tiefgarage unter dem Gelände, gestrichelt (verdeckt); die Tiefgarage liegt vor dem Haus unter Terrasse und Garten
    const G = HOUSE.tg, zu = Z.ffbUG - 0.3, tgSpan = { S: [4.5, 23.499], E: [-12.501, 0], W: [HOUSE.D, 24.151] }[side];
    let s = r(x0 + 0.3, zu - 0.45, x1 - 0.3, 0, 'e-earth');
    s += r(0, zu, L, -0.02, 'e-under') + ln(0, Z.ffbUG, L, Z.ffbUG, 'e-under') + tx(L / 2, (Z.ffbUG - 0.15) / 2 - 0.15, 'Untergeschoss', 'e-label');
    if (tgSpan) {
      const a = Math.max(tgSpan[0], x0 + 0.3), b = Math.min(tgSpan[1], x1 - 0.3), lx = side === 'S' ? (L + b) / 2 : (a + b) / 2;
      s += r(a, zu, b, G.decke + G.platte, 'e-under') + ln(a, G.decke, b, G.decke, 'e-under');
      s += tx(lx, (Z.ffbUG + G.decke) / 2 + 0.1, 'Tiefgarage', 'e-label') + tx(lx, (Z.ffbUG + G.decke) / 2 - 0.45, `lichte Höhe ${num(G.lichte)} m`, 'e-dimtxt');
    }
    if (side === 'N') s += freisitz('N');
    s += r(0, Z.sockel, L, Z.gesimsU, 'e-wall');
    for (const op of F.open) s += opening(op);
    for (const [a, b] of F.pil) s += r(a, Z.sockel, b, Z.gesimsU, 'e-pil');
    s += r(-0.04, 0, L + 0.04, Z.sockel, 'e-sockel');
    s += r(-0.1, Z.gurtU, L + 0.1, Z.gurtO, 'e-pil');
    s += r(-0.18, Z.gesimsU, L + 0.18, 6.69, 'e-pil') + r(-0.35, 6.69, L + 0.35, Z.gesimsO, 'e-pil');
    const lower = [[-o, HOUSE.traufe], [L + o, HOUSE.traufe], [L - r1, Z.knick], [r1, Z.knick]];
    const upper = L > 13 ? [[r1, Z.knick], [L - r1, Z.knick], [L - r1 - r2, Z.first], [r1 + r2, Z.first]] : [[r1, Z.knick], [L - r1, Z.knick], [L / 2, Z.first]];
    s += poly(lower, 'e-roofo') + poly(upper, 'e-roofo e-roofup');
    if (L > 13) s += r(r1 + r2 - 0.05, Z.first - 0.03, L - r1 - r2 + 0.05, Z.first + 0.05, 'e-cap');
    s += roofItems(side);
    for (const d of F.dormers || []) s += dormer(d);
    for (const c of F.lamps || []) s += r(c - 0.07, 2.0, c + 0.07, 2.34, 'e-frame') + r(c - 0.045, 2.05, c + 0.045, 2.29, 'e-lamp');
    s += portikus(side);
    for (const rl of F.rails || []) s += r(rl.u0 - 0.05, rl.z0 - 0.1, rl.u1 + 0.05, rl.z0, 'e-pil') + rail(rl.u0, rl.u1, rl.z0, rl.z1);
    if (side === 'S' || side === 'E') s += freisitz(side);
    s += flatwork(side) + balkon(side);
    s += ln(x0 + 0.3, 0, x1 - 0.3, 0, 'e-ground');
    if (opt.mass) {
      const eg = F.open.filter(q => q.z0 < 1.5).sort((a, b) => a.u0 - b.u0);
      s += chain([0, ...eg.flatMap(q => [q.u0, q.u1]), L], zu - 0.85) + chain([0, L], zu - 1.6);
    }
    if (opt.koten) s += koten([[Z.ffbUG, 'FFB UG'], ...LEVELS], -4.2, -0.4);
    return { svg: s, vb: [x0, -12.6, x1 - x0, 12.6 - zu + 2.2] };
  }

