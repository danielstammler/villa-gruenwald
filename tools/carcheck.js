// Prüft ein Automodell ohne Browser: baut es mit three.js in Node und meldet Maße, Dreiecke je Material und fehlerhafte Werte.
// Aufruf in WSL im Repo: node tools/carcheck.js ferrari   (three.js 0.170 liegt in ~/carcheck/node_modules)
// Abbruch mit Fehlercode bei Ausnahme, NaN, fehlendem spec oder Maßen, die mehr als 3 % vom Soll abweichen.
const fs = require('fs'), path = require('path'), vm = require('vm'), os = require('os'), { pathToFileURL } = require('url');
const name = process.argv[2];
if (!name) { console.error('Aufruf: node tools/carcheck.js <modell>'); process.exit(2); }
(async () => {
  const base = path.join(os.homedir(), 'carcheck/node_modules/three');
  const THREE = await import(pathToFileURL(path.join(base, 'build/three.module.js')).href);
  const utils = await import(pathToFileURL(path.join(base, 'examples/jsm/utils/BufferGeometryUtils.js')).href);
  const ctx = { console, Math, JSON, Number, String, Array, Object, Set, Map, Float32Array, Uint32Array, Error };
  ctx.globalThis = ctx; vm.createContext(ctx);
  const src = path.join(__dirname, '..', 'src');
  // zweites Argument: anderer Pfad zur Modelldatei (z. B. tools/car-demo.js)
  const file = process.argv[3] ? path.resolve(process.argv[3]) : path.join(src, `car-${name}.js`);
  vm.runInContext(fs.readFileSync(path.join(src, 'cars.js'), 'utf8'), ctx, { filename: 'cars.js' });
  vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: path.basename(file) });
  const M = ctx.CarKit.materials(THREE), names = new Map(Object.entries(M).map(([k, v]) => [v, k]));
  const parts = ctx.CarKit.build(name, THREE, utils, M);
  const box = new THREE.Box3(), bad = [];
  let tris = 0;
  const rows = [];
  for (const [mat, geos] of parts) {
    let t = 0;
    for (const g of geos) {
      const p = g.attributes.position.array;
      for (let i = 0; i < p.length; i++) if (!Number.isFinite(p[i])) { bad.push(names.get(mat)); break; }
      g.computeBoundingBox(); box.union(g.boundingBox); t += g.attributes.position.count / 3;
    }
    tris += t; rows.push(`${(names.get(mat) || '?').padEnd(14)} ${String(Math.round(t)).padStart(7)} Dreiecke in ${geos.length} Teilen`);
  }
  const sz = box.getSize(new THREE.Vector3()), spec = ctx.CAR_MODELS[name].spec;
  console.log(rows.join('\n'));
  console.log(`gesamt ${Math.round(tris)} Dreiecke · L ${sz.x.toFixed(3)} · B ${sz.z.toFixed(3)} · H ${sz.y.toFixed(3)} m · x ${box.min.x.toFixed(3)}…${box.max.x.toFixed(3)} · y ${box.min.y.toFixed(3)}…${box.max.y.toFixed(3)} · z ${box.min.z.toFixed(3)}…${box.max.z.toFixed(3)}`);
  let err = 0;
  if (bad.length) { console.log('FEHLER: NaN in ' + [...new Set(bad)].join(', ')); err++; }
  if (!spec) { console.log('FEHLER: CAR_MODELS.' + name + '.spec = { L, W, H, wheelbase } fehlt'); err++; }
  else {
    // Breite ohne Spiegel: Spiegel dürfen bis 0,25 m je Seite überstehen
    for (const [k, v, tol] of [['L', sz.x, 0.03], ['H', sz.y, 0.03], ['W', sz.z, 0.25]]) {
      const d = (v - spec[k]) / spec[k];
      const okW = k === 'W' ? v >= spec.W * 0.97 && v <= spec.W + 0.5 : Math.abs(d) <= tol;
      console.log(`${okW ? 'ok    ' : 'FEHLER'} ${k} ${v.toFixed(3)} m (Soll ${spec[k]})`);
      if (!okW) err++;
    }
  }
  if (Math.abs(box.min.y) > 0.012) { console.log(`FEHLER: tiefster Punkt bei y ${box.min.y.toFixed(3)} statt 0 (Reifen auf dem Boden)`); err++; }
  if (box.min.x < -0.02) { console.log(`FEHLER: Teile vor der Frontspitze (x ${box.min.x.toFixed(3)})`); err++; }
  if (tris > 160000) { console.log(`FEHLER: ${Math.round(tris)} Dreiecke, mehr als 160 000`); err++; }
  process.exit(err ? 1 : 0);
})().catch(e => { console.error('FEHLER:', e && e.stack || e); process.exit(1); });
