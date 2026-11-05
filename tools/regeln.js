// Regeln aus der Maßprüfung, bei jedem Bau: Tiefgarage und Rampe (GaStellV Bayern), Haus (BayBO, DIN 18065), Grundriss (Räume, Türen,
// Fenster, Treppe, Aufzug), Möbel, Außen (Ortsgestaltungssatzung Grünwald, DIN EN 1176). Jede Regel misst aus den Daten, nichts fest verdrahtet.
// Aufruf: node tools/regeln.js [-v] – je Gruppe eine Zeile, Einzelheiten nur bei Verstößen und Hinweisen (-v: alle Werte), zuletzt die Summe
// mit den Werten, die sich gegen die Referenz geändert haben (tools/shots/referenz/regeln.json; beim ersten Lauf von selbst, node tools/regeln.js
// --abnehmen bzw. ./vg abnehmen übernimmt den Stand). Arten: Pflicht (Rückgabe 1), Hinweis (warnt nur), Offen (klärt der Bauherr mit
// Architektin und Gemeinde, nur gelistet), Ausgenommen (bewusst nicht Teil der Studie, nur gezählt); gefundene Pflicht-Verstöße, über die der
// Bauherr noch entscheidet, unter GEMELDET. Grundrissanalyse in tools/lib/grundriss.js (auch für tools/raumbuch.js).
const fs = require('fs'), path = require('path'), vm = require('vm');
const { ROOT, kontext, rechne, lesen } = require('./lib/laden');
const GR = require('./lib/grundriss');
const ctx = kontext(), B = GR.analyse(ctx), { H, P, Z, G } = B, S = rechne(ctx, 'SITE'), R = H.rampe, TG = H.tg, { LINE, FLIGHTS, LIFT } = P.CORE;
const ALLE = process.argv.includes('-v');

// ---------- Zahlen wie im Seitentext ----------
const zahl = (v, d = 2) => (+v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');
const m = (v, d = 2) => `${zahl(v, d)} m`, cm = v => `${zahl(v * 100, 0)} cm`, pz = v => `${zahl(v * 100, 1)} %`, gr = v => `${zahl(v, 1)}°`, qm = v => `${zahl(v, 1)} m²`;
// Einheiten der Reserven (rest in ja) und Einzelwerte; reserve() ohne „−0,00“ für Werte, die gerundet null sind
const EINHEIT = { m: v => m(v), cm, pz, gr, qm, z: v => zahl(v, 1) }, STUFE = { m: 0.01, cm: 0.01, pz: 0.001, gr: 0.1, qm: 0.1, z: 0.1 };
const reserve = (v, e) => EINHEIT[e](Math.abs(v) < STUFE[e] / 2 ? 0 : v);
// knappstes bzw. größtes Element (null bei leerer Liste, etwa wenn ein Geschoss keine Fenster mehr hat)
const min = (a, f) => a.length ? a.reduce((b, x) => (f(x) < f(b) ? x : b)) : null;
const max = (a, f) => a.length ? a.reduce((b, x) => (f(x) > f(b) ? x : b)) : null;
const deg = r => r * 180 / Math.PI;
const FAS = s => H.fas[s].name;

// ---------- Autos: Maße aus den Modellen (spec in src/car-*.js) ohne three.js – das Modell setzt spec, bevor es den Baukasten braucht ----------
const AUTOS = (() => {
  const c = { console, Math, JSON, Number, String, Array, Object, Set, Map, Error }; c.globalThis = c; vm.createContext(c);
  vm.runInContext(lesen('cars.js'), c);
  const STOP = {}, kit = new Proxy({}, { get() { throw STOP; } });
  return TG.autos.map((a, i) => {
    try { vm.runInContext(lesen(`car-${a.k}.js`), c); c.CAR_MODELS[a.k](kit); } catch (e) { if (e !== STOP) throw e; }
    const s = c.CAR_MODELS[a.k] && c.CAR_MODELS[a.k].spec;
    if (!s) throw new Error(`CAR_MODELS.${a.k}.spec fehlt`);
    return { ...a, i, spec: { L: s.L, W: s.W, H: s.H, radstand: s.wheelbase } };
  });
})();
// tools/carcheck.js lässt das gebaute Modell bis 3 % höher als spec.H zu (V-Klasse: Antenne 1,943 m bei spec 1,90 m): damit rechnen
const H_MODELL = 1.03;
// Ferrari F8 am Modell nachgerechnet (Maßprüfung): Rampenwinkel für Kuppen, Böschungswinkel vorn für Wannen
const FERRARI = { k: 'ferrari', rampenwinkel: 9.5, boeschung: 6.0 };
// Front zur Stirnwand bei tg.x0 (Westen), 5 cm davor wie in Plan und 3D; Fahrerseite (links) liegt damit im Süden
const STIRN = 0.05, FAHRER = -1;

// ---------- Rampe: Längsprofil HOUSE.rampe.z alle 1 cm, Abschnitte gleicher Neigung und Knicke dazwischen ----------
const PROFIL = (() => {
  const dy = 0.01, yA = Math.min(R.grenze(R.x0), R.grenze(R.x1)) - 1, yB = R.yTor + 1, pts = [];
  for (let k = 0; yA + k * dy <= yB + 1e-9; k++) pts.push([yA + k * dy, R.z(yA + k * dy)]);
  // Neigung positiv = abwärts nach Norden, zwischen Punkt i und i + 1
  const s = pts.slice(1).map((p, i) => (pts[i][1] - p[1]) / dy), roh = [];
  s.forEach((v, i) => { const a = roh[roh.length - 1]; if (a && Math.abs(v - a.s) < 1e-4) a.i1 = i; else roh.push({ s: v, i0: i, i1: i }); });
  // Rasterstücke über einem Knick (kürzer als 3 cm) gehören zum Knick
  const ab = roh.filter(a => (a.i1 - a.i0 + 1) * dy > 0.03);
  const knicke = ab.slice(1).map((b, k) => ({ y: (pts[ab[k].i1 + 1][0] + pts[b.i0][0]) / 2, s0: ab[k].s, s1: b.s, d: deg(Math.atan(b.s) - Math.atan(ab[k].s)) }));
  // innere Abschnitte von Knick zu Knick
  const strecken = knicke.slice(1).map((k, i) => ({ y0: knicke[i].y, y1: k.y, l: k.y - knicke[i].y, s: ab[i + 1].s }));
  return { pts, s, ab, knicke, strecken, smax: Math.max(...s.map(Math.abs)) };
})();
// Decke über der Fahrbahn: vor dem Portal offen, unter dem Poolhaus dessen Decke, ab dem Unterzug unter seiner Nordwand die Decke der
// Tiefgarage, in der Toröffnung (bis zur Innenseite der Wand) der Sturz des Tors, dahinter wieder die Decke der Tiefgarage
const decke = y => y < R.yPortal ? null : y < R.yPH - R.unterzug.b ? R.decke : y < R.yTor ? TG.decke : y <= R.yE ? R.zTG + R.tor.h : TG.decke;
// Auto als Kasten (Länge L, Höhe h, Radstand b, Überhänge gleich verteilt) fährt vorwärts hinunter bis in die Tiefgarage: Hinterachse so,
// dass beide Achsen auf dem Profil stehen; kleinster Abstand der Oberkante zur Decke über die ganze Fahrt
function durchfahrt(L, h, b) {
  const o = (L - b) / 2, z = R.z;
  let best = { luft: Infinity, y: null };
  for (let yf = R.yPortal - L - 1; yf <= R.yE + L + 1; yf += 0.05) {
    let lo = yf - b, hi = yf;
    for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (Math.hypot(yf - mid, z(yf) - z(mid)) > b) lo = mid; else hi = mid; }
    const yr = (lo + hi) / 2, u = [(yf - yr) / b, (z(yf) - z(yr)) / b], nv = [-u[1], u[0]];
    for (let s = -o; s <= b + o + 1e-9; s += 0.05) {
      const p = [yr + u[0] * s + nv[0] * h, z(yr) + u[1] * s + nv[1] * h], c = decke(p[0]);
      if (c != null && c - p[1] < best.luft) best = { luft: c - p[1], y: p[0] };
    }
  }
  return best;
}

// ---------- Tiefgarage: Buchten, Innenseiten der Wände, Fahrgasse ----------
const xUeber = (w, a, b) => w[0] < b - 1e-6 && w[1] > a + 1e-6, yUeber = (w, a, b) => w[2] < b - 1e-6 && w[3] > a + 1e-6;
const BUCHTEN = AUTOS.map(a => ({ a, r: [TG.x0, TG.x1, TG.y0 + a.i * TG.bucht, TG.y0 + (a.i + 1) * TG.bucht] }));
const YB = [TG.y0, TG.y0 + AUTOS.length * TG.bucht];
const OST = Math.min(...TG.waende.filter(w => w[0] >= TG.x1 - 1e-6 && yUeber(w, ...YB)).map(w => w[0]));
const WEST = Math.max(...TG.waende.filter(w => w[1] <= TG.x0 + 1e-6 && yUeber(w, ...YB)).map(w => w[1]));
const SUED = Math.max(...TG.waende.filter(w => w[3] <= YB[0] + 1e-6 && xUeber(w, TG.x1, OST)).map(w => w[3]));
const NORD = Math.min(...TG.waende.filter(w => w[2] >= YB[1] - 1e-6 && xUeber(w, TG.x1, OST)).map(w => w[2]));
// GaStellV § 4 Abs. 1: Längsseite im Abstand bis 0,10 m von einer Wand begrenzt? Abs. 2: Fahrgasse bei 90° je nach Stellplatzbreite
const begrenzt = (r, sg) => TG.waende.some(w => xUeber(w, r[0], r[1]) && (sg < 0 ? w[3] <= r[2] + 1e-6 && w[3] >= r[2] - 0.10 : w[2] >= r[3] - 1e-6 && w[2] <= r[3] + 0.10));
const FAHRGASSE = [[2.30, 6.50], [2.40, 6.00], [2.50, 5.50]];
const gasseNoetig = b => b <= 2.30 ? 6.50 : b >= 2.50 ? 5.50 : (([b0, g0], [b1, g1]) => g0 + (g1 - g0) * (b - b0) / (b1 - b0))(...(b < 2.40 ? FAHRGASSE.slice(0, 2) : FAHRGASSE.slice(1)));
const NUTZ = AUTOS.length * TG.bucht * (TG.x1 - TG.x0) + (OST - TG.x1) * (NORD - SUED);

// ---------- Regeltabelle ----------
const REGELN = [];
const regel = (g, id, art, text, quelle, f) => REGELN.push({ g, id, art, text, quelle, f });
// mehr: { rest, werte } für den Vergleich mit der Referenz – rest = Reserve bis zur Grenze beim knappsten Element ([Zahl, Einheit], negativ
// heißt verletzt; kleiner heißt schlechter), werte = alle Einzelwerte, wo der Wert nur das knappste nennt (damit jede Änderung auffällt)
const E = 1e-6, ja = (ok, wert, grenze, liste, mehr) => ({ ok: !!ok, wert, grenze, liste, ...mehr });
const rest = (v, e = 'm', werte) => ({ rest: [v, e], ...(werte ? { werte } : {}) });

// ---------- Tiefgarage und Rampe (GaStellV Bayern) ----------
regel('Tiefgarage', 'tg-hoehe', 'Pflicht', 'lichte Höhe der Tiefgarage', 'GaStellV § 5', () => { const h = TG.decke - R.zTG; return ja(h >= 2 - E, m(h), '≥ 2,00 m', null, rest(h - 2)); });
regel('Tiefgarage', 'tg-unterzug', 'Pflicht', 'lichte Höhe unter dem Unterzug der Tiefgarage', 'GaStellV § 5', () => {
  const h = TG.decke - TG.unterzug.h - R.zTG; return ja(h >= 2 - E, m(h), '≥ 2,00 m', null, rest(h - 2)); });
regel('Tiefgarage', 'rampe-hoehe', 'Pflicht', 'lichte Höhe über der Rampe vom Portal bis zum Tor', 'GaStellV § 5', () => {
  let w = { h: Infinity };
  for (let y = R.yPortal; y <= R.yTor; y += 0.01) { const h = decke(y) - R.z(y); if (h < w.h) w = { h, y }; }
  return ja(w.h >= 2 - E, `${m(w.h)} bei y ${zahl(w.y)}`, '≥ 2,00 m', null, rest(w.h - 2)); });
regel('Tiefgarage', 'rampe-neigung', 'Pflicht', 'größte Neigung der Rampe', 'GaStellV § 3 Abs. 1', () => ja(PROFIL.smax <= 0.15 + E, pz(PROFIL.smax), '≤ 15 %', null, rest(0.15 - PROFIL.smax, 'pz')));
regel('Tiefgarage', 'rampe-vorplatz', 'Pflicht', 'Vorplatz ≤ 5 % vor einer Rampe über 10 %, ab der Grenze (kürzere Kante)', 'GaStellV § 3 Abs. 2', () => {
  if (PROFIL.smax <= 0.10) return ja(true, 'Rampe ≤ 10 %', 'entfällt');
  const yG = Math.min(R.grenze(R.x0), R.grenze(R.x1)), i = PROFIL.s.findIndex((v, k) => PROFIL.pts[k][0] >= yG - E && v > 0.05 + E);
  const l = Math.min(...[R.x0, R.x1].map(x => PROFIL.pts[i][0] - R.grenze(x)));
  return ja(l >= 3 - 0.005, m(l), '≥ 3,00 m', null, rest(l - 3)); });
regel('Tiefgarage', 'rampe-kuppe', 'Pflicht', 'Knicke oben (Kuppen) kleiner als der Rampenwinkel des Ferrari', 'Fahrzeug (Maßprüfung)', () => {
  const k = PROFIL.knicke.filter(x => x.d > 0); if (!k.length) return ja(true, 'keine Kuppe', `< ${gr(FERRARI.rampenwinkel)}`);
  const w = max(k, x => x.d); return ja(w.d < FERRARI.rampenwinkel, `${gr(w.d)} bei y ${zahl(w.y)}`, `< ${gr(FERRARI.rampenwinkel)}`, null, rest(FERRARI.rampenwinkel - w.d, 'gr')); });
regel('Tiefgarage', 'rampe-wanne', 'Pflicht', 'Knicke unten (Wannen) kleiner als der Böschungswinkel vorn des Ferrari', 'Fahrzeug (Maßprüfung)', () => {
  const k = PROFIL.knicke.filter(x => x.d < 0); if (!k.length) return ja(true, 'keine Wanne', `< ${gr(FERRARI.boeschung)}`);
  const w = max(k, x => -x.d); return ja(-w.d < FERRARI.boeschung, `${gr(-w.d)} bei y ${zahl(w.y)}`, `< ${gr(FERRARI.boeschung)}`, null, rest(FERRARI.boeschung + w.d, 'gr')); });
regel('Tiefgarage', 'rampe-uebergang', 'Pflicht', 'Übergänge zwischen zwei Knicken mindestens so lang wie der Radstand des Ferrari', 'Fahrzeug (Maßprüfung)', () => {
  const b = AUTOS.find(a => a.k === FERRARI.k).spec.radstand, w = min(PROFIL.strecken, x => x.l);
  return w ? ja(w.l >= b - 0.005, `${m(w.l)} mit ${pz(w.s)}`, `≥ ${m(b)}`, null, rest(w.l - b)) : ja(true, 'keine Übergänge', `≥ ${m(b)}`); });
regel('Tiefgarage', 'rampe-breite', 'Pflicht', 'Breite der Fahrbahn auf der Rampe', 'GaStellV § 3 Abs. 1', () => { const b = R.x1 - R.x0; return ja(b >= 2.75 - E, m(b), '≥ 2,75 m', null, rest(b - 2.75)); });
regel('Tiefgarage', 'rampe-durchfahrt', 'Pflicht', 'höchstes Auto (Höhe aus dem Modell + 3 %) unter Poolhaus, Unterzügen und Torsturz', 'Bauherr (Maßprüfung)', () => {
  const a = max(AUTOS, x => x.spec.H), h = a.spec.H * H_MODELL, d = durchfahrt(a.spec.L, h, a.spec.radstand);
  const uz = TG.decke - TG.unterzug.h - R.zTG - h, luft = Math.min(d.luft, uz), wo = d.luft <= uz ? `bei y ${zahl(d.y)}` : 'unter dem Unterzug der Tiefgarage';
  return ja(luft >= 0.05 - E, `${a.name} ${m(h)} hoch: ${cm(luft)} Luft ${wo}`, '≥ 5 cm', null, rest(luft - 0.05, 'cm')); });
regel('Tiefgarage', 'tor-hoehe', 'Pflicht', 'lichte Höhe des Tors', 'GaStellV § 5', () => ja(R.tor.h >= 2 - E, m(R.tor.h), '≥ 2,00 m', null, rest(R.tor.h - 2)));
regel('Tiefgarage', 'tor-sturz', 'Hinweis', 'Sturz über dem Sektionaltor (Federwelle, Laufschienen)', 'Herstellerangaben', () => {
  const s = TG.decke - R.zTG - R.tor.h; return ja(s >= 0.20 - E, m(s), '≥ 0,20 m', null, rest(s - 0.20)); });
regel('Tiefgarage', 'tg-stufenlos', 'Pflicht', 'Boden der Tiefgarage stufenlos: Rampe endet vor dem Tor auf FFB UG', 'Bauherr', () => {
  const k = PROFIL.knicke[PROFIL.knicke.length - 1]; if (!k) return ja(false, 'Rampe ohne Knick', 'eben vor dem Tor');
  const eben = PROFIL.pts.filter(([y]) => y >= k.y + 0.01), dz = Math.max(...eben.map(([, z]) => Math.abs(z - R.zTG)));
  const ok = Math.abs(R.zTG - Z.ffbUG) < 0.005 && dz < 0.005 && k.y < R.yE && Math.abs(PROFIL.ab[PROFIL.ab.length - 1].s) < 1e-4;
  return ja(ok, `eben ab ${m(R.yE - k.y)} vor dem Torblatt, Boden ${zahl(R.zTG)} / FFB UG ${zahl(Z.ffbUG)}`, 'eben vor dem Tor, gleiche Höhe'); });
regel('Tiefgarage', 'tg-stellplatz', 'Pflicht', 'Stellplätze breit und lang genug (Wände bis 0,10 m an der Längsseite)', 'GaStellV § 4 Abs. 1', () => {
  const f = BUCHTEN.map(({ a, r }) => { const n = begrenzt(r, -1) + begrenzt(r, 1), b = r[3] - r[2], l = r[1] - r[0], nb = [2.30, 2.40, 2.50][n];
    return { t: `P${a.i + 1} ${zahl(b)} × ${zahl(l)} m (nötig ${zahl(nb)} × 5,00)`, ok: b >= nb - E && l >= 5 - E, r: Math.min(b - nb, l - 5) }; });
  return ja(f.every(x => x.ok), f.map(x => x.t).join(' · '), '≥ 2,30/2,40/2,50 × 5,00 m', f.filter(x => !x.ok).map(x => x.t), f.length ? rest(Math.min(...f.map(x => x.r))) : {}); });
regel('Tiefgarage', 'tg-autos', 'Pflicht', `Autos mit ${cm(STIRN)} Abstand zur Stirnwand passen in ihre Bucht`, 'Bauherr', () => {
  const f = BUCHTEN.map(({ a, r }) => ({ a, l: r[1] - r[0] - STIRN - a.spec.L, b: (r[3] - r[2] - a.spec.W) / 2 })), w = min(f, x => Math.min(x.l, x.b));
  return ja(f.every(x => x.l >= -E && x.b >= -E), w ? `knappste: ${w.a.name} ${cm(Math.min(w.l, w.b))} Luft` : 'keine Autos', '≥ 0', f.filter(x => x.l < -E || x.b < -E).map(x => x.a.name),
    w ? rest(Math.min(w.l, w.b), 'cm', f.map(x => `${x.a.name} ${cm(x.l)} vorn, ${cm(x.b)} seitlich`)) : {}); });
regel('Tiefgarage', 'tg-fahrgasse', 'Pflicht', 'Fahrgasse vor den Stellplätzen (90°)', 'GaStellV § 4 Abs. 2', () => {
  const g = OST - TG.x1, n = gasseNoetig(TG.bucht); return ja(g >= n - 0.005, m(g), `≥ ${m(n)} bei ${m(TG.bucht)} breiten Stellplätzen`, null, rest(g - n)); });
regel('Tiefgarage', 'tg-fahrertuer', 'Pflicht', 'neben dem Ferrari auf der Fahrerseite Platz für die Tür', 'Bauherr 4.11.2026', () => {
  const a = AUTOS.find(x => x.k === FERRARI.k), cy = TG.mitte(a.i), xa = TG.x0 + STIRN, xb = xa + a.spec.L, seite = cy + FAHRER * a.spec.W / 2;
  const hin = [...TG.waende.filter(w => xUeber(w, xa, xb)).map(w => (FAHRER < 0 ? w[3] : w[2])),
    ...AUTOS.filter(x => x !== a).map(x => TG.mitte(x.i) - FAHRER * x.spec.W / 2)].filter(v => FAHRER < 0 ? v <= seite + E : v >= seite - E);
  const luft = Math.abs(seite - (FAHRER < 0 ? Math.max(...hin) : Math.min(...hin)));
  return ja(luft >= 1 - E, `P${a.i + 1}: ${m(luft)}`, '≥ 1,00 m', null, rest(luft - 1)); });
regel('Tiefgarage', 'tg-decke', 'Hinweis', 'Decke und Unterzug der Tiefgarage nicht zu schlank (l/h)', 'Faustwerte (Maßprüfung)', () => {
  const st = [WEST, ...(TG.unterzug ? [TG.unterzug.x] : []), OST].sort((a, b) => a - b), l = Math.max(...st.slice(1).map((x, i) => x - st[i]));
  const lu = NORD - SUED, hu = TG.unterzug ? TG.unterzug.h + TG.platte : null, a = l / TG.platte, b = hu ? lu / hu : 0;
  return ja(a <= 25 && b <= 15, `Decke ${m(TG.platte)} über ${m(l)} (l/h ${zahl(a, 1)})${hu ? ` · Unterzug ${m(hu)} über ${m(lu)} (l/h ${zahl(b, 1)})` : ''}`, 'Decke ≤ 25, Unterzug ≤ 15',
    null, rest(Math.min(25 - a, 15 - b), 'z')); });
regel('Tiefgarage', 'rampe-deckenpaket', 'Hinweis', 'Decke und Belag zwischen Durchfahrt und Poolhausboden', 'Maßprüfung', () => {
  const d = H.poolhaus.z - R.decke; return ja(d >= 0.30 - E, m(d), '≥ 0,30 m', null, rest(d - 0.30)); });
regel('Tiefgarage', 'mittelgarage', 'Ausgenommen', 'Mittelgarage über 100 m²: Sicherheitsschleuse T30, zweiter Ausgang, Lüftung', 'GaStellV §§ 11, 12, 14', () => ({ wert: qm(NUTZ), gilt: NUTZ > 100 }));

// ---------- Haus (BayBO, DIN 18065) ----------
const FL = GR.GESCHOSSE, FENSTER = FL.flatMap(fl => G[fl].fenster), bez = w => `${w.fl} ${FAS(w.fassade)} ${zahl(w.u0)}–${zahl(w.u1)}`;
// Absturzhöhe eines Geschosses über dem Gelände: ab 1 m Brüstung oder Umwehrung, bis 12 m 0,80 / 0,90 m, darüber 0,90 / 1,10 m (Art. 36)
const absturz = fl => G[fl].ffb - Z.gelaende, bruestung = fl => absturz(fl) > 12 ? 0.90 : 0.80, umwehrung = h => h > 12 ? 1.10 : 0.90;
// Höhe im DG über p: flache Decke, am Rand die Dachschräge (Unterseite des Dachaufbaus, HOUSE.roofIn), im Zwerchhaus volle Höhe
const ZWERCH = ['S', 'N', 'E', 'W'].flatMap(s => (H.fas[s].dormers || []).filter(d => d.zwerch).map(d => {
  const fr = H.frame[s], back = (d.top - Z.wand) / H.tan1, pt = (u, t) => [fr.o[0] + u * fr.r[0] - t * fr.n[0], fr.o[1] + u * fr.r[1] - t * fr.n[1]];
  const a = pt(d.u0, 0), b = pt(d.u1, back); return [Math.min(a[0], b[0]), Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[1], b[1])];
}));
const hDG = p => (ZWERCH.some(q => GR.inR(q, p)) ? Z.deckeSpitz : Math.min(Z.deckeSpitz, H.roofIn(Math.min(p[0], H.W - p[0], p[1] + H.D, -p[1])))) - Z.ffbDG;
// Wert des knappsten Elements oder „–“, wenn es keines gibt
const knapp = (w, t) => (w ? t(w) : '–');

regel('Haus', 'raum-hoehe', 'Pflicht', 'lichte Raumhöhe der Geschosse mit Aufenthaltsräumen (außer DG)', 'BayBO Art. 45 Abs. 1', () => {
  const f = FL.filter(fl => fl !== 'DG' && G[fl].raeume.some(r => r.art === 'aufenthalt')).map(fl => ({ fl, h: G[fl].hoehe, ok: G[fl].hoehe >= 2.4 - E }));
  return ja(f.every(x => x.ok), f.map(x => `${x.fl} ${m(x.h)}`).join(' · '), '≥ 2,40 m', f.filter(x => !x.ok).map(x => `${x.fl} ${m(x.h)}`), f.length ? rest(Math.min(...f.map(x => x.h)) - 2.4) : {}); });
regel('Haus', 'dg-hoehe', 'Hinweis', 'Aufenthaltsräume im DG: 2,20 m über mindestens die Hälfte (Teile unter 1,50 m zählen nicht)', 'BayBO a. F. (Richtwert)', () => {
  const f = G.DG.raeume.filter(r => r.art === 'aufenthalt').map(r => {
    const p = r.rects.flatMap(q => GR.raster(q, 0.05, 0.025)), hs = p.map(hDG), a = hs.filter(h => h >= 2.2).length / Math.max(1, hs.filter(h => h > 1.5).length);
    return { n: r.n, a, ok: a >= 0.5 }; });
  return ja(f.every(x => x.ok), `knappster: ${knapp(min(f, x => x.a), w => `${w.n} ${zahl(w.a * 100, 0)} %`)}`, '≥ 50 %', f.filter(x => !x.ok).map(x => `${x.n} ${zahl(x.a * 100, 0)} %`),
    f.length ? rest(Math.min(...f.map(x => x.a)) - 0.5, 'pz', f.map(x => `${x.n} ${zahl(x.a * 100, 0)} %`)) : {}); });
regel('Haus', 'bruestung', 'Pflicht', 'Fensterbrüstungen über Absturzhöhe ab 1 m (sonst Geländer)', 'BayBO Art. 36 Abs. 3', () => {
  const f = FENSTER.filter(w => absturz(w.fl) >= 1 && /fenster/.test(w.kind)).map(w => {
    const b = w.z0 - G[w.fl].ffb, r = w.rail ? w.rail - G[w.fl].ffb : 0, um = umwehrung(absturz(w.fl));
    return { w, b, ok: b >= bruestung(w.fl) - E || r >= um - E, r: Math.max(b - bruestung(w.fl), r - um) }; });
  return ja(f.every(x => x.ok), `niedrigste ${knapp(min(f, x => x.b), k => `${m(k.b)} (${bez(k.w)})`)}`, '≥ 0,80 m', f.filter(x => !x.ok).map(x => `${bez(x.w)} ${m(x.b)}`),
    f.length ? rest(Math.min(...f.map(x => x.r)), 'm', f.map(x => `${bez(x.w)} ${m(x.b)}`)) : {}); });
regel('Haus', 'umwehrung', 'Pflicht', 'Geländer an französischen Fenstern, Balkonen und Dachterrasse', 'BayBO Art. 36 Abs. 4', () => {
  const f = [...FENSTER.filter(w => absturz(w.fl) >= 1 && w.kind === 'franz').map(w => ({ t: bez(w), h: w.rail ? w.rail - G[w.fl].ffb : 0, a: absturz(w.fl) })),
    ...FL.flatMap(fl => G[fl].flaechen.filter(a => a.deck && a.deck.rail).map(a => ({ t: `${fl} ${a.n}`, h: a.deck.rail - a.deck.slab[1], a: a.deck.slab[1] - Z.gelaende })))]
    .map(x => ({ ...x, ok: x.h >= umwehrung(x.a) - E }));
  return ja(f.every(x => x.ok), `niedrigstes ${knapp(min(f, x => x.h), k => `${m(k.h)} (${k.t})`)}`, '≥ 0,90 m', f.filter(x => !x.ok).map(x => `${x.t} ${m(x.h)}`),
    f.length ? rest(Math.min(...f.map(x => x.h - umwehrung(x.a))), 'm', f.map(x => `${x.t} ${m(x.h)}`)) : {}); });
regel('Haus', 'fenstertuer-austritt', 'Pflicht', 'Fenstertüren über Absturzhöhe führen auf Balkon oder Dachterrasse', 'BayBO Art. 36 Abs. 1', () => {
  const f = FENSTER.filter(w => absturz(w.fl) >= 1 && w.kind === 'tuer').map(w => { const a = G[w.fl].aussenFlaeche(w.pt((w.u0 + w.u1) / 2, -0.3)); return { w, a, ok: !!(a && a.deck) }; });
  return ja(f.every(x => x.ok), `${f.length} Türen`, 'Austritt davor', f.filter(x => !x.ok).map(x => bez(x.w))); });
regel('Haus', 'balkon-schwelle', 'Pflicht', 'Belag von Balkon und Dachterrasse unter FFB innen: 0,15 m, mit Rinne vor der Tür 0,05 m', 'DIN 18531 (Flachdachrichtlinie)', () => {
  // nur Flächen, auf die eine Fenstertür hinausführt
  const tuerAuf = (fl, a) => FENSTER.some(w => w.fl === fl && w.kind === 'tuer' && G[fl].aussenFlaeche(w.pt((w.u0 + w.u1) / 2, -0.3)) === a);
  const f = FL.flatMap(fl => G[fl].flaechen.filter(a => a.deck && tuerAuf(fl, a)).map(a => { const d = G[fl].ffb - a.deck.slab[1], n = a.deck.rinne ? 0.05 : 0.15;
    return { t: `${fl} ${a.n} ${cm(d)}${a.deck.rinne ? ' mit Rinne' : ' ohne Rinne'}`, ok: d >= n - E, r: d - n }; }));
  return ja(f.every(x => x.ok), f.map(x => x.t).join(' · '), '≥ 0,15 m (Rinne 0,05)', f.filter(x => !x.ok).map(x => x.t), f.length ? rest(Math.min(...f.map(x => x.r)), 'cm') : {}); });
regel('Haus', 'tuer-breite', 'Hinweis', 'Türen ≥ 0,80 m lichte Breite (Fenstertüren ohne Rahmen je Flügel, Innentüren)', 'üblich (barrierefrei 0,90 m)', () => {
  const f = [...FENSTER.filter(w => w.kind === 'tuer').map(w => ({ t: bez(w), b: (w.u1 - w.u0 - 2 * H.rahmen) / (w.leaves || 1) })),
    ...FL.flatMap(fl => G[fl].tueren.filter(t => !t.paar || !t.d.h).map(t => ({ t: `${fl} ${t.name}`, b: t.breite })))].map(x => ({ ...x, ok: x.b >= 0.8 - E }));
  return ja(f.every(x => x.ok), `${f.length} Türen`, '≥ 0,80 m', f.filter(x => !x.ok).map(x => `${x.t} ${m(x.b)}`),
    f.length ? rest(Math.min(...f.map(x => x.b)) - 0.8, 'm', f.map(x => `${x.t} ${m(x.b)}`)) : {}); });
regel('Haus', 'tuer-fluegel', 'Pflicht', 'Türen bis 1,10 m einflügelig mit Sprosse, breitere zweiflügelig; Fenster mit Mittelsprosse', 'Bauherr', () => {
  const f = FENSTER.filter(w => w.kind !== 'dachfenster' && w.kind !== 'eingang').map(w => {
    const b = w.u1 - w.u0, ok = w.kind === 'tuer' ? (b <= 1.1 + E ? w.leaves === 1 && w.sprosse : w.leaves === 2) : w.leaves === 2 || w.sprosse;
    return { t: `${bez(w)} ${w.kind} ${zahl(b)} m: ${w.leaves} Flügel${w.sprosse ? ' + Sprosse' : ''}`, ok }; });
  return ja(f.every(x => x.ok), `${f.length} Öffnungen`, 'Flügelregel', f.filter(x => !x.ok).map(x => x.t)); });
regel('Haus', 'haustuer', 'Pflicht', 'Haustür ≥ 1,00 m licht, in der Wand der Halle, in Fassade und Grundriss gleich breit und auf 2 cm an derselben Stelle, Podest davor', 'Bauherr, Maßprüfung', () => {
  const w = FENSTER.find(x => x.kind === 'eingang'); if (!w) return ja(false, 'keine Haustür', '1 Haustür');
  // Türblatt zwischen den Seitenteilen: a, b an der Außenkante (Podest davor); u = Lage entlang der Fassade, tw = Tiefe ab der Außenkante
  const fl = G[w.fl], blatt = w.u1 - w.u0 - 2 * w.seitenteil, licht = blatt - 2 * H.rahmen, a = w.pt(w.u0 + w.seitenteil, 0), b = w.pt(w.u1 - w.seitenteil, 0);
  const fr = H.frame[w.fassade], u = p => (p[0] - fr.o[0]) * fr.r[0] + (p[1] - fr.o[1]) * fr.r[1], tw = p => -((p[0] - fr.o[0]) * fr.n[0] + (p[1] - fr.o[1]) * fr.n[1]);
  // Tür des Grundrisses: Außentür in dieser Außenwand, die dem Türblatt entlang der Fassade am nächsten liegt (Doppeltür als ganze Öffnung)
  const spanne = x => { const e = x.paar ? [x, x.paar] : [x], us = e.flatMap(y => [u([y.d.x, y.d.y]), u(y.hz ? [y.d.x + y.d.w, y.d.y] : [y.d.x, y.d.y + y.d.w])]); return [Math.min(...us), Math.max(...us)]; };
  const ub = [w.u0 + w.seitenteil, w.u1 - w.seitenteil], mitte = s => (s[0] + s[1]) / 2;
  const t = min(fl.tueren.filter(x => (x.plus.n === 'außen' || x.minus.n === 'außen') && Math.abs(tw(x.mitte) - H.wall / 2) <= H.wall / 2 + 0.05
    && Math.min(spanne(x)[1], ub[1] + 1) > Math.max(spanne(x)[0], ub[0] - 1)), x => Math.abs(mitte(spanne(x)) - mitte(ub)));
  const innen = t && (t.plus.n === 'außen' ? t.minus.n : t.plus.n), raum = fl.raeume.find(r => r.n === innen), st = t && spanne(t);
  const pd = H.podest, n = fr.n, o = w.pt(0, 0), ecken = [[pd.x0, pd.y0], [pd.x1, pd.y0], [pd.x0, pd.y1], [pd.x1, pd.y1]];
  const tief = Math.max(...ecken.map(c => (c[0] - o[0]) * n[0] + (c[1] - o[1]) * n[1])), deckt = [a, b].every(p => GR.inR([pd.x0, pd.x1, pd.y0, pd.y1], [p[0] + n[0] * 0.05, p[1] + n[1] * 0.05], 0.001));
  // Lage im Plan entlang der Wand (x bei Nord und Süd, y bei Ost und West) und Versatz der Grundrisstür als Himmelsrichtung
  const k = Math.abs(fr.r[0]) > 0.5 ? 0 : 1, planLage = s => { const v = s.map(q => o[k] + q * fr.r[k]).sort((p, q) => p - q); return `${'xy'[k]} ${zahl(v[0])}–${zahl(v[1])}`; };
  const dv = st ? (mitte(st) - mitte(ub)) * fr.r[k] : 0, richtung = k === 0 ? (dv > 0 ? 'östlich' : 'westlich') : (dv > 0 ? 'nördlich' : 'südlich');
  const lage = !!(st && Math.abs(st[0] - ub[0]) <= 0.02 + E && Math.abs(st[1] - ub[1]) <= 0.02 + E);
  const stufe = fl.ffb - pd.z, f = [licht >= 1 - E || 'zu schmal', !!(raum && (raum.core || raum.art === 'flur')) || `führt in ${innen || 'keinen Raum'}`,
    !!(t && Math.abs(t.breite - blatt) <= 0.02) || 'Grundriss ≠ Fassade', !t || lage || `Grundriss ${m(Math.abs(dv))} ${richtung} der Fassade (${planLage(st)} statt ${planLage(ub)})`,
    (deckt && tief >= 1 - E) || 'Podest fehlt oder zu kurz', (stufe >= -E && stufe <= 0.02 + E) || `Schwelle ${cm(stufe)}`];
  return ja(f.every(x => x === true), `licht ${m(licht)} in ${innen || '–'}, Podest ${m(tief)} tief, Schwelle ${cm(stufe)}`, '≥ 1,00 m, Podest ≥ 1,00 m', f.filter(x => x !== true),
    { werte: [`Fassade ${planLage(ub)}`, `Grundriss ${st ? planLage(st) : '–'}`] }); });

// Treppe (Plans.CORE): drei gerade Läufe; Kopfhöhe über der Linie der Stufenvorderkanten (tools/lib/grundriss.js)
const LAEUFE = B.laeufe, lauf = L => `${L.fl}→${L.oben}`;
// f(L) → { t, ok, r }: r = Reserve des Laufs in der Einheit e (leer: keine), die kleinste wird die Reserve der Regel
const jeLauf = (f, e, grenze) => { const r = LAEUFE.map(L => ({ L, ...f(L) })), rs = r.filter(x => x.r != null).map(x => x.r);
  return ja(r.every(x => x.ok), r.map(x => `${lauf(x.L)} ${x.t}`).join(' · '), grenze, r.filter(x => !x.ok).map(x => `${lauf(x.L)} ${x.t}`), e && rs.length ? rest(Math.min(...rs), e) : {}); };
const zwischen = (v, a, b) => Math.min(v - a, b - v);
regel('Haus', 'treppe-ffb', 'Pflicht', 'jeder Lauf verbindet genau die FFB zweier Geschosse', 'Grundriss', () => jeLauf(L => ({ t: `${zahl(L.F.za)}…${zahl(L.F.zb)}`,
  ok: !!L.oben && Math.abs(L.F.za - G[L.fl].ffb) < 0.005 && Math.abs(L.F.zb - G[L.oben].ffb) < 0.005 }), '', 'FFB unten … FFB oben'));
regel('Haus', 'treppe-steigung', 'Pflicht', 'Steigung', 'DIN 18065 Tab. 1', () => jeLauf(L => ({ t: cm(L.h), ok: L.h >= 0.14 - E && L.h <= 0.20 + E, r: zwischen(L.h, 0.14, 0.20) }), 'cm', '14–20 cm'));
regel('Haus', 'treppe-auftritt', 'Pflicht', 'Auftritt', 'DIN 18065 Tab. 1', () => jeLauf(L => ({ t: cm(L.g), ok: L.g >= 0.23 - E && L.g <= 0.37 + E, r: zwischen(L.g, 0.23, 0.37) }), 'cm', '23–37 cm'));
regel('Haus', 'treppe-schritt', 'Pflicht', 'Schrittmaß 2 Steigungen + Auftritt', 'DIN 18065', () => jeLauf(L => { const s = 2 * L.h + L.g; return { t: cm(s), ok: s >= 0.59 - E && s <= 0.65 + E, r: zwischen(s, 0.59, 0.65) }; }, 'cm', '59–65 cm'));
regel('Haus', 'treppe-breite', 'Pflicht', 'Laufbreite', 'DIN 18065 Tab. 1', () => jeLauf(L => ({ t: m(L.breite), ok: L.breite >= 0.8 - E, r: L.breite - 0.8 }), 'm', '≥ 0,80 m'));
regel('Haus', 'treppe-kopf', 'Pflicht', 'Kopfhöhe über den Stufenvorderkanten bis Decke oder Lauf darüber', 'DIN 18065', () =>
  jeLauf(L => ({ t: `${m(L.kopf)} bei x ${zahl(L.kopfX)}`, ok: L.kopf >= 2 - 0.005, r: L.kopf - 2 }), 'm', '≥ 2,00 m'));
regel('Haus', 'treppe-wege', 'Pflicht', 'Antritt und Austritt liegen in begehbaren Räumen', 'Grundriss', () => jeLauf(L => {
  const a = G[L.fl].wo([L.F.x0 - L.dir * 0.15, L.ym]).raum, b = L.oben && G[L.oben].wo([L.F.x1 + L.dir * 0.15, L.ym]).raum;
  return { t: `${a ? a.n : '–'} → ${b ? b.n : '–'}`, ok: !!(a && b) }; }, '', 'Raum unten und oben'));
regel('Haus', 'treppe-podest', 'Hinweis', 'Podest am Austritt mindestens so tief wie der Lauf breit', 'DIN 18065', () => jeLauf(L => {
  let t = 0; while (t < 5 && G[L.oben] && G[L.oben].wo([L.F.x1 + L.dir * (t + 0.001), L.ym]).raum) t += 0.001;
  return { t: m(t), ok: t >= L.breite - 0.005, r: t - L.breite }; }, 'm', '≥ Laufbreite'));
regel('Haus', 'aufzug', 'Pflicht', 'Aufzug auf allen Geschossen frei (kein Raum darüber) und mit Zugang ≥ 0,90 m', 'Grundriss', () => {
  const f = FL.map(fl => {
    const g = G[fl], belegt = [...g.raeume.flatMap(r => r.rects), ...g.offen].some(q => GR.ueber(q, LIFT) > 0.001);
    // längster begehbarer Abschnitt entlang einer Schachtseite, 5 cm vor der Wand
    const seiten = [[0, 1, LIFT[0] - 0.05], [0, 1, LIFT[1] + 0.05], [1, 0, LIFT[2] - 0.05], [1, 0, LIFT[3] + 0.05]].map(([ax, , c]) => {
      let best = 0, lauf = 0; const [a, b] = ax ? [LIFT[0], LIFT[1]] : [LIFT[2], LIFT[3]];
      for (let v = a + 0.01; v < b; v += 0.02) { const p = ax ? [v, c] : [c, v], w = g.wo(p); lauf = w.raum || w.offen ? lauf + 0.02 : 0; best = Math.max(best, lauf); }
      return best; });
    const zu = Math.max(...seiten); return { t: `${fl} ${belegt ? 'überbaut' : 'frei'}, Zugang ${m(zu)}`, ok: !belegt && zu >= 0.9 - 0.02, r: zu - 0.9 }; });
  return ja(f.every(x => x.ok), f.map(x => x.t).join(' · '), 'frei, Zugang ≥ 0,90 m', f.filter(x => !x.ok).map(x => x.t), rest(Math.min(...f.map(x => x.r)))); });

// ---------- Grundriss: Räume, Wände, Türen, Fenster (tools/lib/grundriss.js) ----------
const jeFl = f => FL.flatMap(fl => f(G[fl], fl));
const sammel = (f, wert, grenze, mehr) => { const l = jeFl(f); return ja(!l.length, l.length ? `${l.length} Stelle${l.length > 1 ? 'n' : ''}` : wert, grenze, l, mehr); };
// Einzelwerte je Raum (Bezeichnung, Zahl, Grenze, Format) als werte und kleinste Reserve
const jeRaum = (filter, wert, grenze, e) => { const l = jeFl(g => g.raeume.filter(r => filter(r, g)).map(r => ({ t: `${g.fl} ${r.n}`, v: wert(r, g), n: grenze(r, g) })));
  return l.length ? rest(Math.min(...l.map(x => x.v - x.n)), e, l.map(x => `${x.t} ${EINHEIT[e](x.v)}`)) : {}; };
const spanne = ([a, b]) => `${zahl(a)}${a < 0 || b < 0 ? '…' : '–'}${zahl(b)}`, rechteck = q => `[${q.map(v => zahl(v)).join(' ')}]`;
regel('Grundriss', 'raum-schnitt', 'Pflicht', 'Räume überschneiden sich nicht (r und ext)', 'Grundriss', () => sammel(g => g.schnitte.map(s => `${g.fl} ${s.a} / ${s.b} ${qm(s.qm)}`), 'keine', 'keine'));
regel('Grundriss', 'raum-aussen', 'Pflicht', 'Räume innerhalb der Außenwände (UG auch in der Tiefgarage)', 'Grundriss', () => sammel(g => g.raeume.flatMap(r => r.rects.filter(q =>
  !(q[0] >= g.innen[0] - 0.001 && q[1] <= g.innen[1] + 0.001 && q[2] >= g.innen[2] - 0.001 && q[3] <= g.innen[3] + 0.001)
  && !(g.fl === 'UG' && [[q[0], q[2]], [q[1], q[2]], [q[0], q[3]], [q[1], q[3]]].every(p => GR.inPoly(S.concept.tg, p)))).map(q => `${g.fl} ${r.n} [${q.map(v => zahl(v)).join(' ')}]`)), 'alle', 'innen'));
regel('Grundriss', 'raum-fuge', 'Hinweis', 'Wände zwischen Nachbarräumen 0,115–0,30 m, Räume bündig an der Außenwand (sonst Tippfehler?)', 'Plausibilität', () => sammel(g => {
  const out = new Set();
  for (const x of g.fugen) if (x.d < 0.005) out.add(`${g.fl} ${x.a}/${x.b} ohne Wand`); else if (x.d < 0.115 - E || x.d > 0.30 + E) out.add(`${g.fl} ${x.a}/${x.b} ${cm(x.d)}`);
  for (const r of g.raeume) for (const q of r.rects) {
    const d = [q[0] - g.innen[0], g.innen[1] - q[1], q[2] - g.innen[2], g.innen[3] - q[3]].filter(v => v > 0.005 && v < 0.30);
    if (d.length) out.add(`${g.fl} ${r.n} ${cm(Math.min(...d))} vor der Außenwand`);
  }
  return [...out]; }, 'plausibel', '0,115–0,30 m'));
const groessePruefen = r => (r.art === 'aufenthalt' && /kind|schlaf|gäste/i.test(r.n)) || r.art === 'bad', groesseMin = r => (r.art === 'bad' ? 5 : 10);
regel('Grundriss', 'raum-groesse', 'Hinweis', 'Kinder-, Schlaf- und Gästezimmer ≥ 10 m², Bäder ≥ 5 m²', 'Richtwerte', () => sammel(g => g.raeume.filter(r =>
  (r.art === 'aufenthalt' && /kind|schlaf|gäste/i.test(r.n) && r.a < 10 - E) || (r.art === 'bad' && r.a < 5 - E)).map(r => `${g.fl} ${r.n} ${qm(r.a)}`), 'alle groß genug', '10 / 5 m²',
  jeRaum(groessePruefen, r => r.a, groesseMin, 'qm')));
const breite = r => Math.min(r.r[1] - r.r[0], r.r[3] - r.r[2]), breiteMin = r => (r.art === 'flur' ? 1.0 : 2.4);
regel('Grundriss', 'raum-breite', 'Hinweis', 'Aufenthaltsräume ≥ 2,40 m breit, Flure ≥ 1,00 m', 'Richtwerte', () => sammel(g => g.raeume.filter(r => r.art === 'aufenthalt' || r.art === 'flur').map(r => ({ r,
  b: Math.min(r.r[1] - r.r[0], r.r[3] - r.r[2]) })).filter(x => x.b < (x.r.art === 'flur' ? 1.0 : 2.4) - E).map(x => `${g.fl} ${x.r.n} ${m(x.b)}`), 'alle breit genug', '2,40 / 1,00 m',
  jeRaum(r => r.art === 'aufenthalt' || r.art === 'flur', breite, breiteMin, 'm')));
regel('Grundriss', 'raum-erreichbar', 'Pflicht', 'jeder Raum von der Treppe aus über Türen und Durchgänge erreichbar', 'Grundriss', () => sammel(g => [
  ...(g.raeume.some(r => r.core) ? [] : [`${g.fl} ohne Treppenraum (core)`]), ...g.raeume.filter(r => !g.erreicht.has(r.n)).map(r => `${g.fl} ${r.n}`)], 'alle', 'alle'));
// Teile eines Raums (tools/lib/grundriss.js): raum-erreichbar sieht nur, dass eine Tür in den Raum führt, nicht ob jeder Teil dahinter
// erreichbar ist; ein ext hinter einer durchgehenden Wand wäre abgemauert
regel('Grundriss', 'raum-zusammen', 'Pflicht', `jeder Raum hängt zusammen: r und ext berühren sich auf ≥ ${m(GR.DURCHGANG)} oder über Durchgänge (open)`, 'Grundriss', () =>
  sammel(g => g.raeume.filter(r => r.teile.length > 1).map(r => {
    const teile = r.teile.map(T => `${T.rects.map(rechteck).join(' + ')}${T.zugang ? '' : ' ohne Zugang'}`), wand = [...new Set(r.trennung.map(f => `${f.achse} ${spanne(f.w)}`))];
    return `${g.fl} ${r.n} in ${r.teile.length} Teilen: ${teile.join(' | ')}${wand.length ? `, Wand ${wand.join(', ')} dazwischen` : ', ohne Kontakt'}`; }), 'alle', 'zusammenhängend'));
regel('Grundriss', 'tuer-wand', 'Pflicht', 'jede Tür sitzt in einer Wand zwischen zwei Räumen (oder Raum und außen), über ihre ganze Breite', 'Grundriss', () => sammel(g => g.tueren.filter(t => {
  const gut = s => s.n && !['Wand', 'Luftraum', 'Aufzug', 'Durchgang'].includes(s.n) && s.voll;
  return !(gut(t.plus) && gut(t.minus) && t.plus.n !== t.minus.n && g.wo(t.mitte).wand && t.wand <= 0.6); }).map(t => `${g.fl} Tür bei ${zahl(t.d.x)}/${zahl(t.d.y)} (${t.name})`), 'alle', 'in der Wand'));
// exakt (tools/lib/grundriss.js schwenkTrifft): Viertelkreis gegen Raum, Durchgänge, Treppe, Aufzug und die anderen Flügel, Toleranz 2 cm
regel('Grundriss', 'tuer-schwenk', 'Pflicht', 'Türflügel schlagen frei in ihren Raum (nicht in Wand, Treppe, Aufzug oder andere Türen)', 'Grundriss', () => sammel(g => g.tueren.flatMap(t => {
  const was = g.schwenkTrifft(t); return was.length ? [`${g.fl} Tür ${t.name}: ${was.join(', ')}`] : []; }), 'alle frei', 'frei'));
regel('Grundriss', 'fenster-flaeche', 'Pflicht', 'Fenster in Aufenthaltsräumen ≥ 1/8 der Grundfläche (Rohbaumaß)', 'BayBO Art. 45 Abs. 2', () => {
  const f = jeFl(g => g.raeume.filter(r => r.art === 'aufenthalt').map(r => { const s = g.fenster.reduce((t, w) => t + w.qm * (w.anteile[r.n] || 0), 0);
    return { t: `${g.fl} ${r.n} ${qm(s)} statt ${qm(r.a / 8)}`, a: s / r.a, n: `${g.fl} ${r.n}`, ok: s >= r.a / 8 - 0.005, r: s - r.a / 8 }; }));
  const anteil = w => (w.a > 0 ? `${w.n} 1/${zahl(1 / w.a, 1)}` : `${w.n} ohne Fenster`);
  return ja(f.every(x => x.ok), `knappster: ${knapp(min(f, x => x.a), anteil)}`, '≥ 1/8', f.filter(x => !x.ok).map(x => x.t),
    f.length ? rest(Math.min(...f.map(x => x.r)), 'qm', f.map(anteil)) : {}); });
regel('Grundriss', 'fenster-wand', 'Pflicht', 'hinter jedem Fenster genau ein Raum, keine Innenwand läuft in ein Fenster', 'Grundriss', () => sammel(g => g.fenster.filter(w => w.wand > 0.01 || w.raeume.length !== 1)
  .map(w => `${bez(w)}: ${w.raeume.length ? w.raeume.join(' / ') : 'kein Raum'}${w.wand > 0.01 ? `, ${m(w.wand)} Wand dahinter` : ''}`), 'alle', 'ein Raum, keine Wand'));

// ---------- Möbel (Formen aus Plans.formen, also genau wie gezeichnet) ----------
regel('Möbel', 'moebel-frei', 'Pflicht', 'Möbel stehen frei: nicht in Wänden, im Luftraum, auf Treppe, Aufzug, Pfeilern oder neben den Außenflächen', 'Grundriss', () => sammel(g => g.moebel.flatMap(mb => {
  const was = {};
  for (const fo of mb.formen) for (const p of GR.formPunkte(fo)) { const r = g.frei(p); if (r) was[r] = 1; }
  return Object.keys(was).length ? [`${g.fl} ${mb.name} (${mb.raum}): ${Object.keys(was).join(', ')}`] : []; }), 'alle frei', 'frei'));
// exakt (tools/lib/grundriss.js moebelImSchwenk): Eindringtiefe der Möbelformen in den Viertelkreis ab der Wandflucht, erst über 2 cm ein Treffer
regel('Möbel', 'moebel-schwenk', 'Pflicht', 'kein Möbel im Schwenkbereich einer Tür', 'Grundriss', () => sammel(g => g.tueren.flatMap(t => g.moebel
  .map(mb => ({ mb, d: g.moebelImSchwenk(t, mb) })).filter(x => x.d > 0.02).map(({ mb, d }) => `${g.fl} ${mb.name} (${mb.raum}) ${cm(d)} im Schwenk der Tür ${t.name}`)), 'alle frei', 'frei'));

// ---------- Außen (Ortsgestaltungssatzung Grünwald, DIN EN 1176) ----------
regel('Außen', 'pool-stufen', 'Hinweis', 'Poolstufen vom Rand bis zum Boden gleichmäßig 0,25–0,30 m', 'üblich (Maßprüfung)', () => {
  const PO = H.pool, z = [PO.rand, ...PO.stufen, PO.boden], s = z.slice(1).map((v, i) => z[i] - v), a = Math.min(...s), b = Math.max(...s);
  return ja(a >= 0.25 - E && b <= 0.30 + E && b - a <= 0.02 + E, s.map(cm).join(' · '), '0,25–0,30 m, Unterschied ≤ 2 cm', null, rest(Math.min(a - 0.25, 0.30 - b, 0.02 - (b - a)), 'cm')); });
regel('Außen', 'zaun-hoehe', 'Pflicht', 'Zaun zur Straße samt Pfeilern und Tor', 'OGS § 9 Abs. 4', () => { const h = Math.max(H.zaun.hoehe, H.zaun.stab); return ja(h <= 1.6 + E, m(h), '≤ 1,60 m', null, rest(1.6 - h)); });
regel('Außen', 'lichthof-mass', 'Pflicht', 'Lichtschacht höchstens 1,50 m tief und ein Drittel der Ansichtsbreite', 'OGS § 8', () => {
  const LH = H.lichthof, l = LH.u1 - LH.u0, b = H.fas[LH.side].len / 3;
  return ja(LH.tief <= 1.5 + E && l <= b + E, `${m(LH.tief)} tief, ${m(l)} lang`, `≤ 1,50 m, ≤ ${m(b)}`, null, rest(Math.min(1.5 - LH.tief, b - l))); });
regel('Außen', 'lichthof-gelaender', 'Pflicht', 'Geländer am Lichthof', 'BayBO Art. 36 Abs. 1, 4', () => {
  const h = H.lichthof.gelaender || 0, n = umwehrung(Z.gelaende - Z.ffbUG); return ja(h >= n - E, h ? m(h) : 'keins', `≥ ${m(n)}`, null, rest(h - n)); });
// Zufahrt im Konzept (SITE.concept.zufahrt): Breite quer zur Fahrtrichtung bei y
const ZF = S.concept.zufahrt, zfBreite = y => { const xs = []; ZF.forEach((a, i) => { const b = ZF[(i + 1) % ZF.length]; if ((a[1] - y) * (b[1] - y) < 0) xs.push(a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1])); }); return xs.length > 1 ? Math.max(...xs) - Math.min(...xs) : 0; };
regel('Außen', 'einfahrt', 'Pflicht', 'Einfahrt an der Grenze', 'OGS (Maßprüfung)', () => { const b = zfBreite(R.grenze(R.x0) + 0.05); return ja(b <= 5 + 0.005, m(b), '≤ 5,00 m', null, rest(5 - b)); });
regel('Außen', 'spiel-fallhoehe', 'Pflicht', 'freie Fallhöhe am Spielturm', 'DIN EN 1176-1', () => ja(H.garten.spiel.turm.podest <= 3 + E, m(H.garten.spiel.turm.podest), '≤ 3,00 m', null, rest(3 - H.garten.spiel.turm.podest)));
regel('Außen', 'spiel-fallraum', 'Pflicht', 'Fallräume liegen auf der Fallschutzfläche', 'DIN EN 1176-1, -2, -3', () => {
  const SP = H.garten.spiel, T = SP.turm, d = T.podest <= 1.5 ? 1.5 : 2 / 3 * T.podest + 0.5, Rt = SP.rutsche, Sk = SP.schaukel;
  const zonen = [{ n: 'Turm', r: [T.x - T.a, T.x + T.a, T.y - T.a, T.y + T.a], d }, { n: 'Kletterwand', r: [T.x - SP.wand.b / 2, T.x + SP.wand.b / 2, T.y + T.a, T.y + T.a + SP.wand.tief], d },
    { n: 'Kletternetz', r: [T.x - SP.netz.b / 2, T.x + SP.netz.b / 2, T.y - T.a - SP.netz.tief, T.y - T.a], d },
    // Rutsche: 1,00 m seitlich, 2,00 m hinter dem Auslauf; Schaukel: in Schwingrichtung 0,867 × Seillänge + 1,75 m (HOUSE.garten.spiel.schwing), 1,75 m je Sitz
    { n: 'Rutsche', r: [T.x + T.a, T.x + T.a + Rt.len + 2.0, T.y - Rt.b / 2 - 1.0, T.y + Rt.b / 2 + 1.0], d: 0 },
    ...Sk.sitze.map(x => ({ n: 'Schaukel', r: [x - 0.875, x + 0.875, Sk.y - SP.schwing, Sk.y + SP.schwing], d: 0 }))];
  const f = zonen.map(z => { const r = [z.r[0] - z.d, z.r[1] + z.d, z.r[2] - z.d, z.r[3] + z.d];
    const raus = GR.raster(r, 0.1, 0.02).filter(p => Math.hypot(Math.max(z.r[0] - p[0], 0, p[0] - z.r[1]), Math.max(z.r[2] - p[1], 0, p[1] - z.r[3])) <= Math.max(0, z.d - 0.02) && !GR.inPoly(SP.flaeche, p));
    return { n: z.n, ok: !raus.length, t: `${z.n} ${raus.length} Punkte außerhalb` }; });
  return ja(f.every(x => x.ok), `${zonen.length} Fallräume`, 'auf der Fläche', f.filter(x => !x.ok).map(x => x.t)); });

// ---------- Offen: klärt der Bauherr mit Architektin und Gemeinde (nur Werte, nie ein Fehler) ----------
regel('Offen', 'ogs-dach', 'Offen', 'Dach und Zwerchhäuser', 'OGS § 5', () => {
  const s = ['S', 'N', 'E', 'W'].map(k => { const F = H.fas[k], a = [...(F.dormers || []), ...(F.roofWindows || [])].map(x => [x.u0, x.u1]).sort((p, q) => p[0] - q[0]);
    return { k, sum: a.reduce((t, x) => t + x[1] - x[0], 0), halb: F.len / 2, ab: a.slice(1).map((x, i) => x[0] - a[i][1]) }; });
  const zu = s.filter(x => x.sum > x.halb + E), ab = Math.min(...s.flatMap(x => x.ab)), top = Math.max(...['S', 'N', 'E', 'W'].flatMap(k => (H.fas[k].dormers || []).filter(d => d.zwerch).map(d => d.top)));
  return { wert: `Neigung ${H.dachwinkel.map(v => gr(v)).join(' / ')} (15–52°) · Aufbauten ${zu.map(x => `${FAS(x.k)} ${m(x.sum)} (≤ ${m(x.halb)})`).join(', ') || 'ok'} · Abstand ${m(ab)} (≥ 1,00 m) · Zwerchhaus bis ${m(top)} (≤ ${m(Z.wand + 1.8)})` }; });
regel('Offen', 'ogs-poolhaus', 'Offen', 'Wandhöhe des Poolhauses (Dachhaut über der Wandflucht)', 'OGS § 6', () => {
  const PH = H.poolhaus; return { wert: `${m(PH.traufe + (PH.ueberstand || 0) * Math.tan(PH.neigung * Math.PI / 180) - Z.gelaende)} (≤ 2,75 m)` }; });
regel('Offen', 'ogs-stahl', 'Offen', 'Zaun, Tor und Gartentür aus Stahl', 'OGS § 9 Abs. 3', () => ({ wert: `Stäbe ${m(H.zaun.stab)}, Tor ${m(H.zaun.tor[1] - H.zaun.tor[0])}, Gartentür ${m(H.zaun.tuer[1] - H.zaun.tuer[0])} aus schwarzem Metall` }));
regel('Offen', 'rampe-beginn', 'Offen', 'wo die Rampe beginnen darf', 'Konzept, GaStellV § 2', () => {
  const yG = R.grenze(R.x0); let y = yG + 0.05; while (y < R.yPortal && zfBreite(y) > R.x1 - R.x0 + 0.05) y += 0.01;
  return { wert: `Rampe ab der Grenze (y ${zahl(yG)}, Rinne ${zahl(R.y0)}); im Konzept bleibt die Zufahrt ${m(zfBreite(yG + 0.05))} breit bis y ${zahl(y)}, ${m(y - yG - 5)} hinter der 5-m-Linie (y ${zahl(yG + 5)})` }; });

// ---------- Gemeldet ----------
// Gefundene Pflicht-Verstöße, über die der Bauherr noch entscheidet: Regel → Stellen (Teiltexte der Fundstellen). Sie lassen die Prüfung grün
// und stehen gesammelt unter „Gemeldet“; eine neue Stelle derselben Regel zählt weiter als Fehler. Nach der Entscheidung beheben und austragen.
const GEMELDET = {   // gemeldet am 5.11.2026
  'treppe-kopf': ['UG→EG', 'EG→OG', 'OG→DG'],
  'balkon-schwelle': ['OG Balkon', 'OG Dachterrasse', 'DG Balkon'],
  'fenster-flaeche': ['DG Schlafzimmer', 'DG Gäste'],
  'fenster-wand': ['OG Nord 9,80–10,80'],
  'moebel-schwenk': ['EG Regal (Backkitchen)', 'OG Regal (Kind 4)', 'DG Regal (Ankleide)'],
  // gemeldet 5.11.2026: OG Kind 1 und 3 – Zimmer mit Bett und Schreibtisch durch eine durchgehende Wand (x 4,48–4,72 bzw. 11,28–11,52) vom
  // Türstreifen getrennt, also unerreichbar; „in 2 Teilen“, damit ein weiterer abgemauerter Teil wieder auffällt
  'raum-zusammen': ['OG Kind 1 in 2 Teilen', 'OG Kind 3 in 2 Teilen'],
};
const funde = x => (x.e.liste && x.e.liste.length ? x.e.liste : String(x.e.wert).split(' · '));
const gemeldet = x => !!GEMELDET[x.r.id] && funde(x).every(t => GEMELDET[x.r.id].some(s => t.includes(s)));

// ---------- Auswertung ----------
const erg = REGELN.map(r => { try { return { r, e: r.f() }; } catch (e) { return { r, e: { ok: false, wert: `Fehler in der Regel: ${e.message}`, grenze: '' } }; } });
const zeile = (a, b) => console.log(`${a.padEnd(12)} ${b}`);

// ---------- Werte gegen die Referenz (tools/shots/referenz/regeln.json, je Arbeitskopie) ----------
// Beim ersten Lauf und mit --abnehmen (./vg abnehmen) wird der Stand Referenz. Verglichen wird je Regel Teil für Teil (Wert an „ · “ zerlegt,
// Fundstellen, Einzelwerte): gleicher Text bis auf die Zahlen ist derselbe Teil mit neuen Zahlen (alt → neu), sonst neu (+) oder weg (−);
// die Reserve sagt, ob es schlechter oder besser wurde. Änderungen sind kein Fehler, die letzte Zeile nennt sie kurz.
const REF = path.join(ROOT, 'tools', 'shots', 'referenz', 'regeln.json');
const werteVon = x => {
  const e = x.e, o = { art: x.r.art, ok: !!e.ok, wert: String(e.wert) };
  if (e.liste && e.liste.length) o.liste = e.liste.map(String);
  if (e.werte && e.werte.length) o.werte = e.werte.map(String);
  if (e.gilt !== undefined) o.gilt = e.gilt;
  if (e.rest && Number.isFinite(e.rest[0])) o.rest = { v: +e.rest[0].toFixed(6), t: reserve(...e.rest) };
  return o;
};
const STAND = Object.fromEntries(erg.map(x => [x.r.id, werteVon(x)]));
// Gerippe = Text ohne Zahlen („1 Stelle“ und „2 Stellen“ sind derselbe Teil)
const ZAHL_RE = /([−-]?\d+(?:,\d+)?)/, gerippe = s => s.split(ZAHL_RE).map((t, i) => (i % 2 ? '#' : t)).join('').replace(/\bStellen\b/g, 'Stelle');
const nurAnzahl = s => /^\S+( → \S+)? Stellen?$/.test(s);
const teileVon = o => [...new Set([...o.wert.split(' · '), ...(o.liste || []), ...(o.werte || [])])];
function teilDiff(alt, neu) {
  const a = alt.filter(s => !neu.includes(s)), n = neu.filter(s => !alt.includes(s)), out = [];
  for (const s of [...n]) {
    // geänderte Wörter ganz zeigen: „1/2,8 → 1/2,9“, „x 7,35–8,65 → 7,65–8,95“ (gleiches Gerippe, also gleich viele Wörter)
    const j = a.findIndex(t => gerippe(t) === gerippe(s)); if (j < 0) continue;
    const A = a[j].split(' '), N = s.split(' ');
    out.push(A.length === N.length ? N.map((w, i) => (w !== A[i] ? `${A[i]} → ${w}` : w)).join(' ') : `${a[j]} → ${s}`);
    a.splice(j, 1); n.splice(n.indexOf(s), 1);
  }
  // Fundstellen vor der bloßen Anzahl („2 → 3 Stellen“), damit die Kurzform sagt, was dazukam oder wegfiel
  const alle = [...out, ...n.map(s => `+ ${s}`), ...a.map(s => `− ${s}`)];
  return [...alle.filter(s => !nurAnzahl(s)), ...alle.filter(nurAnzahl)];
}
function aenderung(alt, neu) {
  if (!alt) return { teile: [], rest: null, kurz: 'neue Regel', weitere: 0 };
  const teile = teilDiff(teileVon(alt), teileVon(neu)), dr = alt.rest && neu.rest && alt.rest.t !== neu.rest.t;
  const r = dr ? `${(alt.rest.t.match(ZAHL_RE) || [alt.rest.t])[0]} → ${neu.rest.t}` : null, richtung = dr ? (neu.rest.v < alt.rest.v ? 'schlechter' : 'besser') : null;
  // Kurzform: Reserve, sonst der erste geänderte Teil, ein Wechsel von erfüllt/verletzt davor; weitere = was die Kurzform nicht zeigt
  const status = alt.ok !== neu.ok ? (neu.ok ? 'jetzt erfüllt' : 'jetzt verletzt') : null, kurz = r || [status, teile[0]].filter(Boolean).join(': ');
  const weitere = r ? teile.length + (status ? 1 : 0) : Math.max(0, teile.length - 1);
  if (status) teile.unshift(status);
  return teile.length || r ? { teile, rest: r && `${r} (${richtung})`, richtung, kurz, weitere } : null;
}
const lies = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return null; } };
const schreibRef = () => { fs.mkdirSync(path.dirname(REF), { recursive: true }); fs.writeFileSync(REF, JSON.stringify({ stand: new Date().toISOString(), regeln: STAND }, null, 1)); };
if (process.argv.includes('--abnehmen')) {
  schreibRef(); console.log(`Regeln: Referenz übernommen, ${erg.length} Regelwerte (tools/shots/referenz/regeln.json)`); process.exit(0);
}
const REFERENZ = lies(REF), NEU = !(REFERENZ && REFERENZ.regeln);
if (NEU) schreibRef();
const AENDERUNGEN = NEU ? [] : [...erg.map(x => ({ x, d: aenderung(REFERENZ.regeln[x.r.id], STAND[x.r.id]) })).filter(a => a.d),
  ...Object.keys(REFERENZ.regeln).filter(id => !STAND[id]).map(id => ({ x: { r: { id, text: 'Regel entfernt', quelle: '–' } }, d: { teile: [], rest: null, kurz: 'entfernt', weitere: 0 } }))];
// Regel in einer Zeile: id, Text [Quelle]: Wert, fehlende Einzelheiten (soweit nicht schon im Wert), Grenze
const detail = (z, x) => { const l = (x.e.liste || []).filter(t => !String(x.e.wert).includes(t));
  console.log(`  ${z} ${x.r.id}  ${x.r.text} [${x.r.quelle}]: ${x.e.wert}${l.length ? ` · ${l.join(' · ')}` : ''}${x.e.grenze ? ` · Grenze ${x.e.grenze}` : ''}`); };
let erfuellt = 0, verletzt = 0, hinweise = 0;
const gem = [];
for (const g of ['Tiefgarage', 'Haus', 'Grundriss', 'Möbel', 'Außen']) {
  const rs = erg.filter(x => x.r.g === g && (x.r.art === 'Pflicht' || x.r.art === 'Hinweis')), h = rs.filter(x => !x.e.ok && x.r.art === 'Hinweis');
  const p = rs.filter(x => !x.e.ok && x.r.art === 'Pflicht'), v = p.filter(x => !gemeldet(x)), gm = p.filter(gemeldet);
  const ok = rs.length - p.length - h.length; erfuellt += ok; verletzt += v.length; hinweise += h.length; gem.push(...gm);
  const zusatz = [gm.length && `${gm.length} gemeldet`, h.length && `${h.length} Hinweis${h.length > 1 ? 'e' : ''}`, `${ok} erfüllt`].filter(Boolean).join(' · ');
  zeile(g, v.length ? `FEHLER ${v.length} verletzt · ${zusatz}` : gm.length || h.length ? `ok    ${zusatz}` : `ok    ${ok} Regeln`);
  for (const x of v) detail('✗', x);
  for (const x of h) detail('!', x);
  if (ALLE) for (const x of rs.filter(x => x.e.ok)) detail('✓', x);
}
if (gem.length) { zeile('Gemeldet', `${gem.length} Verstöße, über die der Bauherr entscheidet (tools/regeln.js, GEMELDET)`); for (const x of gem) detail('~', x); }
const offen = erg.filter(x => x.r.art === 'Offen'), aus = erg.filter(x => x.r.art === 'Ausgenommen' && x.e.gilt !== false);
zeile('Offen', `${offen.length} Punkte, klärt der Bauherr mit Architektin und Gemeinde`);
for (const x of offen) console.log(`  ? ${x.r.id}  ${x.r.text} [${x.r.quelle}]: ${x.e.wert}`);
// geänderte Werte: je Regel alle Teile; in der letzten Zeile die ersten drei Regeln kurz (Reserve, sonst der erste geänderte Teil)
if (AENDERUNGEN.length) {
  zeile('Geändert', `${AENDERUNGEN.length} Regel${AENDERUNGEN.length > 1 ? 'n' : ''} mit anderen Werten als die Referenz (./vg abnehmen übernimmt den Stand)`);
  for (const { x, d } of AENDERUNGEN) console.log(`  Δ ${x.r.id}  ${x.r.text}: ${[...(d.rest ? [`Reserve ${d.rest}`] : []), ...d.teile].join(' · ') || d.kurz}`);
}
const kuerzen = (s, n = 70) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const vergleich = NEU ? 'Referenz angelegt' : !AENDERUNGEN.length ? 'Werte unverändert'
  : `geändert: ${AENDERUNGEN.slice(0, 3).map(({ x, d }) => { const z = [d.richtung, d.weitere > 0 && `+${d.weitere}`].filter(Boolean);
    return `${x.r.id} ${kuerzen(d.kurz)}${z.length ? ` (${z.join(', ')})` : ''}`; }).join(', ')}`
    + (AENDERUNGEN.length > 3 ? ` und ${AENDERUNGEN.length - 3} weitere` : '');
console.log(`${erfuellt} erfüllt · ${verletzt} verletzt${gem.length ? ` · ${gem.length} gemeldet` : ''}${hinweise ? ` · ${hinweise} Hinweis${hinweise > 1 ? 'e' : ''}` : ''} · ${offen.length} offen · ${aus.length} ausgenommen · ${vergleich}`);
process.exit(verletzt ? 1 : 0);

