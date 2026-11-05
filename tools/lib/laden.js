// Gemeinsame Grundlage für Bau (tools/bauen.js) und Prüfungen (tools/check.js, tools/regeln.js): welche Quellteile in welcher
// Reihenfolge zusammengehören und wie man sie ohne Browser in eine vm lädt.
// Ordner wie src/haus/ sind Teildateien einer einzigen Datei: nach Namen sortiert und ohne Trenner aneinandergehängt.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..'), SRC = path.join(ROOT, 'src');

// Quellen mit LF-Zeilenenden (unter Windows ausgecheckt liegen sie mit CRLF vor)
const lesen = n => fs.readFileSync(path.join(SRC, n), 'utf8').replace(/\r\n?/g, '\n');
const teile = (d, ext = '.js') => fs.readdirSync(path.join(SRC, d)).filter(n => n.endsWith(ext)).sort();
const ordner = (d, ext = '.js') => teile(d, ext).map(n => lesen(path.join(d, n))).join('');
const teil = n => n.endsWith('/') ? ordner(n) : lesen(n);

// Grundlage für Zeichnungen und 3D, in dieser Reihenfolge: Grundstück, Umgebung, Sonne, Haus, Ansichten, Lageplan, Grundrisse
const BASIS = ['data.js', 'lod2.js', 'sun.js', 'haus/', 'ansicht/', 'siteplan.js', 'plan/'];

// Zeile im zusammengesetzten Ordner → Teildatei und Zeile darin (für Fehlermeldungen)
function wo(d, zeile) {
  for (const n of teile(d)) {
    const z = lesen(path.join(d, n)).split('\n').length - 1;
    if (zeile <= z) return `src/${d}${n}:${zeile}`;
    zeile -= z;
  }
  return `src/${d}:?`;
}

// vm mit der ganzen Grundlage; der Lageplan reicht seine interne Zeichenfunktion als _build nach außen
function kontext(extra = {}) {
  const ctx = { console, Math, JSON, Number, String, Array, Object, Set, Map, ...extra };
  ctx.window = ctx; ctx.document = { createElement: () => ({}) };
  vm.createContext(ctx);
  for (const n of BASIS) {
    const code = teil(n).replace('return { init, setLayer, STATS', 'return { _build: build, init, setLayer, STATS');
    try { vm.runInContext(code, ctx, { filename: n }); } catch (e) {
      const m = n.endsWith('/') && String(e.stack).match(new RegExp(`${n.replace('/', '\\/')}:(\\d+)`));
      if (m) e.message += ` (${wo(n, +m[1])})`;
      throw e;
    }
  }
  return ctx;
}
const rechne = (ctx, ausdruck) => vm.runInContext(ausdruck, ctx);

module.exports = { ROOT, SRC, lesen, teile, ordner, teil, BASIS, wo, kontext, rechne };
