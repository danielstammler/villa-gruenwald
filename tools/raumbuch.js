// Raumbuch als Text je Geschoss: Maße, Fläche, Türen und Durchgänge zu welchen Räumen, Fenster mit Fläche und Anteil an der Grundfläche,
// Möbel – damit sich ein geänderter Grundriss ohne Bilder prüfen lässt. Gleiche Analyse wie tools/regeln.js (tools/lib/grundriss.js).
// Aufruf: node tools/raumbuch.js [UG|EG|OG|DG …] (ohne Angabe alle Geschosse); ⇅ = Raum mit der Treppe, Fläche im DG mit Wohnfläche in Klammern.
const { kontext } = require('./lib/laden');
const GR = require('./lib/grundriss');
const B = GR.analyse(kontext()), { H } = B, wahl = process.argv.slice(2).map(s => s.toUpperCase()).filter(s => GR.GESCHOSSE.includes(s));
const zahl = (v, d = 2) => (+v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');
const ART = { aufenthalt: 'Aufenthalt', bad: 'Bad', wc: 'WC', flur: 'Flur', neben: 'Nebenraum' };
const spalte = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s).padEnd(n);
const kopf = ['Raum', 14, 'Art', 12, 'Maße m', 15, 'Fläche m²', 12, 'Fenster: Zahl · m² · Anteil', 27, 'Möbel', 5, 'Türen (lichte Breite) und Durchgänge', 0];
const zeile = w => console.log('  ' + w.map((s, i) => (i === w.length - 1 ? s : spalte(s, kopf[2 * i + 1]))).join(' '));
for (const fl of wahl.length ? wahl : GR.GESCHOSSE) {
  const G = B.G[fl], L = B.laeufe.find(x => x.fl === fl), U = B.laeufe.find(x => x.oben === fl);
  console.log(`${fl} · ${G.F.titel} · FFB ${zahl(G.ffb)} · lichte Höhe ${zahl(G.hoehe)} m · ${G.raeume.length} Räume, ${G.tueren.length} Türen, ${G.fenster.length} Fenster, ${G.moebel.length} Möbel`);
  zeile(kopf.filter((_, i) => i % 2 === 0));
  for (const r of G.raeume) {
    const wege = [...new Set(G.kanten.filter(k => k.a === r.n || k.b === r.n).map(k => { const n = k.a === r.n ? k.b : k.a; return k.art === 'Tür' ? `${n} ${zahl(k.t.breite)}` : `${n} ${k.art}`; }))];
    const fe = G.fenster.filter(w => w.anteile[r.n]), qm = fe.reduce((t, w) => t + w.qm * w.anteile[r.n], 0);
    const mass = `${zahl(r.r[1] - r.r[0])} × ${zahl(r.r[3] - r.r[2])}${r.rects.length > 1 ? ` +${r.rects.length - 1}` : ''}`;
    const fla = fl === 'DG' && Math.abs(r.wf - r.a) > 0.05 ? `${zahl(r.a, 1)} (${zahl(r.wf, 1)})` : zahl(r.a, 1);
    zeile([r.n, ART[r.art] + (r.core ? ' ⇅' : ''), mass, fla, fe.length ? `${fe.length} · ${zahl(qm, 1)} · ${zahl(qm / r.a * 100, 0)} %` : '–',
      String(G.moebel.filter(mb => mb.raum === r.n).length), wege.join(', ') || '–']);
  }
  // Treppe, Fenster ohne Raum (z. B. zum Luftraum), Außenflächen mit Möbeln
  const tr = [L && `↑ ${L.oben} ${L.F.n} × ${zahl(L.h * 100, 1)}/${zahl(L.g * 100, 1)} cm, Kopfhöhe ${zahl(L.kopf)} m`, U && `↓ ${U.fl}`].filter(Boolean);
  if (tr.length) console.log(`  Treppe ${tr.join(' · ')}`);
  const ohne = G.fenster.filter(w => !Object.keys(w.anteile).length);
  if (ohne.length) console.log(`  Fenster ohne Raum: ${ohne.map(w => `${H.fas[w.fassade].name} ${zahl(w.u0)}–${zahl(w.u1)} (${w.raeume.join(', ') || 'Wand'})`).join(' · ')}`);
  if (G.flaechen.length) console.log(`  außen: ${G.flaechen.map(a => `${a.n} ${G.moebel.filter(mb => mb.raum === a.n).length} Möbel`).join(' · ')}`);
}
