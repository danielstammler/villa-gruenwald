// Prüft die Zeichnungen ohne Browser: alle Ansichten und Schnitte, Grundrisse, Lageplan und Wohnfläche.
// Aufruf: node tools/check.js – Ausgabe je Zeichnung, Abbruch mit Fehlercode bei NaN, undefined oder Ausnahme.
const fs = require('fs'), path = require('path'), vm = require('vm');
const src = path.join(__dirname, '..', 'src');
const ctx = { console, Math, JSON, Number, String, Array, Object, Set, Map };
ctx.window = ctx; ctx.document = { createElement: () => ({}) };
vm.createContext(ctx);
for (const n of ['data.js', 'lod2.js', 'sun.js', 'house.js', 'elevation.js', 'siteplan.js', 'floorplan.js']) {
  // Lageplan: die interne Zeichenfunktion für den Test nach außen reichen
  const code = fs.readFileSync(path.join(src, n), 'utf8').replace('return { init, setLayer, STATS', 'return { _build: build, init, setLayer, STATS');
  vm.runInContext(code, ctx, { filename: n });
}
const svgs = vm.runInContext(`(() => {
  const out = {};
  for (const v of ['S', 'N', 'E', 'W', 'A', 'B']) out['Ansicht ' + v] = Elev.render(v, { mass: true, koten: true }).svg;
  for (const fl of ['UG', 'EG', 'OG', 'DG']) out['Grundriss ' + fl] = Plans.render(fl, { moebel: true, flaechen: true }).svg;
  out['Lageplan'] = Site._build();
  return out;
})()`, ctx);
let bad = 0;
for (const [name, svg] of Object.entries(svgs)) {
  const n = (svg.match(/NaN|undefined/g) || []).length;
  if (n) bad++;
  console.log(`${n ? 'FEHLER' : 'ok    '} ${name.padEnd(12)} ${String(svg.length).padStart(6)} Zeichen${n ? ` · ${n} × NaN/undefined` : ''}`);
}
console.log(`Wohnfläche ${vm.runInContext('Plans.wohnflaeche().sum', ctx).toFixed(1)} m²`);
process.exit(bad ? 1 : 0);
