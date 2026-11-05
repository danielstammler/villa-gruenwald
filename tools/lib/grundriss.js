// Grundrissanalyse für tools/regeln.js und tools/raumbuch.js: Räume, Wände, Türen mit Schwenkbereich, Durchgänge, Fenster (Fassaden über
// HOUSE.frame aufs Geschoss gelegt), Möbelformen (Plans.formen), Treppe und Aufzug – alles aus Plans und HOUSE abgeleitet, damit ein
// geänderter Grundriss sofort geprüft ist. Rechtecke wie im Plan: [x0, x1, y0, y1], x Ost, y Nord, Meter.
const { rechne } = require('./laden');
const GESCHOSSE = ['UG', 'EG', 'OG', 'DG'];

// ---------- Rechtecke, Punkte, Raster ----------
const inR = (r, p, e = 0) => p[0] > r[0] - e && p[0] < r[1] + e && p[1] > r[2] - e && p[1] < r[3] + e;
const qm = r => (r[1] - r[0]) * (r[3] - r[2]);
const ueber = (a, b) => Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[2], b[2]));
const gleich = (a, b) => a.length === b.length && a.every((v, i) => Math.abs(v - b[i]) < 1e-6);
const inPoly = (P, p) => {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i], [xj, yj] = P[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
};
// a … b in Schritten von höchstens s, beide Enden dabei
const teilung = (a, b, s) => { if (b <= a) return [(a + b) / 2]; const n = Math.max(1, Math.ceil((b - a) / s)); return Array.from({ length: n + 1 }, (_, i) => a + (b - a) * i / n); };
// Punkte im Rechteck, um rand eingerückt: Anliegen an einer Wand ist erlaubt, Hineinragen um mehr als rand nicht
const raster = (r, s = 0.05, rand = 0.02) => { const xs = teilung(r[0] + rand, r[1] - rand, s), ys = teilung(r[2] + rand, r[3] - rand, s); return xs.flatMap(x => ys.map(y => [x, y])); };

// Raumarten nach dem Namen (Reihenfolge zählt: „Gäste-WC“ ist ein WC, „Dusche / WC“ ein Bad); Aufenthaltsräume nach BayBO Art. 45
const ARTEN = [[/bad|dusche/i, 'bad'], [/wc/i, 'wc'], [/flur|halle|foyer|diele/i, 'flur'], [/gym|wohnen|essen|küche|kind|schlaf|büro|gäste|arbeit/i, 'aufenthalt']];
const art = n => (ARTEN.find(([re]) => re.test(n)) || [null, 'neben'])[1];

// ---------- Möbelformen aus dem SVG der Plan-Helfer (Plans.formen) ----------
const ZAHL = '(-?[\\d.]+)';
const RE_RECT = new RegExp(`<rect x="${ZAHL}" y="${ZAHL}" width="${ZAHL}" height="${ZAHL}"`, 'g');
const RE_KREIS = new RegExp(`<circle cx="${ZAHL}" cy="${ZAHL}" r="${ZAHL}"`, 'g');
const RE_ELL = new RegExp(`<ellipse cx="${ZAHL}" cy="${ZAHL}" rx="${ZAHL}" ry="${ZAHL}"`, 'g');
function formenAus(svg) {
  const out = [];
  for (const m of svg.matchAll(RE_RECT)) { const [x, y, w, h] = m.slice(1).map(Number); out.push({ typ: 'rect', r: [x, x + w, -y - h, -y] }); }
  const ell = (cx, cy, rx, ry) => out.push({ typ: 'ell', cx, cy: -cy, rx, ry, r: [cx - rx, cx + rx, -cy - ry, -cy + ry] });
  for (const m of svg.matchAll(RE_KREIS)) { const [cx, cy, r] = m.slice(1).map(Number); ell(cx, cy, r, r); }
  for (const m of svg.matchAll(RE_ELL)) ell(...m.slice(1).map(Number));
  return out;
}
// Punkte einer Form (Ellipsen nur innen), Punkt in Form mit tol nach innen
const formPunkte = (f, s = 0.05, rand = 0.02) => f.typ === 'rect' ? raster(f.r, s, rand)
  : raster(f.r, s, 0).filter(([x, y]) => ((x - f.cx) / Math.max(0.01, f.rx - rand)) ** 2 + ((y - f.cy) / Math.max(0.01, f.ry - rand)) ** 2 <= 1);
const inForm = (f, p, tol = 0.02) => f.typ === 'rect' ? inR(f.r, p, -tol)
  : ((p[0] - f.cx) / Math.max(0.01, f.rx - tol)) ** 2 + ((p[1] - f.cy) / Math.max(0.01, f.ry - tol)) ** 2 < 1;
const MOEBEL = { box: 'Möbel', shelf: 'Regal', bed: 'Bett', sofa: 'Sofa', table: 'Tisch', tub: 'Wanne', shower: 'Dusche', wc: 'WC', basin: 'Waschtisch',
  desk: 'Schreibtisch', hob: 'Kochfeld', car: 'Auto', carH: 'Auto' };
const moebelName = m => (m.t === 'box' && (m.a[4] || m.a[5])) || MOEBEL[m.t] || m.t;

// ---------- Ein Geschoss: Räume, Wo-ist-was, Außenflächen, Türen, Fenster, Möbel, Verbindungen ----------
function geschoss(B, fl) {
  const { H, P } = B, F = P.FL[fl], { LINE, FLIGHTS, HOLES, LIFT, VOID } = P.CORE, W = H.W, D = H.D, tab = P.table(fl).rows;
  const raeume = F.rooms.map((rm, k) => ({ n: rm.n, art: art(rm.n), r: [...rm.r], rects: [rm.r, ...(rm.ext || [])].map(q => [...q]), core: !!rm.core, a: tab[k].a, wf: tab[k].wf }));
  // Luftraum über der Halle steht in open, ist aber nicht begehbar
  const luft = fl === 'OG' ? VOID.map(v => [...v]) : [];
  const offen = (F.open || []).map(o => [...o]).filter(o => !luft.some(v => gleich(v, o)));
  // Treppe auf diesem Geschoss: der Lauf nach oben und die Deckenöffnung über dem Lauf von unten
  const treppe = [FLIGHTS[fl] && [Math.min(FLIGHTS[fl].x0, FLIGHTS[fl].x1), Math.max(FLIGHTS[fl].x0, FLIGHTS[fl].x1), LINE[2], LINE[3]], HOLES[fl] && [...HOLES[fl]]].filter(Boolean);
  const haus = [0, W, -D, 0];
  // Wo liegt p? Raum, Durchgang, Luftraum, Aufzug, Wand (im Haus) oder außen
  function wo(p) {
    if (!inR(haus, p)) return { aussen: true };
    for (const rm of raeume) if (rm.rects.some(q => inR(q, p))) return { raum: rm };
    if (luft.some(q => inR(q, p))) return { luft: true };
    if (offen.some(q => inR(q, p))) return { offen: true };
    if (inR(LIFT, p)) return { aufzug: true };
    return { wand: true };
  }
  const name = w => !w ? null : w.aussen ? 'außen' : w.raum ? w.raum.n : w.luft ? 'Luftraum' : w.offen ? 'Durchgang' : w.aufzug ? 'Aufzug' : 'Wand';
  // Außenflächen und Pfeiler wie in Plans (context): Terrasse, Freisitz, Podest im EG, Balkon und Dachterrasse im OG, Balkon im DG
  const t = H.terrasse, b = H.balkon, bd = H.balkonDG, fz = H.freisitz, pd = H.podest, pk = H.fas.N.portikus, rr = o => [o.x0, o.x1, o.y0, o.y1];
  const sq = (x, y, w) => [x - w / 2, x + w / 2, y - w / 2, y + w / 2];
  const flaechen = {
    EG: [{ n: 'Terrasse', poly: t.poly }, { n: 'Freisitz', r: rr(fz) }, { n: 'Podest', r: rr(pd) }],
    OG: [{ n: 'Balkon', r: rr(b), deck: b }, { n: 'Dachterrasse', r: rr(fz), deck: fz }],
    DG: [{ n: 'Balkon DG', r: rr(bd), deck: bd }],
  }[fl] || [];
  const pfeiler = {
    EG: [...b.cols.map(x => sq(x, b.colY, b.colW)), sq(fz.x1 - fz.col / 2, fz.y0 + fz.col / 2, fz.col), sq(fz.x1 - fz.col / 2, fz.y1 - fz.col / 2, fz.col),
      ...pk.pillars.map(u => sq(W - u, pk.py, pk.pw))],
    OG: bd.cols.map(x => sq(x, bd.colY, bd.colW)),
  }[fl] || [];
  const aussenFlaeche = p => flaechen.find(a => a.poly ? inPoly(a.poly, p) : inR(a.r, p));
  // Kann hier ein Möbel stehen? null oder der Grund
  function frei(p) {
    if (inR(LIFT, p)) return 'Aufzug';
    if (treppe.some(q => inR(q, p))) return 'Treppe';
    const w = wo(p);
    if (w.aussen) return pfeiler.some(q => inR(q, p)) ? 'Pfeiler' : aussenFlaeche(p) ? null : 'außerhalb der Flächen';
    return w.raum || w.offen ? null : w.luft ? 'Luftraum' : 'Wand';
  }

  // Türen: Räume auf beiden Seiten (senkrecht zur Wand gesucht, Durchgänge übersprungen), Wanddicke, Schwenkbereich wie Plans (door)
  const tueren = F.doors.map((d, k) => {
    const hz = d.o === 'h', nrm = hz ? [0, 1] : [1, 0], lng = hz ? [1, 0] : [0, 1];
    const at = (u, v) => [d.x + lng[0] * u + nrm[0] * v, d.y + lng[1] * u + nrm[1] * v];
    const suche = (sg, u) => { for (let v = 0.01; v <= 0.8; v += 0.01) { const w = wo(at(u, sg * v)); if (!w.wand && !w.offen) return { w, v }; } return null; };
    const seite = sg => {
      const m = suche(sg, d.w / 2), n = m && name(m.w), enden = [suche(sg, 0.03), suche(sg, d.w - 0.03)];
      return { n, v: m ? m.v - 0.005 : null, voll: enden.every(e => e && name(e.w) === n) };
    };
    const plus = seite(1), minus = seite(-1);
    const Hg = hz ? [d.h ? d.x + d.w : d.x, d.y] : [d.x, d.h ? d.y + d.w : d.y];
    const uB = hz ? [d.h ? -1 : 1, 0] : [0, d.h ? -1 : 1], uS = hz ? [0, d.s] : [d.s, 0];
    // Punkte im Viertelkreis des Flügels, mit Abstand c von der Wandachse (c < halbe Wanddicke: in der Öffnung)
    const schwenk = [];
    for (let a = 0.015; a < d.w; a += 0.03) for (let c = 0.015; c < d.w; c += 0.03) if (a * a + c * c < d.w * d.w) schwenk.push({ p: [Hg[0] + uB[0] * a + uS[0] * c, Hg[1] + uB[1] * a + uS[1] * c], c });
    const wand = plus.v != null && minus.v != null ? plus.v + minus.v : null;
    return { d, k, hz, plus, minus, wand, in: d.s > 0 ? plus : minus, schwenk, Hg, uB, uS, breite: d.w, mitte: at(d.w / 2, 0), name: `${minus.n || '?'}–${plus.n || '?'}` };
  });
  // Liegt p im Schwenkbereich der Tür t (tol nach innen)?
  const imSchwenk = (t, p, tol = 0.02) => {
    const dx = p[0] - t.Hg[0], dy = p[1] - t.Hg[1], a = dx * t.uB[0] + dy * t.uB[1], c = dx * t.uS[0] + dy * t.uS[1];
    return a > tol && c > tol && a * a + c * c < (t.d.w - tol) ** 2;
  };
  // Doppeltüren: zwei Flügel auf einer Achse, die in der Mitte zusammenstoßen
  for (const a of tueren) for (const c of tueren) if (a !== c && a.hz === c.hz && !a.d.h && c.d.h && Math.abs(a.hz ? a.d.y - c.d.y : a.d.x - c.d.x) < 0.01
    && Math.abs(a.hz ? a.d.x + a.d.w - c.d.x : a.d.y + a.d.w - c.d.y) < 0.01) { a.breite = c.breite = a.d.w + c.d.w; a.paar = c; c.paar = a; }

  // Fenster dieses Geschosses: hinter der Öffnung entlang abgetastet, welche Räume (oder Wände) dahinter liegen
  const fenster = B.fenster.filter(f => f.fl === fl).map(f => {
    const us = teilung(f.u0 + 0.02, f.u1 - 0.02, 0.02), hinter = us.map(u => wo(f.pt(u, f.tiefe)));
    const raeumeH = [...new Set(hinter.filter(w => !w.wand && !w.aufzug).map(name))], anteile = {};
    for (const w of hinter) if (w.raum) anteile[w.raum.n] = (anteile[w.raum.n] || 0) + 1 / us.length;
    return { ...f, raeume: raeumeH, anteile, wand: hinter.filter(w => w.wand || w.aufzug).length / us.length * (f.u1 - f.u0), raum: (hinter.find(w => w.raum) || {}).raum };
  });

  // Möbel mit ihren Formen; Raum nach der Mitte der ersten Form
  const moebel = P.formen(fl).map(m => {
    const formen = formenAus(m.svg), f = formen[0], c = f && [(f.r[0] + f.r[1]) / 2, (f.r[2] + f.r[3]) / 2], w = c && wo(c);
    return { t: m.t, a: [...m.a], name: moebelName(m), formen, raum: !w ? null : w.aussen ? ((aussenFlaeche(c) || {}).n || 'außen') : w.raum ? w.raum.n : name(w) };
  });

  // Wandfugen zwischen gegenüberliegenden Rechtecken verschiedener Räume (Abstand in einer Richtung, Überlappung in der anderen),
  // Überschneidungen, Abstand zur Innenkante der Außenwand
  const fugen = [], schnitte = [], R = raeume.flatMap(rm => rm.rects.map(q => ({ rm, q })));
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    const A = R[i], C = R[j], p = A.q, q = C.q, gx = Math.max(p[0], q[0]) - Math.min(p[1], q[1]), gy = Math.max(p[2], q[2]) - Math.min(p[3], q[3]);
    if (A.rm === C.rm) continue;
    if (gx < -0.001 && gy < -0.001) { schnitte.push({ a: A.rm.n, b: C.rm.n, qm: ueber(p, q) }); continue; }
    if (gx >= -0.001 && gx < 0.6 && gy < -0.1) fugen.push({ a: A.rm.n, b: C.rm.n, d: Math.max(0, gx), lang: -gy });
    if (gy >= -0.001 && gy < 0.6 && gx < -0.1) fugen.push({ a: A.rm.n, b: C.rm.n, d: Math.max(0, gy), lang: -gx });
  }
  const innen = [H.wall, W - H.wall, -D + H.wall, -H.wall];

  // Verbindungen: Türen, Durchgänge (open, an jeder Seite dreimal abgetastet), Räume ohne Wand dazwischen
  const kanten = [];
  for (const t of tueren) if (t.plus.n && t.minus.n && t.plus.n !== t.minus.n) kanten.push({ a: t.plus.n, b: t.minus.n, art: 'Tür', t });
  for (const o of offen) {
    const n = new Set();
    for (const f of [0.25, 0.5, 0.75]) {
      const x = o[0] + f * (o[1] - o[0]), y = o[2] + f * (o[3] - o[2]);
      for (const p of [[o[0] - 0.03, y], [o[1] + 0.03, y], [x, o[2] - 0.03], [x, o[3] + 0.03]]) { const w = wo(p); if (w.raum) n.add(w.raum.n); }
    }
    const L = [...n];
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) kanten.push({ a: L[i], b: L[j], art: 'offen', o });
  }
  for (const g of fugen) if (g.d < 0.005) kanten.push({ a: g.a, b: g.b, art: 'ohne Wand' });
  // Erreichbar von der Treppe (Räume mit core) über Türen und Durchgänge; außen zählt nicht
  const nb = new Map(raeume.map(r => [r.n, new Set()]));
  for (const k of kanten) { if (nb.has(k.a)) nb.get(k.a).add(k.b); if (nb.has(k.b)) nb.get(k.b).add(k.a); }
  const erreicht = new Set(raeume.filter(r => r.core).map(r => r.n)), todo = [...erreicht];
  while (todo.length) for (const n of nb.get(todo.shift()) || []) if (nb.has(n) && !erreicht.has(n)) { erreicht.add(n); todo.push(n); }

  return { fl, F, ffb: F.ffb, decke: B.decke[fl], hoehe: B.decke[fl] - F.ffb, raeume, offen, luft, treppe, haus, innen, wo, name, frei, flaechen, pfeiler,
    aussenFlaeche, tueren, imSchwenk, fenster, moebel, fugen, schnitte, kanten, nachbarn: nb, erreicht };
}

// ---------- Ganzes Haus: Fenster aller Fassaden, Geschosse, Treppenläufe ----------
// Unterseite eines Laufs lotrecht unter seinen Stufenkanten (Annahme für die Kopfhöhe darunter; das 3D hat 0,32–0,53 m)
const LAUF_DICKE = 0.6;
function analyse(ctx) {
  const H = rechne(ctx, 'HOUSE'), P = rechne(ctx, 'Plans'), Z = H.Z, { LINE, FLIGHTS, HOLES } = P.CORE;
  const geschossVon = z => GESCHOSSE.filter(g => P.FL[g].ffb <= z + 0.05).pop();
  const decke = { UG: Z.deckeUG, EG: Z.gurtU, OG: Z.deckeDG, DG: Z.deckeSpitz };
  // Fenster: Fassadenöffnungen, Zwerchhaus- und Gaubenfenster, Dachfenster, Lichthof; pt(u, t) = Planpunkt bei u, t Meter innen ab Außenkante
  const lage = fr => (u, t) => [fr.o[0] + u * fr.r[0] - t * fr.n[0], fr.o[1] + u * fr.r[1] - t * fr.n[1]];
  const sinA = Math.sin(Math.atan(H.tan1)), cosA = Math.cos(Math.atan(H.tan1)), fenster = [];
  const neu = (fassade, o, quelle, z0, z1, extra = {}) => fenster.push({ fassade, quelle, pt: lage(H.frame[fassade]), kind: o.kind || 'fenster', u0: o.u0, u1: o.u1, z0, z1,
    leaves: o.leaves, sprosse: !!o.sprosse, rail: o.rail, seitenteil: o.side || 0, single: !!o.single, fl: geschossVon(z0), tiefe: H.wall + 0.02, qm: (o.u1 - o.u0) * (z1 - z0), o, ...extra });
  for (const s of ['S', 'N', 'E', 'W']) {
    const Fa = H.fas[s];
    for (const o of Fa.open) neu(s, o, 'Fassade', o.z0, o.z1);
    for (const d of Fa.dormers || []) for (const w of d.win) neu(s, w, d.zwerch ? 'Zwerchhaus' : 'Gaube', w.z0, w.z1, d.zwerch ? {} : { tiefe: Math.max(H.wall, d.front) + 0.3 });
    // Dachfenster: Fläche in der Dachebene, Höhe aus der Lage auf der steilen Dachfläche
    for (const w of Fa.roofWindows || []) neu(s, { ...w, kind: 'dachfenster', leaves: 2 }, 'Dachfenster', H.traufe + w.v0 * sinA, H.traufe + w.v1 * sinA,
      { tiefe: (w.v0 + w.v1) / 2 * cosA - H.ueberstand, qm: (w.u1 - w.u0) * (w.v1 - w.v0) });
  }
  const LH = H.lichthof;
  for (const [u0, u1] of LH.win) neu(LH.side, { u0, u1, kind: 'fenster', leaves: 2 }, 'Lichthof', Z.ffbUG, LH.sturz);
  const B = { H, P, Z, decke, fenster, geschossVon };
  B.G = Object.fromEntries(GESCHOSSE.map(fl => [fl, geschoss(B, fl)]));
  // Treppenläufe: Stufenvorderkanten wie im 3D (erste bei x0 auf za + h, letzte bei x1 auf zb); Kopfhöhe lotrecht über dieser Linie bis zur
  // Decke darüber, in der Deckenöffnung bis zum Lauf darüber oder zur Decke des oberen Geschosses
  B.laeufe = Object.entries(FLIGHTS).map(([fl, F]) => {
    const oben = GESCHOSSE[GESCHOSSE.indexOf(fl) + 1], h = (F.zb - F.za) / F.n, g = Math.abs(F.x0 - F.x1) / (F.n - 1), dir = Math.sign(F.x1 - F.x0);
    return { fl, oben, F, h, g, dir, kante: x => F.za + h + Math.abs(F.x0 - x) / g * h, breite: LINE[3] - LINE[2], ym: (LINE[2] + LINE[3]) / 2 };
  });
  for (const L of B.laeufe) {
    const loch = HOLES[L.oben], drauf = B.laeufe.find(M => M.fl === L.oben);
    // über der Lauflänge ohne die Austrittskante selbst (dort beginnt das Podest des oberen Geschosses)
    let min = Infinity, xMin = null;
    for (const x of teilung(Math.min(L.F.x0, L.F.x1) + 0.005, Math.max(L.F.x0, L.F.x1) - 0.005, 0.01)) {
      const imLoch = loch && x >= loch[0] && x < loch[1], aufLauf = drauf && x >= Math.min(drauf.F.x0, drauf.F.x1) && x <= Math.max(drauf.F.x0, drauf.F.x1);
      const k = (!imLoch ? decke[L.fl] : aufLauf ? drauf.kante(x) - LAUF_DICKE : decke[L.oben]) - L.kante(x);
      if (k < min) { min = k; xMin = x; }
    }
    Object.assign(L, { kopf: min, kopfX: xMin });
  }
  return B;
}

module.exports = { GESCHOSSE, analyse, inR, qm, ueber, inPoly, teilung, raster, formPunkte, inForm, art, LAUF_DICKE };

