// Baut die Seite aus src/: docs/index.html (GitHub Pages, vollständiges Dokument) und dist/artifact.html (ohne Rahmen).
// Aufruf: node tools/bauen.js (oder ./vg bauen) · OHNE_AUTOS=1 baut mit den einfachen Ersatzformen statt der Modelle aus src/car-*.js,
// z. B. solange jemand an den Modellen arbeitet.
// Werte im Text: {{ Ausdruck }} in src/seite/*.html wird beim Bauen aus den Hausdaten ersetzt (Formate unten, z. B. {{ m(HOUSE.tg.bucht) }});
// src/werte.js darf dafür Hilfsrechnungen anlegen, die nur beim Bauen gebraucht werden.
const fs = require('fs'), path = require('path');
const { ROOT, SRC, lesen, ordner, teil, BASIS, kontext, rechne } = require('./lib/laden');

const zahl = (v, d = 2) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const FORMAT = {
  z: zahl,                                   // 2,77
  m: (v, d = 2) => `${zahl(v, d)} m`,        // 2,77 m
  cm: (v, d = 0) => `${zahl(v * 100, d)} cm`, // 0,40 → 40 cm
  m2: (v, d = 1) => `${zahl(v, d)} m²`,      // 17,3 m²
  proz: (v, d = 0) => `${zahl(v * 100, d)} %`, // 0,15 → 15 %
  grad: (v, d = 1) => `${zahl(v, d)}°`,      // 6,2°
};

function werte(html) {
  if (!html.includes('{{')) return html;
  const ctx = kontext(FORMAT);
  if (fs.existsSync(path.join(SRC, 'werte.js'))) rechne(ctx, lesen('werte.js'));
  let fehler = 0;
  const out = html.replace(/\{\{([\s\S]*?)\}\}/g, (all, a) => {
    let v;
    try { v = rechne(ctx, a); } catch (e) { v = e; }
    if (typeof v !== 'string' || /NaN|undefined|Infinity/.test(v)) {
      fehler++;
      console.error(`FEHLER im Text: {{${a}}} → ${v instanceof Error ? v.message : typeof v === 'number' ? `Zahl ${v} ohne Format (z/m/cm/m2/proz/grad)` : v}`);
    }
    return v;
  });
  if (fehler) process.exit(1);
  return out;
}

const IMPORTS = [
  "import * as THREE from 'three';",
  "import { OrbitControls } from 'three/addons/controls/OrbitControls.js';",
  "import { Sky } from 'three/addons/objects/Sky.js';",
  "import { mergeGeometries, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';",
  "import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';",
  "import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';",
];
// Autos: Baukasten und je Modell eine Datei (fehlende Modelle ersetzt das 3D-Modell durch eine einfache Form)
const AUTOS = ['car-ferrari.js', 'car-cayenne.js', 'car-vklasse.js'].filter(n => fs.existsSync(path.join(SRC, n)) && !process.env.OHNE_AUTOS);

const page = werte(ordner('seite/', '.html'));
const css = lesen('style.css');
const base = BASIS.map(teil).join('\n');
// 3D-Modell: Bereichsdateien in src/view3d/, nach Namen sortiert zu einem Block zusammengesetzt (ein gemeinsamer Gültigkeitsbereich)
const view3d = [...IMPORTS, lesen('cars.js'), ...AUTOS.map(lesen), ordner('view3d/'), 'window.View3D = View3D;'].join('\n');
const main = lesen('main.js');

const ersetze = (s, a, b) => s.split(a).join(b);   // alle Stellen, ohne $-Muster wie bei String.replace
function assemble(downloads) {
  let p = ersetze(page, '/*CSS*/', css);
  p = ersetze(p, '/*JSBASE*/', `const BUILD = { downloads: ${downloads} };\n` + base);
  p = ersetze(ersetze(p, '/*JS3D*/', view3d), '/*JSMAIN*/', main);
  const t = p.split('<!--BODY-->');
  if (t.length !== 2) throw new Error('<!--BODY--> muss genau einmal vorkommen');
  return t.map(s => s.trim());
}

const schreibe = (n, s) => {
  const f = path.join(ROOT, n);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, s);
  console.log(n, Buffer.byteLength(s), 'bytes');
};
let [head, body] = assemble(true);
schreibe('docs/index.html', '<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
  + '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  + `${head}\n</head>\n<body>\n${body}\n</body>\n</html>\n`);
[head, body] = assemble(false);
schreibe('dist/artifact.html', `${head}\n${body}\n`);
