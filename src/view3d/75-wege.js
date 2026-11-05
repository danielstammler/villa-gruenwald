  // Teil des 3D-Modells (src/view3d/, siehe 00-kern.js): Wege der Rundgänge durch das Haus, aus dem Grundriss berechnet (weg, siehe unten)
  // Je Geschoss ein Raster aus 10-cm-Feldern: frei sind Räume, Durchgänge und Türöffnungen, gesperrt Wände, Treppenläufe, Deckenlöcher,
  // Aufzug, Möbel und offene Türflügel. Türen quert der Weg mittig und senkrecht zwischen zwei Anlaufpunkten, dazwischen sucht A* den Weg mit
  // Abstand zu Wänden und Möbeln und strafft ihn zu geraden Strecken. So folgen die Rundgänge (TOURS in 80-steuerung.js nennen nur Räume,
  // Außentüren und Treppenläufe) jeder Änderung an Räumen, Türen, Möbeln, Treppe und Eingang.
  // Boden je Geschoss für die Wegpunkte (die Augenhöhe gibt tourPath dazu)
  const ZF = { UG: Zh.ffbUG, EG: Zh.ffbEG + 0.005, OG: Zh.ffbOG + 0.005, DG: Zh.ffbDG + 0.005 }, GESCHOSSE = ['UG', 'EG', 'OG', 'DG'];
  // Gerade Treppenläufe (Plans.CORE): Antritt im Osten, Austritt am Westpodest neben dem Aufzug, Gehlinie in der Mitte der Treppenbahn
  const { LINE: TL, FLIGHTS: TF } = Plans.CORE, TY = (TL[2] + TL[3]) / 2;
  const lauf = (fl, za, zb) => [[TF[fl].x0, TY, za], [TF[fl].x1, TY, zb]];
  // Abstände: unter gut wird der Weg teurer (er hält sich in der Mitte von Fluren), unter min ist er gesperrt; gestrafft wird mit bis zu sicht
  const WEG = { h: 0.1, gut: 0.6, min: 0.25, sicht: 0.55 }, NETZ = {};
  const imRechteck = (r, x, y) => x >= r[0] && x <= r[1] && y >= r[2] && y <= r[3];
  const strecke = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);
  // Grundflächen der Möbel im Haus wie im 3D-Innenausbau: Tische mit ihren Stühlen, Schreibtisch mit Stuhl, WC und Waschtisch ab der Wand;
  // die Bodenmatte im Gym ist begehbar
  function moebelFlaechen(fl) {
    const out = [], D4 = { N: [0, -1], S: [0, 1], E: [-1, 0], W: [1, 0] }, stuhl = (x, y) => out.push([x - 0.21, x + 0.21, y - 0.21, y + 0.21]);
    for (const { t, a } of Plans.items(fl)) {
      if (t === 'hob' || (t === 'box' && /^matte$/i.test(a[4] || ''))) continue;
      if (t === 'wc' || t === 'basin') {
        const [x, y] = a, d = D4[a[t === 'wc' ? 2 : 3]], l = t === 'wc' ? 0.62 : 0.52, b = t === 'wc' ? 0.3 : a[2] / 2;
        out.push(d[0] ? [Math.min(x, x + d[0] * l), Math.max(x, x + d[0] * l), y - b, y + b] : [x - b, x + b, Math.min(y, y + d[1] * l), Math.max(y, y + d[1] * l)]);
        continue;
      }
      const [x0, x1, y0, y1] = a, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      out.push([x0, x1, y0, y1]);
      if (t === 'table') {
        const n = a[4] ?? 3, quer = x1 - x0 >= y1 - y0;
        for (let i = 0; i < n; i++) {
          const m = quer ? x0 + (i + 0.5) * (x1 - x0) / n : y0 + (i + 0.5) * (y1 - y0) / n;
          if (quer) { stuhl(m, y1 + 0.32); stuhl(m, y0 - 0.32); } else { stuhl(x1 + 0.32, m); stuhl(x0 - 0.32, m); }
        }
        if (a[5] ?? true) { if (quer) { stuhl(x0 - 0.32, cy); stuhl(x1 + 0.32, cy); } else { stuhl(cx, y1 + 0.32); stuhl(cx, y0 - 0.32); } }
      }
      if (t === 'desk') { const d = { N: [0, 1], S: [0, -1], E: [1, 0], W: [-1, 0] }[a[4]]; stuhl(cx + d[0] * ((x1 - x0) / 2 + 0.35), cy + d[1] * ((y1 - y0) / 2 + 0.35)); }
    }
    return out.filter(r => r[0] < HOUSE.W && r[1] > 0 && r[2] < 0 && r[3] > -HOUSE.D);
  }
  // Türen eines Geschosses: aus dem Grundriss (Flügel nebeneinander als eine Tür) und die beweglichen Außentüren der Fassaden (Gartentür,
  // Balkontür). c: Mitte in der Wand, n: Normale, sw: Seite längs n (±1), zu der die Flügel aufgehen, L: Flügelbreite, lt: Richtung längs
  // der Wand, hs: Seite der Angel längs lt (0: zwei Flügel), ra/rb: Raum auf der Seite -n/+n (-1: keiner), aus: Seite nach draußen (0: innen),
  // seite: Himmelsrichtung nach draußen, rect: Öffnung in der Wand. Dazu die offenen Flügel als dünne Rechtecke (fluegel): die Türen gehen
  // schon 2,4 m vor der Kamera auf, im Weg steht also der offene Flügel
  function tuerenVon(fl, raumAt) {
    const W = HOUSE.W, D = HOUSE.D, haus = [0, W, -D, 0], ds = [], out = [], fluegel = [];
    const blatt = (H, e) => [Math.min(H[0], H[0] + e[0]) - (e[0] ? 0 : 0.03), Math.max(H[0], H[0] + e[0]) + (e[0] ? 0 : 0.03), Math.min(H[1], H[1] + e[1]) - (e[1] ? 0 : 0.03), Math.max(H[1], H[1] + e[1]) + (e[1] ? 0 : 0.03)];
    for (const d of Plans.FL[fl].doors) fluegel.push(d.o === 'h' ? blatt([d.h ? d.x + d.w : d.x, d.y], [0, d.s * d.w]) : blatt([d.x, d.h ? d.y + d.w : d.y], [d.s * d.w, 0]));
    for (const d of [...Plans.FL[fl].doors].sort((p, q) => p.o.localeCompare(q.o) || (p.o === 'h' ? p.y - q.y || p.x - q.x : p.x - q.x || p.y - q.y))) {
      const v = ds[ds.length - 1], h = d.o === 'h';
      if (v && v.o === d.o && v.s === d.s && Math.abs(h ? v.y - d.y : v.x - d.x) < 0.01 && Math.abs((h ? v.x : v.y) + v.w - (h ? d.x : d.y)) < 0.01) { v.L = Math.max(v.L, d.w); v.w += d.w; }
      else ds.push({ ...d, L: d.w });
    }
    for (const d of ds) {
      const h = d.o === 'h', n = h ? [0, 1] : [1, 0], c = h ? [d.x + d.w / 2, d.y] : [d.x, d.y + d.w / 2], t = d.t ?? 0.3, e = t / 2 + 0.12;
      const pa = [c[0] - n[0] * e, c[1] - n[1] * e], pb = [c[0] + n[0] * e, c[1] + n[1] * e], ra = raumAt(...pa), rb = raumAt(...pb);
      const aus = ra < 0 && !imRechteck(haus, ...pa) ? -1 : rb < 0 && !imRechteck(haus, ...pb) ? 1 : 0;
      out.push({ c, n, w: d.w, L: d.L, sw: d.s, lt: h ? [1, 0] : [0, 1], hs: d.w > d.L + 0.01 ? 0 : d.h ? 1 : -1, t, ra, rb, aus,
        seite: aus ? (h ? (aus > 0 ? 'N' : 'S') : (aus > 0 ? 'E' : 'W')) : '', rect: h ? [d.x, d.x + d.w, d.y - 0.2, d.y + 0.2] : [d.x - 0.2, d.x + 0.2, d.y, d.y + d.w] });
    }
    for (const [seite, F] of Object.entries(HOUSE.fas)) for (const o of [...F.open, ...(F.dormers || []).flatMap(dm => (dm.zwerch ? dm.win : []))]) {
      if (!(o.move || o.kind === 'eingang') || Math.abs(o.z0 - HOUSE.Z['ffb' + fl]) > 0.3) continue;
      const f = HOUSE.frame[seite], u = (o.u0 + o.u1) / 2, n = f.n, c = [f.o[0] + f.r[0] * u - n[0] * HOUSE.wall / 2, f.o[1] + f.r[1] * u - n[1] * HOUSE.wall / 2];
      if (out.some(d => strecke(d.c, c) < 0.5)) continue;   // die Haustür steht schon im Grundriss
      // Flügel mit der Angel an der Zarge (7 cm), gehen nach innen auf
      const w = o.u1 - o.u0 - 2 * (o.side || 0), nl = o.single ? 1 : o.leaves || 1, L = (w - 0.14) / nl;
      for (const uh of nl === 1 ? [o.u0 + 0.07] : [o.u0 + 0.07, o.u1 - 0.07]) fluegel.push(blatt([f.o[0] + f.r[0] * uh - n[0] * HOUSE.wall / 2, f.o[1] + f.r[1] * uh - n[1] * HOUSE.wall / 2], [-n[0] * L, -n[1] * L]));
      out.push({ c, n, w, L, sw: -1, lt: f.r, hs: nl === 1 ? -1 : 0, t: 0.5, ra: raumAt(c[0] - n[0] * 0.4, c[1] - n[1] * 0.4), rb: -1, aus: 1, seite });
    }
    return { tueren: out, fluegel };
  }
  // Raster eines Geschosses, beim ersten Gebrauch: je Feld frei (Raum oder Durchgang), Tür, Raum und Abstand zum nächsten Gesperrten
  function netz(fl) {
    if (NETZ[fl]) return NETZ[fl];
    const F = Plans.FL[fl], { LINE, FLIGHTS, HOLES, LIFT, VOID } = Plans.CORE, W = HOUSE.W, D = HOUSE.D, h = WEG.h, offen = F.open || [];
    const rooms = F.rooms.map(r => ({ n: r.n, r: r.r, at: r.at, rs: [r.r, ...(r.ext || [])] }));
    const raumAt = (x, y) => rooms.findIndex(rm => rm.rs.some(q => imRechteck(q, x, y))), { tueren, fluegel } = tuerenVon(fl, raumAt);
    // gesperrt im Raum: Aufzug, Deckenlöcher mit Geländer (im OG der Luftraum), der Lauf nach oben mit Pfosten, im EG die breite, zur Halle
    // gerundete Antrittsstufe (wie im 3D-Innenausbau), Möbel und offene Türflügel
    const up = FLIGHTS[fl], hind = [LIFT, ...[HOLES[fl], ...(fl === 'OG' ? VOID : [])].filter(Boolean).map(q => [q[0] - 0.05, q[1] + 0.05, q[2] - 0.05, q[3] + 0.05]), ...moebelFlaechen(fl), ...fluegel];
    if (up) hind.push([Math.min(up.x0, up.x1), Math.max(up.x0, up.x1) + 0.03, LINE[2], LINE[3] + 0.09]);
    if (up && fl === 'EG') { const x = up.x0, y = LINE[3]; hind.push([x - (up.x0 - up.x1) / (up.n - 1), x - 0.2, y, y + 0.4], [x - 0.2, x, y, y + 0.2], [x - 0.2, x - 0.06, y + 0.2, y + 0.34]); }
    // Wände: was zwischen Räumen, Durchgängen und Türöffnungen übrig bleibt (wie im 3D-Innenausbau), je Zeile zu Streifen und gleiche Streifen
    // übereinander zusammengefasst
    const off = [...rooms.flatMap(rm => rm.rs), ...offen, ...tueren.filter(d => d.rect).map(d => d.rect)], wand = [];
    const uq = a => [...new Set(a.map(v => +v.toFixed(3)))].sort((p, q) => p - q);
    const xs = uq([0, W, ...off.flatMap(q => [q[0], q[1]])]).filter(v => v >= 0 && v <= W), ys = uq([-D, 0, ...off.flatMap(q => [q[2], q[3]])]).filter(v => v >= -D && v <= 0);
    for (let j = 0; j < ys.length - 1; j++) for (let i = 0, s = -1; i < xs.length; i++) {
      const zu = i < xs.length - 1 && !off.some(q => imRechteck(q, (xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2));
      if (zu && s < 0) s = i;
      if (zu || s < 0) continue;
      const v = wand.find(q => q[0] === xs[s] && q[1] === xs[i] && q[3] === ys[j]);
      if (v) v[3] = ys[j + 1]; else wand.push([xs[s], xs[i], ys[j], ys[j + 1]]);
      s = -1;
    }
    // Abstand zum nächsten gesperrten Rechteck, gedeckelt bei 0,7 m (mehr braucht kein Weg): jedes Rechteck in die Halbmeterfelder
    // einsortiert, die es mit 0,7 m Rand berührt
    const fach = new Map(), fk = (i, j) => i * 128 + j + 64, B = 0.5, R = 0.7;
    for (const q of [...hind, ...wand]) for (let i = Math.floor((q[0] - R) / B); i <= Math.floor((q[1] + R) / B); i++) for (let j = Math.floor((q[2] - R) / B); j <= Math.floor((q[3] + R) / B); j++) {
      const k = fk(i, j); if (!fach.has(k)) fach.set(k, []); fach.get(k).push(q);
    }
    const abst = (x, y) => {
      let m = R * R;
      for (const q of fach.get(fk(Math.floor(x / B), Math.floor(y / B))) || []) { const dx = Math.max(q[0] - x, 0, x - q[1]), dy = Math.max(q[2] - y, 0, y - q[3]); if (dx * dx + dy * dy < m) m = dx * dx + dy * dy; }
      return Math.sqrt(m);
    };
    const nx = Math.ceil(W / h), ny = Math.ceil(D / h), n = nx * ny, X = k => ((k % nx) + 0.5) * h, Y = k => -D + (Math.floor(k / nx) + 0.5) * h;
    const fr = new Uint8Array(n), tu = new Int16Array(n).fill(-1), ra = new Int16Array(n).fill(-1), cl = new Float32Array(n);
    // Rechtecke auf die Felder legen, deren Mitte darin liegt: erst Türöffnungen, dann Durchgänge und Räume (der erste Raum zuletzt, wie
    // raumAt), zuletzt das Gesperrte
    const male = (q, f) => {
      for (let j = Math.max(0, Math.ceil((q[2] + D) / h - 0.5)); j < ny && (j + 0.5) * h - D <= q[3]; j++)
        for (let i = Math.max(0, Math.ceil(q[0] / h - 0.5)); i < nx && (i + 0.5) * h <= q[1]; i++) f(i + j * nx);
    };
    tueren.forEach((d, di) => d.rect && male(d.rect, k => { tu[k] = di; }));
    for (const q of offen) male(q, k => { fr[k] = 1; tu[k] = -1; });
    for (let ri = rooms.length - 1; ri >= 0; ri--) for (const q of rooms[ri].rs) male(q, k => { fr[k] = 1; tu[k] = -1; ra[k] = ri; });
    for (const q of hind) male(q, k => { fr[k] = 0; tu[k] = -1; ra[k] = -1; });
    for (let k = 0; k < n; k++) if (fr[k] || tu[k] >= 0) cl[k] = abst(X(k), Y(k));
    const zelle = ([x, y]) => { const i = Math.floor(x / h), j = Math.floor((y + D) / h); return i < 0 || j < 0 || i >= nx || j >= ny ? -1 : i + j * nx; };
    return (NETZ[fl] = { fl, nx, ny, X, Y, fr, tu, ra, cl, abst, zelle, rooms, raumAt, tueren });
  }
  // A* im Raster (8 Nachbarn, schräg nicht an Wand- oder Möbelecken vorbei) von p nach q, Türfelder nur mitTueren; unter gutem Abstand teurer,
  // unter min gesperrt außer im ersten und letzten halben Meter (Anlaufpunkte an engen Stellen). Ergebnis: Feldnummern von p bis q oder null
  const NACHBARN = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  function suche(N, p, q, mitTueren) {
    const { nx, ny, X, Y, fr, tu, cl } = N, s = N.zelle(p), z = N.zelle(q), n = nx * ny;
    if (s < 0 || z < 0) return null;
    const g = new Float32Array(n).fill(Infinity), von = new Int32Array(n).fill(-1), zu = new Uint8Array(n), H = [];
    const rand = k => Math.hypot(X(k) - p[0], Y(k) - p[1]) < 0.5 || Math.hypot(X(k) - q[0], Y(k) - q[1]) < 0.5;
    const geht = k => (fr[k] === 1 || (mitTueren && tu[k] >= 0)) && (cl[k] >= WEG.min || rand(k)), auf = k => fr[k] === 1 || tu[k] >= 0;
    const push = (f, k) => { H.push([f, k]); for (let i = H.length - 1; i > 0;) { const o = (i - 1) >> 1; if (H[o][0] <= H[i][0]) break; [H[o], H[i]] = [H[i], H[o]]; i = o; } };
    const pop = () => {
      const t = H[0], e = H.pop();
      if (H.length) { H[0] = e; for (let i = 0; ;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === i) break; [H[m], H[i]] = [H[i], H[m]]; i = m; } }
      return t[1];
    };
    g[s] = 0; push(0, s);
    while (H.length) {
      const k = pop(); if (zu[k]) continue; zu[k] = 1;
      if (k === z) break;
      const i = k % nx, j = (k - i) / nx;
      for (const [di, dj, l] of NACHBARN) {
        const i2 = i + di, j2 = j + dj, k2 = i2 + j2 * nx;
        if (i2 < 0 || j2 < 0 || i2 >= nx || j2 >= ny || zu[k2] || !geht(k2) || (di && dj && !(auf(i2 + j * nx) && auf(i + j2 * nx)))) continue;
        const m = Math.max(0, WEG.gut - cl[k2]) / WEG.gut, c = g[k] + l * WEG.h * (1 + 3 * m * m);
        if (c < g[k2]) { g[k2] = c; von[k2] = k; push(c + Math.hypot(X(k2) - q[0], Y(k2) - q[1]), k2); }
      }
    }
    if (!zu[z]) return null;
    const out = []; for (let k = z; k >= 0; k = von[k]) out.push(k);
    return out.reverse();
  }
  // Sicht von a nach b: alle 5 cm ein freies Feld mit mindestens soll(f) Abstand zu allem Gesperrten (f: Anteil der Strecke ab a; Türfelder
  // zählen nicht als frei)
  function sicht(N, a, b, soll) {
    for (let i = 0, n = Math.max(1, Math.ceil(strecke(a, b) / 0.05)); i <= n; i++) {
      const x = a[0] + (b[0] - a[0]) * i / n, y = a[1] + (b[1] - a[1]) * i / n, k = N.zelle([x, y]);
      if (k < 0 || (!N.fr[k] && i && i < n) || N.abst(x, y) < soll(i / n)) return false;
    }
    return true;
  }
  // Schnittpunkt der Geraden a→b und c→d, wenn er hinter b und vor c liegt (zwei nahe Ecken, die eigentlich eine sind)
  function schnitt(a, b, c, d) {
    const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], q = r[0] * s[1] - r[1] * s[0], e = [c[0] - a[0], c[1] - a[1]];
    if (Math.abs(q) < 1e-9) return null;
    const t = (e[0] * s[1] - e[1] * s[0]) / q, u = (e[0] * r[1] - e[1] * r[0]) / q;
    return t >= 1 && u <= 0 ? [a[0] + r[0] * t, a[1] + r[1] * t] : null;
  }
  // Feldfolge zu geraden Strecken straffen: von jedem Eckpunkt so weit voraus, wie die Sicht frei bleibt; verlangt wird an jeder Stelle der
  // Abstand, den der A*-Weg dort hatte (höchstens sicht), an engen Enden nur so viel wie dort (kegel). Danach entfallen Ecken, wo es mit
  // ihrem Abstand auch direkt geht, und zwei nahe Ecken werden zu einer im Schnittpunkt
  function straff(N, p, q, ks) {
    const P = ks.map(k => [N.X(k), N.Y(k)]), C = ks.map(k => N.cl[k]), out = [p];
    const kegel = (a, b, c) => { const L = strecke(a, b), ca = N.abst(...a), cb = N.abst(...b); return f => Math.min(c(f), ca + f * L, cb + (1 - f) * L) - 0.04; };
    P[0] = p; P[P.length - 1] = q;
    for (let i = 0; i < P.length - 1;) {
      let j = i + 1;
      for (let k = i + 2; k < P.length; k++) {
        const lokal = f => { const m = i + Math.round(f * (k - i)); return Math.min(WEG.sicht, ...C.slice(Math.max(i, m - 2), Math.min(k, m + 2) + 1)); };
        if (sicht(N, P[i], P[k], kegel(P[i], P[k], lokal))) j = k; else break;
      }
      out.push(P[j]); i = j;
    }
    for (let i = 1; i < out.length - 1; i++) {
      const [a, b, c, d] = [out[i - 1], out[i], out[i + 1], out[i + 2]], cb = Math.min(WEG.sicht, N.abst(...b));
      if (sicht(N, a, c, kegel(a, c, () => cb))) { out.splice(i--, 1); continue; }
      const x = d && strecke(b, c) < 0.6 && schnitt(a, b, c, d), cx = Math.min(cb, N.abst(...c));
      if (x && N.abst(...x) >= cx - 0.04 && sicht(N, a, x, kegel(a, x, () => cx)) && sicht(N, x, d, kegel(x, d, () => cx))) { out.splice(i, 2, x); i--; }
    }
    return out;
  }
  // Anlaufpunkt einer Tür auf der Seite s (±1 längs n), mittig auf der Achse, 0,6 m vor der Wandmitte; wohin die Flügel aufgehen (außer
  // kurz), auch 0,2 m außerhalb ihres Schwenkbereichs (ein Flügel von der Breite der Tür schwenkt bis 0,87 Breiten über die Achse). Käme er
  // zu nah an Wand oder Möbel, rückt er näher an die Tür (sonst bleibt der mit dem meisten Abstand)
  function anlauf(N, d, s, kurz) {
    let best = null;
    for (let a = s === d.sw && !kurz ? Math.max(0.6, Math.sqrt(Math.max(0, d.L * d.L - d.w * d.w / 4)) + 0.2) : 0.6; a >= d.t / 2 + 0.2; a -= 0.05) {
      const p = [d.c[0] + s * d.n[0] * a, d.c[1] + s * d.n[1] * a], c = N.abst(...p);
      if (c >= 0.35) return p;
      if (!best || c > best[1] + 0.01) best = [p, c];
    }
    return best[0];
  }
  // Weg von p nach q im Geschoss: A* über die Türfelder bestimmt, durch welche Türen es geht; jede wird zwischen ihren Anlaufpunkten gerade
  // gequert, die Strecken dazwischen ohne Türen gesucht und gestrafft. Ergebnis: Punkte nach p bis q ({ p, tuer, gerade }), sonst null;
  // luecke: eine Teilstrecke ging nur gerade
  function route(N, p, q) {
    const ks = suche(N, p, q, true);
    if (!ks) return null;
    const halte = [{ p }];
    for (let i = 0; i < ks.length; i++) {
      const d = N.tu[ks[i]]; if (d < 0) continue;
      let j = i; while (j + 1 < ks.length && N.tu[ks[j + 1]] === d) j++;
      const T = N.tueren[d], k0 = ks[Math.max(0, i - 1)], s = Math.sign((N.X(k0) - T.c[0]) * T.n[0] + (N.Y(k0) - T.c[1]) * T.n[1]) || 1;
      halte.push({ p: anlauf(N, T, s), tuer: d }, { p: anlauf(N, T, -s), tuer: d, gerade: true });
      i = j;
    }
    halte.push({ p: q });
    // wohin die Flügel aufgehen, genügen 0,6 m, wo der Weg geradeaus oder von der Angel weg weitergeht (bzw. so herkommt); nur zur Angel hin
    // muss er erst am Flügel vorbei
    for (let k = 1; k < halte.length - 1; k++) {
      const h = halte[k], T = N.tueren[h.tuer];
      if (Math.sign((h.p[0] - T.c[0]) * T.n[0] + (h.p[1] - T.c[1]) * T.n[1]) !== T.sw) continue;
      const p6 = anlauf(N, T, T.sw, true), nb = (h.gerade ? halte[k + 1] : halte[k - 1]).p, v = [nb[0] - p6[0], nb[1] - p6[1]];
      if ((v[0] * T.lt[0] + v[1] * T.lt[1]) * T.hs < 0.3 * Math.hypot(...v)) h.p = p6;
    }
    // liegt p bzw. q schon auf der Türachse, nicht weiter als 0,6 m hinter dem Anlaufpunkt, entfällt dieser (kein Hin und Her an der Tür)
    const achse = (h, r) => {
      const T = N.tueren[h.tuer], v = [r[0] - T.c[0], r[1] - T.c[1]], w = [h.p[0] - T.c[0], h.p[1] - T.c[1]], a = v[0] * T.n[0] + v[1] * T.n[1], b = w[0] * T.n[0] + w[1] * T.n[1];
      return Math.abs(v[0] * T.n[1] - v[1] * T.n[0]) < 0.3 && a * b > 0 && Math.abs(a) <= Math.abs(b) + 0.6;
    };
    if (halte.length > 3 && achse(halte[1], p)) halte.splice(1, 1);
    const v = halte[halte.length - 2];
    if (halte.length > 3 && v.gerade && achse(v, q)) { halte.splice(halte.length - 2, 1); halte[halte.length - 1].gerade = true; }
    const out = [];
    for (let i = 1; i < halte.length; i++) {
      const a = halte[i - 1], b = halte[i], ks2 = !b.gerade && suche(N, a.p, b.p, false);
      if (!b.gerade && !ks2) out.luecke = true;
      const st = ks2 ? straff(N, a.p, b.p, ks2) : [a.p, b.p];
      st.slice(1).forEach((pt, k) => out.push(k === st.length - 2 ? { ...b, p: pt } : { p: pt }));
    }
    // fast gleiche Punkte (Tür gleich hinter Tür) zusammenlegen
    const r = out.filter((h, i) => i === out.length - 1 || strecke(h.p, out[i + 1].p) > 0.15);
    r.luecke = out.luecke;
    return r;
  }
  // Platz für einen Halt: der Punkt selbst, wenn er frei und mit Abstand liegt, sonst das nächste Feld mit gutem Abstand, möglichst im Raum ri
  function platz(N, p, ri = -1) {
    const k0 = N.zelle(p);
    if (k0 >= 0 && N.fr[k0] && N.abst(...p) >= 0.45 && (ri < 0 || N.ra[k0] === ri)) return p;
    let best = p, bw = Infinity;
    for (let k = 0; k < N.fr.length; k++) {
      if (!N.fr[k] || (ri >= 0 && N.ra[k] !== ri)) continue;
      const w = Math.hypot(N.X(k) - p[0], N.Y(k) - p[1]) + 3 * Math.max(0, 0.45 - N.cl[k]);
      if (w < bw) { bw = w; best = [N.X(k), N.Y(k)]; }
    }
    return best;
  }
  const raumAnker = (N, ri) => { const rm = N.rooms[ri]; return platz(N, rm.at || [(rm.r[0] + rm.r[1]) / 2, (rm.r[2] + rm.r[3]) / 2], ri); };
  // Weglänge, bei der der Weg ab s0 zuerst die Bedingung erfüllt (alle 5 cm geprüft), sonst null
  function eintritt(pts, S, s0, drin) {
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1].p, b = pts[k].p, L = S[k] - S[k - 1] || 1;
      for (let t = 0; t <= S[k] - S[k - 1] + 1e-9; t += 0.05) if (S[k - 1] + t >= s0 - 1e-9 && drin([a[0] + (b[0] - a[0]) * t / L, a[1] + (b[1] - a[1]) * t / L])) return S[k - 1] + t;
    }
    return null;
  }
  // Rundgang aus Zielen; Punkte [x, y, Boden, {…}] bleiben, wie sie sind (draußen), Objekte löst der Grundriss auf:
  //   { raum, label }        durch den Raum, beschriftet beim Eintreten; mit wait/look ein Halt darin: bei [fx, fy] im Raum oder ein Anker,
  //                          sonst gleich hinter der Tür (schon im Raum: am Raumanker); fl setzt das Geschoss (erstes Ziel eines Rundgangs)
  //   { rein: 'N', vor, z }  von draußen durch die Außentür dieser Seite (vor: Meter davor, z: Boden dort); { raus: 'S', vor, z, aussen: {…} }
  //   { treppe: 'hoch' }     zum Antritt, den Lauf hinauf ('runter': hinab) und einen Schritt aufs Podest; { label } unterwegs, mittig
  //   { bei: anker, z }      fester Punkt draußen an einer Außentür; Blickziele (look) dürfen überall Anker sein
  // Anker: { tuer: 'EG N', a } a Meter vor der Außentür (negativ: im Haus), { lauf: 'EG', f } auf der Gehlinie (Anteil f ab Antritt, sonst
  // Mitte), { raum, fl } am Raum (at, sonst Mitte), { moebel: 'Kamin', fl } am Möbel dieser Beschriftung; als Blickziel h Meter über dem Boden.
  // Fehlt ein Raum oder eine Tür oder gibt es keinen Weg, warnt die Konsole mit Rundgang und Station, und der Weg geht dort gerade weiter.
  function weg(name, ziele) {
    const out = [], innen = [];
    let cur = null, z = 0, fl = null, offen = [];
    const warn = (i, s) => console.warn(`Rundgang ${name}, Station ${i + 1}: ${s}`);
    const geschoss = h => GESCHOSSE.find(f => Math.abs(h - Zh['ffb' + f]) < 0.6) || null;
    const tuerAussen = (f, s) => netz(f).tueren.filter(d => d.aus && d.seite === s).sort((a, b) => (cur ? strecke(a.c, cur) - strecke(b.c, cur) : 0))[0];
    const anker = (A, i) => {
      if (A.tuer) { const [f, s] = A.tuer.split(' '), d = tuerAussen(f, s), a = A.a || 0; return d ? [d.c[0] + d.n[0] * d.aus * a, d.c[1] + d.n[1] * d.aus * a] : (warn(i, `keine Außentür ${A.tuer}`), null); }
      if (A.lauf) { const F = TF[A.lauf], t = A.f ?? 0.5; return F ? [F.x0 + (F.x1 - F.x0) * t, TY] : (warn(i, `kein Treppenlauf im ${A.lauf}`), null); }
      const f = A.fl || fl;
      if (A.moebel) {
        const m = Plans.items(f).find(it => it.t === 'box' && [it.a[4], it.a[5]].some(v => v && v.toLowerCase() === A.moebel.toLowerCase()));
        return m ? [(m.a[0] + m.a[1]) / 2, (m.a[2] + m.a[3]) / 2] : (warn(i, `kein Möbel „${A.moebel}“ im ${f}`), null);
      }
      const rm = netz(f).rooms.find(r => r.n === A.raum);
      return rm ? rm.at || [(rm.r[0] + rm.r[1]) / 2, (rm.r[2] + rm.r[3]) / 2] : (warn(i, `Raum „${A.raum}“ fehlt im ${f}`), null);
    };
    const blick = (L, i) => {
      if (!L || Array.isArray(L)) return L;
      const p = anker(L, i), f = (L.tuer && L.tuer.split(' ')[0]) || L.lauf || L.fl || fl;
      return p && [p[0], p[1], Zh['ffb' + f] + (L.h ?? 1)];
    };
    const opt = (g, i) => { const o = {}; for (const k of ['label', 'wait', 'v', 'eye']) if (g[k] !== undefined) o[k] = g[k]; const l = blick(g.look, i); if (l) o.look = l; return o; };
    // Punkt anhängen (f: Geschoss, wenn er im Haus liegt); fällt er auf den letzten, gehen seine Angaben an diesen
    const setze = (p, h, o, f = null) => {
      const L = out[out.length - 1];
      if (L && Math.hypot(L[0] - p[0], L[1] - p[1]) < 0.05 && Math.abs(L[2] - h) < 0.05) Object.assign(L[3], o);
      else { out.push([+p[0].toFixed(3), +p[1].toFixed(3), h, o]); innen.push(f); }
      cur = p; z = h;
    };
    // zum Punkt T im Geschoss fl, durch die offenen Räume in ihrer Reihenfolge (beschriftet beim Eintreten; liegt einer nicht am Weg, dann
    // über seinen Anker); Beschriftungen ohne Raum kommen mittig zwischen ihre Nachbarn
    const gehe = (T, o, i) => {
      if (!cur) { const e = offen.find(e => e.label !== undefined); setze(T, ZF[fl], e && o.label === undefined ? { ...o, label: e.label } : o, fl); offen = []; return; }
      const N = netz(fl), zw = [];
      let pts, S, lagen;
      for (let versuch = 0; ; versuch++) {
        pts = [{ p: cur, o: out[out.length - 1][3] }];
        for (const t of [...zw.filter(Boolean), T]) {
          const r = route(N, pts[pts.length - 1].p, t);
          if (!r || r.luecke) warn(i, `kein Weg im ${fl} bis ${t.map(v => v.toFixed(2)).join(', ')}, dort gerade`);
          pts.push(...(r || [{ p: t }]));
        }
        S = [0]; for (let k = 1; k < pts.length; k++) S.push(S[k - 1] + strecke(pts[k - 1].p, pts[k].p));
        lagen = offen.map(() => null);
        let s0 = 0, fehlt = -1;
        offen.forEach((e, k) => { if (e.ri === undefined || fehlt >= 0) return; const s = eintritt(pts, S, s0, p => N.raumAt(...p) === e.ri); if (s === null) fehlt = k; else lagen[k] = s0 = s; });
        if (fehlt < 0) break;
        if (versuch >= offen.length) { warn(i, `Weg führt nicht durch ${N.rooms[offen[fehlt].ri].n}`); offen = offen.slice(0, fehlt); break; }
        zw[fehlt] = raumAnker(N, offen[fehlt].ri);
      }
      pts[pts.length - 1].o = { ...o };
      // Beschriftung bei Weglänge s: auf einen nahen Eckpunkt (für einen Raum einen darin), sonst ein neuer Punkt auf der Strecke, wo die Bögen
      // der Nachbarecken (bis 0,7 m) nicht leiden
      const beschrifte = (s, label, ri) => {
        let k = 1; while (k < pts.length - 1 && S[k] < s - 1e-9) k++;
        const da = s - S[k - 1], db = S[k] - s, frei = m => !(pts[m].o && pts[m].o.label !== undefined) && (ri === undefined || N.raumAt(...pts[m].p) === ri);
        const m = da >= 1.4 && db >= 1.4 ? undefined : (db <= da ? [k, k - 1] : [k - 1, k]).find(frei);
        if (m !== undefined) { pts[m].o = pts[m].o || {}; pts[m].o.label = label; return; }
        const a = pts[k - 1].p, b = pts[k].p, u = da / (S[k] - S[k - 1] || 1);
        pts.splice(k, 0, { p: [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u], o: { label } }); S.splice(k, 0, s);
      };
      offen.forEach((e, k) => {
        if (e.ri === undefined) { const a = lagen.slice(0, k).filter(v => v !== null).pop() ?? 0, b = lagen.slice(k + 1).find(v => v !== null) ?? S[S.length - 1]; lagen[k] = (a + b) / 2; }
        if (e.label !== undefined) beschrifte(lagen[k], e.label, e.ri);
      });
      offen = [];
      for (const pt of pts.slice(1)) setze(pt.p, ZF[fl], pt.o || {}, fl);
    };
    ziele.forEach((g, i) => {
      if (Array.isArray(g)) {
        const o = { ...(g[3] || {}) }; if (o.look) o.look = blick(o.look, i);
        out.push([g[0], g[1], g[2], o]); innen.push(null); cur = [g[0], g[1]]; z = g[2]; fl = geschoss(z) || fl;
        return;
      }
      if (g.fl) fl = g.fl;
      const o = opt(g, i);
      if (g.treppe) {
        const hoch = g.treppe !== 'runter', u = hoch ? fl : GESCHOSSE[GESCHOSSE.indexOf(fl) - 1], F = TF[u], ob = GESCHOSSE[GESCHOSSE.indexOf(u) + 1];
        if (!F || !ob) return warn(i, `keine Treppe ${g.treppe} im ${fl}`);
        // Auf der Gehlinie beginnt der Lauf dort, wo der Weg sie am natürlichsten erreicht: 0,4, 0,55 oder 0,7 m vor dem Laufende, was mit dem
        // Rest bis zum Lauf der kürzeste Weg ist (nicht zu nah an einer Wand); oben endet er mit einem Schritt von 0,6 m aufs Podest
        const dir = Math.sign(F.x1 - F.x0), [xa, sa, xe, se, fe] = hoch ? [F.x0, -dir, F.x1, dir, ob] : [F.x1, dir, F.x0, -dir, u], N = netz(fl);
        const lang = p => { const r = cur && route(N, cur, p); return r ? r.reduce((s, h, k) => s + strecke(k ? r[k - 1].p : cur, h.p), 0) + Math.abs(p[0] - xa) : Infinity; };
        const kand = [0.4, 0.55, 0.7].map(a => [xa + sa * a, TY]).filter((p, k) => !k || N.abst(...p) >= 0.3);
        const A = kand.map(p => [p, lang(p)]).sort((a, b) => a[1] - b[1])[0][0];
        const neben = (f, x, s, a) => { const M = netz(f); while (a > 0.3 && M.abst(x + s * a, TY) < 0.35) a -= 0.05; return [x + s * a, TY]; };
        gehe(A, o, i); innen[innen.length - 1] = null;   // der Bogen dort führt auf den Lauf
        const L = lauf(u, ZF[u], ZF[ob]);
        for (const p of hoch ? L : L.reverse()) { out.push([...p, {}]); innen.push(null); }
        fl = fe; setze(neben(fe, xe, se, 0.6), ZF[fl], {}, fl);
      } else if (g.rein || g.raus) {
        if (g.rein) fl = geschoss(z) || fl;
        const d = tuerAussen(fl, g.rein || g.raus), v = g.vor ?? 0.8, P = d && [d.c[0] + d.n[0] * d.aus * v, d.c[1] + d.n[1] * d.aus * v];
        if (!d) return warn(i, `keine Außentür nach ${g.rein || g.raus} im ${fl}`);
        if (g.rein) { setze(P, g.z ?? z, opt(g.aussen || {}, i)); setze(anlauf(netz(fl), d, -d.aus), ZF[fl], o, fl); }
        else { gehe(anlauf(netz(fl), d, -d.aus), o, i); setze(P, g.z ?? ZF[fl], opt(g.aussen || {}, i)); fl = geschoss(z) || fl; }
      } else if (g.raum) {
        const N = netz(fl), ri = N.rooms.findIndex(r => r.n === g.raum), drin = !!cur && N.raumAt(...cur) === ri;
        if (ri < 0) return warn(i, `Raum „${g.raum}“ fehlt im ${fl}`);
        if (!(g.wait || g.look || g.bei)) return void offen.push({ ri, label: g.label });
        if (o.label !== undefined && cur && !drin) { offen.push({ ri, label: o.label }); delete o.label; }
        let T;
        if (Array.isArray(g.bei)) { const r = N.rooms[ri].r; T = platz(N, [r[0] + (r[1] - r[0]) * g.bei[0], r[2] + (r[3] - r[2]) * g.bei[1]], ri); }
        else if (g.bei) T = platz(N, anker(g.bei, i) || raumAnker(N, ri), ri);
        else if (!cur || drin) T = raumAnker(N, ri);
        else { const r = route(N, cur, raumAnker(N, ri)), e = r && r.find(h => h.gerade && N.raumAt(...h.p) === ri); T = e ? e.p : raumAnker(N, ri); }
        gehe(T, o, i);
      } else if (g.bei) { const p = anker(g.bei, i); if (p) setze(p, g.z ?? z, o); }
      else if (g.label !== undefined) offen.push({ label: g.label });
    });
    // Bögen an den Ecken (tourPath rundet bis 0,7 m): im Haus nur so weit, wie der Bogen 0,27 m Abstand zu Wänden und Möbeln hält (oder so
    // viel wie die Strecken an seinen Enden)
    for (let i = 1; i < out.length - 1; i++) {
      const f = innen[i], o = out[i][3], [a, b, c] = [out[i - 1], out[i], out[i + 1]], l1 = Math.hypot(b[0] - a[0], b[1] - a[1]), l2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      if (!f || o.wait || l1 < 0.01 || l2 < 0.01) continue;
      const N = netz(f), u1 = [(b[0] - a[0]) / l1, (b[1] - a[1]) / l1], u2 = [(c[0] - b[0]) / l2, (c[1] - b[1]) / l2], r0 = Math.min(0.7, l1 / 2, l2 / 2);
      const frei = r => {
        const P = [b[0] - u1[0] * r, b[1] - u1[1] * r], Q = [b[0] + u2[0] * r, b[1] + u2[1] * r], soll = Math.min(0.27, N.abst(...P), N.abst(...Q)) - 0.01;
        for (let t = 0.125; t < 1; t += 0.125) { const w = 1 - t; if (N.abst(w * w * P[0] + 2 * t * w * b[0] + t * t * Q[0], w * w * P[1] + 2 * t * w * b[1] + t * t * Q[1]) < soll) return false; }
        return true;
      };
      let r = r0; while (r > 0.12 && !frei(r)) r -= 0.1;
      if (r < r0 - 1e-6) o.r = +Math.max(0.1, r).toFixed(2);
    }
    return out;
  }
  // Rundgänge erst beim ersten Gebrauch ausrechnen (je Rundgang bis etwa 0,2 s, nicht beim Laden der Seite): je Name eine Funktion mit den Zielen
  const rundgaenge = def => Object.defineProperties({}, Object.fromEntries(Object.keys(def).map(n => { let w = null; return [n, { enumerable: true, get: () => (w = w || weg(n, def[n]())) }]; })));
