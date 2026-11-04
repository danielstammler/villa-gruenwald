// Lageplan als SVG: Umgebung aus der Flurkarte, Konzept mit offener Rampe, Tiefgarage, Bäume, Maße.
// Einheit Meter; Plan-y nach Norden wird zu SVG-y = -y.
const Site = (() => {
  const C = SITE.concept;
  const f = v => +v.toFixed(2);
  const num = (v, d = 2) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pts = P => P.map(p => `${f(p[0])},${f(-p[1])}`).join(' ');
  const area = P => Math.abs(P.reduce((s, p, i) => { const q = P[(i + 1) % P.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0)) / 2;
  const tipAttr = tip => tip ? ` data-tip="${tip}"` : '';
  const poly = (P, cls, tip) => `<polygon points="${pts(P)}" class="${cls}"${tipAttr(tip)}/>`;
  const pline = (P, cls) => `<polyline points="${pts(P)}" class="${cls}"/>`;
  const circ = (c, r, cls, tip) => `<circle cx="${f(c[0])}" cy="${f(-c[1])}" r="${f(r)}" class="${cls}"${tipAttr(tip)}/>`;
  const line = (a, b, cls) => `<line x1="${f(a[0])}" y1="${f(-a[1])}" x2="${f(b[0])}" y2="${f(-b[1])}" class="${cls}"/>`;
  const text = (p, s, cls, rot = 0) => `<text x="${f(p[0])}" y="${f(-p[1])}" class="${cls}"${rot ? ` transform="rotate(${f(rot)} ${f(p[0])} ${f(-p[1])})"` : ''}>${s}</text>`;
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const upright = a => (a > 90 ? a - 180 : a < -90 ? a + 180 : a);

  // Schnittpunkte einer waagrechten bzw. senkrechten Linie mit der Grundstücksgrenze
  function hits(v, axis) {
    const P = SITE.plot, out = [], k = axis === 'y' ? 1 : 0, j = 1 - k;
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length];
      if ((a[k] - v) * (b[k] - v) <= 0 && a[k] !== b[k]) out.push(a[j] + (b[j] - a[j]) * (v - a[k]) / (b[k] - a[k]));
    }
    return out;
  }
  const westX = y => Math.min(...hits(y, 'y')), eastX = y => Math.max(...hits(y, 'y'));
  const northY = x => Math.max(...hits(x, 'x')), southY = x => Math.min(...hits(x, 'x'));

  function dim(a, b, label, cls = 's-dim', off = 0.5) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
    const t = [(ux - uy) * 0.32, (ux + uy) * 0.32];
    let s = line(a, b, cls);
    for (const p of [a, b]) s += line([p[0] - t[0], p[1] - t[1]], [p[0] + t[0], p[1] + t[1]], cls);
    const m = [(a[0] + b[0]) / 2 - uy * off, (a[1] + b[1]) / 2 + ux * off];
    return s + text(m, label ?? num(L), 's-dimtxt', upright(Math.atan2(-dy, dx) * 180 / Math.PI));
  }

  const plotArea = area(SITE.plot);
  const tgUnterZuwegung = (23.499 - 22.885) * (24.151 - 11.65);
  // Überlappung zweier Rechtecke [x0, x1, y0, y1]
  const cut = (a, b) => Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[2], b[2]));
  const T = HOUSE.terrasse, PD = HOUSE.poolDeck, PW = HOUSE.poolWeg;
  const tgUnterTerrasse = [[4.5, 11.498, -14.652, -11.65], [11.498, 23.499, -24.151, -11.65]].reduce((s, r) => s + cut(r, [T.x0, T.x1, T.y0, T.y1]), 0);
  const FL = [
    ['Wohnhaus', area(C.haus)], ['Freisitz', area(C.freisitz)], ['Terrasse', area(T.poly)], ['Podest', area(C.podest)],
    ['Poolhaus', area(C.poolhaus)], ['Pool', area(C.pool)], ['Poolterrasse', area(PD.poly) - area(C.pool)], ['Weg zum Pool', (PW.x1 - PW.x0) * (PW.y1 - PW.y0)],
    ['Zuwegung', area(C.zuwegung)], ['Zufahrt', area(C.zufahrt)],
  ];
  const befestigt = FL.reduce((s, [, a]) => s + a, 0);
  const tgGarten = area(C.tg) - tgUnterZuwegung - tgUnterTerrasse;
  const STATS = { plotArea, befestigt, tgGarten, tg: area(C.tg), gruen: plotArea - befestigt, gruenOhneTG: plotArea - befestigt - tgGarten, FL };

  function northArrow(c, rot) {
    const R = p => { const a = rot * Math.PI / 180; return [c[0] + p[0] * Math.cos(a) - p[1] * Math.sin(a), c[1] + p[0] * Math.sin(a) + p[1] * Math.cos(a)]; };
    return poly([[0, 2.4], [0.7, -1.3], [0, -0.6]].map(R), 's-na-dark') + poly([[0, 2.4], [-0.7, -1.3], [0, -0.6]].map(R), 's-na-light') +
      text(R([0, 3.0]), 'N', 's-na-txt', -rot);
  }
  function scaleBar(p) {
    let s = '';
    [[0, 5, 's-sb-a'], [5, 10, 's-sb-b'], [10, 20, 's-sb-a']].forEach(([a, b, cls]) => { s += poly(rect(p[0] + a, p[1], p[0] + b, p[1] + 0.6), cls); });
    for (const v of [0, 5, 10, 20]) s += text([p[0] + v, p[1] + 1.1], String(v), 's-sbtxt');
    return s + text([p[0] + 21.2, p[1] + 1.1], 'm', 's-sbtxt');
  }

  function build() {
    const s = [];
    // Umgebung
    s.push('<g data-layer="umgebung">');
    for (const st of SITE.streets) s.push(poly(st, 's-street', 'Öffentliche Straße'));
    for (const [a, b, c, d] of SITE.parcelLines) s.push(line([a, b], [c, d], 's-parcel'));
    for (const b of SITE.secondary) s.push(poly(b.pts, 's-nb2', 'Nebengebäude Nachbar (Flurkarte)'));
    for (const b of SITE.neighbors) s.push(poly(b.pts, 's-nb', 'Nachbarhaus (Flurkarte) · Erdgeschoss + Dachgeschoss'));
    for (const l of SITE.labels) s.push(text(l.p, l.t, 's-hnr'));
    s.push(text([7.5, -56.2], 'Ebertstraße', 's-streetname', 4.0));
    s.push('</g>');
    // Konzept
    s.push('<g data-layer="konzept">');
    s.push(poly(SITE.plot, 's-lawn', `Garten · ${num(STATS.gruen, 0)} m² unversiegelt`));
    s.push(poly(C.zuwegung, 's-pave', `Zuwegung · 1,50 m breit · ${num(area(C.zuwegung), 1)} m²`));
    s.push(poly(C.zufahrt, 's-pave', `Zufahrt · ${num(area(C.zufahrt), 1)} m² · darin die offene Rampe zur Tiefgarage`));
    // Offene Rampe zwischen Betonwänden: Querlinien im Meterabstand, Pfeil zeigt bergab
    const rp = HOUSE.rampe, rx0 = rp.x0 - rp.wand, rx1 = rp.x1 + rp.wand, rc = (rp.x0 + rp.x1) / 2;
    s.push(poly(rect(rp.x0, rp.y0, rp.x1, rp.yPortal), 's-rampopen', `Offene Rampe zur Tiefgarage · 2,80 m breit · davor ${num(rp.vor.l)} m Vorplatz mit ${num(rp.vor.s * 100, 0)} % bis zur Rinne, dann ${num(rp.s * 100, 0)} % · am Poolhaus ${num(-rp.z(rp.yPortal))} m tief`));
    for (let y = rp.y0 + 1; y < rp.yPortal - 0.4; y += 1) s.push(line([rp.x0, y], [rp.x1, y], 's-rampline'));
    s.push(poly(rect(rx0, rp.y0, rp.x0, rp.yPortal), 's-rampwall', 'Rampenwand mit Geländer') + poly(rect(rp.x1, rp.y0, rx1, rp.yPortal), 's-rampwall', 'Rampenwand mit Geländer'));
    s.push(poly([[rc - 0.5, -38.2], [rc + 0.5, -38.2], [rc, -36.9]], 's-ramparrow') + text([rc + 0.25, -43.4], `Rampe ${num(rp.s * 100, 0)} %`, 's-lbl s-tiny', -90));
    const PL = SITE.plot, hk = [[25.059, -44.0], PL[4], PL[5], PL[6], PL[0]];
    s.push(`<polyline points="${pts(hk.map(([x, y], i) => [x + (i === 0 || i === 1 ? -0.45 : 0), y]))}" class="s-hedge" data-tip="Hecke · ca. 1,30 m hoch · West-, Nord- und Ostgrenze"/>`);
    s.push(poly(T.poly, 's-stone', `Terrasse · durchgehend 19,00 × 4,00 m bis an den Freisitz · ${num(area(T.poly), 1)} m² · Lounge mittig unter dem Balkon`));
    s.push(poly(C.podest, 's-stone', 'Podest am Eingang · 5,00 × 1,00 m'));
    s.push(poly(C.freisitz, 's-stone', 'Freisitz · 3,00 × 5,00 m · Esstisch für sechs, überdacht, darüber Dachterrasse'));
    s.push(poly(rect(PW.x0, PW.y0, PW.x1, PW.y1), 's-stone', 'Weg von der Terrasse zum Pool · 1,20 m breit'));
    s.push(poly(PD.poly, 's-stone', `Poolterrasse · Naturstein · ${num(area(PD.poly) - area(C.pool), 1)} m² · Liegen und Sonnenschirm, bis an die Veranda des Poolhauses`));
    s.push(poly(C.pool, 's-coping', 'Pool · 4,00 × 12,00 m · Stufen über die ganze Breite an der Nordseite'));
    s.push(poly(C.poolWasser, 's-water', 'Pool · Wasserfläche ca. 3,50 × 11,50 m'));
    const PH = HOUSE.poolhaus;
    s.push(poly(rect(PH.x0 - PH.veranda, PH.y0, PH.x0, PH.y1), 's-balkon', 'Veranda des Poolhauses · 1,80 × 6,00 m · überdacht, zwei Pfeiler'));
    s.push(poly(C.poolhaus, 's-annex', 'Poolhaus · 3,50 × 6,00 m · zum Pool offen mit Glas-Schiebewand, Fenster nach Norden, Walmdach · darunter führt die Rampe in die Tiefgarage'));
    // Zaun an der Straße mit Einfahrtstor und Gartentür, an der Ostgrenze bis zur Hecke
    const Z0 = HOUSE.zaun, P0 = SITE.plot, onB = x => [x, P0[2][1] + (x - P0[2][0]) * (P0[3][1] - P0[2][1]) / (P0[3][0] - P0[2][0])];
    s.push(`<polyline points="${pts([P0[0], P0[1], P0[2], onB(Z0.tor[0])])}" class="s-fence" data-tip="Zaun · weißer Sockel mit schwarzen Stäben zwischen Pfeilern · 1,65 m hoch"/>`);
    s.push(`<polyline points="${pts([onB(Z0.tuer[1]), P0[3], [25.059, -44.0]])}" class="s-fence" data-tip="Zaun · weißer Sockel mit schwarzen Stäben"/>`);
    s.push(`<polyline points="${pts([onB(Z0.tor[0]), onB(Z0.tor[1])])}" class="s-gate" data-tip="Einfahrtstor · zweiflügelig, schwarzer Stahl · 3,60 m breit"/>`);
    s.push(`<polyline points="${pts([onB(Z0.tuer[0]), onB(Z0.tuer[1])])}" class="s-gate" data-tip="Gartentür für Fußgänger mit Klingel und Briefkasten im Pfeiler"/>`);
    s.push(poly(C.haus, 's-house', 'Wohnhaus · 16,00 × 11,65 m · 186,4 m² · Wandhöhe 7,25 m · First 11,12 m'));
    for (const o of HOUSE.fas.S.open.filter(q => q.z0 < 1)) s.push(poly(rect(o.u0, -HOUSE.D, o.u1, -HOUSE.D + 0.2), 's-win'));
    const bk = HOUSE.balkon;
    const sq = (x, y, w) => poly(rect(x - w / 2, y - w / 2, x + w / 2, y + w / 2), 's-col');
    s.push(poly(rect(bk.x0, bk.y0, bk.x1, bk.y1), 's-balkon', 'Balkon im OG · 7,00 × 3,00 m · auf zwei Pfeilern') + bk.cols.map(x => sq(x, bk.colY, bk.colW)).join(''));
    const bd = HOUSE.balkonDG;
    s.push(poly(rect(bd.x0, bd.y0, bd.x1, bd.y1), 's-balkon', 'Balkon im DG · 7,00 × 1,00 m · auf Konsolen vor dem Zwerchhaus'));
    // Vordach über dem Eingang (Nordfassade: Plan-x = Hausbreite − u)
    const pk = HOUSE.fas.N.portikus;
    s.push(poly(rect(HOUSE.W - pk.u1, 0, HOUSE.W - pk.u0, pk.depth), 's-balkon', `Vordach über dem Eingang · ${num(pk.u1 - pk.u0)} × ${num(pk.depth)} m · zwei Pfeiler`) +
      pk.pillars.map(u => sq(HOUSE.W - u, pk.py, pk.pw)).join(''));
    s.push(text([8, -4.6], 'Wohnhaus', 's-houselabel') + text([8, -6.0], '16,00 × 11,65', 's-houselabel s-small') + text([8, -7.2], '186,4 m²', 's-houselabel s-small'));
    s.push(text([2.4, -14.1], 'Terrasse', 's-lbl s-small') + text([17.5, -8.6], 'Freisitz', 's-lbl s-small', -90) + text([8, 0.35], 'Podest', 's-lbl s-tiny'));
    s.push(text([11.8, -36.9], 'Poolterrasse', 's-lbl s-tiny'));
    s.push(poly([[8, 1.1], [7.55, 2.05], [8.45, 2.05]], 's-entry', 'Hauseingang (Nordseite)'));
    s.push(text([8, -30.65], 'Pool 4,00 × 12,00', 's-lbl s-small', -90) + text([21.13, -30.65], 'Poolhaus 3,50 × 6,00', 's-lbl s-tiny', -90));
    s.push(text([23.63, -21], 'Zuwegung 1,50', 's-lbl s-tiny', -90) + text([22.6, -49.75], 'Zufahrt', 's-lbl s-small'));
    s.push('</g>');
    s.push(`<g data-layer="tg">${poly(C.tg, 's-tg', `Tiefgarage (unterirdisch) · ${num(STATS.tg, 1)} m² außerhalb des Hauses`)}${text([17.6, -18.2], 'Tiefgarage (unterirdisch)', 's-tglabel')}` +
      `${poly(rect(rp.x0, rp.yPortal, rp.x1, rp.yTor), 's-ramp', `Rampe unter dem Poolhaus · lichte Höhe ca. ${num(rp.lichte)} m · unten das Tor zur Tiefgarage`)}</g>`);
    // Bäume
    s.push('<g data-layer="baeume">');
    for (const z of SITE.schutz) s.push(circ(z.c, z.r, 's-schutz', `Wurzelschutzbereich (Krone + 1,50 m) · Radius ${num(z.r, 1)} m`));
    for (const t of SITE.trees) s.push(circ(t.c, t.r, t.geschuetzt ? 's-tree s-tree-p' : 's-tree', `${t.geschuetzt ? 'Geschützter Baum (Nachbar)' : 'Baum'} · Kronendurchmesser ca. ${num(2 * t.r, 1)} m`) + circ(t.c, 0.28, 's-trunk'));
    s.push(text([27.2, -1.0], 'Schutzbaum', 's-schutzlabel') + text([27.0, -53.8], 'Schutzbaum', 's-schutzlabel'));
    s.push('</g>');
    // 5-m-Linie
    s.push(`<g data-layer="linie">${pline(C.linie5m, 's-linie')}${text([-1.5, -43.5], '5,00 m zur Straße', 's-linielabel', 0.2)}</g>`);
    // Grenze
    const P = SITE.plot;
    s.push('<g data-layer="grenze">' + poly(P, 's-grenze', `Grundstück · ${num(1661, 0)} m² (amtlich) · gezeichnet ${num(plotArea, 1)} m²`));
    for (const st of SITE.stones) s.push(circ(st, 0.35, 's-stone-mark'));
    for (let i = 0; i < P.length; i++) {
      const a = P[i], b = P[(i + 1) % P.length], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      const m = [(a[0] + b[0]) / 2 + dy / L * 1.1, (a[1] + b[1]) / 2 - dx / L * 1.1];
      s.push(text(m, num(L), 's-edge', upright(Math.atan2(-dy, dx) * 180 / Math.PI)));
    }
    s.push(text([-10.2, -23], 'Fl. 1.661 m²', 's-plotarea', -90) + '</g>');
    // Maße
    const W = HOUSE.W, D = HOUSE.D;
    s.push('<g data-layer="masse">' +
      dim([westX(-0.6), -0.6], [0, -0.6]) + dim([westX(-D + 0.6), -D + 0.6], [0, -D + 0.6]) +
      dim([0.8, 0], [0.8, northY(0.8)], null, 's-dim', -0.5) + dim([W - 0.8, 0], [W - 0.8, northY(W - 0.8)], null, 's-dim', -0.5) +
      dim([W, -1.4], [eastX(-1.4), -1.4]) + dim([19, -9.6], [eastX(-9.6), -9.6]) +
      dim([3, -D], [3, southY(3)], null, 's-dim', -0.5) + dim([10.6, -15.65], [10.6, -24.651], null, 's-dim', -0.5) +
      dim([22.885, -30.6], [eastX(-30.6), -30.6]) +
      dim([0, 2.9], [W, 2.9], '16,00') + dim([-0.9, 0], [-0.9, -D], '11,65', 's-dim', 0.5) + '</g>');
    s.push(northArrow([-10.5, 9], SITE.north.grid) + scaleBar([-9, -60]));
    return s.join('');
  }

  let svg, pz, tip, stage;
  function init(stageEl, svgEl, tipEl) {
    stage = stageEl; svg = svgEl; tip = tipEl;
    svg.innerHTML = build();
    pz = PanZoom(svg, () => [-16, -17, 52, 80]);
    pz.home();
    let downAt = null;
    svg.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
    svg.addEventListener('pointermove', e => {
      if (e.buttons) { tip.hidden = true; return; }
      showTip(e);
    });
    svg.addEventListener('pointerup', e => { if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6) showTip(e); });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; });
  }
  function showTip(e) {
    const el = e.target.closest && e.target.closest('[data-tip]');
    if (!el) { tip.hidden = true; return; }
    const r = stage.getBoundingClientRect();
    tip.textContent = el.dataset.tip; tip.hidden = false;
    const x = Math.min(e.clientX - r.left + 14, r.width - tip.offsetWidth - 8), y = Math.max(8, e.clientY - r.top - tip.offsetHeight - 12);
    tip.style.left = `${Math.max(8, x)}px`; tip.style.top = `${y}px`;
  }
  function setLayer(name, on) { const g = svg.querySelector(`[data-layer="${name}"]`); if (g) g.style.display = on ? '' : 'none'; }
  return { init, setLayer, STATS, num, home: () => pz.home(), zoom: k => pz.zoom(k), svgText: () => svg.outerHTML };
})();

// Zoomen und Verschieben für SVG-Zeichnungen (Maus, Rad, Touch mit zwei Fingern).
function PanZoom(svg, getHome) {
  let vb = null, pinch = null;
  const ptr = new Map();
  const set = v => { vb = v; svg.setAttribute('viewBox', v.map(n => +n.toFixed(3)).join(' ')); };
  const toSvg = (x, y) => { const p = new DOMPoint(x, y).matrixTransform(svg.getScreenCTM().inverse()); return [p.x, p.y]; };
  function zoomAt(cx, cy, k) {
    const [x, y] = toSvg(cx, cy), w = vb[2] * k;
    if (w < 3 || w > 700) return;
    set([x - (x - vb[0]) * k, y - (y - vb[1]) * k, w, vb[3] * k]);
  }
  svg.style.touchAction = 'none';
  svg.addEventListener('wheel', e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, Math.exp(e.deltaY * 0.0015)); }, { passive: false });
  svg.addEventListener('pointerdown', e => { svg.setPointerCapture(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]); pinch = null; });
  svg.addEventListener('pointermove', e => {
    if (!ptr.has(e.pointerId)) return;
    const prev = ptr.get(e.pointerId); ptr.set(e.pointerId, [e.clientX, e.clientY]);
    if (ptr.size === 1) {
      const a = toSvg(prev[0], prev[1]), b = toSvg(e.clientX, e.clientY);
      set([vb[0] - (b[0] - a[0]), vb[1] - (b[1] - a[1]), vb[2], vb[3]]);
    } else if (ptr.size === 2) {
      const [p, q] = [...ptr.values()], d = Math.hypot(p[0] - q[0], p[1] - q[1]);
      if (pinch) zoomAt((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, pinch / d);
      pinch = d;
    }
  });
  const up = e => { ptr.delete(e.pointerId); pinch = null; };
  svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
  return {
    home() { set(getHome().slice()); },
    zoom(k) { const r = svg.getBoundingClientRect(); zoomAt(r.left + r.width / 2, r.top + r.height / 2, k); },
  };
}
