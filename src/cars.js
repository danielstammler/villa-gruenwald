// Autos in der Tiefgarage: Baukasten für detailreiche Modelle. Jedes Modell steht in einer eigenen Datei (car-ferrari.js,
// car-cayenne.js, car-vklasse.js) und meldet sich als CAR_MODELS.<name> = k => { … } an; k ist der Baukasten unten.
// Auto-Koordinaten in Metern: x längs von der Frontspitze (0) bis zum Heck (L), y Höhe über dem Boden, z quer (Mitte 0, +z rechts).
// Geometrien werden je Material gesammelt; das Haus stellt sie danach an ihren Stellplatz (Front zur Wand).
var CAR_MODELS = globalThis.CAR_MODELS || (globalThis.CAR_MODELS = {});
const CarKit = (() => {
  // Materialien für alle Autos; Lack je Modell
  function materials(THREE) {
    const std = (color, r, m, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: m, ...extra });
    const phys = (color, r, m, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: r, metalness: m, ...extra });
    const paint = (color, m, r) => phys(color, r, m, { clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.3 });
    const DS = { side: THREE.DoubleSide };
    return {
      paint_default: paint(0x5d6670, 0.6, 0.3), paint_ferrari: paint(0xa50d15, 0.25, 0.28), paint_cayenne: paint(0x3a3d41, 0.65, 0.3), paint_vklasse: paint(0x0b0c0e, 0.5, 0.26),
      glass: phys(0x0b0f12, 0.03, 0.1, { transparent: true, opacity: 0.55, envMapIntensity: 1.8, ...DS }),
      glassDark: phys(0x040506, 0.04, 0.1, { transparent: true, opacity: 0.86, envMapIntensity: 1.8, ...DS }),
      lens: phys(0xffffff, 0.02, 0, { transparent: true, opacity: 0.22, envMapIntensity: 2.2, ...DS }),
      trim: std(0x0b0c0d, 0.3, 0.2), trimMatte: std(0x151617, 0.85, 0, DS), chrome: std(0xdcdfe2, 0.08, 1), alu: std(0xb6babe, 0.32, 0.9),
      tire: std(0x161616, 0.88, 0, DS), rim: std(0xc4c8cc, 0.2, 0.95, DS), rimDark: std(0x2a2d31, 0.32, 0.85, DS), disc: std(0x85888b, 0.45, 0.9),
      calYellow: std(0xe8b200, 0.35, 0.1), calRed: std(0xb3121a, 0.35, 0.1), calBlack: std(0x161718, 0.4, 0.2), calSilver: std(0x9ea2a6, 0.35, 0.7),
      headlight: std(0xeef3f8, 0.15, 0.1, { emissive: 0xe8f0ff, emissiveIntensity: 0.55 }), drl: std(0xffffff, 0.2, 0, { emissive: 0xffffff, emissiveIntensity: 1.6 }),
      lampHousing: std(0x15171a, 0.25, 0.7), taillight: std(0x5e0808, 0.3, 0, { emissive: 0xc01010, emissiveIntensity: 0.8 }),
      taillightDark: std(0x2a0505, 0.25, 0.1), indicator: std(0x7a4e10, 0.3, 0, { emissive: 0x804000, emissiveIntensity: 0.35 }),
      plate: std(0xf3f3ef, 0.5, 0), interior: std(0x1a1a1b, 0.75, 0, DS), interiorLight: std(0x8a7660, 0.7, 0, DS), carpet: std(0x0e0e0e, 1, 0, DS),
      grille: std(0x0d0e0f, 0.5, 0.3, DS), carbon: std(0x18191b, 0.28, 0.45), liner: std(0x090909, 0.95, 0, DS), underbody: std(0x111111, 0.9, 0, DS),
    };
  }
  // Ein Modell bauen; liefert Map Material → [BufferGeometry] in Auto-Koordinaten
  function build(name, THREE, utils, M) {
    if (!CAR_MODELS[name]) throw new Error(`Automodell ${name} fehlt`);
    const k = kit(THREE, utils, M, name);
    CAR_MODELS[name](k);
    return k.parts;
  }
  function kit(THREE, utils, M, name) {
    const parts = new Map(), V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const matOf = m => { const r = typeof m === 'string' ? (m === 'paint' ? M[`paint_${name}`] || M.paint_default : M[m]) : m; if (!r) throw new Error(`Material ${m} fehlt`); return r; };
    // Geometrie aufnehmen (optional mit Matrix); nur position, normal, uv bleiben, damit alles zusammengefasst werden kann
    function add(m, g, mx) {
      if (mx) g.applyMatrix4(mx);
      const geo = g.index ? g.toNonIndexed() : g;
      for (const a of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(a)) geo.deleteAttribute(a);
      if (!geo.attributes.normal) geo.computeVertexNormals();
      if (!geo.attributes.uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
      geo.clearGroups();
      const key = matOf(m);
      if (!parts.has(key)) parts.set(key, []);
      parts.get(key).push(geo);
      return geo;
    }
    const both = fn => { fn(1); fn(-1); };
    // Glatte Kurve durch Stützpunkte [[x, wert], …] ohne Überschwingen (monotone kubische Interpolation)
    function curve(pts) {
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), n = pts.length;
      if (n === 1) return () => ys[0];
      const d = [], m = [];
      for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i] || 1e-9));
      m[0] = d[0]; m[n - 1] = d[n - 2];
      for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
      for (let i = 0; i < n - 1; i++) {
        if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
        const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
        if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
      }
      return x => {
        if (x <= xs[0]) return ys[0];
        if (x >= xs[n - 1]) return ys[n - 1];
        let i = 0; while (i < n - 2 && x > xs[i + 1]) i++;
        const h = xs[i + 1] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
        return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1];
      };
    }
    // Halber Querschnitt mit 22 Punkten in fester Rolle (j): 0 Bodenmitte, 1–2 Boden, 3 Schwellerkante, 4–8 untere Flanke bis zur
    // breitesten Stelle, 9–11 Schulter bis zur Gürtellinie (12), 13–16 Seitenscheiben bis zur Dachkante, 17–20 Dach, 21 Dachmitte.
    // yb Boden, ys Schweller, yw breiteste Stelle, ybelt Gürtellinie, yr Dach (Mitte); wb, ws, ww, wbelt, wr halbe Breiten;
    // crown Wölbung des Dachs, bulge Wölbung der Flanke; ycut hebt alle Punkte darunter an (Radläufe).
    function section({ yb, ys, yw, ybelt, yr, wb, ws, ww, wbelt, wr, crown = 0.04, bulge = 0.01, ycut = -1 }) {
      const P = [[0, yb], [wb * 0.55, yb], [wb, yb + 0.005], [ws, ys]];
      for (let k2 = 1; k2 <= 5; k2++) { const t = k2 / 5, e = Math.sin(t * Math.PI / 2); P.push([ws + (ww - ws) * e + bulge * Math.sin(t * Math.PI), ys + (yw - ys) * t]); }
      for (let k2 = 1; k2 <= 3; k2++) { const t = k2 / 4; P.push([ww + (wbelt - ww) * t * t, yw + (ybelt - yw) * t]); }
      P.push([wbelt, ybelt]);
      const ye = yr - crown, gw = Math.max(0, ybelt === yr ? 0 : 1);
      for (let k2 = 1; k2 <= 4; k2++) { const t = k2 / 4; P.push([wbelt + (wr - wbelt) * t - 0.01 * gw * Math.sin(t * Math.PI), ybelt + (ye - ybelt) * t]); }
      for (let k2 = 1; k2 <= 4; k2++) { const t = k2 / 5, a = t * Math.PI / 2; P.push([wr * Math.cos(a), ye + crown * Math.sin(a)]); }
      P.push([0, yr]);
      if (ycut > 0) for (const p of P) if (p[1] < ycut) p[1] = ycut;
      return P;
    }
    // Karosserie als Loft: stations = [{ x, p: [[z, y], …] }] mit gleicher Punktzahl, Profil von der Bodenmitte über die rechte
    // Seite zur Dachmitte; wird gespiegelt und zu einem Ring geschlossen. mat(i, j, side, mitte) gibt je Feld (Station i…i+1,
    // Profil j…j+1) ein Material oder null (Loch). Liefert einen Abtaster at(x, j, side) → { p, n } für Anbauteile auf der Fläche.
    function hull(stations, { mat = () => 'paint', caps = [true, true] } = {}) {
      const ns = stations.length, n = stations[0].p.length, R = 2 * n - 2;
      const jOf = r => (r < n ? r : R - r), sOf = r => (r < n ? 1 : -1);
      const pos = new Float32Array(ns * R * 3);
      stations.forEach((st, i) => {
        if (st.p.length !== n) throw new Error(`Station ${i}: ${st.p.length} statt ${n} Profilpunkte`);
        for (let r = 0; r < R; r++) { const [z, y] = st.p[jOf(r)]; pos[(i * R + r) * 3] = st.x; pos[(i * R + r) * 3 + 1] = y; pos[(i * R + r) * 3 + 2] = z * sOf(r); }
      });
      const idx = [];
      for (let i = 0; i < ns - 1; i++) for (let r = 0; r < R; r++) {
        const a = i * R + r, b = (i + 1) * R + r, c = (i + 1) * R + (r + 1) % R, d = i * R + (r + 1) % R;
        idx.push(a, b, c, a, c, d);
      }
      const grid = new THREE.BufferGeometry();
      grid.setAttribute('position', new THREE.BufferAttribute(pos, 3)); grid.setIndex(idx); grid.computeVertexNormals();
      const nrm = grid.attributes.normal.array, out = new Map();
      const P = (i, r) => V3(pos[(i * R + r) * 3], pos[(i * R + r) * 3 + 1], pos[(i * R + r) * 3 + 2]);
      for (let i = 0; i < ns - 1; i++) for (let r = 0; r < R; r++) {
        const side = r < n - 1 ? 1 : -1, j = side > 0 ? r : R - 1 - r;
        const q = [i * R + r, (i + 1) * R + r, (i + 1) * R + (r + 1) % R, i * R + (r + 1) % R];
        const c = V3(0, 0, 0); for (const v of q) c.add(V3(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2])); c.multiplyScalar(0.25);
        const m = mat(i, j, side, c);
        if (!m) continue;
        if (!out.has(m)) out.set(m, { p: [], n: [] });
        const o = out.get(m);
        for (const v of [q[0], q[1], q[2], q[0], q[2], q[3]]) { o.p.push(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); o.n.push(nrm[v * 3], nrm[v * 3 + 1], nrm[v * 3 + 2]); }
      }
      for (const [m, o] of out) {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(o.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(o.n, 3));
        add(m, g);
      }
      // Stirnflächen vorn und hinten als Fächer
      [[0, -1], [ns - 1, 1]].forEach(([i, dir], e) => {
        if (!caps[e]) return;
        const c = V3(0, 0, 0); for (let r = 0; r < R; r++) c.add(P(i, r)); c.multiplyScalar(1 / R);
        const p = [];
        for (let r = 0; r < R; r++) {
          let a = P(i, r), b = P(i, (r + 1) % R);
          if (b.clone().sub(c).cross(a.clone().sub(c)).x * dir < 0) [a, b] = [b, a];
          p.push(c.x, c.y, c.z, b.x, b.y, b.z, a.x, a.y, a.z);
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.computeVertexNormals();
        add(typeof caps[e] === 'string' ? caps[e] : mat(Math.min(i, ns - 2), 5, 1, c) || 'paint', g);
      });
      // Abtaster: Punkt und Normale auf der Fläche bei Länge x und Profilstelle j (auch gebrochen), Seite ±1
      const xs = stations.map(s => s.x), rOf = (j, side) => (side > 0 || j === 0 || j === n - 1 ? j : R - j);
      const Nv = (i, r) => V3(nrm[(i * R + r) * 3], nrm[(i * R + r) * 3 + 1], nrm[(i * R + r) * 3 + 2]);
      function at(x, jf, side = 1) {
        let lo = 0, hi = ns - 2; const xc = Math.min(Math.max(x, xs[0]), xs[ns - 1]);
        while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (xs[mid] <= xc) lo = mid; else hi = mid - 1; }
        const t = Math.min(1, Math.max(0, (xc - xs[lo]) / ((xs[lo + 1] - xs[lo]) || 1)));
        const j0 = Math.min(n - 2, Math.max(0, Math.floor(jf))), s = Math.min(1, Math.max(0, jf - j0)), r0 = rOf(j0, side), r1 = rOf(j0 + 1, side);
        const mix = f => f(lo, r0).multiplyScalar((1 - t) * (1 - s)).add(f(lo + 1, r0).multiplyScalar(t * (1 - s))).add(f(lo, r1).multiplyScalar((1 - t) * s)).add(f(lo + 1, r1).multiplyScalar(t * s));
        return { p: mix(P), n: mix(Nv).normalize() };
      }
      return { at, stations, n };
    }
    // Flächenstück auf der Karosserie (Leuchte, Gitter, Einlass, Scheibeneinsatz): x0…x1 längs, j0…j1 im Profil, um off nach außen
    function patch(m, H, x0, x1, j0, j1, { side = 0, off = 0.004, nx = 10, nj = 6 } = {}) {
      for (const sg of side ? [side] : [1, -1]) {
        const pts = [], nor = [], id = (a, b) => a * (nj + 1) + b;
        for (let a = 0; a <= nx; a++) for (let b = 0; b <= nj; b++) { const q = H.at(x0 + (x1 - x0) * a / nx, j0 + (j1 - j0) * b / nj, sg); pts.push(q.p.addScaledVector(q.n, off)); nor.push(q.n); }
        const p = [], nn = [];
        for (let a = 0; a < nx; a++) for (let b = 0; b < nj; b++) {
          let tri = [[id(a, b), id(a + 1, b), id(a + 1, b + 1)], [id(a, b), id(a + 1, b + 1), id(a, b + 1)]];
          const [p0, p1, p2] = tri[0].map(q => pts[q]), fn = p1.clone().sub(p0).cross(p2.clone().sub(p0));
          if (fn.dot(nor[id(a, b)]) < 0) tri = tri.map(([u, v, w]) => [u, w, v]);
          for (const t of tri) for (const q of t) { p.push(pts[q].x, pts[q].y, pts[q].z); nn.push(nor[q].x, nor[q].y, nor[q].z); }
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nn, 3));
        add(m, g);
      }
    }
    // Schmale Streifen auf der Fläche: lineX bei fester Länge x über das Profil (Türfuge), lineJ längs bei fester Profilstelle (Zierleiste)
    const lineX = (m, H, x, j0, j1, { w = 0.007, off = 0.0025, side = 0, n = 12 } = {}) => patch(m, H, x - w / 2, x + w / 2, j0, j1, { side, off, nx: 1, nj: n });
    const lineJ = (m, H, x0, x1, j, { dj = 0.06, off = 0.0025, side = 0, n = 30 } = {}) => patch(m, H, x0, x1, j - dj / 2, j + dj / 2, { side, off, nx: n, nj: 1 });
    // Quader und Zylinder in Auto-Koordinaten; Zylinder entlang 'x', 'y' oder 'z' von a bis b, Mitte (c1, c2) in den anderen Achsen
    function box(m, x0, x1, y0, y1, z0, z1) { const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0); g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); return add(m, g); }
    const toAxis = (g, axis, c1, c2) => {
      if (axis === 'x') { g.rotateZ(-Math.PI / 2); g.translate(0, c1, c2); } else if (axis === 'z') { g.rotateX(Math.PI / 2); g.translate(c1, c2, 0); } else g.translate(c1, 0, c2);
      return g;
    };
    function cyl(m, axis, a, b, c1, c2, r0, r1 = r0, seg = 20, open = false) {
      const g = new THREE.CylinderGeometry(r1, r0, Math.abs(b - a), seg, 1, open); g.translate(0, (a + b) / 2, 0);
      return add(m, toAxis(g, axis, c1, c2));
    }
    // Drehkörper: pts = [[Radius, Lage entlang der Achse], …], in Richtung wachsender Lage aufzählen
    function lathe(m, axis, pts, c1, c2, seg = 32) { return add(m, toAxis(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(r, h)), seg), axis, c1, c2)); }
    // Ebene Form, extrudiert: 'xy' Seitenansicht (Tiefe entlang z ab a), 'zy' Front/Heck (entlang x ab a), 'xz' Draufsicht (entlang y ab a)
    function shape(m, plane, pts, a, depth, { holes = [], bevel = 0, curve = 12 } = {}) {
      const sh = new THREE.Shape(pts.map(([p, q]) => new THREE.Vector2(p, q)));
      for (const h of holes) sh.holes.push(new THREE.Path(h.map(([p, q]) => new THREE.Vector2(p, q))));
      const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: curve });
      const mx = new THREE.Matrix4();
      if (plane === 'xy') mx.makeTranslation(0, 0, a);
      else if (plane === 'zy') mx.makeBasis(V3(0, 0, 1), V3(0, 1, 0), V3(-1, 0, 0)).setPosition(a + depth, 0, 0);
      else mx.makeBasis(V3(1, 0, 0), V3(0, 0, 1), V3(0, -1, 0)).setPosition(0, a + depth, 0);
      return add(m, g, mx);
    }
    // Rad mit Mitte bei x, Radius r, Reifenbreite w, Mitte quer zc (Vorzeichen = Seite). Felge tief liegend mit Speichen,
    // dahinter Bremsscheibe und Sattel, Nabe mit Radmuttern. style: 'five', 'fiveDouble', 'ten', 'multi', 'y'
    function wheel({ x, r, w, zc, rimR = r * 0.68, style = 'fiveDouble', rim = 'rim', cal = 'calBlack', dish = 0.06 }) {
      const s = Math.sign(zc) || 1, hw = w / 2, z = q => zc + s * q;
      const tp = [[rimR - 0.004, -hw * 0.84], [r - 0.05, -hw], [r - 0.014, -hw * 0.9], [r, -hw * 0.6], [r, hw * 0.6], [r - 0.014, hw * 0.9], [r - 0.05, hw], [rimR - 0.004, hw * 0.84]];
      lathe('tire', 'z', tp.map(([a, b]) => [a, zc + b]), x, r, 48);
      lathe('rimDark', 'z', [[rimR, zc - hw * 0.8], [rimR, zc + hw * 0.8]], x, r, 40);
      const lip = new THREE.TorusGeometry(rimR, 0.012, 8, 48); lip.translate(x, r, z(hw * 0.8)); add(rim, lip);
      // Speichen: Felgenscheibe mit Aussparungen
      const hub = 0.085, ro = rimR - 0.02, cnt = { five: 5, fiveDouble: 5, ten: 10, multi: 15, y: 5 }[style] || 5;
      const holes = [], arc = (a0, a1, rr, rev) => { const p = []; for (let q = 0; q <= 6; q++) { const a = a0 + (a1 - a0) * q / 6; p.push([x + Math.cos(a) * rr, r + Math.sin(a) * rr]); } return rev ? p.reverse() : p; };
      const ang = 2 * Math.PI / cnt;
      for (let q = 0; q < cnt; q++) {
        const a = q * ang + 0.3, sp = { five: 0.17, fiveDouble: 0.2, ten: 0.1, multi: 0.065, y: 0.16 }[style] || 0.15;
        if (style === 'fiveDouble' || style === 'y') {
          const mid = style === 'y' ? 0.06 : 0.035;   // schmaler Spalt zwischen den Doppelspeichen
          holes.push([...arc(a + mid, a + ang / 2 - sp / 2, hub + 0.03, false), ...arc(a + mid, a + ang / 2 - sp / 2, ro, true)]);
          holes.push([...arc(a + ang / 2 + sp / 2, a + ang - mid, hub + 0.03, false), ...arc(a + ang / 2 + sp / 2, a + ang - mid, ro, true)]);
          if (style === 'fiveDouble') holes.push([...arc(a - mid + 0.012, a + mid - 0.012, ro * 0.62, false), ...arc(a - mid + 0.012, a + mid - 0.012, ro, true)]);
        } else holes.push([...arc(a + sp / 2, a + ang - sp / 2, hub + 0.03, false), ...arc(a + sp / 2, a + ang - sp / 2, ro, true)]);
      }
      const disc = arc(0, 2 * Math.PI, rimR - 0.004, false);
      shape(rim, 'xy', disc, z(hw * 0.8 - dish) - (s < 0 ? 0.03 : 0), 0.03, { holes, curve: 4 });
      // Bremsscheibe, Sattel, Nabe, Radmuttern
      cyl('disc', 'z', z(hw * 0.05) - 0.014, z(hw * 0.05) + 0.014, x, r, rimR * 0.86, rimR * 0.86, 36);
      const ca0 = Math.PI * 0.62, ca1 = Math.PI * 0.92, cp = [...arc(ca0, ca1, rimR * 0.6, false), ...arc(ca0, ca1, rimR * 0.92, true)];
      shape(cal, 'xy', cp, z(hw * 0.05 + 0.02) - (s < 0 ? 0.06 : 0), 0.06, { curve: 4 });
      cyl(rim, 'z', z(hw * 0.8 - dish) - 0.02, z(hw * 0.8 - dish) + 0.025, x, r, hub, hub * 0.9, 24);
      for (let q = 0; q < 5; q++) { const a = q * 2 * Math.PI / 5; cyl('chrome', 'z', z(hw * 0.8 - dish), z(hw * 0.8 - dish) + s * 0.03, x + Math.cos(a) * 0.052, r + Math.sin(a) * 0.052, 0.011, 0.011, 8); }
    }
    // Radhaus: dunkle Schale über dem Rad
    function arch(x, r, zw, { ra = r + 0.06 } = {}) {
      const g = new THREE.CylinderGeometry(ra, ra, 2 * zw, 28, 1, true, Math.PI * 0.5, Math.PI); g.rotateX(Math.PI / 2); g.translate(x, r, 0); add('liner', g);
    }
    return { THREE, M, name, utils, parts, add, both, curve, section, hull, patch, lineX, lineJ, box, cyl, lathe, shape, wheel, arch, V3 };
  }
  return { materials, build };
})();
globalThis.CarKit = CarKit;
