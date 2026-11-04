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
      // Haustür mit hohen Glasfeldern und Stoßgriffen, verglaste Seitenteile, darüber ein Oberlicht
      const zt = o.z1 - 0.32, sd = o.side || 0, a0 = o.u0 + g + sd, n = o.single ? 1 : 2, lw = (w - 2 * g - 2 * sd) / n;
      s += r(o.u0 + g, o.z0, o.u1 - g, o.z1 - g, 'e-frame') + r(o.u0 + 0.05, zt + 0.06, o.u1 - 0.05, o.z1 - 0.05, 'e-glass');
      if (sd) for (const b0 of [o.u0 + g, o.u1 - g - sd]) s += r(b0 + 0.05, o.z0 + 0.55, b0 + sd - 0.05, zt, 'e-glass');
      for (let i = 0; i < n; i++) {
        // einflügelig: Glasfeld mittig, langer Stoßgriff auf der Schlossseite
        const a = a0 + i * lw, gx = n === 1 ? a + 0.12 : i ? a + 0.08 : a + lw - 0.08;
        s += r(a + 0.18 + (n === 1 ? 0.12 : 0), o.z0 + 0.7, a + lw - 0.18, zt - 0.18, 'e-glass') + r(gx - 0.015, o.z0 + 0.6, gx + 0.015, o.z0 + 1.85, 'e-handle');
      }
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
    const zb = d.zwerch ? Z.gesimsU : HOUSE.roofZ(d.front);
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
  // Quadratischer Pfeiler mit schlichtem Sockel und Kapitell von z0 bis unter die Platte z1 (Seitenlänge w)
  function column(u, w, z0 = HOUSE.terrasse.z, z1 = HOUSE.balkon.slab[0]) {
    const h = w / 2;
    return r(u - h - 0.05, z0, u + h + 0.05, z0 + 0.14, 'e-pil') + r(u - h, z0 + 0.14, u + h, z1 - 0.16, 'e-pil') +
      r(u - h - 0.04, z1 - 0.16, u + h + 0.04, z1 - 0.06, 'e-pil') + r(u - h - 0.07, z1 - 0.06, u + h + 0.07, z1, 'e-pil');
  }
  function balkon(side) {
    const b = HOUSE.balkon, bd = HOUSE.balkonDG, D = HOUSE.D;
    const slab = (B, a, c) => r(a, B.slab[0], c, B.slab[1] - 0.12, 'e-pil') + r(a - 0.06, B.slab[1] - 0.12, c + 0.06, B.slab[1], 'e-pil') + rail(a + 0.05, c - 0.05, B.slab[1], B.rail);
    // Pfeiler des DG-Balkons stehen auf dem OG-Balkon
    const upper = u => column(u, bd.colW, b.slab[1], bd.slab[0]);
    if (side === 'S') return b.cols.map(x => column(x, b.colW)).join('') + slab(b, b.x0, b.x1) + bd.cols.map(upper).join('') + slab(bd, bd.x0, bd.x1);
    if (side === 'E') return column(b.colY + D, b.colW) + slab(b, b.y0 + D, b.y1 + D) + upper(bd.colY + D) + slab(bd, bd.y0 + D, bd.y1 + D);
    if (side === 'W') return column(-b.colY, b.colW) + slab(b, -b.y1, -b.y0) + upper(-bd.colY) + slab(bd, -bd.y1, -bd.y0);
    return '';
  }
  // Eingangsportikus der Nordseite: von vorn Pfeiler, Gebälk und Türrahmung, von Osten und Westen im Profil
  function portikus(side) {
    const p = HOUSE.fas.N.portikus, D = HOUSE.D, zp = HOUSE.podest.z, h = p.pw / 2;
    if (!p) return '';
    const roof = (a, c) => r(a, p.z0, c, p.z1 - 0.12, 'e-pil') + r(a - 0.08, p.z1 - 0.12, c + 0.08, p.z1, 'e-pil') + r(a - 0.04, p.z1, c + 0.04, p.z1 + 0.03, 'e-cap');
    const pillar = u => r(u - h - 0.05, zp, u + h + 0.05, zp + 0.14, 'e-pil') + r(u - h, zp + 0.14, u + h, p.z0 - 0.14, 'e-pil') + r(u - h - 0.04, p.z0 - 0.14, u + h + 0.04, p.z0, 'e-pil');
    if (side === 'N') {
      const d = HOUSE.fas.N.open.find(q => q.kind === 'eingang');
      return r(d.u0 - 0.22, Z.ffbEG, d.u0 - 0.04, d.z1 + 0.18, 'e-pil') + r(d.u1 + 0.04, Z.ffbEG, d.u1 + 0.22, d.z1 + 0.18, 'e-pil') + r(d.u0 - 0.3, d.z1 + 0.04, d.u1 + 0.3, d.z1 + 0.22, 'e-pil') +
        p.pillars.map(pillar).join('') + roof(p.u0, p.u1);
    }
    if (side === 'E') return pillar(D + p.py) + roof(D, D + p.depth);
    if (side === 'W') return pillar(-p.py) + roof(-p.depth, 0);
    return '';
  }
  // Dachfenster in der steilen Dachfläche und Kamine über dem Dach
  function roofItems(side) {
    const F = HOUSE.fas[side], sinA = Math.sin(Math.atan(HOUSE.tan1)), W = HOUSE.W, D = HOUSE.D;
    let s = '';
    for (const w of F.roofWindows || []) {
      const z0 = HOUSE.traufe + w.v0 * sinA, z1 = HOUSE.traufe + w.v1 * sinA;
      const c = (w.u0 + w.u1) / 2;
      s += r(w.u0 - 0.07, z0 - 0.07, w.u1 + 0.07, z1 + 0.07, 'e-frame') + r(w.u0, z0, w.u1, z1, 'e-glass') + r(c - 0.03, z0, c + 0.03, z1, 'e-frame');
    }
    for (const k of HOUSE.kamine) {
      const u = { S: k.x, N: W - k.x, E: k.y + D, W: -k.y }[side], hw = (side === 'S' || side === 'N' ? k.w : k.d) / 2;
      s += r(u - hw, Z.knick, u + hw, k.top - 0.12, 'e-wall') + r(u - hw - 0.05, k.top - 0.32, u + hw + 0.05, k.top - 0.22, 'e-pil') + r(u - hw - 0.06, k.top - 0.12, u + hw + 0.06, k.top, 'e-cap');
    }
    return s;
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
    s += r(bd.colY + D - bd.colW / 2, b.slab[1], bd.colY + D + bd.colW / 2, bd.slab[0], 'e-beyond');
    s += tx((bd.y0 + D) / 2, bd.slab[1] + 1.25, 'Balkon', 'e-dimtxt') + tx((b.y0 + D) / 2, b.slab[1] + 1.25, 'Balkon', 'e-dimtxt');
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
    const R0 = HOUSE.rampe, G = HOUSE.tg, yS = -53.2, u = y => y - yS, yEnd = -17.4, uE = u(yEnd), zPH = HOUSE.poolhaus.z, T = R0.tor, uz = R0.unterzug;
    const xc = (R0.x0 + R0.x1) / 2, yG = R0.grenze(xc), pct = v => `${+(v * 100).toFixed(1)}`.replace('.', ',') + ' %';
    // Fahrbahn ab der Grenze (in der Achse, bis zur Westkante noch eben): an jedem Knick und dazwischen alle 40 cm
    const ys = [yG, R0.yG, R0.y0, R0.y0 + R0.lm, R0.y1, R0.yTor];
    for (let y = yG; y < R0.yTor; y += 0.4) ys.push(y);
    const prof = ys.sort((a, b) => a - b).map(y => [u(y), R0.z(y)]);
    prof.push([uE, R0.zTG]);
    const back = prof.slice().reverse(), u0 = u(R0.y0), uP = u(R0.yPortal), uH = u(R0.yPH), uT = u(R0.yTor), uTE = u(R0.yE), uG = u(yG), zP = R0.z(R0.yPortal);
    const x0 = -0.6, x1 = uE + 0.6;
    let s = r(x0 + 0.3, -4.1, x1 - 0.3, 0, 'e-earth');
    // Luftraum: Vorplatz, offener Graben, Durchfahrt unter dem Poolhaus, Anschluss und Tiefgarage
    s += poly([[uG, 0], [uP, 0], [uP, R0.decke], [uH, R0.decke], [uH, G.decke], [uE, G.decke], ...back], 'e-room');
    // Rampenwand mit Geländer jenseits der Schnittebene, am Vorplatz der bündige Randstein
    s += poly([[u0, 0.15], [uP, 0.15], [uP, zP], ...prof.filter(p => p[0] > u0 && p[0] < uP).reverse(), [u0, R0.zR]], 'e-beyond');
    const uK = u(Math.max(R0.grenze(R0.x0 - R0.wand), R0.yG) + 0.02);
    s += poly([[uK, 0.02], [u0, 0.02], [u0, R0.zR], ...prof.filter(p => p[0] > uK && p[0] < u0).reverse(), [uK, R0.z(uK + yS)]], 'e-beyond');
    s += rail(u0 + 0.3, uP - 0.06, 0.15, 1.05).replace(/class="e-bar"/g, 'class="e-bar e-railx"');
    // Fahrbahnplatte mit den Rinnen (am Ende des Vorplatzes, vor dem Tor), Unterzug unter der Nordwand des Poolhauses, Decke der Tiefgarage
    s += poly([...prof, ...back.map(([a, b]) => [a, b - 0.3])], 'e-cut') + r(uH - uz.b, G.decke, uH, R0.decke, 'e-cut') + r(uH, G.decke, uE, G.decke + G.platte, 'e-cut');
    for (const y of [R0.y0 - 0.09, R0.y1 + 0.15]) s += r(u(y) - 0.08, R0.z(y) - 0.15, u(y) + 0.08, R0.z(y), 'e-room');
    // Unterzug an der Kante Stellplätze/Fahrgasse (x 17,20) jenseits der Schnittebene
    const U = G.unterzug;
    s += r(uTE, G.decke - U.h, uE, G.decke, 'e-beyond');
    // Sektionaltor: Sturz geschnitten, Torblatt an der Innenseite der Wand, offen (gestrichelt) über einen Bogen waagrecht unter der Decke
    const hb = T.h + 0.05, zb = R0.zTG + hb, zh = zb + 0.25;
    s += r(uT, R0.zTG + T.h, uTE, G.decke, 'e-cut') + r(uTE + 0.01, R0.zTG, uTE + 0.05, zb, 'e-bar');
    s += pline([...[0, 1, 2, 3, 4, 5, 6].map(k => [uTE + 0.28 - 0.25 * Math.cos(k * Math.PI / 12), zb + 0.25 * Math.sin(k * Math.PI / 12)]), [uTE + 0.28 + hb, zh]], 'e-dim e-dash');
    s += tx(uT - 1.75, R0.zTG + 1.3, `Tor ${num(T.h)} m`, 'e-mark') + tx(uTE + 0.4, G.decke - U.h - 0.22, 'Tor offen unter der Decke', 'e-mark');
    // Poolhaus: Boden zugleich Decke der Durchfahrt, Wände geschnitten (Nordwand mit Fenster, wenn es in der Schnittachse liegt), dahinter die Glas-Schiebewand zum Pool; flaches Walmdach im Schnitt
    const PH = HOUSE.poolhaus, tn = Math.tan(PH.neigung * Math.PI / 180), ov = 0.25, ex = Math.min(xc - (PH.x0 - PH.veranda - ov), PH.x1 + ov - xc);
    const rY0 = u(PH.y0 - ov), rY1 = u(PH.y1 + ov), rz = PH.traufe + tn * ex, uDoor = v => u(PH.y1 - v);
    s += r(uP, R0.decke, uH, zPH, 'e-cut') + r(uP + PH.wand, zPH, uH - PH.wand, PH.gesims, 'e-room');
    { const [a, b] = PH.front; s += r(uDoor(b), zPH, uDoor(a), 2.45, 'e-beyond'); for (let q = 0; q <= 3; q++) { const uu = uDoor(a + (b - a) * q / 3); s += ln(uu, zPH, uu, 2.45, 'e-glassline'); } }
    const fenster = PH.fenster[0] < xc && xc < PH.fenster[1];
    s += r(uP, zPH, uP + PH.wand, PH.gesims, 'e-cut') + r(uP - 0.1, PH.gesims, uH + 0.1, PH.traufe, 'e-cut');
    s += fenster ? r(uH - PH.wand, zPH, uH, 0.9, 'e-cut') + r(uH - PH.wand, 2.45, uH, PH.gesims, 'e-cut') + ln(uH - PH.wand / 2, 0.9, uH - PH.wand / 2, 2.45, 'e-glassline')
      : r(uH - PH.wand, zPH, uH, PH.gesims, 'e-cut');
    s += poly([[rY0, PH.traufe], [rY0 + ex, rz], [rY1 - ex, rz], [rY1, PH.traufe], [rY1, PH.traufe - 0.18], [rY1 - ex, rz - 0.2], [rY0 + ex, rz - 0.2], [rY0, PH.traufe - 0.18]], 'e-cutroof');
    s += ln(x0 + 0.3, 0, uG, 0, 'e-ground') + ln(uH, 0, x1 - 0.3, 0, 'e-ground');
    s += ln(uG, -0.7, uG, 1.7, 'e-dim e-dash') + tx(uG, 1.9, 'Grenze', 'e-label');
    s += tx(uG / 2, 0.45, 'Straße', 'e-label') + tx((uG + u0) / 2, 0.45, 'Vorplatz', 'e-label') + tx((u0 + uP) / 2, 1.6, 'offene Rampe · 2,80 m breit', 'e-label');
    const uL = (uTE + uE) / 2 + 0.6, txm = (uu, z, t) => tx(uu, z, t, 'e-mark').replace('<text ', '<text text-anchor="middle" ');
    s += tx((uP + uH) / 2, 1.55, 'Poolhaus', 'e-label') + tx(uL, -2.05, 'Tiefgarage', 'e-label');
    s += txm(uL, -2.5, `lichte Höhe ${num(G.lichte)} m`) + txm(uL, -2.85, `unter dem Unterzug (dahinter) ${num(U.lichte)} m`);
    // Neigungen; lichte Höhen am Portal unter dem Poolhaus und unter dem Unterzug an dessen Nordwand
    const sl = (ya, yb, t) => tx((u(ya) + u(yb)) / 2, R0.z((ya + yb) / 2) - 0.62, t, 'e-dimtxt');
    s += sl(R0.yG, R0.y0, pct(R0.vor.s)) + sl(R0.y0, R0.y0 + R0.lm, pct(R0.s)) + sl(R0.y0 + R0.lm, R0.y1, pct(R0.unten.s));
    const hoehe = (uh, zr, zt, t) => ln(uh, zr, uh, zt, 'e-dim') + ln(uh - 0.11, zr, uh + 0.11, zr, 'e-dim') + ln(uh - 0.11, zt, uh + 0.11, zt, 'e-dim') + tx(uh + 0.2, (zr + zt) / 2, t, 'e-mark');
    s += hoehe(uP + 0.03, R0.z(R0.yPortal + 0.03), R0.decke, `lichte Höhe ${num(R0.lichte)} m`);
    s += hoehe(uH - uz.b - 0.03, R0.z(R0.yPH - uz.b - 0.03), G.decke, `${num(uz.lichte)} m`);
    if (opt.mass) s += chain([uG, u0, u(R0.y0 + R0.lm), u(R0.y1), uTE], -4.55) + chain([uP, uH], 3.7);
    if (opt.koten) {
      const mark = (uu, z, t) => poly([[uu - 0.16, z + 0.27], [uu + 0.16, z + 0.27], [uu, z]], 'e-kmark') + tx(uu + 0.24, z + 0.07, `${kote(z)} ${t}`, 'e-mark');
      s += mark(uG - 1.0, 0, '') + mark(u0, R0.zR, 'Rinne') + mark(uP + 1.0, zPH, 'Boden Poolhaus') + mark(uTE + 1.9, R0.zTG, 'Boden Tiefgarage');
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
