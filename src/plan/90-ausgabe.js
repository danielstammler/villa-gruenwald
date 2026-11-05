  // Teil der Grundrisse (src/plan/, siehe 00-kern.js): Umgebung, Höhenlinien, render, Raumtabelle, Wohnfläche und Schnittstelle
  function context(fl) {
    const t = HOUSE.terrasse, b = HOUSE.balkon, fz = HOUSE.freisitz, p = HOUSE.podest;
    const sq = (x, y, w, tip) => R(x - w / 2, x + w / 2, y - w / 2, y + w / 2, 'g-col', tip);
    const pk = HOUSE.fas.N.portikus, bd = HOUSE.balkonDG;
    const rails = B => L(B.x0 + 0.06, B.y0 + 0.06, B.x1 - 0.06, B.y0 + 0.06, 'g-railing') + L(B.x0 + 0.06, B.y0 + 0.06, B.x0 + 0.06, B.y1, 'g-railing') + L(B.x1 - 0.06, B.y0 + 0.06, B.x1 - 0.06, B.y1, 'g-railing');
    if (fl === 'EG') return `<polygon points="${pts(t.poly)}" class="g-outside" data-tip="Terrasse · durchgehend ${num(t.x1 - t.x0, 2)} × ${num(t.y1 - t.y0, 2)} m bis an den Freisitz · Naturstein · Lounge mittig unter dem Balkon"/>` +
      R(t.stufe[0], t.stufe[1], t.y0 - 0.35, t.y0, 'g-outside', 'Stufe zum Weg an den Pool') + L(t.stufe[0], t.y0, t.stufe[1], t.y0, 'g-tread') +
      b.cols.map(x => sq(x, b.colY, b.colW, `Pfeiler · ${num(b.colW * 100, 0)} × ${num(b.colW * 100, 0)} cm`)).join('') +
      R(fz.x0, fz.x1, fz.y0, fz.y1, 'g-outside', `Freisitz · ${num(fz.x1 - fz.x0, 2)} × ${num(fz.y1 - fz.y0, 2)} m · überdacht, Esstisch`) + sq(fz.x1 - 0.175, fz.y0 + 0.175, 0.35) + sq(fz.x1 - 0.175, fz.y1 - 0.175, 0.35) +
      R(p.x0, p.x1, p.y0, p.y1, 'g-outside', 'Podest am Eingang') + R(W - pk.u1, W - pk.u0, 0, pk.depth, 'g-above', 'Portikus über dem Eingang') +
      pk.pillars.map(u => sq(W - u, pk.py, pk.pw, 'Pfeiler des Portikus')).join('') + T(8, -15.25, 'Terrasse', 'g-ftxt') + T(17.5, -6.25, 'Freisitz', 'g-ftxt') + T(8, 0.4, 'Eingang', 'g-ftxt');
    if (fl === 'OG') return R(b.x0, b.x1, b.y0, b.y1, 'g-outside', `Balkon · ${num(b.x1 - b.x0, 2)} × ${num(b.y1 - b.y0, 2)} m`) + rails(b) + T(8, -14.3, 'Balkon', 'g-ftxt') +
      bd.cols.map(x => sq(x, bd.colY, bd.colW, `Pfeiler · ${num(bd.colW * 100, 0)} × ${num(bd.colW * 100, 0)} cm · trägt den Balkon im DG`)).join('') +
      R(fz.x0, fz.x1, fz.y0, fz.y1, 'g-outside', `Dachterrasse auf dem Freisitz · ${num(fz.x1 - fz.x0, 2)} × ${num(fz.y1 - fz.y0, 2)} m`) + T(17.5, -8.4, 'Dachterrasse', 'g-ftxt');
    if (fl === 'DG') return R(bd.x0, bd.x1, bd.y0, bd.y1, 'g-outside', `Balkon vor dem Büro · ${num(bd.x1 - bd.x0, 2)} × ${num(bd.y1 - bd.y0, 2)} m · tritt nach vorne, auf zwei Pfeilern`) + rails(bd) +
      bd.cols.map(x => sq(x, bd.colY, bd.colW)).join('') + T(9.6, -12.25, 'Balkon', 'g-ftxt');
    return '';
  }
  function heightLines() {
    let s = '';
    const zs = ZWERCH.find(z => z[2] === -D), zn = ZWERCH.find(z => z[3] === 0), t = HOUSE.wall;
    for (const [h, lbl] of [[1, '1,00 m'], [2, '2,00 m']]) {
      const [x0, x1, y0, y1] = inset(sAt(h));
      // Linie springt an den Zwerchhäusern bis an die Außenwand zurück
      const P = [[x0, y0], ...(zs ? [[zs[0], y0], [zs[0], -D + t], [zs[1], -D + t], [zs[1], y0]] : []), [x1, y0], [x1, y1],
        ...(zn ? [[zn[1], y1], [zn[1], -t], [zn[0], -t], [zn[0], y1]] : []), [x0, y1], [x0, y0]];
      s += `<polyline points="${pts(P)}" class="g-hline"/>` + T(x0 + 0.15, y0 + 0.08, `lichte Höhe ${lbl}`, 'g-htxt');
    }
    return s;
  }
  function render(fl, opt) {
    const F = FL[fl];
    let s = fl === 'UG' ? tiefgarage() : '';
    s += context(fl);
    s += R(0, W, -D, 0, 'g-wall');
    for (const rm of F.rooms) for (const q of [rm.r, ...(rm.ext || [])]) s += R(...q, 'g-room', `${rm.n} · ${num(rm.r[1] - rm.r[0], 2)} × ${num(rm.r[3] - rm.r[2], 2)} m`);
    for (const o of F.open || []) s += R(...o, 'g-room');
    s += outerOpenings(fl);
    for (const d of F.doors) s += door(d);
    if (fl === 'DG') s += heightLines();
    if (opt.moebel) s += `<g class="g-furniture">${F.furn().join('')}</g>`;
    s += stair(fl) + lift() + (fl === 'OG' ? voidArea() : '');
    if (opt.flaechen) for (const rm of F.rooms) {
      const { a, wf } = roomArea(fl, rm), at = rm.at || [(rm.r[0] + rm.r[1]) / 2, (rm.r[2] + rm.r[3]) / 2];
      const sm = rm.r[1] - rm.r[0] < 2.6 ? ' g-sm' : '';
      const txt = fl === 'DG' && rm.wf !== 0 && Math.abs(wf - a) > 0.2 ? `${num(a)} m² · WoFl. ${num(wf)}` : `${num(a)} m²`;
      s += T(at[0], at[1] + 0.12, rm.n, `g-roomtxt${sm}`) + T(at[0], at[1] - (sm ? 0.32 : 0.42), txt, `g-areatxt${sm}`);
    }
    // Außenmaße und Nordpfeil
    // Im UG liegt südlich des Hauses die Tiefgarage, dort steht die Breite an der Nordseite
    const dy = fl === 'UG' ? 0.9 : -D - 0.9;
    s += `<g class="g-dims">${L(0, dy, W, dy, 'g-dim')}${L(-0.9, -D, -0.9, 0, 'g-dim')}${T(W / 2, dy + 0.15, num(W, 2), 'g-dimtxt')}` +
      `<text x="-0.75" y="${f(D / 2)}" class="g-dimtxt" transform="rotate(-90 -0.75 ${f(D / 2)})">${num(D, 2)}</text></g>`;
    const na = (rot => { const a = rot * Math.PI / 180, c = [-1.6, 1.9], Rt = p => [c[0] + p[0] * Math.cos(a) - p[1] * Math.sin(a), c[1] + p[0] * Math.sin(a) + p[1] * Math.cos(a)]; return `<polygon points="${pts([[0, 0.9], [0.32, -0.55], [-0.32, -0.55]].map(Rt))}" class="g-north"/>` + T(...Rt([0, 1.35]), 'N', 'g-ntxt'); })(SITE.north.grid);
    s += na;
    const vb = fl === 'UG' ? [-2.6, -2.2, 28.6, 53.8] : [-2.6, -1.6, 22.2, 17.2];
    return { svg: s, vb };
  }
  function table(fl) {
    const rows = FL[fl].rooms.map(rm => ({ n: rm.n, ...roomArea(fl, rm) }));
    return { rows, sum: rows.reduce((t, r) => t + r.a, 0), wf: rows.reduce((t, r) => t + r.wf, 0) };
  }
  // Möbel als Daten für das 3D-Modell: dieselben Aufrufe wie im Grundriss, nur mitgeschrieben statt gezeichnet
  function items(fl) {
    const out = [], saved = { ...fu };
    for (const k of Object.keys(fu)) fu[k] = (...a) => { out.push({ t: k, a }); return ''; };
    try { FL[fl].furn(); } finally { Object.assign(fu, saved); }
    return out;
  }
  // Für die Prüfungen (tools/lib/grundriss.js): dieselben Aufrufe, je Möbel das SVG, das der echte Helfer zeichnet (Formen ohne Nachbau)
  function formen(fl) {
    const out = [], saved = { ...fu };
    for (const k of Object.keys(fu)) fu[k] = (...a) => { const svg = saved[k](...a); out.push({ t: k, a, svg }); return svg; };
    try { FL[fl].furn(); } finally { Object.assign(fu, saved); }
    return out;
  }
  function wohnflaeche() {
    const part = ['EG', 'OG', 'DG'].map(fl => table(fl).wf);
    const B = HOUSE.balkon, BD = HOUSE.balkonDG;
    const aussen = 0.25 * (area([B.x0, B.x1, B.y0, B.y1]) + 15.0 + area([BD.x0, BD.x1, BD.y0, BD.y1]));
    return { eg: part[0], og: part[1], dg: part[2], aussen, sum: part[0] + part[1] + part[2] + aussen };
  }
  return { render, table, wohnflaeche, items, formen, FL, num, CORE: { LINE, FLIGHTS, HOLES, LIFT, VOID } };
})();
