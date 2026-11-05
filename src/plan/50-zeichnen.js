  // Teil der Grundrisse (src/plan/, siehe 00-kern.js): Flächen (auch DG nach lichter Höhe), Wände, Fenster, Türen, Treppe, Luftraum und Aufzug zeichnen
  // Dachgeschoss: lichte Höhe hängt vom Abstand s zur Außenwand ab (steile Mansarde, Dachaufbau 30 cm); im Zwerchhaus volle Höhe
  const h0 = HOUSE.Z.wand - 0.3 / Math.cos(Math.atan(HOUSE.tan1)) - HOUSE.Z.ffbDG;
  const sAt = h => (h - h0) / HOUSE.tan1;
  const inset = s => [s, W - s, -D + s, -s];
  const clip = (r, z) => Math.max(0, Math.min(r[1], z[1]) - Math.max(r[0], z[0])) * Math.max(0, Math.min(r[3], z[3]) - Math.max(r[2], z[2]));
  const inter = (a, b) => [Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.min(a[3], b[3])];
  const ZWERCH = ['S', 'N'].flatMap(side => (HOUSE.fas[side].dormers || []).filter(d => d.zwerch).map(d => {
    const back = (d.top - HOUSE.Z.wand) / HOUSE.tan1;
    return side === 'S' ? [d.u0, d.u1, -D, -D + back] : [W - d.u1, W - d.u0, -back, 0];
  }));
  const tall = (r, inner) => clip(r, inner) + ZWERCH.reduce((t, z) => t + clip(r, z) - clip(r, inter(inner, z)), 0);
  function roomArea(fl, rm) {
    // ext: weitere Rechtecke desselben Raums (L-förmige Räume, z. B. die Küche); Treppe, Aufzug und Luftraum zählen bei core nicht
    const rs = [rm.r, ...(rm.ext || [])], core = q => (rm.core ? coreIn(fl, q) : 0);
    const a = rs.reduce((t, q) => t + area(q) - core(q), 0);
    if (fl !== 'DG') return { a, wf: fl === 'UG' ? 0 : (rm.wf ?? 1) * a };
    // Wohnfläche nach WoFlV: unter 1 m lichter Höhe 0 %, 1–2 m 50 %, ab 2 m 100 %; Zwerchhäuser zählen voll, Gauben nicht (eher zu niedrig)
    const wf = rs.reduce((t, q) => { const full = tall(q, inset(sAt(2))), half = tall(q, inset(sAt(1))) - full; return t + full - core(q) + 0.5 * half; }, 0);
    return { a, wf: (rm.wf ?? 1) * wf };
  }

  // ---------- Zeichnen ----------
  function planSeg(side, u0, u1, t0, t1) {
    if (side === 'S') return [u0, u1, -D + t0, -D + t1];
    if (side === 'N') return [W - u1, W - u0, -t1, -t0];
    if (side === 'E') return [W - t1, W - t0, u0 - D, u1 - D];
    return [t0, t1, -u1, -u0];
  }
  function arc(H, A, B, r) {
    const a = [A[0] - H[0], -(A[1] - H[1])], b = [B[0] - H[0], -(B[1] - H[1])];
    const sw = a[0] * b[1] - a[1] * b[0] > 0 ? 1 : 0;
    return `<path d="M${f(A[0])} ${f(-A[1])} A${f(r)} ${f(r)} 0 0 ${sw} ${f(B[0])} ${f(-B[1])}" class="g-arc"/>`;
  }
  function door({ x, y, w, o, s, h, t = 0.3 }) {
    if (o === 'v') {
      const H = [x, h ? y + w : y], B = [x, h ? y : y + w], A = [x + s * w, H[1]];
      return R(x - t / 2, x + t / 2, y, y + w, 'g-gap') + L(H[0], H[1], A[0], A[1], 'g-leaf') + arc(H, A, B, w);
    }
    const H = [h ? x + w : x, y], B = [h ? x : x + w, y], A = [H[0], y + s * w];
    return R(x, x + w, y - t / 2, y + t / 2, 'g-gap') + L(H[0], H[1], A[0], A[1], 'g-leaf') + arc(H, A, B, w);
  }
  function outerOpenings(fl) {
    let s = '';
    if (fl === 'UG') {
      // Lichthof vor dem Gym: große Fenster bis zum Boden in der Westwand
      const LH = HOUSE.lichthof;
      s += R(...planSeg(LH.side, LH.u0, LH.u1, -LH.tief, 0), 'g-outside', `Lichthof vor dem Gym · ${num(LH.u1 - LH.u0, 2)} × ${num(LH.tief, 2)} m, bis zum UG-Boden, Steinbelag, oben Geländer`);
      for (const [a, b] of LH.win) s += R(...planSeg(LH.side, a, b, -0.01, 0.37), 'g-gap') + R(...planSeg(LH.side, a, b, 0.13, 0.19), 'g-glass');
    }
    if (fl === 'EG' || fl === 'OG') {
      const [za, zb] = fl === 'EG' ? [0, 3] : [3, 6.5];
      for (const side of ['S', 'N', 'E', 'W']) for (const o of HOUSE.fas[side].open) {
        if (o.z0 < za || o.z0 >= zb) continue;
        // Haustür kommt aus der Türliste, hier nur die verglasten Seitenteile
        if (o.kind === 'eingang') {
          for (const [a, b] of o.side ? [[o.u0, o.u0 + o.side], [o.u1 - o.side, o.u1]] : []) s += R(...planSeg(side, a, b, -0.01, 0.37), 'g-gap') + R(...planSeg(side, a, b, 0.13, 0.19), 'g-glass');
          continue;
        }
        s += R(...planSeg(side, o.u0, o.u1, -0.01, 0.37), 'g-gap') + R(...planSeg(side, o.u0, o.u1, 0.13, 0.19), 'g-glass');
        if (o.kind === 'fenster') s += R(...planSeg(side, o.u0, o.u1, 0, 0.05), 'g-sill');
      }
    }
    if (fl === 'DG') for (const side of ['S', 'N', 'E', 'W']) {
      const F = HOUSE.fas[side], cosA = Math.cos(Math.atan(HOUSE.tan1)), o = HOUSE.ueberstand;
      for (const d of F.dormers || []) {
        const back = (d.top - HOUSE.Z.wand) / HOUSE.tan1;
        s += R(...planSeg(side, d.u0, d.u1, d.front, back), 'g-dormer', d.zwerch ? 'Zwerchhaus · volle Raumhöhe' : 'Gaube');
        // Zwerchhaus steht in der Fassadenflucht: Öffnungen gehen durch die Außenwand
        for (const w of d.win) s += d.zwerch ? R(...planSeg(side, w.u0, w.u1, -0.01, 0.37), 'g-gap') + R(...planSeg(side, w.u0, w.u1, 0.13, 0.19), 'g-glass')
          : R(...planSeg(side, w.u0, w.u1, d.front, d.front + 0.12), 'g-glass');
      }
      for (const w of F.roofWindows || []) s += R(...planSeg(side, w.u0, w.u1, w.v0 * cosA - o, w.v1 * cosA - o), 'g-skylight', 'Dachfenster in der steilen Dachfläche');
    }
    return s;
  }
  // Treppenbahn eines Geschosses: der Lauf nach oben mit Stufen und Laufpfeil (Antritt im Osten, Austritt im Westen); im EG eine
  // breitere, zur Halle ausschwingende Antrittsstufe; im DG die Öffnung über dem heraufkommenden Lauf mit Geländer
  const TREPPE = { UG: 'Kellertreppe', EG: 'Haupttreppe', OG: 'Treppe ins DG' };
  function stair(fl) {
    const ly0 = LINE[2], ly1 = LINE[3], ym = (ly0 + ly1) / 2, up = FLIGHTS[fl];
    let s = '';
    if (up) {
      const g = (up.x0 - up.x1) / (up.n - 1), h = (up.zb - up.za) / up.n;
      s += R(up.x1, up.x0, ly0, ly1, 'g-stair', `${TREPPE[fl]} · gerade, 1,30 m breit · ${up.n} Steigungen à ${num(h * 100)} cm, Auftritt ${num(g * 100, 0)} cm`);
      for (let i = 1; i < up.n - 1; i++) s += L(up.x1 + i * g, ly0, up.x1 + i * g, ly1, 'g-tread');
      if (fl === 'EG') s += `<path d="M${f(up.x0)} ${f(-ly0)} V${f(-(ly1 + 0.2))} A0.2 0.2 0 0 0 ${f(up.x0 - 0.2)} ${f(-(ly1 + 0.4))} H${f(up.x0 - g)} V${f(-ly1)} H${f(up.x0)} Z" class="g-stair" data-tip="Antrittsstufe · zur Halle hin 40 cm breiter, gerundet"/>`;
      // geschlossene Brüstung an der Nordseite (zur Halle bzw. zum Luftraum)
      s += L(up.x1, ly1 + 0.04, up.x0, ly1 + 0.04, 'g-railing');
      s += `<polyline points="${pts([[up.x0 - 0.15, ym], [up.x1 + 0.5, ym]])}" class="g-walk"/>` +
        `<polygon points="${pts([[up.x1 + 0.55, ym + 0.14], [up.x1 + 0.55, ym - 0.14], [up.x1 + 0.27, ym]])}" class="g-walkhead"/>`;
    } else {
      const [h0, h1] = HOLES[fl], F = FLIGHTS.OG, g = (F.x0 - F.x1) / (F.n - 1);
      s += R(h0, h1, ly0, ly1, 'g-void', 'Öffnung über der Treppe aus dem OG');
      for (let i = 1; F.x1 + i * g < h1; i++) s += L(F.x1 + i * g, ly0, F.x1 + i * g, ly1, 'g-tread');
      s += L(h1 + 0.03, ly0, h1 + 0.03, ly1, 'g-railing');
    }
    // Beschriftung: aufwärts auf dem Lauf, abwärts am Podest im Westen, wo der Lauf von unten ankommt
    const [hoch, runter] = { UG: ['↑ EG', ''], EG: ['↑ OG', '↓ UG'], OG: ['↑ DG', '↓ EG'], DG: ['', '↓ OG'] }[fl];
    if (hoch) s += T((up.x1 + up.x0) / 2, ym + 0.3, hoch, 'g-stairtxt');
    if (runter) s += T((LINE[0] + FLIGHTS.EG.x1) / 2 + 0.05, ym - 0.08, runter, 'g-stairtxt');
    return s;
  }
  // Luftraum über der Halle (im OG): schraffiert; Geländer am Antritt der Dachtreppe
  function voidArea() {
    const [a] = VOID;
    let s = R(a[0], a[1], a[2], a[3], 'g-void', 'Luftraum über der Halle · zweigeschossig, 6,10 m hoch, mit dem Fenster über der Haustür');
    s += L(a[0], a[3], a[1], a[2], 'g-thin') + L(a[0], a[2], a[1], a[3], 'g-thin');
    return s + L(FLIGHTS.OG.x0, a[2] - 0.04, a[1], a[2] - 0.04, 'g-railing') + T((a[0] + a[1]) / 2, -1.25, 'Luftraum', 'g-ftxt');
  }
  // Aufzug im Wandblock westlich der Treppenbahn, Tür nach Osten auf das Podest
  function lift() {
    const [x0, x1, y0, y1] = LIFT, t = 0.2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, dy = -4.2;
    return R(x0, x1, y0, y1, 'g-wall') + R(x0 + t, x1 - t, y0 + t, y1 - t, 'g-shaft', 'Personenaufzug · Kabine 1,10 × 1,40 m · UG bis DG · im Wandblock am Treppenpodest, wandbündige Türen nach Osten') +
      L(x0 + t, y0 + t, x1 - t, y1 - t, 'g-thin') + L(x0 + t, y1 - t, x1 - t, y0 + t, 'g-thin') +
      R(cx - 0.55, cx + 0.55, cy - 0.7, cy + 0.7, 'g-cabin') + R(x1 - t - 0.02, x1 + 0.02, dy - 0.45, dy + 0.45, 'g-gap') + T(cx, cy - 0.08, 'Aufzug', 'g-ftxt g-lifttxt');
  }
