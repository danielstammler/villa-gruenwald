// Rundgänge ohne Browser prüfen: rechnet TOURS wie die Seite aus dem Grundriss (src/view3d/75-wege.js und 78-rundgaenge.js) und tastet sie
// ab wie tourPath (alle 5 cm, Bögen an den Ecken). Je Rundgang eine Zeile: Stationen, Halte, Länge, Türen und Treppen, engste Stelle im Haus.
// Rückgabe 1 bei jeder Warnung: Raum oder Außentür fehlt, kein Weg (gerade Linie), Halt verschoben (Möbel, Wand oder Loch zu nah), Weg über
// Wand, Loch oder Möbel oder näher als 0,20 m an etwas im Haus (so nah meldet auch die 3D-Wegeprüfung).
// Aufruf: node tools/wege.js [-v]                 (-v: alle Punkte je Rundgang)
//         node tools/wege.js bild [UG EG OG DG]   Grundrisse mit den Wegen als PNG nach tools/shots/ (Chrome ohne Fenster), gibt den Pfad aus
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm'), { execFileSync } = require('child_process');
const { ROOT, kontext, rechne, lesen } = require('./lib/laden');
const t0 = Date.now(), args = process.argv.slice(2), BILD = args[0] === 'bild', ALLE = args.includes('-v');
const zahl = (v, d = 2) => (+v).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }).replace('-', '−');
const ort = p => `${zahl(p[0])}/${zahl(p[1])}`;

// Grundlage wie für Regeln und Raumbuch, dazu Router und Rundgänge aus dem 3D (beide ohne three.js); die Konsole des Routers schweigt,
// seine Warnungen hängen am Ergebnis jedes Rundgangs
const ctx = kontext({ console: { ...console, warn() {} } }), H = rechne(ctx, 'HOUSE');
const W = vm.runInContext(`(() => { const Zh = HOUSE.Z;\n${lesen('view3d/75-wege.js')}\n${lesen('view3d/78-rundgaenge.js')}\nreturn { TOURS, ZF, GESCHOSSE, netz, TF, TY }; })()`,
  ctx, { filename: 'src/view3d/75-wege.js + 78-rundgaenge.js' });
const imHaus = s => s[0] > 0 && s[0] < H.W && s[1] > -H.D && s[1] < 0;
// Laufenden der Treppen: dort geht der Weg vom Boden auf die Stufen über (dort keine Prüfung gegen den Lauf selbst)
const ENDEN = Object.values(W.TF).flatMap(F => [[F.x0, W.TY], [F.x1, W.TY]]);

// Weg abtasten wie tourPath in src/view3d/80-steuerung.js: alle 5 cm, Ecken außer an Haltepunkten mit Bögen bis 0,7 m (bzw. r des Punkts)
function abtasten(pts) {
  const P = pts.map(([x, y, z, o = {}]) => ({ p: [x, y, z], o })), S = [[...P[0].p]], d = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const add = (a, b, c) => {
    const n = Math.max(1, Math.ceil((c ? d(a, c) + d(c, b) : d(a, b)) / 0.05));
    for (let j = 1; j <= n; j++) { const t = j / n, u = 1 - t; S.push(c ? a.map((v, k) => u * u * v + 2 * t * u * c[k] + t * t * b[k]) : a.map((v, k) => v + (b[k] - v) * t)); }
  };
  let cur = P[0].p;
  for (let i = 1; i < P.length; i++) {
    const A = P[i - 1].p, B = P[i].p, C = P[i + 1] && P[i + 1].p, l1 = d(A, B), l2 = C ? d(B, C) : 0;
    const r = C && !P[i].o.wait ? Math.min(P[i].o.r ?? 0.7, l1 / 2, l2 / 2) : 0;
    const E = r > 0.02 ? B.map((v, k) => v - (v - A[k]) / l1 * r) : B;
    add(cur, E);
    if (r > 0.02) { const F = B.map((v, k) => v + (C[k] - v) / l2 * r); add(E, F, B); cur = F; } else cur = B;
  }
  return S;
}

// Im Haus jede Stelle auf einem Geschossboden prüfen: auf freiem Feld des Wegenetzes (Raum, Durchgang, Türöffnung) und mit Abstand;
// zusammenhängende Fundstellen als eine Warnung. Nicht geprüft: draußen, auf den Stufen und quer durch die Fassadentüren (Gartentür,
// Balkontür sind nicht im Netz, ihre Wand stünde dort im Weg) bis zu ihrem Anlaufpunkt 0,6 m hinter der Wandmitte.
function pruefe(pts) {
  const S = abtasten(pts), warn = [...pts.warnungen], eng = { a: Infinity };
  let lang = 0, innen = 0, lauf = null;
  const melde = (art, s, fl) => { if (lauf && lauf.art === art && lauf.fl === fl) { lauf.n++; return; } schliesse(); lauf = { art, s, fl, n: 1 }; };
  const schliesse = () => { if (lauf) warn.push(`${lauf.fl} bei ${ort(lauf.s)}: Weg ${lauf.art}${lauf.n > 1 ? ` (${zahl(lauf.n * 0.05)} m lang)` : ''}`); lauf = null; };
  S.forEach((s, i) => {
    if (i) { const l = Math.hypot(s[0] - S[i - 1][0], s[1] - S[i - 1][1], s[2] - S[i - 1][2]); lang += l; if (imHaus(s)) innen += l; }
    const fl = W.GESCHOSSE.find(f => Math.abs(s[2] - W.ZF[f]) < 0.01);
    if (!fl || !imHaus(s) || ENDEN.some(e => Math.hypot(s[0] - e[0], s[1] - e[1]) < 0.35)) return schliesse();
    const N = W.netz(fl), k = N.zelle(s);
    if (N.tueren.some(d => !d.rect && Math.abs((s[0] - d.c[0]) * d.n[0] + (s[1] - d.c[1]) * d.n[1]) < 0.62 && Math.abs((s[0] - d.c[0]) * d.n[1] - (s[1] - d.c[1]) * d.n[0]) < d.w / 2)) return schliesse();
    if (k < 0 || !(N.fr[k] || N.tu[k] >= 0)) return melde('über Wand, Loch oder Möbel', s, fl);
    const a = N.abst(s[0], s[1]), rn = ri => (ri >= 0 ? N.rooms[ri].n : 'außen'), d = N.tueren[N.tu[k]];
    if (a < eng.a) Object.assign(eng, { a, s, fl, raum: N.ra[k] >= 0 ? rn(N.ra[k]) : d ? `Tür ${rn(d.ra)}/${rn(d.rb)}` : 'Durchgang' });
    if (a < 0.2) melde(`nur ${zahl(a)} m neben Wand oder Möbel`, s, fl); else schliesse();
  });
  schliesse();
  return { S, warn, eng, lang, innen };
}

const touren = Object.keys(W.TOURS).map(name => {
  try { const pts = W.TOURS[name]; return { name, pts, ...pruefe(pts) }; }
  catch (e) { return { name, pts: [], S: [], warn: [`lässt sich nicht rechnen: ${e.message}`], eng: { a: Infinity }, lang: 0, innen: 0 }; }
});
const warnungen = touren.reduce((t, T) => t + T.warn.length, 0);

if (!BILD) {
  // je Rundgang eine Zeile; Türen je Geschoss zusammengefasst („EG außen→Halle, Halle→Wohnen; DG …“)
  const breit = Math.max(...touren.map(T => T.name.length));
  for (const T of touren) {
    const tueren = (T.pts.tueren || []).reduce((a, t) => { const [fl, w] = [t.slice(0, 2), t.slice(3)], v = a[a.length - 1]; if (v && v.fl === fl) v.w.push(w); else a.push({ fl, w: [w] }); return a; }, []);
    const teile = [`${T.pts.filter(p => p[3] && p[3].label).length} Stationen`, `${T.pts.filter(p => p[3] && p[3].wait).length} Halte`,
      `${zahl(T.lang, 0)} m${T.innen > 0.5 ? `, ${zahl(T.innen, 0)} m im Haus` : ''}`,
      (T.pts.treppen || []).length ? `Treppen ${T.pts.treppen.join(', ')}` : '', tueren.length ? `Türen ${tueren.map(g => `${g.fl} ${g.w.join(', ')}`).join('; ')}` : '',
      T.eng.a < Infinity ? `engste Stelle ${zahl(T.eng.a)} m (${T.eng.fl} ${T.eng.raum})` : 'nur draußen', T.warn.length ? `${T.warn.length} Warnung${T.warn.length > 1 ? 'en' : ''}` : 'ok'];
    console.log(`${T.name.padEnd(breit)}  ${teile.filter(Boolean).join(' · ')}`);
    for (const w of T.warn) console.log(`${' '.repeat(breit)}  ! ${w}`);
    if (ALLE) T.pts.forEach((p, i) => console.log(`${' '.repeat(breit)}  ${String(i).padStart(3)} ${zahl(p[0])} ${zahl(p[1])} ${zahl(p[2], 3)}${p[3] && Object.keys(p[3]).length ? ' ' + JSON.stringify(p[3]) : ''}`));
  }
  console.log(`${touren.length} Rundgänge · ${warnungen ? `${warnungen} Warnung${warnungen > 1 ? 'en' : ''}` : 'keine Warnung'} · ${zahl((Date.now() - t0) / 1000, 1)} s`);
  process.exit(warnungen ? 1 : 0);
}

// ---------- Bild: je Geschoss der Grundriss mit Möbeln und den Wegen darauf (Strecken auf diesem Boden, also auch Terrasse und Balkon) ----------
const FARBE = ['#d62728', '#1f77b4', '#2ca02c', '#9467bd', '#ff7f0e', '#8c564b'];
const wahl = args.slice(1).map(s => s.toUpperCase()).filter(s => W.GESCHOSSE.includes(s)), fls = wahl.length ? wahl : W.GESCHOSSE;
const pw = fls.length > 1 ? 700 : 1000, ph = Math.round(pw * 14.5 / 18.4), spalten = Math.min(2, fls.length), zeilen = Math.ceil(fls.length / spalten);
const nah = (z, fl) => Math.abs(z - W.ZF[fl]) < 0.7;
let html = `<!doctype html><meta charset="utf-8"><style>${lesen('style.css')}
  body{margin:0;background:#fff;font:14px sans-serif} .kopf{padding:6px 10px;height:22px} .kopf span{margin-right:16px;font-weight:600}
  .gitter{display:grid;grid-template-columns:repeat(${spalten},${pw}px);gap:8px;padding:0 8px 8px} .gitter b{display:block;height:20px} svg{width:${pw}px;height:${ph}px;background:#fff}</style>
  <div class="kopf">${touren.map((T, i) => `<span style="color:${FARBE[i % FARBE.length]}">${T.name}${T.warn.length ? ` (${T.warn.length} !)` : ''}</span>`).join('')}</div><div class="gitter">`;
for (const fl of fls) {
  let s = '';
  touren.forEach((T, ti) => {
    const f = FARBE[ti % FARBE.length], seg = [[]];
    for (const p of T.S) { if (nah(p[2], fl)) seg[seg.length - 1].push(p); else if (seg[seg.length - 1].length) seg.push([]); }
    for (const q of seg) if (q.length > 1) s += `<polyline points="${q.map(p => `${p[0].toFixed(2)},${(-p[1]).toFixed(2)}`).join(' ')}" fill="none" stroke="${f}" stroke-width="0.06" stroke-linejoin="round" opacity="0.85"/>`;
    for (const [x, y, z, o = {}] of T.pts) {
      if (!nah(z, fl) || (!o.label && !o.wait)) continue;
      s += `<circle cx="${x}" cy="${-y}" r="${o.wait ? 0.13 : 0.07}" fill="${f}"/>`;
      if (o.wait && o.look) { const v = [o.look[0] - x, o.look[1] - y], l = Math.hypot(...v) || 1, m = Math.min(1.6, l); s += `<line x1="${x}" y1="${-y}" x2="${x + v[0] / l * m}" y2="${-y - v[1] / l * m}" stroke="${f}" stroke-width="0.035" stroke-dasharray="0.1 0.07"/>`; }
      if (o.label) s += `<text x="${x + 0.15}" y="${-y - 0.12}" font-size="0.32" fill="${f}" stroke="#fff" stroke-width="0.06" paint-order="stroke">${o.label}</text>`;
    }
    // Fundstellen der Warnungen mit Ort im Grundriss rot umkreist
    for (const w of T.warn) { const m = w.match(/^(\w\w) bei (−?[\d,]+)\/(−?[\d,]+)/); if (m && m[1] === fl) { const [x, y] = [m[2], m[3]].map(v => +v.replace('−', '-').replace(',', '.')); s += `<circle cx="${x}" cy="${-y}" r="0.3" fill="none" stroke="#e00" stroke-width="0.08"/>`; } }
  });
  html += `<div><b>${fl}</b><svg viewBox="-1.2 -1.6 18.4 14.5" class="plan">${rechne(ctx, `Plans.render(${JSON.stringify(fl)}, { moebel: true, flaechen: false }).svg`)}${s}</svg></div>`;
}
html += '</div>';
const name = `wege${wahl.length ? '-' + wahl.join('-') : ''}`, dir = path.join(ROOT, 'tools', 'shots'), png = path.join(dir, `${name}.png`), seite = path.join(dir, `${name}.html`);
fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(seite, html); fs.rmSync(png, { force: true });
// Chrome ohne Fenster wie tools/houseshot.sh, eigenes Profil je Aufruf (mehrfach gleichzeitig möglich)
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'wege-'));
try {
  execFileSync('google-chrome', ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', `--user-data-dir=${prof}`, '--no-first-run', '--disable-gcm', '--hide-scrollbars',
    '--force-device-scale-factor=1', `--window-size=${spalten * pw + (spalten + 1) * 8},${34 + zeilen * (ph + 28) + 8}`, `--screenshot=${png}`, `file://${seite}`], { stdio: 'ignore', timeout: 90000 });
} catch (e) { if (!fs.existsSync(png)) { console.log(`FEHLER: kein Bild entstanden (${e.message.split('\n')[0]})`); process.exit(1); } }
finally { fs.rmSync(prof, { recursive: true, force: true }); }
console.log(path.resolve(png).replace(/^\/mnt\/([a-z])\//, (_, l) => `${l.toUpperCase()}:/`));
