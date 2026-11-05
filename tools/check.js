// Prüft die Zeichnungen ohne Browser: alle Ansichten und Schnitte, Grundrisse, Lageplan und Wohnfläche.
// Aufruf: node tools/check.js – Ausgabe je Zeichnung, Abbruch mit Fehlercode bei NaN, undefined oder Ausnahme.
const { kontext, rechne } = require('./lib/laden');
const ctx = kontext();
const svgs = rechne(ctx, `(() => {
  const out = {};
  for (const v of ['S', 'N', 'E', 'W', 'A', 'B']) out['Ansicht ' + v] = Elev.render(v, { mass: true, koten: true }).svg;
  for (const fl of ['UG', 'EG', 'OG', 'DG']) out['Grundriss ' + fl] = Plans.render(fl, { moebel: true, flaechen: true }).svg;
  out['Lageplan'] = Site._build();
  return out;
})()`);
let bad = 0;
for (const [name, svg] of Object.entries(svgs)) {
  const n = (svg.match(/NaN|undefined/g) || []).length;
  if (n) bad++;
  console.log(`${n ? 'FEHLER' : 'ok    '} ${name.padEnd(12)} ${String(svg.length).padStart(6)} Zeichen${n ? ` · ${n} × NaN/undefined` : ''}`);
}
console.log(`Wohnfläche ${rechne(ctx, 'Plans.wohnflaeche().sum').toFixed(1)} m²`);
process.exit(bad ? 1 : 0);
