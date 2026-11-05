// Hilfsrechnungen für die Werte im Seitentext ({{ … }} in src/seite/*.html). Läuft nur beim Bauen (tools/bauen.js), in derselben vm wie
// SITE, HOUSE, Plans, Elev, Site … und die Formate z, m, cm, m2, proz, grad. Alles Abgeleitete ist eine Funktion: ein Fehler (Raum
// umbenannt, Bauteil entfernt) erscheint dann beim Bauen mit dem Ausdruck, der ihn braucht, und bricht ab, statt still eine falsche Zahl
// in den Text zu schreiben. Prosa, die Räume beim Namen nennt, bekommt daneben die unsichtbare Prüfung {{ W.da('UG', 'Gym', …) }}.
// Der Bau ersetzt je Datei und setzt dafür DATEI (z. B. '30-grundrisse.html'), so nennen die Meldungen die Datei.

// Anzahl als Wort wie im Text („drei Stellplätze“), ab 13 in Ziffern. 0, 1 und Brüche brechen ab: dann muss der Satz anders lauten.
const wort = n => {
  if (!Number.isInteger(n) || n < 2) throw new Error(`Anzahl ${n}: den Satz in ${W.wo()} umformulieren (kein/ein, Einzahl)`);
  return n > 12 ? String(n) : ['zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf'][n - 2];
};
const Wort = n => wort(n).replace(/^./, c => c.toUpperCase());   // am Satzanfang
// Höhe mit echtem Minuszeichen wie im Text: −3,40 m
const mv = (v, d = 2) => (v < 0 ? '−' : '') + m(Math.abs(v), d);
// Ost–West × Nord–Süd eines Polygons [[x, y] …] oder Rechtecks { x0, x1, y0, y1 }: „4,00 × 12,00 m“
const masse = (P, d = 2) => {
  const [a, b] = Array.isArray(P) ? [0, 1].map(k => Math.max(...P.map(p => p[k])) - Math.min(...P.map(p => p[k]))) : [P.x1 - P.x0, P.y1 - P.y0];
  return `${z(a, d)} × ${m(b, d)}`;
};

const W = {
  // Datei, deren Ausdrücke gerade ersetzt werden (setzt tools/bauen.js), für die Meldungen
  wo: () => `src/seite/${DATEI}`,
  geschoss(fl) {
    if (!Plans.FL[fl]) throw new Error(`Geschoss ${fl} gibt es im Grundriss nicht (${Object.keys(Plans.FL).join(', ')}) – ${W.wo()} anpassen`);
    return Plans.FL[fl];
  },
  // Unsichtbare Prüfung neben Prosa, die Räume nennt (Namen wie im Grundriss): liefert '' oder bricht ab, wenn einer fehlt
  da(fl, ...namen) {
    const da = W.geschoss(fl).rooms.map(r => r.n), weg = namen.filter(n => !da.includes(n));
    if (weg.length) throw new Error(`${weg.length > 1 ? 'Räume' : 'Raum'} ${weg.map(n => `„${n}“`).join(', ')} ${weg.length > 1 ? 'fehlen' : 'fehlt'} im ${fl}`
      + ` (es gibt: ${da.join(', ')}) – Text in ${W.wo()} anpassen`);
    return '';
  },
  // Räume eines Geschosses aus dem Grundriss, Name genau oder als RegExp, je { n, a, wf } wie in der Raumtabelle der Seite.
  // Passt keiner (mehr), bricht der Bau mit den vorhandenen Namen ab: dann den Seitentext an den Grundriss anpassen.
  raeume(fl, name) {
    W.geschoss(fl);
    const alle = Plans.table(fl).rows, rows = alle.filter(r => (typeof name === 'string' ? r.n === name : name.test(r.n)));
    if (!rows.length) throw new Error(`kein Raum ${name} im ${fl} (es gibt: ${alle.map(r => r.n).join(', ')}) – Text in ${W.wo()} anpassen`);
    return rows;
  },
  // Spanne der Flächen, gerundet wie im Text: „17 bis 25 m²“, bei gleicher Größe „je 20 m²“
  spanne(rows, d = 0) {
    const a = rows.map(r => r.a), lo = z(Math.min(...a), d), hi = z(Math.max(...a), d);
    return lo === hi ? `je ${lo} m²` : `${lo} bis ${hi} m²`;
  },
  // Kinder je Bad im OG (Kinderzimmer durch Bäder, muss aufgehen)
  kinderJeBad: () => W.raeume('OG', /^Kind/).length / W.raeume('OG', /^Bad/).length,
  // Plätze am einzigen Tisch eines Raums (Möbel aus dem Grundriss: fu.table mit n Stühlen je Längsseite, Kopfenden zwei mehr)
  plaetze(fl, name) {
    W.raeume(fl, name);
    const rm = Plans.FL[fl].rooms.find(r => r.n === name), R = [rm.r, ...(rm.ext || [])];
    const T = Plans.items(fl).filter(i => i.t === 'table').map(i => i.a).filter(([x0, x1, y0, y1]) => {
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      return R.some(r => cx > r[0] && cx < r[1] && cy > r[2] && cy < r[3]);
    });
    if (T.length !== 1) throw new Error(`${T.length} Tische in ${name} (${fl}), der Text in ${W.wo()} nennt einen`);
    const [, , , , n = 3, ends = true] = T[0];
    return 2 * n + (ends ? 2 : 0);
  },
  // Treppe: Breite der Treppenbahn, Steigung h und Auftritt g eines Laufs
  treppenBreite: () => Plans.CORE.LINE[3] - Plans.CORE.LINE[2],
  stufe(fl) { const F = Plans.CORE.FLIGHTS[fl]; return { h: (F.zb - F.za) / F.n, g: (F.x0 - F.x1) / (F.n - 1) }; },
  // Fensterachsen der Südfassade = Öffnungen im EG; Gauben (ohne Zwerchhäuser) an allen Seiten
  achsenSued: () => HOUSE.fas.S.open.filter(o => o.z0 === HOUSE.Z.ffbEG).length,
  gauben: () => Object.values(HOUSE.fas).reduce((t, F) => t + (F.dormers || []).filter(d => !d.zwerch).length, 0),
  // Brüstung der OG-Fenster über FFB OG (alle gleich, sonst stimmt der Satz nicht mehr)
  ogBruestung() {
    const b = [...new Set(Object.values(HOUSE.fas).flatMap(F => F.open).filter(o => o.kind === 'fenster' && o.z0 > HOUSE.Z.ffbOG)
      .map(o => +(o.z0 - HOUSE.Z.ffbOG).toFixed(3)))];
    if (b.length !== 1) throw new Error(`OG-Fenster mit ${b.length ? 'verschiedenen Brüstungen ' + b.join(' / ') : 'keiner Brüstung'} – ${W.wo()} anpassen`);
    return b[0];
  },
  // DG-Balkon: Tiefe vor der Südfassade und die Türen im Zwerchhaus
  dgBalkon: () => HOUSE.balkonDG.y1 - HOUSE.balkonDG.y0,
  dgTueren: () => HOUSE.fas.S.dormers.find(d => d.zwerch).win,
  dgSeitentuer() {
    const T = W.dgTueren(), b = [T[0], T[T.length - 1]].map(t => +(t.u1 - t.u0).toFixed(3));
    if (b[0] !== b[1]) throw new Error(`seitliche DG-Balkontüren verschieden breit (${b.join(' / ')} m) – ${W.wo()} anpassen`);
    return b[0];
  },
  // Tiefgarage: Platz neben dem Ferrari auf P1 bis zur Südwand (seine Tür geht ganz auf); Fahrgasse bis zur Wand gegenüber den Stellplätzen
  ferrariWand() {
    const G = HOUSE.tg;
    if (G.autos[0].k !== 'ferrari') throw new Error(`Ferrari steht nicht mehr auf P1 an der Südwand – ${W.wo()} anpassen`);
    return G.mitte(0) - G.autos[0].W / 2 - Math.max(...G.waende.filter(w => w[1] - w[0] > 1 && w[3] <= G.y0).map(w => w[3]));
  },
  fahrgasse() {
    const G = HOUSE.tg, y1 = G.y0 + G.autos.length * G.bucht;
    return Math.min(...G.waende.filter(w => w[0] >= G.x1 && w[2] <= G.y0 && w[3] >= y1).map(w => w[0])) - G.x1;
  },
  // Abstand von der Terrasse (Südkante) bis zum Beckenrand; Breite der Zuwegung an der Ostgrenze (Schenkel südlich des Hauses)
  terrassePool: () => HOUSE.terrasse.y0 - Math.max(...SITE.concept.pool.map(p => p[1])),
  zuwegung() { const x = SITE.concept.zuwegung.filter(p => p[1] < 0).map(p => p[0]); return Math.max(...x) - Math.min(...x); },
  // Kronendurchmesser des großen Schutzbaums der Nachbarn
  schutzKrone: () => 2 * Math.max(...SITE.trees.filter(t => t.geschuetzt).map(t => t.r)),
};
