'use strict';
// Ansichten der 3D-Prüfung (tools/ansichten.json) in Kamera und Ziel umrechnen. Innenansichten hängen an den Plandaten, damit sie nach Umbauten
// im Grundriss noch stimmen: Räume aus Plans.FL[fl].rooms (Name n, Rechteck r), Halle und Treppe aus Plans.CORE, Eingang aus der Haustür in
// HOUSE.fas, Tiefgarage aus HOUSE.tg, dazu Lichthof, DG-Balkon, Pool und Spielplatz aus HOUSE. Außen sind auch feste Kameras erlaubt.
// Formate je Eintrag (immer mit name und text):
//   { pos: [x, y, z], tgt: [x, y, z], level? }   feste Kamera in Weltkoordinaten (X = Plan-x, Y = Höhe, Z = −Plan-y), level = Geschossschnitt
//   { cam: 'ost' }                                Kamera wie die Buttons der Seite (PRESETS in src/view3d/80-steuerung.js)
//   { geschossblick: 'EG' }                       Geschossblick wie die Geschoss-Buttons (Schnitt über dem Geschoss, Kamera der Seite)
//   { geschoss: 'DG', raum: 'Büro', blick: 'S', ab?, hoehe?, zielhoehe? }
//                                                 im Raum (Hauptrechteck r) mittig an der Wand gegenüber der Blickrichtung, ab (0,5 m) davor,
//                                                 Augenhöhe FFB + hoehe (1,6 m), Blick zur gegenüberliegenden Wand auf FFB + zielhoehe (1,2 m);
//                                                 blick N, S, O (oder E), W
//   { anker: 'eingang' | 'halle' | 'halle-tuer' | 'galerie' | 'tg-gang' | 'tg-stellplaetze' | 'lichthof' | 'balkon-dg' | 'pool' | 'spielplatz' }
// Steht eine Innenkamera in einem Möbel aus Plans.items (Schrank in der Ecke …), rückt sie zum Ziel hin, bis 0,25 m Luft sind.
// Ergebnis { name, text, v: { pos, tgt, level, cam } } oder { name, text, fehler: 'eine Zeile, warum der Anker fehlt' }.
// node tools/lib/anker.js prüft nur, ob alle Anker noch da sind (./vg pruefen schnell).
const fs = require('fs'), path = require('path');
const { ROOT, kontext, rechne } = require('./laden');
const DATEI = path.join(ROOT, 'tools', 'ansichten.json');
const r2 = v => +v.toFixed(2);
const welt = (x, y, h) => [r2(x), r2(h), r2(-y)];   // Plan (x Ost, y Nord) und Höhe → Welt
const GESCHOSSE = ['UG', 'EG', 'OG', 'DG'];

function loese(ctx, e) {
  const H = rechne(ctx, 'HOUSE'), PL = rechne(ctx, 'Plans'), Z = H.Z, C = PL.CORE;
  const fehl = t => { throw new Error(t); };
  const ffb = fl => (GESCHOSSE.includes(fl) ? Z['ffb' + fl] : fehl(`Geschoss ${fl} gibt es nicht (${GESCHOSSE.join(', ')})`));
  const kam = (p, ph, t, th) => ({ pos: welt(p[0], p[1], ph), tgt: welt(t[0], t[1], th) });
  // Haustür: Öffnung „eingang“ in einer Fassade; Mitte in der Außenflucht, n zeigt nach draußen
  const tuer = () => {
    for (const s of Object.keys(H.fas)) {
      const o = (H.fas[s].open || []).find(q => q.kind === 'eingang');
      if (!o) continue;
      const f = H.frame[s], u = (o.u0 + o.u1) / 2;
      return { o, n: f.n, p: [f.o[0] + f.r[0] * u, f.o[1] + f.r[1] * u], zm: (o.z0 + o.z1) / 2 };
    }
    return fehl('Haustür fehlt (keine Öffnung „eingang“ in HOUSE.fas)');
  };
  const vor = (t, d) => [t.p[0] + t.n[0] * d, t.p[1] + t.n[1] * d];
  const kern = () => (C && C.LINE && C.FLIGHTS ? C : fehl('Plans.CORE (LINE, FLIGHTS) fehlt'));
  // Möbel des Geschosses als Rechtecke (Aufrufe mit x0, x1, y0, y1 vorn, wie fu.box/shelf/bed); die Kamera rückt in 10-cm-Schritten zum Ziel
  // hin, bis sie 0,25 m neben allen steht – sonst stünde sie nach einem Umbau womöglich in einem Schrank
  const moebel = fl => (PL.items ? PL.items(fl) : []).map(i => i.a).filter(a => a.length >= 4 && a.slice(0, 4).every(Number.isFinite) && a[0] < a[1] && a[2] < a[3]);
  const neben = (fl, p, t) => {
    const M = moebel(fl), d = Math.hypot(t[0] - p[0], t[1] - p[1]), drin = q => M.some(a => q[0] > a[0] - 0.25 && q[0] < a[1] + 0.25 && q[1] > a[2] - 0.25 && q[1] < a[3] + 0.25);
    for (let s = 0; s < Math.min(3, d - 0.5); s += 0.1) { const q = [p[0] + (t[0] - p[0]) * s / d, p[1] + (t[1] - p[1]) * s / d]; if (!drin(q)) return q; }
    return p;
  };
  const kamIn = (fl, p, ph, t, th) => kam(neben(fl, p, t), ph, t, th);

  if (e.pos || e.tgt) {
    if (!(Array.isArray(e.pos) && e.pos.length === 3 && Array.isArray(e.tgt) && e.tgt.length === 3)) fehl('pos und tgt brauchen je drei Zahlen');
    return { pos: e.pos, tgt: e.tgt, level: e.level };
  }
  if (e.cam) return { cam: e.cam, level: e.level };
  if (e.geschossblick) { ffb(e.geschossblick); return { level: e.geschossblick }; }
  if (e.raum) {
    const F = PL.FL[e.geschoss] || fehl(`Geschoss ${e.geschoss} gibt es nicht (${GESCHOSSE.join(', ')})`);
    const rm = F.rooms.find(q => q.n === e.raum) || fehl(`Raum „${e.raum}“ im ${e.geschoss} fehlt (da sind: ${F.rooms.map(q => q.n).join(', ')})`);
    const [x0, x1, y0, y1] = rm.r, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, z = ffb(e.geschoss);
    if (!'NSOEW'.includes(e.blick || '-')) fehl(`Blickrichtung „${e.blick}“ gibt es nicht (N, S, O, W)`);
    // in kleinen Räumen näher an die Wand, damit die Kamera nicht schon in der Raummitte steht
    const ab = Math.min(e.ab ?? 0.5, ('NS'.includes(e.blick) ? y1 - y0 : x1 - x0) / 3);
    const b = { N: [[cx, y0 + ab], [cx, y1]], S: [[cx, y1 - ab], [cx, y0]], O: [[x0 + ab, cy], [x1, cy]], E: [[x0 + ab, cy], [x1, cy]], W: [[x1 - ab, cy], [x0, cy]] }[e.blick];
    return kamIn(e.geschoss, b[0], z + (e.hoehe ?? 1.6), b[1], z + (e.zielhoehe ?? 1.2));
  }
  const a = e.anker;
  if (a === 'eingang') { const t = tuer(); return kam(vor(t, 6.5), Z.gelaende + 1.7, t.p, t.zm); }
  if (a === 'halle') {
    // aus der Ecke der Halle neben der Haustür schräg über die ganze Treppe an der Rückwand (frontal stünde man ihr zu nah); weit genug von
    // der Tür, dass sie zu bleibt
    const t = tuer(), L = kern().LINE, w = H.wall || 0.36, yi = t.p[1] - t.n[1] * (w + 0.45), ecke = t.p[0] < (L[0] + L[1]) / 2 ? L[1] - 0.45 : L[0] + 0.45;
    return kamIn('EG', [ecke, yi], Z.ffbEG + 1.7, [L[0] + (L[1] - L[0]) * (ecke > t.p[0] ? 0.3 : 0.7), (L[2] + L[3]) / 2], Z.ffbEG + 1.6);
  }
  if (a === 'halle-tuer') {
    // vom Fuß der Treppe zurück zur Haustür
    const t = tuer(), L = kern().LINE, y = t.n[1] > 0 ? Math.max(L[2], L[3]) + 0.45 : Math.min(L[2], L[3]) - 0.45;
    return kamIn('EG', [t.p[0], y], Z.ffbEG + 1.6, t.p, t.zm);
  }
  if (a === 'galerie') {
    // OG am Antritt der Dachtreppe (Halt „Galerie“ im Rundgang) nahe am Luftraum, Blick schräg hinüber zur Eingangswand und hinunter in die Halle
    const { LINE: L, FLIGHTS: F, VOID: V } = kern(), f = F.OG || fehl('Treppenlauf OG fehlt in Plans.CORE.FLIGHTS');
    const v = (V && V[0]) || fehl('Luftraum fehlt (Plans.CORE.VOID)'), s = Math.sign(f.x1 - f.x0) || -1;
    const x = Math.min(Math.max(f.x0 - s * 0.5, L[0] + 0.3), L[1] - 0.3), yL = (L[2] + L[3]) / 2, yV = Math.abs(v[2] - yL) > Math.abs(v[3] - yL) ? v[2] : v[3];
    const yR = Math.abs(L[2] - yV) < Math.abs(L[3] - yV) ? L[2] : L[3], y = yR + Math.sign(yL - yR) * 0.35;   // 35 cm vor der Kante zum Luftraum
    return kamIn('OG', [x, y], Z.ffbOG + 1.6, [(v[0] + v[1]) / 2, yV + Math.sign(yL - yV) * 0.6], Z.ffbEG + 1.8);
  }
  if (a === 'tg-gang' || a === 'tg-stellplaetze') {
    const G = H.tg || fehl('HOUSE.tg fehlt'), n = (G.autos || []).length || 3, z = Z.ffbUG;
    if (a === 'tg-gang') {
      // Gang zwischen den Stellplätzen und den Fahrrädern an der Hauswand, von Osten zum Eingangsbereich
      const yN = -H.D - G.raeder.tief, yS = G.y0 + n * G.bucht, yc = (yN + yS) / 2;
      return kam([Math.max(...G.raeder.x) + 1.0, yc], z + 1.6, [G.schleuse.x1, yc + 0.2], z + 1.0);
    }
    // aus der Fahrgasse schräg über alle Stellplätze
    return kam([G.x1 + 3.6, G.mitte(0) - 0.8], z + 1.7, [G.x0 + 1.0, G.mitte(n - 1)], z + 0.6);
  }
  if (a === 'lichthof') {
    // über dem Außenrand des Lichthofs (zwischen Lichthof und Grenzhecke, über der Hecke) steil hinunter auf die Fenster im UG
    const L = H.lichthof || fehl('HOUSE.lichthof fehlt'), f = H.frame[L.side], m = [f.o[0] + f.r[0] * (L.u0 + L.u1) / 2, f.o[1] + f.r[1] * (L.u0 + L.u1) / 2];
    const at = d => [m[0] + f.n[0] * d, m[1] + f.n[1] * d];
    return kam(at(L.tief + 0.5), Z.gelaende + 3.4, at(0.1), Z.ffbUG + 1.2);
  }
  if (a === 'balkon-dg') {
    // auf dem Balkon vor dem Büro, am Westende entlang nach Osten
    const B = H.balkonDG || fehl('HOUSE.balkonDG fehlt'), y = (B.y0 + B.y1) / 2;
    return kam([B.x0 + 0.4, y], B.slab[1] + 1.6, [B.x1 - 0.3, y], B.slab[1] + 0.8);
  }
  if (a === 'pool') {
    // von der Nordwestecke des Beckens schräg über das Wasser auf das Poolhaus
    const P = rechne(ctx, 'SITE.concept.poolWasser') || fehl('SITE.concept.poolWasser fehlt'), ph = H.poolhaus || fehl('HOUSE.poolhaus fehlt');
    const x0 = Math.min(...P.map(p => p[0])), y1 = Math.max(...P.map(p => p[1]));
    return kam([x0 - 1.2, y1 + 1.4], Z.gelaende + 2.8, [ph.x0 - 2, (ph.y0 + ph.y1) / 2], 0.8);
  }
  if (a === 'spielplatz') {
    const T = ((H.garten || {}).spiel || {}).turm || fehl('Spielturm fehlt (HOUSE.garten.spiel.turm)');
    return kam([T.x + 6, T.y + 4.5], Z.gelaende + 2.6, [T.x - 1.5, T.y - 0.3], 1.3);
  }
  return fehl(a ? `Anker „${a}“ gibt es nicht` : 'weder pos/tgt noch cam, geschossblick, raum oder anker');
}

// Alle Ansichten aus tools/ansichten.json (oder liste), je { name, text, v } oder { name, text, fehler }
function ansichten(ctx = kontext(), liste = JSON.parse(fs.readFileSync(DATEI, 'utf8')).ansichten) {
  return liste.map(e => {
    try { return { name: e.name, text: e.text || '', v: loese(ctx, e) }; } catch (err) { return { name: e.name, text: e.text || '', fehler: err.message }; }
  });
}
module.exports = { ansichten, loese, DATEI };
// node tools/lib/anker.js: nur prüfen, ob alle Anker noch da sind (für ./vg pruefen schnell): erste Zeile „ok 25“ bzw. „1 von 25 Ansichten
// ohne Anker“, danach eine Zeile je fehlendem Anker
if (require.main === module) {
  const alle = ansichten(), weg = alle.filter(a => a.fehler);
  console.log(weg.length ? `${weg.length} von ${alle.length} Ansichten ohne Anker` : `ok ${alle.length}`);
  for (const a of weg) console.log(`${a.name}: ${a.fehler}`);
}
