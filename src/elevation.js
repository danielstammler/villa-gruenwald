// Maßstäbliche Ansichten und Schnitt als SVG. Einheit: Meter; Höhe z wird zu SVG-y = -z.
const Elev = (() => {
  const Z = HOUSE.Z, o = HOUSE.ueberstand, r1 = HOUSE.run1, r2 = HOUSE.run2;
  const f = v => +v.toFixed(3);
  const num = v => v.toFixed(2).replace('.', ',');
  const kote = v => (Math.abs(v) < 0.005 ? '±' : v > 0 ? '+' : '−') + num(Math.abs(v));
  const r = (x0, z0, x1, z1, cls) => `<rect x="${f(Math.min(x0, x1))}" y="${f(-Math.max(z0, z1))}" width="${f(Math.abs(x1 - x0))}" height="${f(Math.abs(z1 - z0))}" class="${cls}"/>`;
  const poly = (pts, cls) => `<polygon points="${pts.map(p => `${f(p[0])},${f(-p[1])}`).join(' ')}" class="${cls}"/>`;
  const pline = (pts, cls) => `<polyline points="${pts.map(p => `${f(p[0])},${f(-p[1])}`).join(' ')}" class="${cls}"/>`;
  const ln = (x0, z0, x1, z1, cls) => `<line x1="${f(x0)}" y1="${f(-z0)}" x2="${f(x1)}" y2="${f(-z1)}" class="${cls}"/>`;
  const tx = (x, z, s, cls) => `<text x="${f(x)}" y="${f(-z)}" class="${cls}">${s}</text>`;

  const DEFS = `<defs>
    <pattern id="pSlate" width="0.8" height="0.4" patternUnits="userSpaceOnUse"><rect width="0.8" height="0.4" class="e-roof"/><path d="M0 0.2H0.8M0 0.4H0.8M0.4 0V0.2M0 0.2V0.4M0.8 0.2V0.4" class="e-roof-line"/></pattern>
    <linearGradient id="gGlass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a4830"/><stop offset="0.35" stop-color="#d9a466"/><stop offset="0.75" stop-color="#c48b51"/><stop offset="1" stop-color="#7a563a"/></linearGradient>
    <pattern id="pZink" width="0.32" height="1" patternUnits="userSpaceOnUse"><rect width="0.32" height="1" class="e-zink"/><path d="M0 0V1" class="e-roof-line"/></pattern>
    <pattern id="pEarth" width="0.32" height="0.32" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V0.32" class="e-hatch"/></pattern>
  </defs>`;

  function rail(u0, u1, z0, z1) {
    const n = Math.max(2, Math.round((u1 - u0) / 0.11));
    let s = '';
    for (let i = 0; i <= n; i++) { const u = u0 + (u1 - u0) * i / n; s += r(u - 0.009, z0, u + 0.009, z1, 'e-bar'); }
    return s + r(u0 - 0.02, z1 - 0.035, u1 + 0.02, z1, 'e-bar') + r(u0, z0, u1, z0 + 0.03, 'e-bar');
  }
  function opening(o) {
    const w = o.u1 - o.u0, fw = 0.07, g = 0.02, sill = o.kind === 'fenster' ? g : 0;
    let s = r(o.u0, o.z0, o.u1, o.z1, 'e-reveal');
    if (o.kind === 'eingang') {
      s += r(o.u0 + g, o.z0, o.u1 - g, o.z1 - g, 'e-frame');
      const lw = (w - 2 * g) / 2;
      for (let i = 0; i < 2; i++) { const a = o.u0 + g + i * lw; s += r(a + 0.16, o.z0 + 1.0, a + lw - 0.16, o.z1 - 0.22, 'e-glass'); }
      return s;
    }
    s += r(o.u0 + g, o.z0 + sill, o.u1 - g, o.z1 - g, 'e-frame');
    const n = o.leaves || 1, mull = 0.09, lw = (w - 2 * g - 2 * fw - (n - 1) * mull) / n;
    for (let i = 0; i < n; i++) {
      const a = o.u0 + g + fw + i * (lw + mull), b = a + lw, z0 = o.z0 + fw + sill, z1 = o.z1 - g - fw, c = Math.min(0.14, lw * 0.22);
      s += r(a, z0, b, z1, 'e-glass') + r(a, z0, a + c, z1, 'e-curtain') + r(b - c, z0, b, z1, 'e-curtain');
    }
    if (o.kind === 'fenster') s += r(o.u0 - 0.05, o.z0 - 0.05, o.u1 + 0.05, o.z0, 'e-sill');
    if (o.rail) s += rail(o.u0 + 0.03, o.u1 - 0.03, o.z0 + 0.04, o.rail);
    return s;
  }
  function dormer(d) {
    const zb = d.loggia ? Z.gesimsO : HOUSE.roofZ(d.front);
    let s = r(d.u0, zb, d.u1, d.top, d.clad === 'putz' ? 'e-wall' : 'e-zinkf');
    if (d.clad === 'putz') {
      s += r(d.u0, zb, d.u0 + 0.22, d.top - 0.34, 'e-pil') + r(d.u1 - 0.22, zb, d.u1, d.top - 0.34, 'e-pil');
      s += r(d.u0 - 0.12, d.top - 0.34, d.u1 + 0.12, d.top - 0.12, 'e-pil');
    }
    s += r(d.u0 - 0.06, d.top - 0.06, d.u1 + 0.06, d.top + 0.03, 'e-cap');
    for (const w of d.win) s += opening({ ...w, z0: Math.max(w.z0, zb), kind: 'dg' });
    return s;
  }
  function freisitz(side) {
    const fz = HOUSE.freisitz, W = HOUSE.W, D = HOUSE.D;
    let ua, ub, cols, shade = null;
    if (side === 'S') { ua = fz.x0; ub = fz.x1; cols = [[fz.x1 - fz.col, fz.x1]]; shade = [ua, ub - fz.col]; }
    else if (side === 'N') { ua = W - fz.x1; ub = W - fz.x0; cols = [[ua, ua + fz.col]]; shade = [ua + fz.col, ub]; }
    else if (side === 'E') { ua = fz.y0 + D; ub = fz.y1 + D; cols = [[ua, ua + fz.col], [ub - fz.col, ub]]; }
    else return '';
    let s = shade ? r(shade[0], fz.z, shade[1], fz.slab[0], 'e-shade') : '';
    s += r(ua, 0, ub, fz.z, 'e-stone');
    for (const [a, b] of cols) s += r(a, fz.z, b, fz.slab[0], 'e-pil');
    s += r(ua, fz.slab[0], ub, fz.slab[1], 'e-pil');
    return s + rail(ua + 0.06, ub - 0.06, fz.slab[1], fz.rail);
  }
  // Toskanische Säule von der Terrasse bis unter die Balkonplatte
  function column(u, cr) {
    const z0 = HOUSE.terrasse.z, z1 = HOUSE.balkon.slab[0];
    return r(u - cr * 1.35, z0, u + cr * 1.35, z0 + 0.12, 'e-pil') + r(u - cr * 1.2, z0 + 0.12, u + cr * 1.2, z0 + 0.2, 'e-pil') +
      poly([[u - cr, z0 + 0.2], [u + cr, z0 + 0.2], [u + cr * 0.86, z1 - 0.2], [u - cr * 0.86, z1 - 0.2]], 'e-pil') +
      r(u - cr * 1.15, z1 - 0.2, u + cr * 1.15, z1 - 0.1, 'e-pil') + r(u - cr * 1.3, z1 - 0.1, u + cr * 1.3, z1, 'e-pil');
  }
  function balkon(side) {
    const b = HOUSE.balkon, D = HOUSE.D;
    const slab = (a, c) => r(a, b.slab[0], c, b.slab[1] - 0.12, 'e-pil') + r(a - 0.06, b.slab[1] - 0.12, c + 0.06, b.slab[1], 'e-pil') + rail(a + 0.05, c - 0.05, b.slab[1], b.rail);
    if (side === 'S') return b.cols.map(x => column(x, b.colR)).join('') + slab(b.x0, b.x1);
    if (side === 'E') return column(b.colY + D, b.colR) + slab(b.y0 + D, b.y1 + D);
    if (side === 'W') return column(-b.colY, b.colR) + slab(-b.y1, -b.y0);
    return '';
  }
  function flatwork(side) {
    const t = HOUSE.terrasse, p = HOUSE.podest, W = HOUSE.W, D = HOUSE.D;
    const span = { S: [[t.x0, t.x1]], N: [[W - p.x1, W - p.x0]], E: [[t.y0 + D, t.y1 + D], [p.y0 + D, p.y1 + D]], W: [[-p.y1, -p.y0], [-t.y1, -t.y0]] }[side];
    return span.map(([a, b]) => r(a, 0, b, t.z, 'e-stone')).join('');
  }
  function chain(pts, z) {
    let s = ln(pts[0], z, pts[pts.length - 1], z, 'e-dim');
    for (const u of pts) s += ln(u - 0.11, z - 0.11, u + 0.11, z + 0.11, 'e-dim') + ln(u, z - 0.22, u, z + 0.22, 'e-dim e-thin');
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      if (b - a > 0.3) s += tx((a + b) / 2, z + 0.1, num(b - a), 'e-dimtxt');
    }
    return s;
  }
  function koten(levels, u, toU) {
    let s = '';
    for (const [z, name] of levels) {
      s += ln(u - 0.55, z, toU, z, 'e-dim e-thin e-dash');
      s += poly([[u - 0.16, z + 0.27], [u + 0.16, z + 0.27], [u, z]], 'e-kmark');
      const tz = Math.abs(z) < 0.01 ? z - 0.42 : z + 0.08;
      s += tx(u - 0.3, tz, kote(z), 'e-kote') + tx(u + 0.3, tz, name, 'e-kname');
    }
    return s;
  }
  const LEVELS = [[0, 'Gelände'], [Z.ffbEG, 'FFB EG'], [Z.ffbOG, 'FFB OG'], [Z.ffbDG, 'FFB DG'], [Z.wand, 'Wandhöhe'], [Z.knick, 'Dachknick'], [Z.first, 'First']];

  function facade(side, opt) {
    const F = HOUSE.fas[side], L = F.len, x0 = -5.6, x1 = L + (side === 'S' ? 6.2 : 5.4);
    let s = r(x0 + 0.3, -0.55, x1 - 0.3, 0, 'e-earth');
    if (side === 'N') s += freisitz('N');
    s += r(0, Z.sockel, L, Z.gesimsU, 'e-wall');
    for (let z = 0.5; z < Z.gurtU; z += 0.3) s += ln(0, z, L, z, 'e-rust');
    for (const op of F.open) s += opening(op);
    for (const [a, b] of F.pil) s += r(a, Z.sockel, b, Z.gesimsU, 'e-pil');
    s += r(-0.04, 0, L + 0.04, Z.sockel, 'e-sockel');
    s += r(-0.1, Z.gurtU, L + 0.1, Z.gurtO, 'e-pil');
    s += r(-0.18, Z.gesimsU, L + 0.18, 6.69, 'e-pil') + r(-o, 6.69, L + o, Z.gesimsO, 'e-pil');
    const lower = [[-o, HOUSE.traufe], [L + o, HOUSE.traufe], [L - r1, Z.knick], [r1, Z.knick]];
    const upper = L > 13 ? [[r1, Z.knick], [L - r1, Z.knick], [L - r1 - r2, Z.first], [r1 + r2, Z.first]] : [[r1, Z.knick], [L - r1, Z.knick], [L / 2, Z.first]];
    s += poly(lower, 'e-roofo') + poly(upper, 'e-roofo e-roofup');
    if (L > 13) s += r(r1 + r2 - 0.05, Z.first - 0.03, L - r1 - r2 + 0.05, Z.first + 0.05, 'e-cap');
    for (const d of F.dormers || []) s += dormer(d);
    if (F.eaveRail) {
      const e = F.eaveRail;
      s += rail(e.u0, e.u1, e.z0, e.z1);
      for (const [a, b] of F.piers) s += r(a, Z.gesimsO, b, 7.92, 'e-pil') + r(a - 0.05, 7.92, b + 0.05, 8.0, 'e-pil');
    }
    for (const c of F.lamps || []) s += r(c - 0.07, 2.0, c + 0.07, 2.34, 'e-frame') + r(c - 0.045, 2.05, c + 0.045, 2.29, 'e-lamp');
    if (F.portal) {
      const p = F.portal;
      s += r(p.u0, Z.ffbEG, p.u0 + 0.25, p.z1, 'e-pil') + r(p.u1 - 0.25, Z.ffbEG, p.u1, p.z1, 'e-pil') + r(p.u0, 2.85, p.u1, p.z1, 'e-pil');
    }
    if (F.canopy) { const c = F.canopy; s += r(c.u0, c.z0, c.u1, c.z1, 'e-frame'); }
    for (const rl of F.rails || []) s += r(rl.u0 - 0.05, rl.z0 - 0.1, rl.u1 + 0.05, rl.z0, 'e-pil') + rail(rl.u0, rl.u1, rl.z0, rl.z1);
    if (side === 'S' || side === 'E') s += freisitz(side);
    s += flatwork(side) + balkon(side);
    s += ln(x0 + 0.3, 0, x1 - 0.3, 0, 'e-ground');
    if (opt.mass) {
      const eg = F.open.filter(q => q.z0 < 1.5).sort((a, b) => a.u0 - b.u0);
      s += chain([0, ...eg.flatMap(q => [q.u0, q.u1]), L], -0.85) + chain([0, L], -1.6);
    }
    if (opt.koten) s += koten(LEVELS, -4.2, -0.4);
    return { svg: s, vb: [x0, -12.6, x1 - x0, 15.0] };
  }

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
    const S1 = HOUSE.fas.S.dormers[1], N1 = HOUSE.fas.N.dormers[1];
    const sB = (S1.top - Z.wand) / tan1, nB = (N1.top - Z.wand) / tan1;
    const southPart = S1.loggia ? [[-o, HOUSE.traufe], [0, HOUSE.traufe], [0, S1.loggia], [S1.front, S1.loggia]] : [[-o, HOUSE.traufe], [S1.front, HOUSE.roofZ(S1.front)]];
    const prof = [...southPart, [S1.front, S1.top], [sB, S1.top], [r1, Z.knick], [D / 2, Z.first],
      [D - r1, Z.knick], [D - nB, N1.top], [D - N1.front, N1.top], [D - N1.front, HOUSE.roofZ(N1.front)], [D + o, HOUSE.traufe]];
    const inner = offsetPolyline(prof, 0.3);
    const x0 = -6.4, x1 = D + 6.8;
    let s = r(x0 + 0.3, -4.1, x1 - 0.3, 0, 'e-earth');
    s += r(t, Z.ffbUG, D - t, -0.15, 'e-room') + r(-3.0, 0, 0, HOUSE.terrasse.z, 'e-stone') + r(D, 0, D + 1.0, HOUSE.podest.z, 'e-stone');
    s += r(0, -3.4, D, Z.ffbUG, 'e-cut');
    for (const [z0, z1] of [[-0.15, Z.ffbEG], [Z.gurtU, Z.ffbOG], [Z.deckeDG, Z.ffbDG]]) s += r(t, z0, D - t, z1, 'e-cut');
    for (const [a, b] of [[0, t], [D - t, D]]) for (const [z0, z1] of [[-3.4, Z.ffbEG], [2.85, Z.ffbOG], [Z.sturzOG, 7.0]]) s += r(a, z0, b, z1, 'e-cut');
    for (const [a, b] of [[0, t], [D - t, D]]) for (const [z0, z1] of [[Z.ffbEG, 2.85], [Z.ffbOG, Z.sturzOG]]) s += r(a, z0, b, z1, 'e-beyond') + ln((a + b) / 2, z0, (a + b) / 2, z1, 'e-glassline');
    s += poly([[-0.18, Z.gesimsU], [0, Z.gesimsU], [0, Z.gesimsO], [-o, Z.gesimsO], [-o, 6.69], [-0.18, 6.69]], 'e-cut');
    s += poly([[D + 0.18, Z.gesimsU], [D, Z.gesimsU], [D, Z.gesimsO], [D + o, Z.gesimsO], [D + o, 6.69], [D + 0.18, 6.69]], 'e-cut');
    s += poly([...prof, ...inner.slice().reverse()], 'e-cutroof');
    const sw = S1.win[1];
    s += r(S1.front, sw.z0, S1.front + 0.3, sw.z1, 'e-beyond') + ln(S1.front + 0.12, sw.z0, S1.front + 0.12, sw.z1, 'e-glassline');
    if (S1.loggia) s += rail(0.08, 0.16, Z.gesimsO, 7.72).replace(/class="e-bar"/g, 'class="e-bar"') + tx(0.75, S1.loggia + 0.25, 'Balkon', 'e-dimtxt');
    s += r(D - N1.front - 0.3, 7.65, D - N1.front, 9.05, 'e-beyond') + ln(D - N1.front - 0.12, 7.65, D - N1.front - 0.12, 9.05, 'e-glassline');
    // 2,30 m lichte Höhe im DG
    const zc = Z.ffbDG + 2.3, xs = [];
    for (let i = 0; i < inner.length - 1; i++) {
      const [a, b] = inner[i], [c, e] = inner[i + 1];
      if ((b - zc) * (e - zc) < 0) xs.push(a + (c - a) * (zc - b) / (e - b));
    }
    if (xs.length >= 2) s += ln(Math.min(...xs), zc, Math.max(...xs), zc, 'e-dim e-dash e-h230') + tx(D / 2, zc + 0.12, 'lichte Höhe 2,30 m', 'e-dimtxt');
    s += tx(D / 2, -1.75, 'UG · Annahme', 'e-label') + tx(D / 2, 1.5, 'EG · lichte Höhe ≈ 3,00 m', 'e-label') +
      tx(D / 2, 4.85, 'OG · lichte Höhe ≈ 2,75 m', 'e-label') + tx(D / 2, 7.7, 'DG', 'e-label');
    s += ln(x0 + 0.3, 0, x1 - 0.3, 0, 'e-ground');
    if (opt.mass) s += chain([0, D], -4.8 + 0.4);
    if (opt.koten) s += koten([[Z.ffbUG, 'FFB UG'], ...LEVELS], -4.6, -0.4);
    return { svg: s, vb: [x0, -12.6, x1 - x0, 17.9] };
  }
  // Schnitt B–B in der Achse der Rampe, Blick nach Westen: links Straße und Zufahrt, rechts die Tiefgarage.
  function rampSection(opt) {
    const R0 = HOUSE.rampe, PL = SITE.plot, yS = -53.2, u = y => y - yS, yEnd = -19.2, uE = u(yEnd), n = 72, zPH = 0.2;
    const xc = (R0.x0 + R0.x1) / 2, yG = PL[2][1] + (xc - PL[2][0]) * (PL[3][1] - PL[2][1]) / (PL[3][0] - PL[2][0]);
    const prof = [];
    for (let i = 0; i <= n; i++) { const y = R0.y0 + (R0.yTor - R0.y0) * i / n; prof.push([u(y), R0.z(y)]); }
    prof.push([uE, R0.zTG]);
    const back = prof.slice().reverse(), u0 = u(R0.y0), uP = u(R0.yPortal), uH = u(R0.yPH), uT = u(R0.yTor), uG = u(yG), zP = R0.z(R0.yPortal);
    const x0 = -0.6, x1 = uE + 0.6;
    let s = r(x0 + 0.3, -4.1, x1 - 0.3, 0, 'e-earth');
    // Luftraum: offener Graben, Durchfahrt unter dem Poolhaus, Anschluss und Tiefgarage
    s += poly([[u0, 0], [uP, 0], [uP, R0.decke], [uH, R0.decke], [uH, -0.9], [uE, -0.9], ...back], 'e-room');
    // Rampenwand mit Geländer jenseits der Schnittebene
    s += poly([[u0, 0.15], [uP, 0.15], [uP, zP], ...prof.filter(p => p[0] < uP).reverse()], 'e-beyond');
    s += rail(u0 + 0.3, uP - 0.06, 0.15, 1.05).replace(/class="e-bar"/g, 'class="e-bar e-railx"');
    // Fahrbahnplatte, Unterzug unter der Nordwand des Poolhauses, Decke der Tiefgarage, Tor
    s += poly([...prof, ...back.map(([a, b]) => [a, b - 0.3])], 'e-cut') + r(uH - 0.3, -0.9, uH, R0.decke, 'e-cut') + r(uH, -0.9, uE, -0.6, 'e-cut');
    s += r(uT - 0.04, R0.zTG, uT + 0.04, -0.9, 'e-bar') + tx(uT + 0.25, -1.25, 'Tor', 'e-mark');
    // Poolhaus: Boden zugleich Decke der Durchfahrt, Wände geschnitten, dahinter die Glasfront zum Pool
    s += r(uP, R0.decke, uH, zPH, 'e-cut') + r(uP + 0.3, zPH, uH - 0.3, 3.0, 'e-room') + r(uP + 0.5, 0.25, uH - 0.5, 2.7, 'e-beyond');
    s += r(uP, zPH, uP + 0.3, 3.0, 'e-cut') + r(uH - 0.3, zPH, uH, 3.0, 'e-cut') + r(uP - 0.15, 3.0, uH + 0.15, 3.22, 'e-cut');
    s += ln(x0 + 0.3, 0, u0, 0, 'e-ground') + ln(uH, 0, x1 - 0.3, 0, 'e-ground');
    s += ln(uG, -0.7, uG, 1.7, 'e-dim e-dash') + tx(uG, 1.9, 'Grenze', 'e-label');
    s += tx(uG / 2, 0.45, 'Straße', 'e-label') + tx((uG + u0) / 2, 0.45, 'Zufahrt', 'e-label') + tx((u0 + uP) / 2, 1.6, 'offene Rampe · 2,80 m breit', 'e-label');
    s += tx((uP + uH) / 2, 1.55, 'Poolhaus', 'e-label') + tx((uT + uE) / 2, -2.1, 'Tiefgarage', 'e-label');
    // Neigungen und lichte Höhe an der Einfahrt unter das Poolhaus
    const sl = (ya, yb, t) => tx((u(ya) + u(yb)) / 2, R0.z((ya + yb) / 2) - 0.62, t, 'e-dimtxt');
    s += sl(R0.y0, R0.y0 + R0.lu, `${Math.round(R0.s0 * 100)} %`) + sl(R0.y0 + R0.lu, R0.y1 - R0.lu, `${Math.round(R0.s * 100)} %`) + sl(R0.y1 - R0.lu, R0.y1, `${Math.round(R0.s0 * 100)} %`);
    const uh = uP + 0.25, zr = R0.z(R0.yPortal + 0.25);
    s += ln(uh, zr, uh, R0.decke, 'e-dim') + ln(uh - 0.11, zr, uh + 0.11, zr, 'e-dim') + ln(uh - 0.11, R0.decke, uh + 0.11, R0.decke, 'e-dim');
    s += tx(uh + 0.2, (zr + R0.decke) / 2, `lichte Höhe ${num(R0.lichte)} m`, 'e-mark');
    if (opt.mass) s += chain([uG, u0, u(R0.y0 + R0.lu), u(R0.y1 - R0.lu), u(R0.y1), uT], -4.55) + chain([uP, uH], 3.7);
    if (opt.koten) {
      const mark = (uu, z, t) => poly([[uu - 0.16, z + 0.27], [uu + 0.16, z + 0.27], [uu, z]], 'e-kmark') + tx(uu + 0.24, z + 0.07, `${kote(z)} ${t}`, 'e-mark');
      s += mark((uG + u0) / 2 - 0.2, 0, '') + mark(uP + 1.0, zPH, 'Boden Poolhaus') + mark(uT + 0.5, R0.zTG, 'Boden Tiefgarage');
      s += poly([[uP - 0.31, zP + 0.32], [uP - 0.05, zP + 0.32], [uP - 0.18, zP + 0.05]], 'e-kmark') + tx(uP - 0.18, zP + 0.5, kote(zP), 'e-dimtxt');
    }
    return { svg: s, vb: [x0, -4.3, x1 - x0, 9.5] };
  }
  function render(view, opt) {
    const res = view === 'A' ? section(opt) : view === 'B' ? rampSection(opt) : facade(view, opt);
    return { ...res, svg: DEFS + res.svg };
  }
  const TITLES = {
    S: ['Ansicht Süd · Garten', 'Grundriss und Fensterachsen aus dem Konzeptplan, Gliederung aus dem Rendering'],
    N: ['Ansicht Nord · Eingang', 'Im Konzept noch nicht gezeichnet: Fenster und Eingang als Annahme im gleichen Stil'],
    E: ['Ansicht Ost · Freisitz', 'Freisitz 3,00 × 5,00 m aus dem Konzeptplan, Öffnungen angenommen'],
    W: ['Ansicht West', 'Öffnungen angenommen'],
    A: ['Schnitt A–A · Hausmitte, Blick nach Westen', 'Geschosshöhen, Untergeschoss und Dachaufbau sind Annahmen'],
    B: ['Schnitt B–B · Rampe zur Tiefgarage', 'Längsschnitt in der Rampenachse, Blick nach Westen; Neigungen und Höhen der Tiefgarage sind ein Vorschlag'],
  };
  return { render, TITLES };
})();
