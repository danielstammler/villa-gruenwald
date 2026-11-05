// Prüft die Zeichnungen ohne Browser: alle Ansichten und Schnitte, Grundrisse, Lageplan und Wohnfläche.
// Aufruf: node tools/check.js [--svg <ordner>] – Ausgabe je Zeichnung, Abbruch mit Fehlercode bei NaN, undefined oder Ausnahme.
// Mit --svg schreibt es jede Zeichnung als eigenständige SVG-Datei (<ordner>/<datei>.svg, z. B. grundriss-EG.svg) und daneben style.css,
// für den Vergleich mit der Referenz (./vg pruefen, ./vg plan; Bilder davon macht tools/browser.js).
const fs = require('fs'), path = require('path');
const { kontext, rechne } = require('./lib/laden');
const { zeichnungen, css } = require('./lib/zeichnungen');
const ctx = kontext();
const alle = zeichnungen(ctx);
const i = process.argv.indexOf('--svg'), ordner = i > 0 && process.argv[i + 1];
if (ordner) {
  fs.mkdirSync(ordner, { recursive: true });
  for (const z of alle) fs.writeFileSync(path.join(ordner, `${z.datei}.svg`), z.text);
  fs.writeFileSync(path.join(ordner, 'style.css'), css());
}
let bad = 0;
for (const z of alle) {
  const n = (z.svg.match(/NaN|undefined/g) || []).length;
  if (n) bad++;
  console.log(`${n ? 'FEHLER' : 'ok    '} ${z.titel.padEnd(12)} ${String(z.svg.length).padStart(6)} Zeichen${n ? ` · ${n} × NaN/undefined` : ''}`);
}
console.log(`Wohnfläche ${rechne(ctx, 'Plans.wohnflaeche().sum').toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m²`);
process.exit(bad ? 1 : 0);
