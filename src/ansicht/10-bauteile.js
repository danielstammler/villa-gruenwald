  // Teil der Ansichten (src/ansicht/, siehe 00-kern.js): Geländer, Öffnungen, Gauben, Freisitz, Säulen, Balkone, Portikus, Dachteile, Wege, Koten
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
    // einflügelige Tür mit aufgesetzter Sprosse: schmaler als der Stoß zweier Flügel, aber dieselbe senkrechte Teilung
    if (o.sprosse) { const c = (o.u0 + o.u1) / 2; s += r(c - 0.025, o.z0 + fw + sill, c + 0.025, o.z1 - g - fw, 'e-frame'); }
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
