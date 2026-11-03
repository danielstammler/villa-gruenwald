// Lageplan als SVG: Umgebung aus der Flurkarte, Konzept, Bäume, Maße, Abstandsflächen, Vogel-Skizze.
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

  const H = HOUSE.Z.wand + (HOUSE.Z.first - HOUSE.Z.wand) / 3;
  const AB = { H, ns: 0.8 * H, ew: 0.4 * H };
  const plotArea = area(SITE.plot);
  const tgUnterZuwegung = (23.499 - 22.885) * (24.151 - 11.65);
  const FL = [
    ['Wohnhaus', area(C.haus)], ['Freisitz', area(C.freisitz)], ['Terrasse', area(C.terrasse)], ['Podest', area(C.podest)],
    ['Poolhaus', area(C.poolhaus)], ['Pool', area(C.pool)], ['Zuwegung', area(C.zuwegung)], ['Zufahrt', area(C.zufahrt)],
  ];
  const befestigt = FL.reduce((s, [, a]) => s + a, 0);
  const tgGarten = area(C.tg) - tgUnterZuwegung;
  const STATS = { plotArea, befestigt, tgGarten, tg: area(C.tg), gruen: plotArea - befestigt, gruenOhneTG: plotArea - befestigt - tgGarten, FL, AB,
    west: [westX(0), westX(-HOUSE.D)].map(x => -x), north: [northY(0.01), northY(HOUSE.W)], east: eastX(-HOUSE.D / 2) - HOUSE.W };

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
    s.push(`<defs>
      <pattern id="pBestand" width="0.9" height="0.9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V0.9" class="s-hatchline"/></pattern>
      <pattern id="pAbstand" width="0.7" height="0.7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><path d="M0 0V0.7" class="s-abline"/></pattern>
      <mask id="mOutside" maskUnits="userSpaceOnUse" x="-400" y="-400" width="800" height="800"><rect x="-400" y="-400" width="800" height="800" fill="#fff"/><polygon points="${pts(SITE.plot)}" fill="#000"/></mask>
    </defs>`);
    // Umgebung
    s.push('<g data-layer="umgebung">');
    for (const st of SITE.streets) s.push(poly(st, 's-street', 'Öffentliche Straße'));
    for (const [a, b, c, d] of SITE.parcelLines) s.push(line([a, b], [c, d], 's-parcel'));
    for (const b of SITE.secondary) s.push(poly(b.pts, 's-nb2', 'Nebengebäude Nachbar (Flurkarte)'));
    for (const b of SITE.neighbors) s.push(poly(b.pts, 's-nb', 'Nachbarhaus (Flurkarte) · Erdgeschoss + Dachgeschoss'));
    for (const l of SITE.labels) if (!l.t.startsWith('14')) s.push(text(l.p, l.t, 's-hnr'));
    s.push(text([7.5, -56.2], 'Ebertstraße', 's-streetname', 4.0));
    s.push('</g>');
    // Konzept
    s.push('<g data-layer="konzept">');
    s.push(poly(SITE.plot, 's-lawn', `Garten · ${num(STATS.gruen, 0)} m² unversiegelt`));
    s.push(poly(C.zuwegung, 's-pave', `Zuwegung · 1,50 m breit · ${num(area(C.zuwegung), 1)} m²`));
    s.push(poly(C.zufahrt, 's-pave', `Zufahrt · ${num(area(C.zufahrt), 1)} m² · mit Rampe zur Tiefgarage`));
    s.push(poly(C.terrasse, 's-stone', 'Terrasse · 7,00 × 3,00 m · darüber Balkon auf vier Säulen'));
    s.push(poly(C.podest, 's-stone', 'Podest am Eingang · 5,00 × 1,00 m'));
    s.push(poly(C.freisitz, 's-stone', 'Freisitz · 3,00 × 5,00 m · überdacht, darüber Dachterrasse'));
    s.push(poly(C.pool, 's-coping', 'Pool · 4,00 × 12,00 m'));
    s.push(poly(C.poolWasser, 's-water', 'Pool · Wasserfläche ca. 3,50 × 11,50 m'));
    s.push(poly(C.poolhaus, 's-annex', 'Poolhaus · 3,50 × 6,00 m'));
    s.push(poly(C.haus, 's-house', 'Wohnhaus · 16,00 × 11,65 m · 186,4 m² · Wandhöhe 7,25 m · First 11,12 m'));
    for (const o of HOUSE.fas.S.open.filter(q => q.z0 < 1)) s.push(poly(rect(o.u0, -HOUSE.D, o.u1, -HOUSE.D + 0.2), 's-win'));
    const bk = HOUSE.balkon;
    s.push(poly(rect(bk.x0, bk.y0, bk.x1, bk.y1), 's-balkon', 'Balkon im OG · 7,00 × 3,00 m · auf vier Säulen') + bk.cols.map(x => circ([x, bk.colY], bk.colR, 's-col')).join(''));
    s.push(text([8, -4.6], 'Wohnhaus', 's-houselabel') + text([8, -6.0], '16,00 × 11,65', 's-houselabel s-small') + text([8, -7.2], '186,4 m²', 's-houselabel s-small'));
    s.push(text([8, -13.4], 'Terrasse', 's-lbl s-small') + text([17.5, -8.6], 'Freisitz', 's-lbl s-small', -90) + text([8, 0.35], 'Podest', 's-lbl s-tiny'));
    s.push(poly([[8, 1.1], [7.55, 2.05], [8.45, 2.05]], 's-entry', 'Hauseingang (Nordseite)'));
    s.push(text([8, -30.65], 'Pool 4,00 × 12,00', 's-lbl s-small', -90) + text([21.13, -30.65], 'Poolhaus 3,50 × 6,00', 's-lbl s-tiny', -90));
    s.push(text([23.63, -21], 'Zuwegung 1,50', 's-lbl s-tiny', -90) + text([22.2, -48.6], 'Zufahrt', 's-lbl s-small'));
    s.push('</g>');
    s.push(`<g data-layer="bestand">${SITE.bestand.map(b => poly(b.pts, 's-bestand', b.kind === 'haus' ? 'Bestandshaus Nr. 14 · Abriss' : 'Bestandsgarage · Abriss')).join('')}</g>`);
    const rp = HOUSE.rampe;
    s.push(`<g data-layer="tg">${poly(C.tg, 's-tg', `Tiefgarage (unterirdisch) · ${num(STATS.tg, 1)} m² außerhalb des Hauses`)}${text([17.6, -18.2], 'Tiefgarage (unterirdisch)', 's-tglabel')}` +
      `${poly(rect(rp.x0, rp.y0, rp.x1, rp.y1), 's-ramp', 'Rampe zur Tiefgarage · ca. 14 % · läuft unter dem Poolhaus durch')}${text([21.13, -40.5], 'Rampe', 's-tglabel', -90)}</g>`);
    // Vogel
    const V = SITE.vogel, vb = (o, side) => {
      const [a, b] = o[side];
      return side === 'W' || side === 'E' ? rect(a, -12.09, b, -0.19) : rect(3.46, a, 18.38, b);
    };
    s.push('<g data-layer="vogel">');
    for (const side of ['N', 'S', 'E', 'W']) s.push(poly(vb(V.abstandAussen, side), 's-vab', 'Vogel: Abstandsfläche inkl. ⅓ Dachhöhe') + poly(vb(V.abstandInnen, side), 's-vab s-vab-in', 'Vogel: Abstandsfläche nur Wandhöhe'));
    s.push(poly(V.tg, 's-vtg', 'Vogel: Tiefgarage') + poly(V.haus, 's-vhaus', 'Vogel: Haus 15,10 × 12,05 m') + poly(V.vorbauSued, 's-vhaus', 'Vogel: Vorbau Süd 2,50 m') + poly(V.vorbauNord, 's-vhaus', 'Vogel: Vorbau Nord 2,00 m'));
    s.push(text([10.9, 4.2], 'Vogel+Partner 30.10.', 's-vlabel'));
    s.push('</g>');
    // Abstandsflächen für das Konzept
    const abs = [rect(0, 0, HOUSE.W, AB.ns), rect(0, -HOUSE.D - AB.ns, HOUSE.W, -HOUSE.D), rect(-AB.ew, -HOUSE.D, 0, 0), rect(HOUSE.W, -HOUSE.D, HOUSE.W + AB.ew, 0)];
    s.push('<g data-layer="abstand">' + abs.map((P, i) => poly(P, 's-ab', `Abstandsfläche ${i < 2 ? '0,8' : '0,4'} H = ${num(i < 2 ? AB.ns : AB.ew)} m (überschlägig)`)).join('') +
      `<g mask="url(#mOutside)">${abs.map(P => poly(P, 's-ab-over')).join('')}</g>` + text([-1.7, -5.8], `0,4 H = ${num(AB.ew)}`, 's-ablabel', -90) + text([8, 5.7], `0,8 H = ${num(AB.ns)}`, 's-ablabel') + '</g>');
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
      dim([3, -D], [3, southY(3)], null, 's-dim', -0.5) + dim([8, -14.652], [8, -24.651], null, 's-dim', -0.5) +
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
