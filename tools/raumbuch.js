// Raumbuch als Text je Geschoss: Maße, Fläche, Türen und Durchgänge zu welchen Räumen, Fenster mit Fläche und Anteil an der Grundfläche,
// Möbel und darunter die Nachbarn je Seite mit der Lage der Wand – damit sich ein geänderter Grundriss ohne Bilder prüfen lässt und ein neuer
// Chat ohne Plan sieht, wer neben wem liegt. Gleiche Analyse wie tools/regeln.js (tools/lib/grundriss.js). Flächen und Lage der Räume gegen
// die Referenz tools/shots/referenz/raumbuch.json (beim ersten Lauf von selbst, ./vg abnehmen übernimmt den Stand): geänderte Räume mit Δ
// und vorher → nachher.
// Aufruf: node tools/raumbuch.js [UG|EG|OG|DG …] (ohne Angabe alle Geschosse); ⇅ = Raum mit der Treppe, Fläche im DG mit Wohnfläche in Klammern.
//         node tools/raumbuch.js --vergleich   nur die Änderungen gegen die Referenz in einer Zeile (Zeile „Räume“ in ./vg pruefen)
//         node tools/raumbuch.js --abnehmen    der Stand wird Referenz
const fs = require('fs'), path = require('path');
const { ROOT, kontext } = require('./lib/laden');
const GR = require('./lib/grundriss');
const args = process.argv.slice(2), B = GR.analyse(kontext()), { H } = B, wahl = args.map(s => s.toUpperCase()).filter(s => GR.GESCHOSSE.includes(s));
const zahl = (v, d = 2) => (+v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');
const spanne = ([a, b]) => `${zahl(a)}${a < 0 || b < 0 ? '…' : '–'}${zahl(b)}`;

// ---------- Referenz: Fläche, Wohnfläche und Rechtecke je Raum ----------
const REF = path.join(ROOT, 'tools', 'shots', 'referenz', 'raumbuch.json');
const STAND = Object.fromEntries(GR.GESCHOSSE.map(fl => [fl, Object.fromEntries(B.G[fl].raeume.map(r =>
  [r.n, { a: +r.a.toFixed(2), wf: +r.wf.toFixed(2), rects: r.rects.map(q => q.map(v => +v.toFixed(3))) }]))]));
const ANZAHL = GR.GESCHOSSE.reduce((t, fl) => t + B.G[fl].raeume.length, 0);
const schreibRef = () => { fs.mkdirSync(path.dirname(REF), { recursive: true }); fs.writeFileSync(REF, JSON.stringify({ stand: new Date().toISOString(), raeume: STAND }, null, 1)); };
if (args.includes('--abnehmen')) { schreibRef(); console.log(`Räume: Referenz übernommen, ${ANZAHL} Räume (tools/shots/referenz/raumbuch.json)`); process.exit(0); }
let REFERENZ = null;
try { REFERENZ = JSON.parse(fs.readFileSync(REF, 'utf8')).raeume; } catch (e) { /* noch keine Referenz */ }
const NEU = !REFERENZ;
if (NEU) schreibRef();
// geänderte Räume: Fläche (auf 0,1 m²), sonst Wohnfläche, sonst Lage; neue und entfernte Räume
const AENDERUNGEN = NEU ? [] : GR.GESCHOSSE.flatMap(fl => {
  const alt = REFERENZ[fl] || {}, neu = STAND[fl], f1 = v => zahl(v, 1);
  return [...Object.entries(neu).map(([n, r]) => { const o = alt[n];
    const t = !o ? `neu, ${f1(r.a)} m²` : f1(o.a) !== f1(r.a) ? `${f1(o.a)} → ${f1(r.a)} m²` : f1(o.wf) !== f1(r.wf) ? `Wohnfläche ${f1(o.wf)} → ${f1(r.wf)} m²`
      : JSON.stringify(o.rects) !== JSON.stringify(r.rects) ? `Lage geändert, ${f1(r.a)} m²` : null;
    return t && { fl, n, t }; }),
    ...Object.keys(alt).filter(n => !neu[n]).map(n => ({ fl, n, t: `entfernt (${f1(alt[n].a)} m²)` }))].filter(Boolean);
});
const ZEILE = NEU ? `Referenz angelegt (${ANZAHL} Räume)` : !AENDERUNGEN.length ? `unverändert (${ANZAHL} Räume)`
  : `${AENDERUNGEN.length} geändert: ${AENDERUNGEN.slice(0, 4).map(a => `${a.fl} ${a.n} ${a.t}`).join(', ')}${AENDERUNGEN.length > 4 ? `, … (+${AENDERUNGEN.length - 4})` : ''}`;
if (args.includes('--vergleich')) { console.log(ZEILE); process.exit(0); }

// ---------- Nachbarn je Seite: Name und Lage der Wand, gleiche Wände zusammengefasst ----------
function nachbarn(r) {
  const teile = ['N', 'O', 'S', 'W'].map(s => {
    const je = new Map();
    for (const f of r.nachbarn.filter(x => x.seite === s).sort((p, q) => p.entlang[0] - q.entlang[0])) {
      const e = je.get(f.n) || { w: new Set(), ohne: false }; je.set(f.n, e);
      if (f.n === 'Außenwand') continue;
      if (f.d >= 0.005) e.w.add(`${f.achse} ${spanne(f.w)}`); else if (f.n !== 'Aufzug' && f.n !== 'Luftraum') e.ohne = true;
    }
    const gruppen = new Map();
    for (const [n, e] of je) { const k = [e.w.size ? `Wand ${[...e.w].join(' und ')}` : '', e.ohne ? 'ohne Wand' : ''].filter(Boolean).join(', '); gruppen.set(k, [...(gruppen.get(k) || []), n]); }
    return je.size ? `${s}: ${[...gruppen].map(([k, ns]) => `${ns.join(', ')}${k ? `, ${k}` : ''}`).join('; ')}` : null;
  }).filter(Boolean);
  // ein abgemauerter eigener Teil (raum-zusammen in tools/regeln.js)
  const tw = [...new Set(r.trennung.map(f => `${f.achse} ${spanne(f.w)}`))];
  if (r.teile.length > 1) teile.push(`abgemauert: ${r.teile.length} Teile${tw.length ? `, Wand ${tw.join(' und ')} dazwischen` : ''}`);
  return teile.join(' · ');
}

// ---------- Tabelle je Geschoss ----------
const ART = { aufenthalt: 'Aufenthalt', bad: 'Bad', wc: 'WC', flur: 'Flur', neben: 'Nebenraum' };
const spalte = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s).padEnd(n);
const kopf = ['Raum', 14, 'Art', 12, 'Maße m', 15, 'Fläche m²', 12, 'Fenster: Zahl · m² · Anteil', 27, 'Möbel', 5, 'Türen (lichte Breite) und Durchgänge', 0];
const zeile = w => console.log('  ' + w.map((s, i) => (i === w.length - 1 ? s : spalte(s, kopf[2 * i + 1]))).join(' '));
const EINZUG = ' '.repeat(2 + kopf[1] + 1);
for (const fl of wahl.length ? wahl : GR.GESCHOSSE) {
  const G = B.G[fl], L = B.laeufe.find(x => x.fl === fl), U = B.laeufe.find(x => x.oben === fl), ae = AENDERUNGEN.filter(a => a.fl === fl);
  console.log(`${fl} · ${G.F.titel} · FFB ${zahl(G.ffb)} · lichte Höhe ${zahl(G.hoehe)} m · ${G.raeume.length} Räume, ${G.tueren.length} Türen, ${G.fenster.length} Fenster, ${G.moebel.length} Möbel`);
  zeile(kopf.filter((_, i) => i % 2 === 0));
  for (const r of G.raeume) {
    const wege = [...new Set(G.kanten.filter(k => k.a === r.n || k.b === r.n).map(k => { const n = k.a === r.n ? k.b : k.a; return k.art === 'Tür' ? `${n} ${zahl(k.t.breite)}` : `${n} ${k.art}`; }))];
    const fe = G.fenster.filter(w => w.anteile[r.n]), qm = fe.reduce((t, w) => t + w.qm * w.anteile[r.n], 0);
    const mass = `${zahl(r.r[1] - r.r[0])} × ${zahl(r.r[3] - r.r[2])}${r.rects.length > 1 ? ` +${r.rects.length - 1}` : ''}`;
    const fla = fl === 'DG' && Math.abs(r.wf - r.a) > 0.05 ? `${zahl(r.a, 1)} (${zahl(r.wf, 1)})` : zahl(r.a, 1);
    zeile([`${r.n}${ae.some(a => a.n === r.n) ? ' Δ' : ''}`, ART[r.art] + (r.core ? ' ⇅' : ''), mass, fla, fe.length ? `${fe.length} · ${zahl(qm, 1)} · ${zahl(qm / r.a * 100, 0)} %` : '–',
      String(G.moebel.filter(mb => mb.raum === r.n).length), wege.join(', ') || '–']);
    const nb = nachbarn(r); if (nb) console.log(EINZUG + nb);
  }
  if (ae.length) console.log(`  Δ gegen die Referenz: ${ae.map(a => `${a.n} ${a.t}`).join(' · ')}`);
  // Treppe, Fenster ohne Raum (z. B. zum Luftraum), Außenflächen mit Möbeln
  const tr = [L && `↑ ${L.oben} ${L.F.n} × ${zahl(L.h * 100, 1)}/${zahl(L.g * 100, 1)} cm, Kopfhöhe ${zahl(L.kopf)} m`, U && `↓ ${U.fl}`].filter(Boolean);
  if (tr.length) console.log(`  Treppe ${tr.join(' · ')}`);
  const ohne = G.fenster.filter(w => !Object.keys(w.anteile).length);
  if (ohne.length) console.log(`  Fenster ohne Raum: ${ohne.map(w => `${H.fas[w.fassade].name} ${zahl(w.u0)}–${zahl(w.u1)} (${w.raeume.join(', ') || 'Wand'})`).join(' · ')}`);
  if (G.flaechen.length) console.log(`  außen: ${G.flaechen.map(a => `${a.n} ${G.moebel.filter(mb => mb.raum === a.n).length} Möbel`).join(' · ')}`);
}
console.log(`Räume gegen die Referenz (tools/shots/referenz/raumbuch.json): ${ZEILE}`);
