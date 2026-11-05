'use strict';
// Treiber für das 3D-Modell und die Zeichnungen ohne Fenster (in WSL): eigener Server für den Checkout auf einem freien Port, Chrome headless
// mit Software-WebGL (SwiftShader) über das DevTools-Protokoll (WebSocket, ohne npm-Pakete). Die Seite wird einmal geladen und arbeitet dann
// alle Aufträge nacheinander ab; ihre Bildschleife steht still, Bilder entstehen nur über _frame + snapshot, Math.random ist fest gesät:
// gleiche Szene, gleiches Bild. Chrome-Profil je Checkout und Platz unter ~/.cache/villa-gruenwald (three.js kommt dann aus dem Cache).
// Aufrufe über ./vg (Ausgabe je Bereich eine Zeile, Einzelheiten nur bei Problemen):
//   ./vg pruefen                    ruft "3d" und "zeichnungen" auf (siehe tools/pruefen.sh)
//   ./vg bild <ansicht…>            Ansichten aus tools/ansichten.json → tools/shots/bild-<name>.png, mit Vergleich, wenn es eine Referenz gibt
//   ./vg bild <name> "pos=x,y,z&tgt=x,y,z[&level=EG]"   freie Kamera; "cam=ost" wie die Kamera-Buttons, "level=OG" Geschossblick
//   ./vg rundgang [name…]           Rundgänge wie beim Gehen prüfen (Türen öffnen sich), bekannte Kontakte stehen in tools/erwartet.json
//   ./vg plan [UG|EG|OG|DG…]        Grundrisse als PNG nach tools/shots/plan-<fl>.png, bei Abweichung von der Referenz vorher | nachher
//   ./vg abnehmen                   aktuelle Bilder, Zeichnungen und Prüfsumme werden die neue Referenz (nur nach gewollten Änderungen)
//   ./vg houseshot …                die alten Aufrufe von tools/houseshot.sh (Bild, probe, fingerprint)
// Direkt: node tools/browser.js <3d|zeichnungen|bild|rundgang|plan|abnehmen|houseshot> … (VG_ZEIT=1 zeigt die Zeiten je Schritt).
const fs = require('fs'), path = require('path'), http = require('http'), os = require('os'), crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const ROOT = path.join(__dirname, '..'), SHOTS = path.join(ROOT, 'tools', 'shots');
const AKT = path.join(SHOTS, 'aktuell'), REF = path.join(SHOTS, 'referenz'), VGL = path.join(SHOTS, 'vergleich');
const T0 = Date.now(), zeit = (...a) => { if (process.env.VG_ZEIT) console.error(`[${((Date.now() - T0) / 1000).toFixed(1)} s]`, ...a); };
const zahl = (v, d = 1) => v.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const lies = (f, fallback) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return fallback; } };
const schreib = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };

// ---------- Aufräumen: Chrome und Server sterben immer mit, auch bei Fehlern, Abbruch und Zeitüberschreitung ----------
const kinder = new Set(), locks = new Set();
function aufraeumen() {
  for (const p of kinder) { try { process.kill(-p.pid, 'SIGKILL'); } catch (e) { /* schon weg */ } }
  kinder.clear();
  for (const l of locks) { try { fs.unlinkSync(l); } catch (e) { /* schon weg */ } }
  locks.clear();
}
process.on('exit', aufraeumen);
for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(s, () => { aufraeumen(); process.exit(130); });
process.on('uncaughtException', e => { console.error(`FEHLER ${e.message}`); aufraeumen(); process.exit(1); });
process.on('unhandledRejection', e => { console.error(`FEHLER ${e && e.message || e}`); aufraeumen(); process.exit(1); });
function frist(sek) { setTimeout(() => { console.error(`FEHLER Zeitüberschreitung nach ${sek} s`); aufraeumen(); process.exit(1); }, sek * 1000).unref(); }

// ---------- Server für den Checkout (freier Port, nichts zwischenspeichern: die Seite wird zwischen den Läufen neu gebaut) ----------
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2' };
function server() {
  return new Promise((ok, fail) => {
    const s = http.createServer((req, res) => {
      let f;
      try { f = path.join(ROOT, path.normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[/\\]+/, '')); } catch (e) { res.writeHead(400).end(); return; }
      if (!f.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
      fs.readFile(f, (e, data) => {
        if (e) { res.writeHead(404).end(); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    s.on('error', fail);
    s.listen(0, '127.0.0.1', () => { s.unref(); ok({ port: s.address().port, close: () => s.close() }); });
  });
}

// ---------- Chrome ----------
// Schalter wie bisher in houseshot.sh (SwiftShader), dazu: Math.random fest gesät (die Entrauschung der Umgebungsverdeckung, GTAO, baut ihr
// Rauschmuster daraus, sonst weicht jedes Laden in rund der Hälfte der Pixel ab; die Optik bleibt dieselbe), Fernsteuerung auf freiem Port,
// keine Hintergrunddienste, keine Drosselung von Hintergrund-Tabs
const CHROME = ['--headless=new', '--js-flags=--random-seed=4711', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', '--disable-gcm',
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--window-size=1400,900', '--mute-audio',
  '--disable-background-networking', '--disable-component-update', '--disable-sync', '--disable-extensions', '--disable-default-apps',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
  '--disable-features=Translate,MediaRouter,OptimizationHints,CalculateNativeWinOcclusion', '--remote-debugging-port=0', '--remote-allow-origins=*'];
const lebt = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
// Ein Profil je Checkout und Platz; belegte Plätze (Sperrdatei mit lebender PID) werden übersprungen, damit parallele Läufe sich nicht sperren
function profil() {
  const basis = path.join(os.homedir(), '.cache', 'villa-gruenwald', 'chrome-' + crypto.createHash('sha1').update(fs.realpathSync(ROOT)).digest('hex').slice(0, 8));
  for (let i = 0; i < 16; i++) {
    const dir = `${basis}-${i}`, lock = `${dir}.lock`;
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    try { fs.writeFileSync(lock, String(process.pid), { flag: 'wx' }); }
    catch (e) {
      const pid = +fs.readFileSync(lock, 'utf8') || 0;
      if (pid && pid !== process.pid && lebt(pid)) continue;
      if (pid === process.pid && locks.has(lock)) continue;
      fs.writeFileSync(lock, String(process.pid));
    }
    locks.add(lock);
    return { dir, frei: () => { try { fs.unlinkSync(lock); } catch (e) { /* schon weg */ } locks.delete(lock); } };
  }
  throw new Error('kein freies Chrome-Profil (16 belegt)');
}
async function chrome() {
  const pr = profil(), log = [];
  // Absturzreste im Profil stören nicht, aber eine alte Portdatei könnte verwirren
  try { fs.unlinkSync(path.join(pr.dir, 'DevToolsActivePort')); } catch (e) { /* keine */ }
  const proc = spawn('google-chrome', [...CHROME, `--user-data-dir=${pr.dir}`, 'about:blank'], { detached: true, stdio: ['ignore', 'ignore', 'pipe'] });
  kinder.add(proc);
  const url = await new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error(`Chrome startet nicht: ${log.slice(-5).join(' | ')}`)), 30000);
    let rest = '';
    proc.stderr.on('data', b => {
      rest += b; const zeilen = rest.split('\n'); rest = zeilen.pop();
      for (const z of zeilen) { log.push(z); if (log.length > 60) log.shift(); const m = z.match(/DevTools listening on (ws:\/\/\S+)/); if (m) { clearTimeout(t); ok(m[1]); } }
    });
    proc.on('exit', c => { clearTimeout(t); fail(new Error(`Chrome beendet (${c}): ${log.slice(-5).join(' | ')}`)); });
  });
  const cdp = await verbinde(url);
  const zu = async () => {
    // erst sauber schließen (Cache und Profil bleiben heil), dann notfalls hart
    if (proc.exitCode === null) {
      const weg = new Promise(r => proc.once('exit', r));
      try { await Promise.race([cdp.send('Browser.close', {}, null, 3000), weg]); } catch (e) { /* hart */ }
      await Promise.race([weg, new Promise(r => setTimeout(r, 3000))]);
    }
    try { process.kill(-proc.pid, 'SIGKILL'); } catch (e) { /* schon weg */ }
    kinder.delete(proc); pr.frei();
  };
  return { cdp, zu, log };
}

// ---------- DevTools-Protokoll über WebSocket (Node 22+ hat WebSocket eingebaut) ----------
function verbinde(url) {
  return new Promise((ok, fail) => {
    const ws = new WebSocket(url), wait = new Map(), hoerer = new Set();
    let id = 0;
    const cdp = {
      send(method, params = {}, sessionId = null, ms = 180000) {
        const n = ++id;
        return new Promise((ja, nein) => {
          const t = setTimeout(() => { wait.delete(n); nein(new Error(`Zeitüberschreitung bei ${method} nach ${ms / 1000} s`)); }, ms);
          wait.set(n, { method, ja: r => { clearTimeout(t); ja(r); }, nein: e => { clearTimeout(t); nein(e); } });
          ws.send(JSON.stringify({ id: n, method, params, ...(sessionId ? { sessionId } : {}) }));
        });
      },
      // wartet auf ein Ereignis (method, sessionId), das pruef(params) erfüllt
      warte(method, sessionId, ms = 60000, pruef = () => true) {
        return new Promise((ja, nein) => {
          const h = m => { if (m.method === method && m.sessionId === sessionId && pruef(m.params)) { hoerer.delete(h); clearTimeout(t); ja(m.params); } };
          const t = setTimeout(() => { hoerer.delete(h); nein(new Error(`Zeitüberschreitung: ${method}`)); }, ms);
          hoerer.add(h);
        });
      },
      hoere(h) { hoerer.add(h); },
    };
    ws.onopen = () => ok(cdp);
    ws.onerror = e => fail(new Error(`DevTools-Verbindung: ${e.message || 'Fehler'}`));
    ws.onclose = () => { for (const w of wait.values()) w.nein(new Error('Verbindung zu Chrome getrennt')); wait.clear(); };
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.id && wait.has(m.id)) { const w = wait.get(m.id); wait.delete(m.id); if (m.error) w.nein(new Error(`${w.method}: ${m.error.message}`)); else w.ja(m.result); }
      else if (m.method) for (const h of [...hoerer]) h(m);
    };
  });
}
// Ein Tab mit eigener Sitzung; Ansicht fest 1400 × 900 bei Pixeldichte 1. Fehler der Seite werden gesammelt (für die Meldung, wenn etwas scheitert).
async function tab(cdp, w = 1400, h = 900) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const send = (m, p, ms) => cdp.send(m, p, sessionId, ms), fehler = [];
  cdp.hoere(m => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') fehler.push((m.params.exceptionDetails.exception || {}).description || m.params.exceptionDetails.text);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') fehler.push(m.params.args.map(a => a.value ?? a.description ?? '').join(' '));
  });
  await Promise.all([send('Page.enable'), send('Runtime.enable')]);
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  const t = {
    sessionId, send, fehler,
    async eval(expr, ms) {
      const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, ms);
      if (r.exceptionDetails) throw new Error(String((r.exceptionDetails.exception || {}).description || r.exceptionDetails.text).replace(/^Error: /, ''));
      return r.result.value;
    },
    async oeffne(url, ms = 60000) { const l = cdp.warte('Page.loadEventFired', sessionId, ms); await send('Page.navigate', { url }); await l; },
    async inhalt(html, ms = 30000) {
      const { frameTree } = await send('Page.getFrameTree');
      const l = cdp.warte('Page.loadEventFired', sessionId, ms);
      await send('Page.setDocumentContent', { frameId: frameTree.frame.id, html });
      await Promise.race([l, new Promise(r => setTimeout(r, 300))]);
    },
  };
  return t;
}

// ---------- Modellseite ----------
// Die Bildschleife der Seite läuft gar nicht erst an (requestAnimationFrame ruft nichts auf): sonst zeichnet sie nach dem Laden mehrere volle
// Bilder im Software-Rendering (rund 15 s), bevor der Treiber sie anhalten kann. Math.random ist über --random-seed fest (siehe CHROME).
const ZUFALL = `(() => { const raf = window.requestAnimationFrame; window.requestAnimationFrame = () => raf.call(window, () => {}); })();`;
// Helfer in der Seite: eine Ansicht einstellen und zeichnen. Geschossblick und Kamera der Buttons laufen über ihre eigene Fahrt; eine feste
// Kamera wird zweimal gesetzt, damit die Seite beim zweiten Mal schon weiß, ob man drinnen ist (sonst begrenzt sie den Blick nach oben).
// 45 Schritte à 1/30 s: Fahrten (bis 1,1 s) sind am Ziel, Türen ganz offen oder zu; die Nahebene wird zuletzt frisch gesetzt (die Schleife
// ändert sie sonst erst ab 5 mm) – so hängt das Bild nicht von der Ansicht davor ab.
const HELFER = `window.__vg = {
  bild(v) {
    const V = View3D, lv = v.level || 'alle';
    if (V.state.level !== lv) V.setLevel(lv);
    if (v.cam) V.goTo(v.cam);
    if (v.pos) { V._view(v.pos, v.tgt); V._frame(3); V._view(v.pos, v.tgt); }
    V._frame(45);
    if (V._nahNeu) { V._nahNeu(); V._frame(1); }
    const cam = V._frame(0), sicht = V._sicht ? V._sicht() : null;
    return { cam: cam.map(x => +x.toFixed(2)), sicht, png: V._shot ? V._shot() : V.snapshot() };
  },
  touren() {
    if (View3D._tours) return View3D._tours();
    return [...document.querySelectorAll('[data-tour]')].map(b => b.dataset.tour).filter((t, i, a) => a.indexOf(t) === i);
  },
}`;
async function modell(cdp, port) {
  const t = await tab(cdp);
  await t.send('Page.addScriptToEvaluateOnNewDocument', { source: ZUFALL });
  await t.oeffne(`http://127.0.0.1:${port}/${process.env.VG_SEITE || 'docs/index.html'}#modell`, 120000);
  const ok = await t.eval(`new Promise(ja => { const t0 = Date.now(); (function w() { if (window.View3D && View3D.ready) ja(true);
    else if (Date.now() - t0 > 90000) ja(false); else setTimeout(w, 50); })(); })`, 100000);
  if (!ok) throw new Error(`3D-Modell nicht bereit${t.fehler.length ? ': ' + t.fehler.slice(0, 3).join(' | ') : ' (three.js aus dem Netz geladen?)'}`);
  if (process.env.VG_ZEIT) zeit('Seite', JSON.stringify(await t.eval(`(() => { const n = performance.getEntriesByType('navigation')[0];
    return { jetzt: Math.round(performance.now()), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd),
      res: performance.getEntriesByType('resource').filter(r => /jsdelivr/.test(r.name)).map(r => [r.name.split('/').pop(), Math.round(r.startTime), Math.round(r.duration), r.transferSize]) }; })()`)));
  // eigene Bildschleife der Seite anhalten; ab hier zeichnet nur noch snapshot()
  await t.eval(`View3D.show(false); View3D._frame(1); ${HELFER}; true`);
  return t;
}
const png = s => Buffer.from(s.slice(s.indexOf(',') + 1), 'base64');
// Aufträge in einer Seite: fp (Prüfsumme, gleich nach dem Laden), touren (Namen), probe (Rundgang), bild (Ansicht → PNG-Datei)
async function auftrag(t, a) {
  const t0 = Date.now();
  let r;
  if (a.art === 'fp') r = await t.eval('View3D._fingerprint()');
  else if (a.art === 'touren') r = await t.eval('window.__vg.touren()');
  else if (a.art === 'probe') r = await t.eval(`View3D._probe(${JSON.stringify(a.name)}, ${a.step || 10})`, 600000);
  else if (a.art === 'bild') {
    r = await t.eval(`window.__vg.bild(${JSON.stringify(a.v)})`, 300000);
    schreib(a.datei, png(r.png)); delete r.png;
  } else throw new Error(`unbekannter Auftrag ${a.art}`);
  r = r === undefined ? null : r;
  zeit(`${a.art} ${a.name || ''} ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  return r;
}
// Eine Chrome-Instanz: Modell laden, dann Aufträge aus der eigenen Schlange, danach aus den anderen (wer fertig ist, hilft mit), bis alle
// leer sind; Ergebnis je Auftrag an fertig(a, r). Aufträge dürfen weitere vorn einreihen (a.dann(r) liefert eine Liste), z. B. die Rundgänge,
// sobald ihre Namen bekannt sind. Aufträge mit erst (die Prüfsumme: Türen zu, kein Geschossschnitt) laufen nur als erster Auftrag einer Instanz.
async function instanz(port, schlangen, i, fertig) {
  const c = await chrome();
  try {
    zeit('Chrome bereit');
    const t = await modell(c.cdp, port);
    zeit('Modell geladen');
    let n = 0;
    const naechster = () => {
      for (const k of [i, ...schlangen.keys()]) { const s = schlangen[k], j = s.findIndex(a => !a.erst || !n); if (j >= 0) return [s.splice(j, 1)[0], k]; }
      return [null];
    };
    for (let [a, k] = naechster(); a; [a, k] = naechster()) {
      let r;
      n++;
      try { r = await auftrag(t, a); } catch (e) { r = { fehler: e.message.split('\n')[0] }; }
      zeit(`  (Instanz ${i}, ${n}. Auftrag)`);
      if (a.dann && !(r && r.fehler)) schlangen[k].unshift(...a.dann(r));
      fertig(a, r);
    }
  } finally { await c.zu(); }
}
// Je Schlange eine Instanz, alle gleichzeitig, ein Server für alle. Zwei lohnen sich: die Rundgänge rechnen auf einem Kern, das Software-
// Rendering nutzt alle Kerne – mehr Instanzen fürs Rendern bringen nichts (gemessen: 12 Bilder in 1, 2, 3 Instanzen 46, 48, 50 s).
async function parallel(schlangen, fertig) {
  const s = await server();
  try { await Promise.all(schlangen.map((_, i) => instanz(s.port, schlangen, i, fertig))); } finally { s.close(); }
}

// ---------- Zeichnungen als PNG (eigener Chrome ohne WebGL) ----------
// SVG ohne CSS (wie tools/check.js --svg sie schreibt) mit dem CSS der Seite; die längere Seite wird px Pixel groß
async function svgPng(t, svg, css, px = 1000) {
  const vb = ((svg.match(/viewBox="([^"]+)"/) || [])[1] || '0 0 100 100').split(/[\s,]+/).map(Number);
  const k = px / Math.max(vb[2], vb[3]), w = Math.max(1, Math.round(vb[2] * k)), h = Math.max(1, Math.round(vb[3] * k));
  await t.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await t.inhalt(`<!doctype html><html><head><meta charset="utf-8"><style>${css}</style><style>html, body { margin: 0; padding: 0; background: #fff;
    overflow: hidden } body > svg { display: block; width: ${w}px; height: ${h}px }</style></head><body>${svg}</body></html>`);
  const { data } = await t.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } });
  return Buffer.from(data, 'base64');
}
async function zeichnungsTab(fn) {
  const c = await chrome();
  try { return await fn(await tab(c.cdp)); } finally { await c.zu(); }
}

// ---------- Auswertung: Bildvergleich, Rundgänge, Prüfsumme ----------
const { kontext } = require('./lib/laden');
const anker = require('./lib/anker'), Z = require('./lib/zeichnungen');
const ERWARTET = path.join(ROOT, 'tools', 'erwartet.json'), DOCS = path.join(ROOT, 'docs', 'index.html');
const winPfad = f => { const a = path.resolve(f), m = a.match(/^\/mnt\/([a-z])\/(.*)$/); return m ? `${m[1].toUpperCase()}:/${m[2]}` : a; };
const hash = f => { try { return crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex').slice(0, 12); } catch (e) { return null; } };
const text = f => { try { return fs.readFileSync(f, 'utf8'); } catch (e) { return null; } };
const zeile = (bereich, s) => console.log(`${bereich.padEnd(12)} ${s}`);
const proz = a => `${zahl(a * 100, a < 0.001 ? 2 : 1)} %`;
// Bildpaare an tools/vergleich.py (Python mit PIL/numpy), Ergebnis je Name
function vergleiche(art, paare, uebersicht = null) {
  if (!paare.length && !uebersicht) return {};
  const r = spawnSync('python3', [path.join(ROOT, 'tools', 'vergleich.py')], { input: JSON.stringify({ art, paare, uebersicht }), encoding: 'utf8', maxBuffer: 1 << 26 });
  if (r.status !== 0) throw new Error(`Bildvergleich: ${String(r.stderr || r.error || '').trim().split('\n').pop()}`);
  return JSON.parse(r.stdout);
}
// alte Vergleichsbilder einer Sorte weg (zeichnung-* oder die Ansichten), damit nur Aktuelles herumliegt
function vergleichLeeren(zeichnungen) {
  fs.mkdirSync(VGL, { recursive: true });
  for (const f of fs.readdirSync(VGL)) if (f.startsWith('zeichnung-') === zeichnungen) fs.rmSync(path.join(VGL, f), { force: true });
}

// Treffer eines Rundgangs zu Kontakten bündeln: gleiche Art und gleiches Material, jeder Treffer höchstens 1 m vom vorigen der Gruppe
function kontakte(tour, hits) {
  const g = [];
  for (const h of hits) {
    const [art, x, y] = h, mat = String(h[5]).split(' @')[0];
    const k = g.find(q => q.art === art && q.mat === mat && Math.hypot(q.ende[0] - x, q.ende[1] - y) <= 1);
    if (k) { k.hits.push(h); k.ende = [x, y]; } else g.push({ tour, art, mat, hits: [h], ende: [x, y] });
  }
  return g;
}
// Kontakte gegen tools/erwartet.json: bekannt, wenn alle Treffer im Umkreis tol eines Eintrags liegen (gleicher Rundgang, gleiche Art, eines
// der Materialien „a|b“), sonst unerwartet; Einträge geprüfter Rundgänge ohne passenden Kontakt sind veraltet
function ordne(alle, touren) {
  const liste = lies(ERWARTET, {}).kontakte || [];
  const passt = (e, k) => e.rundgang === k.tour && e.art === k.art && String(e.material).split('|').includes(k.mat) && k.hits.every(h => Math.hypot(h[1] - e.x, h[2] - e.y) <= e.tol);
  const benutzt = new Set(), bekannt = [], neu = [];
  for (const k of alle) { const e = liste.find(q => passt(q, k)); if (e) { benutzt.add(e); bekannt.push(k); } else neu.push(k); }
  return { bekannt, neu, veraltet: liste.filter(e => touren.includes(e.rundgang) && !benutzt.has(e)) };
}
function kontaktText(k) {
  const h = k.hits[0], d = k.hits.map(q => q[4]).filter(v => v !== null), wo = String(h[5]).split(' @')[1];
  return `${k.tour} ${k.art} ${k.mat} bei ${zahl(h[1], 2)} / ${zahl(h[2], 2)} (Augenhöhe ${zahl(h[3], 2)})${k.hits.length > 1 ? ` · ${k.hits.length}×` : ''}` +
    ` · ${d.length ? `${zahl(Math.min(...d), 2)} m` : 'kein Boden'}${wo ? ` · Treffer ${wo.split(',').map(v => zahl(+v, 2)).join(' / ')}` : ''}`;
}
// Zeile „Rundgänge“ und Einzelheiten; erg: Rundgang → Treffer oder { fehler }. true, wenn nichts Unerwartetes
function rundgangZeilen(erg) {
  const touren = Object.keys(erg), kaputt = touren.filter(t => !Array.isArray(erg[t])), gut = touren.filter(t => Array.isArray(erg[t]));
  const { bekannt, neu, veraltet } = ordne(gut.flatMap(t => kontakte(t, erg[t])), gut);
  const schlecht = neu.length + kaputt.length;
  zeile('Rundgänge', `${schlecht ? 'FEHLER ' : 'ok    '}${touren.length} Rundgänge · ${neu.length} unerwartet · ${bekannt.length} bekannt${veraltet.length ? ` · ${veraltet.length} veraltet` : ''}`);
  for (const t of kaputt) console.log(`  ${t}: ${(erg[t] || {}).fehler || 'kein Ergebnis'}`);
  for (const k of neu) console.log(`  ${kontaktText(k)}`);
  for (const e of veraltet) console.log(`  veraltet (tools/erwartet.json): ${e.rundgang} ${e.art} ${e.material} bei ${zahl(e.x, 2)} / ${zahl(e.y, 2)} – ${e.grund}`);
  return !schlecht;
}
// Zeile „Szene“: Prüfsumme gegen die Referenz, geänderte Teile beim Namen (Material bzw. Textur)
function szeneZeile(fp, ref) {
  if (!fp || fp.fehler) { zeile('Szene', `FEHLER ${fp ? fp.fehler : 'keine Prüfsumme'}`); return false; }
  const n = Object.keys(fp.je).length;
  if (!ref) { zeile('Szene', `ok    Prüfsumme ${fp.gesamt} (${n} Teile), Referenz neu`); return true; }
  if (ref.gesamt === fp.gesamt) { zeile('Szene', `ok    unverändert (${fp.gesamt}, ${n} Teile)`); return true; }
  const k = [...new Set([...Object.keys(fp.je), ...Object.keys(ref.je)])].filter(q => fp.je[q] !== ref.je[q]).sort();
  const nm = q => q + (!(q in ref.je) ? ' (neu)' : !(q in fp.je) ? ' (weg)' : '');
  zeile('Szene', `geändert: ${k.slice(0, 12).map(nm).join(', ')}${k.length > 12 ? ` und ${k.length - 12} weitere` : ''} (${k.length} von ${n})`);
  return true;
}

// ---------- Ansichten ----------
// als Aufträge; Geschossblicke zuletzt (der Schnitt übersetzt die Hausmaterialien neu), sonst in der Reihenfolge der Datei
const STUFE = { alle: 0, UG: 1, EG: 2, OG: 3, DG: 4 };
const bildAuftraege = (liste, ordner) => liste.filter(a => a.v).map(a => ({ art: 'bild', name: a.name, v: a.v, datei: path.join(ordner, `${a.name}.png`) }))
  .sort((p, q) => (STUFE[p.v.level || 'alle'] ?? 9) - (STUFE[q.v.level || 'alle'] ?? 9));
// Hinweise zu einem Bild: Kamera steckt in einem Bauteil, Blick gleich verdeckt (Wand, Türflügel, Hecke), Kamera versetzt (die Seite begrenzt
// den Blick nach oben, solange man draußen ist)
function hinweise(a, r) {
  if (!r || r.fehler) return [`FEHLER ${r ? r.fehler : 'kein Ergebnis'}`];
  const h = [], s = r.sicht || {};
  if (s.nah) h.push(s.nah.innen ? `Kamera steckt in ${s.nah.was} (rundum Rückseiten, nächste ${zahl(s.nah.d, 2)} m)` : `Kamera ${zahl(s.nah.d, 2)} m an ${s.nah.was}`);
  if (s.frei !== undefined && s.frei < 0.8) h.push(`Blick nach ${zahl(s.frei, 2)} m verdeckt (${s.was}${s.rueck ? ', Rückseite: Kamera steckt wohl darin' : ''})`);
  if (a.v.pos && Math.hypot(...a.v.pos.map((p, i) => p - r.cam[i])) > 0.05) h.push(`Kamera versetzt auf ${r.cam.map(v => zahl(v, 2)).join(' / ')} (Blick nach oben begrenzt)`);
  return h;
}
// Zeile „Ansichten“: Vergleich mit der Referenz, je geänderter Ansicht eine Zeile (Anteil, Ort), Übersicht aller Bilder; true ohne Fehler
function ansichtenZeilen(liste, erg, erster = false) {
  vergleichLeeren(false);
  const gerendert = liste.filter(a => a.v && erg[a.name] && !erg[a.name].fehler);
  const paare = gerendert.map(a => ({ name: a.name, ref: path.join(REF, 'ansichten', `${a.name}.png`), akt: path.join(AKT, 'ansichten', `${a.name}.png`), aus: path.join(VGL, `${a.name}.png`) }));
  const v = vergleiche('3d', paare, path.join(SHOTS, 'uebersicht.png'));
  const geaendert = paare.filter(p => v[p.name] && v[p.name].anteil !== undefined).sort((p, q) => v[q.name].anteil - v[p.name].anteil);
  const neu = paare.filter(p => v[p.name] && v[p.name].fehlt === 'ref'), ohne = liste.filter(a => a.fehler), kaputt = liste.filter(a => a.v && !gerendert.includes(a));
  const zusatz = [neu.length && `${neu.length} neu`, ohne.length && `${ohne.length} ohne Anker`, kaputt.length && `${kaputt.length} FEHLER`].filter(Boolean).join(' · ');
  if (!geaendert.length) zeile('Ansichten', `${kaputt.length ? 'FEHLER ' : 'ok    '}${paare.length - neu.length} unverändert${zusatz ? ' · ' + zusatz : ''} → tools/shots/uebersicht.png`);
  else zeile('Ansichten', `${geaendert.length} von ${paare.length} geändert${zusatz ? ' · ' + zusatz : ''} → tools/shots/vergleich/ · Übersicht tools/shots/uebersicht.png`);
  for (const p of geaendert) { const e = v[p.name]; console.log(`  ${p.name.padEnd(16)} ${e.groesse ? 'Bildgröße geändert' : `${proz(e.anteil).padStart(7)}  ${e.ort}`}`); }
  for (const a of ohne) console.log(`  ${a.name}: Anker fehlt – ${a.fehler}`);
  for (const a of liste.filter(q => q.v)) for (const h of hinweise(a, erg[a.name])) console.log(`  ${a.name}: ${h}`);
  if (neu.length && !erster) console.log(`  neu ohne Referenz: ${neu.map(p => p.name).join(', ')} (./vg abnehmen)`);
  return !kaputt.length;
}

// ---------- Referenz ----------
// Stand der aktuellen Bilder (Seite, Treiber, Ansichten), damit abnehmen nur Frisches übernimmt
const stand = liste => ({ docs: hash(DOCS), treiber: hash(__filename), ansichten: liste.map(a => [a.name, a.v || a.fehler]) });
const frisch = liste => JSON.stringify(stand(liste)) === JSON.stringify((lies(path.join(AKT, 'stand.json'), {}) || {}).stand);
function kopiereOrdner(von, nach, filter = () => true) {
  fs.rmSync(nach, { recursive: true, force: true }); fs.mkdirSync(nach, { recursive: true });
  let n = 0;
  if (fs.existsSync(von)) for (const f of fs.readdirSync(von)) if (filter(f)) { fs.copyFileSync(path.join(von, f), path.join(nach, f)); n++; }
  return n;
}
// aktuelle Bilder, Zeichnungen und Prüfsumme werden Referenz
function uebernimm() {
  const n = kopiereOrdner(path.join(AKT, 'ansichten'), path.join(REF, 'ansichten'), f => f.endsWith('.png'));
  const z = kopiereOrdner(path.join(AKT, 'svg'), path.join(REF, 'svg'), f => /\.(svg|css)$/.test(f)) - 1;
  const fp = lies(path.join(AKT, 'fingerprint.json'), null);
  if (fp && !fp.fehler) schreib(path.join(REF, 'fingerprint.json'), JSON.stringify(fp));
  schreib(path.join(REF, 'stand.json'), JSON.stringify({ zeit: new Date().toISOString(), docs: hash(DOCS), ansichten: n, zeichnungen: z }));
  for (const sorte of [true, false]) vergleichLeeren(sorte);
  return `${n} Ansichten, ${Math.max(0, z)} Zeichnungen, Prüfsumme ${fp && fp.gesamt}`;
}
// SVGs aller Zeichnungen nach tools/shots/aktuell/svg (wie tools/check.js --svg)
function svgsSchreiben(ctx = kontext()) {
  const d = path.join(AKT, 'svg');
  fs.mkdirSync(d, { recursive: true });
  for (const z of Z.zeichnungen(ctx)) fs.writeFileSync(path.join(d, `${z.datei}.svg`), z.text);
  fs.writeFileSync(path.join(d, 'style.css'), Z.css());
}
// Zeichnungen als PNG (z.png oder tools/shots/aktuell/zeichnungen/<datei>.png); weicht SVG oder CSS von der Referenz ab, auch die Referenz,
// dann Vergleich. liste: [{ datei, titel, akt: SVG, ref: SVG oder null, png? }]; Ergebnis je Datei wie tools/vergleich.py, dazu gleich/neu
async function zeichnungsVergleich(liste, cssA, cssR) {
  const paare = [], erg = {};
  await zeichnungsTab(async t => {
    for (const z of liste) {
      const a = z.png || path.join(AKT, 'zeichnungen', `${z.datei}.png`);
      schreib(a, await svgPng(t, z.akt, cssA));
      if (z.ref === null) { erg[z.datei] = { neu: true }; continue; }
      if (z.ref === z.akt && cssA === cssR) { erg[z.datei] = { gleich: true }; continue; }
      const r = path.join(AKT, 'zeichnungen', `${z.datei}.ref.png`);
      schreib(r, await svgPng(t, z.ref, cssR));
      paare.push({ name: z.datei, ref: r, akt: a, aus: path.join(VGL, `zeichnung-${z.datei}.png`) });
    }
  });
  const v = vergleiche('2d', paare);
  for (const p of paare) erg[p.name] = v[p.name].gleich ? { gleich: true, nurText: true } : v[p.name];
  return erg;
}
const zText = e => (e.neu ? 'ohne Referenz' : e.nurText ? 'nur Text (Bild gleich)' : e.gleich ? 'unverändert' : e.groesse ? 'Größe geändert' : `${proz(e.anteil)} ${e.ort}`);

// ---------- Befehle ----------
const SCHRITT = 10;   // Prüfstrahlen alle 10 × 5 cm Weg
const tourAuftraege = (namen, step) => (namen && namen.length ? namen.map(name => ({ art: 'probe', name, step }))
  : [{ art: 'touren', dann: n => n.map(name => ({ art: 'probe', name, step })) }]);
// freie Kamera aus "pos=x,y,z&tgt=x,y,z[&level=EG]", "cam=ost" oder "level=OG"
function freieAnsicht(par) {
  const q = new URLSearchParams(par), n3 = k => q.get(k) && q.get(k).split(',').map(Number);
  const v = { pos: n3('pos'), tgt: n3('tgt'), cam: q.get('cam'), level: q.get('level') };
  for (const k of Object.keys(v)) if (!v[k]) delete v[k];
  const zahlen = p => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
  if ((v.pos || v.tgt) ? !(zahlen(v.pos) && zahlen(v.tgt)) : !(v.cam || v.level)) throw new Error('Kamera als "pos=x,y,z&tgt=x,y,z[&level=EG]", "cam=ost" oder "level=OG"');
  if (v.level && !(v.level in STUFE)) throw new Error(`level ${v.level} gibt es nicht (alle, UG, EG, OG, DG)`);
  return v;
}

// 3D-Teil von ./vg pruefen: Prüfsumme, alle Rundgänge und alle Ansichten in zwei Instanzen; Zeilen Rundgänge, Szene, Ansichten
async function befehl3d() {
  frist(900);
  const liste = anker.ansichten(kontext());
  fs.rmSync(path.join(AKT, 'ansichten'), { recursive: true, force: true });
  const touren = {}, bilder = {};
  let fp = null;
  // eine Instanz rendert (alle Kerne), die andere geht die Rundgänge ab (ein Kern) und hilft danach beim Rendern; VG_INSTANZEN=1 alles in einer
  const bilder0 = [{ art: 'fp', erst: true }, ...bildAuftraege(liste, path.join(AKT, 'ansichten'))], touren0 = tourAuftraege(null, SCHRITT);
  await parallel(process.env.VG_INSTANZEN === '1' ? [[...bilder0, ...touren0]] : [bilder0, touren0], (a, r) => {
    if (a.art === 'fp') fp = r;
    else if (a.art === 'probe') touren[a.name] = r;
    else if (a.art === 'touren') { if (r && r.fehler) touren['(Namen)'] = r; }
    else bilder[a.name] = r;
  });
  zeit('Browser fertig');
  schreib(path.join(AKT, 'fingerprint.json'), JSON.stringify(fp));
  schreib(path.join(AKT, 'rundgaenge.json'), JSON.stringify(touren));
  schreib(path.join(AKT, 'stand.json'), JSON.stringify({ zeit: new Date().toISOString(), stand: stand(liste) }));
  const erster = !fs.existsSync(path.join(REF, 'stand.json'));
  let ok = rundgangZeilen(touren);
  ok = szeneZeile(fp, lies(path.join(REF, 'fingerprint.json'), null)) && ok;
  ok = ansichtenZeilen(liste, bilder, erster) && ok;
  if (erster) console.log(`  Referenz angelegt: ${uebernimm()}`);
  return ok;
}
// 2D-Teil von ./vg pruefen nach tools/check.js --svg: Zeichnungen gegen die Referenz. Erste Zeile für die Zeile „Zeichnungen“, dann Einzelheiten.
async function befehlZeichnungen() {
  frist(180);
  const akt = path.join(AKT, 'svg'), ref = path.join(REF, 'svg');
  if (!fs.existsSync(path.join(ref, 'style.css'))) { console.log('Referenz neu'); return true; }
  const cssA = text(path.join(akt, 'style.css')), cssR = text(path.join(ref, 'style.css'));
  const liste = Z.LISTE.map(z => ({ ...z, akt: text(path.join(akt, `${z.datei}.svg`)), ref: text(path.join(ref, `${z.datei}.svg`)) }))
    .filter(z => z.akt !== null && (z.akt !== z.ref || cssA !== cssR));
  vergleichLeeren(true);
  if (!liste.length) { console.log('0 geändert'); return true; }
  const erg = await zeichnungsVergleich(liste, cssA, cssR);
  const anders = liste.filter(z => !erg[z.datei].gleich || erg[z.datei].nurText);
  console.log(`${anders.length} geändert: ${anders.map(z => `${z.titel} ${zText(erg[z.datei])}`).join(' · ')}${anders.some(z => erg[z.datei].bild) ? ' → tools/shots/vergleich/' : ''}`);
  return true;
}
// ./vg plan [UG|EG|OG|DG …]: Grundrisse frisch als PNG, bei Abweichung von der Referenz vorher | nachher
async function befehlPlan(args) {
  frist(120);
  const fl = args.map(a => a.toUpperCase()), falsch = fl.filter(a => !STUFE[a]), ctx = kontext();
  if (falsch.length) throw new Error(`Geschoss ${falsch.join(', ')} gibt es nicht (UG, EG, OG, DG)`);
  const liste = Z.zeichnungen(ctx, fl.length ? fl : ['UG', 'EG', 'OG', 'DG']).map(z => ({ ...z, akt: z.text, ref: text(path.join(REF, 'svg', `${z.datei}.svg`)), png: path.join(SHOTS, `plan-${z.fl}.png`) }));
  const cssA = Z.css(), cssR = text(path.join(REF, 'svg', 'style.css')) ?? cssA;
  const erg = await zeichnungsVergleich(liste, cssA, cssR);
  for (const z of liste) {
    const e = erg[z.datei];
    console.log(`${z.titel.padEnd(13)} ${zText(e).padEnd(22)} ${winPfad(e.bild || z.png)}${e.bild ? `  (ganzer Plan: ${winPfad(z.png)})` : ''}`);
  }
  return true;
}
// ./vg bild <ansicht…> | <name> "pos=…&tgt=…": Bilder nach tools/shots/bild-<name>.png, benannte Ansichten mit Vergleich zur Referenz
async function befehlBild(args) {
  frist(300);
  const liste = anker.ansichten(kontext());
  if (!args.length) { for (const a of liste) console.log(`${a.name.padEnd(16)} ${a.fehler ? 'Anker fehlt: ' + a.fehler : a.text}`); return true; }
  const frei = args.length === 2 && args[1].includes('=');
  let auf;
  if (frei) auf = [{ art: 'bild', name: args[0], v: freieAnsicht(args[1]), datei: path.join(SHOTS, `bild-${args[0]}.png`) }];
  else {
    const fehlt = args.filter(n => !liste.some(a => a.name === n));
    if (fehlt.length) throw new Error(`Ansicht ${fehlt.join(', ')} gibt es nicht (${liste.map(a => a.name).join(', ')})`);
    for (const a of liste.filter(q => args.includes(q.name) && q.fehler)) console.log(`${a.name}: Anker fehlt – ${a.fehler}`);
    auf = bildAuftraege(liste.filter(q => args.includes(q.name)), SHOTS).map(a => ({ ...a, datei: path.join(SHOTS, `bild-${a.name}.png`) }));
  }
  const erg = {};
  await parallel([[...auf]], (a, r) => { erg[a.name] = r; });
  const paare = frei ? [] : auf.filter(a => erg[a.name] && !erg[a.name].fehler && fs.existsSync(path.join(REF, 'ansichten', `${a.name}.png`)))
    .map(a => ({ name: a.name, ref: path.join(REF, 'ansichten', `${a.name}.png`), akt: a.datei, aus: path.join(VGL, `${a.name}.png`) }));
  const v = vergleiche('3d', paare);
  let ok = true;
  for (const a of auf) {
    const r = erg[a.name], e = v[a.name];
    if (!r || r.fehler) { ok = false; console.log(`${a.name}: FEHLER ${r ? r.fehler : 'kein Ergebnis'}`); continue; }
    console.log(`${winPfad(a.datei)}${e ? (e.gleich ? ' · wie die Referenz' : ` · geändert ${proz(e.anteil || 1)} ${e.ort || ''} → ${winPfad(e.bild || '')}`) : ''}`);
    for (const h of hinweise(a, r)) console.log(`  ${h}`);
  }
  return ok;
}
// ./vg rundgang [name…] [schritt]: Rundgänge wie beim Gehen prüfen; VG_ROH=1 zeigt alle Treffer
async function befehlRundgang(args) {
  frist(900);
  const step = +(args.find(a => /^\d+$/.test(a)) || SCHRITT), namen = args.filter(a => !/^\d+$/.test(a)), erg = {};
  // mehrere Rundgänge auf zwei Instanzen (je ein Kern)
  await parallel(namen.length === 1 ? [tourAuftraege(namen, step)] : [tourAuftraege(namen, step), []], (a, r) => {
    if (a.art === 'probe') erg[a.name] = r; else if (r && r.fehler) erg['(Namen)'] = r;
  });
  if (!namen.length) schreib(path.join(AKT, 'rundgaenge.json'), JSON.stringify(erg));
  const ok = rundgangZeilen(erg);
  if (process.env.VG_ROH) for (const [t, h] of Object.entries(erg)) for (const x of [].concat(h)) console.log(`  ${t} ${JSON.stringify(x)}`);
  return ok;
}
// ./vg abnehmen: frisch bauen, Zeichnungen schreiben, 3D-Bilder und Prüfsumme neu, falls nicht vom aktuellen Stand; dann alles als Referenz
async function befehlAbnehmen() {
  frist(900);
  const b = spawnSync(process.execPath, [path.join(ROOT, 'tools', 'bauen.js')], { encoding: 'utf8' });
  if (b.status !== 0) throw new Error(`Bauen: ${(b.stdout + b.stderr).trim()}`);
  const ctx = kontext(), liste = anker.ansichten(ctx);
  svgsSchreiben(ctx);
  if (!frisch(liste)) {
    console.log('Bilder sind nicht vom aktuellen Stand, rendere neu …');
    fs.rmSync(path.join(AKT, 'ansichten'), { recursive: true, force: true });
    let fp = null, schlecht = 0;
    await parallel([[{ art: 'fp', erst: true }, ...bildAuftraege(liste, path.join(AKT, 'ansichten'))]], (a, r) => {
      if (a.art === 'fp') fp = r; else if (!r || r.fehler) { schlecht++; console.log(`  ${a.name}: FEHLER ${r ? r.fehler : ''}`); }
    });
    schreib(path.join(AKT, 'fingerprint.json'), JSON.stringify(fp));
    schreib(path.join(AKT, 'stand.json'), JSON.stringify({ zeit: new Date().toISOString(), stand: stand(liste) }));
    if (schlecht) throw new Error(`${schlecht} Ansichten ohne Bild, Referenz nicht übernommen`);
  }
  for (const a of liste.filter(q => q.fehler)) console.log(`  ${a.name}: Anker fehlt – ${a.fehler}`);
  console.log(`Referenz übernommen: ${uebernimm()}`);
  return true;
}
// alte Aufrufe von tools/houseshot.sh: <name> "pos=…&tgt=…" → tools/shots/house-<name>.png, probe <rundgang> [schritt] → PROBE […],
// fingerprint → FP {…}
async function befehlHouseshot(args) {
  frist(300);
  const [name, par = '', step] = args;
  if (!name) throw new Error('Aufruf: ./vg houseshot <name> "pos=x,y,z&tgt=x,y,z" | probe <rundgang> [schritt] | fingerprint');
  if (name === 'fingerprint' || name === 'probe') {
    if (name === 'probe' && !par) throw new Error('Rundgang fehlt');
    let r = null;
    await parallel([[name === 'probe' ? { art: 'probe', name: par, step: +step || SCHRITT } : { art: 'fp', erst: true }]], (a, x) => { r = x; });
    if (!r || r.fehler) { console.log(`FEHLER ${r ? r.fehler : 'keine Antwort von der Seite'}`); return false; }
    console.log(`${name === 'probe' ? 'PROBE' : 'FP'} ${JSON.stringify(r)}`);
    return true;
  }
  const a = { art: 'bild', name, v: freieAnsicht(par), datei: path.join(SHOTS, `house-${name}.png`) };
  let r = null;
  await parallel([[a]], (x, y) => { r = y; });
  if (!r || r.fehler) { console.log(`FEHLER ${r ? r.fehler : 'kein Bild entstanden'}`); return false; }
  console.log(winPfad(a.datei));
  for (const h of hinweise(a, r)) console.log(`  ${h}`);
  return true;
}

const BEFEHLE = { '3d': befehl3d, zeichnungen: befehlZeichnungen, plan: befehlPlan, bild: befehlBild, rundgang: befehlRundgang, abnehmen: befehlAbnehmen, houseshot: befehlHouseshot };
// Bausteine für eigene Prüfskripte (z. B. Messungen): require('./browser.js')
module.exports = { server, chrome, tab, modell, auftrag, parallel, svgPng, zeichnungsTab, vergleiche, frist, png, SHOTS, AKT, REF };
if (require.main === module) {
  const [cmd, ...args] = process.argv.slice(2);
  if (!BEFEHLE[cmd]) { console.log(`Aufruf: node tools/browser.js <${Object.keys(BEFEHLE).join('|')}> … (siehe Kopf der Datei)`); process.exit(2); }
  BEFEHLE[cmd](args).then(ok => { zeit('fertig'); aufraeumen(); process.exit(ok ? 0 : 1); },
    e => { console.log(`FEHLER ${e.message}`); aufraeumen(); process.exit(1); });
}

