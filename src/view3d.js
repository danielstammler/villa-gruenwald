// 3D-Modell (three.js): Haus aus HOUSE, Grundstück und Umgebung aus SITE, Sonnenstand mit Schatten.
// Weltkoordinaten: X = Plan-Ost, Y = Höhe, Z = -Plan-Nord. Das Haus liegt in X 0..16, Z 0..11,65.
const View3D = (() => {
  const Zh = HOUSE.Z;
  let renderer, scene, camP, camO, cam, controls, sun, moon, hemi, sky, skyScene, pmrem, envRT;
  let canvas, stage, raf = 0, last = 0, tween = null, envDue = 0, ready = false, active = false;
  const st = { y: 2026, m: 8, d: 5, h: 16.75, play: false, ortho: false, cut: false, cutX: 8, rotate: false };
  const L = {}, M = {}, houseMats = new Set(), batches = new Map();
  const cutPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 8);
  const ui = {};
  const ORTHO_H = 15.5;

  // ---------- Hilfsfunktionen ----------
  const P = (x, yPlan, z = 0) => new THREE.Vector3(x, z, -yPlan);
  const smooth = (v, a, b) => THREE.MathUtils.smoothstep(v, a, b);
  function canvasTex(w, h, draw, repeat = [1, 1]) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function makeMaterials() {
    const std = (color, r = 0.9, m = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: m, ...extra });
    // Putz in warmem Elfenbein wie im Rendering, im EG mit Quaderfugen
    const rust = canvasTex(64, 1024, (g, w, h) => {
      g.fillStyle = '#eadbbd'; g.fillRect(0, 0, w, h);
      const k = h / 6.6;
      for (let z = 0.5; z < 3.2; z += 0.3) {
        const y = h - z * k;
        g.fillStyle = '#c9b48e'; g.fillRect(0, y - 2, w, 3);
        g.fillStyle = '#f7eedc'; g.fillRect(0, y + 1, w, 1);
      }
    }, [1, 1 / 6.6]);
    // Dachdeckung: anthrazitfarbene Rechteckschindeln
    const shingles = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#141618'; g.fillRect(0, 0, w, h);
      const rows = 5, rh = h / rows, cw = w / 2.5;
      for (let r = 0; r < rows; r++) {
        const y = h - (r + 1) * rh, off = (r % 2) * 0.5;
        for (let c = -1; c < 4; c++) {
          const x = (c + off) * cw, v = 36 + Math.floor(rnd() * 12);
          g.fillStyle = `rgb(${v},${v + 3},${v + 7})`; g.fillRect(x + 1.5, y + 1.5, cw - 3, rh - 3);
          g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 1.5, y + 1.5, cw - 3, 3);
        }
      }
    });
    // Blick ins warm beleuchtete Innere mit hellen Vorhängen
    const interior = canvasTex(128, 256, (g, w, h) => {
      const grd = g.createLinearGradient(0, 0, 0, h);
      grd.addColorStop(0, '#6a4830'); grd.addColorStop(0.35, '#dba768'); grd.addColorStop(0.75, '#c48b51'); grd.addColorStop(1, '#79553a');
      g.fillStyle = grd; g.fillRect(0, 0, w, h);
      const glow = g.createRadialGradient(w / 2, h * 0.27, 2, w / 2, h * 0.27, w * 0.6);
      glow.addColorStop(0, 'rgba(255,238,195,0.95)'); glow.addColorStop(1, 'rgba(255,238,195,0)');
      g.fillStyle = glow; g.fillRect(0, 0, w, h);
      for (const [a, b] of [[0, w * 0.21], [w * 0.79, w]]) {
        g.fillStyle = '#f3eadb'; g.fillRect(a, 0, b - a, h);
        g.fillStyle = 'rgba(150,128,98,0.35)';
        for (let x = a + 4; x < b; x += 7) g.fillRect(x, 0, 2, h);
      }
    });
    interior.wrapS = interior.wrapT = THREE.ClampToEdgeWrapping; interior.repeat.set(1, 1);
    const lawn = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#5a8a35'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) {
        const v = rnd();
        g.fillStyle = v < 0.45 ? 'rgba(66,108,38,0.6)' : v < 0.9 ? 'rgba(122,166,72,0.55)' : 'rgba(168,196,104,0.6)';
        g.fillRect(rnd() * w, rnd() * h, 1.5, 2.5);
      }
    }, [0.3, 0.3]);
    const pave = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#d2ccbf'; g.fillRect(0, 0, w, h);
      const sx = w / 2, sy = h / 4;
      g.strokeStyle = '#b2ab9e'; g.lineWidth = 2;
      for (let r = 0; r < 4; r++) for (let c = -1; c < 3; c++) g.strokeRect(c * sx + (r % 2) * sx / 2, r * sy, sx, sy);
    }, [1 / 1.2, 1 / 1.2]);
    const glass = () => std(0x9a9590, 0.12, 0.25, { map: interior, emissiveMap: interior, emissive: 0xffffff, emissiveIntensity: 0.3 });
    Object.assign(M, {
      putz: std(0xeadbbd), putzRust: std(0xffffff, 0.92, 0, { map: rust }), putzHell: std(0xf3e9d6, 0.85),
      sockel: std(0xdccbab, 0.85), roof: std(0xffffff, 0.5, 0.3, { map: shingles, side: THREE.DoubleSide }),
      zink: std(0x26292d, 0.45, 0.35), frame: std(0x141618, 0.4, 0.3), metal: std(0x111316, 0.38, 0.6),
      glass: glass(), lamp: std(0x1c1c1c, 0.4, 0.2, { emissive: 0xffd49c, emissiveIntensity: 0 }),
      slab: std(0xb9b2a4, 0.9), beton: std(0xb7b3ab, 0.92),
      stone: std(0xdfd4c0, 0.8), pave: std(0xffffff, 0.9, 0, { map: pave }), lawn: std(0xffffff, 1, 0, { map: lawn }),
      ground: std(0x7b9262, 1), street: std(0x6b6f74, 0.95), coping: std(0xe9e2d4, 0.7),
      tile: std(0x8fcbe0, 0.35, 0, { side: THREE.BackSide }),
      water: std(0x2f86ad, 0.05, 0.1, { transparent: true, opacity: 0.8 }),
      site: std(0xeadbbd), siteHell: std(0xf3e9d6, 0.85), siteGlass: glass(),
      nb: std(0xd3cdc2, 0.95), nbRoof: std(0x8b7d72, 0.9, 0, { side: THREE.DoubleSide }), nb2: std(0xbfbaaf, 0.95),
      trunk: std(0x5c4938, 0.95), crowns: [0x527a37, 0x466c30, 0x5f8540].map(c => std(c, 0.95)),
      plants: { lavendel: std(0x8c72b8, 0.9), hortensie: std(0xf1ede2, 0.85), buchs: std(0x3d6a2a, 0.95), gruen: std(0x4f7a34, 0.95) },
      tg: new THREE.MeshStandardMaterial({ color: 0xe0892c, transparent: true, opacity: 0.3, depthWrite: false, roughness: 1 }),
      ug: new THREE.MeshStandardMaterial({ color: 0x5c80a0, transparent: true, opacity: 0.25, depthWrite: false, roughness: 1 }),
    });
    for (const k of ['putz', 'putzRust', 'putzHell', 'sockel', 'roof', 'zink', 'frame', 'metal', 'glass', 'lamp', 'slab']) {
      houseMats.add(M[k]); M[k].clipShadows = true;
    }
  }

  // Geometrien sammeln und je Material zusammenführen (wenige Draw-Calls).
  function addGeo(mat, geo, matrix) {
    if (matrix) geo.applyMatrix4(matrix);
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(g);
  }
  function addBox(mat, mx, x0, x1, y0, y1, z0, z1) {
    const g = new THREE.BoxGeometry(Math.max(x1 - x0, 0.004), Math.max(y1 - y0, 0.004), Math.max(z1 - z0, 0.004));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    addGeo(mat, g, mx);
  }
  function addCyl(mat, x, yPlan, z0, z1, rTop, rBot, seg = 20) {
    const g = new THREE.CylinderGeometry(rTop, rBot, z1 - z0, seg);
    g.translate(x, (z0 + z1) / 2, -yPlan);
    addGeo(mat, g, null);
  }
  // Toskanische Säule vom Boden z0 bis zur Balkonplatte z1
  function column(x, y, z0, z1, r) {
    boxPlan(M.putzHell, x - r * 1.35, x + r * 1.35, y - r * 1.35, y + r * 1.35, z0, z0 + 0.12);
    addCyl(M.putzHell, x, y, z0 + 0.12, z0 + 0.2, r * 1.2, r * 1.25);
    addCyl(M.putzHell, x, y, z0 + 0.2, z1 - 0.2, r * 0.86, r);
    addCyl(M.putzHell, x, y, z1 - 0.2, z1 - 0.1, r * 1.15, r * 0.9);
    boxPlan(M.putzHell, x - r * 1.3, x + r * 1.3, y - r * 1.3, y + r * 1.3, z1 - 0.1, z1);
  }
  // Quader in Plan-Koordinaten (x, yPlan) und Höhe z
  const boxPlan = (mat, x0, x1, y0, y1, z0, z1) => addBox(mat, null, x0, x1, z0, z1, -Math.max(y0, y1), -Math.min(y0, y1));
  function flushBatches(parent) {
    for (const [mat, geos] of batches) {
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
      mesh.castShadow = mat !== M.glass && mat !== M.siteGlass && mat !== M.water;
      mesh.receiveShadow = true;
      parent.add(mesh);
    }
    batches.clear();
  }
  function facadeMatrix(side) {
    const f = HOUSE.frame[side], m = new THREE.Matrix4();
    m.makeBasis(new THREE.Vector3(f.r[0], 0, -f.r[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(f.n[0], 0, -f.n[1]));
    m.setPosition(f.o[0], 0, -f.o[1]);
    return m;
  }
  const v2 = (x, y) => new THREE.Vector2(x, y);
  const rectPts = (x0, y0, x1, y1) => [v2(x0, y0), v2(x1, y0), v2(x1, y1), v2(x0, y1)];
  function shapeFrom(pts, holes = []) {
    const s = new THREE.Shape(pts.map(p => v2(p[0], p[1])));
    for (const h of holes) s.holes.push(new THREE.Path(h.map(p => v2(p[0], p[1]))));
    return s;
  }
  function flat(pts, mat, y, holes) {
    const g = new THREE.ShapeGeometry(shapeFrom(pts, holes)); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat); m.position.y = y; m.receiveShadow = true; return m;
  }
  function extrude(pts, mat, y0, h, holes) {
    const g = new THREE.ExtrudeGeometry(shapeFrom(pts, holes), { depth: h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
  }
  function wallWithHoles(len, z0, z1, holes, depth, mats, mx) {
    const sh = new THREE.Shape(rectPts(0, z0, len, z1));
    for (const o of holes) sh.holes.push(new THREE.Path(rectPts(o.u0, o.z0, o.u1, o.z1)));
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth); g.applyMatrix4(mx);
    const m = new THREE.Mesh(g, mats); m.castShadow = m.receiveShadow = true; return m;
  }

  // ---------- Bauteile ----------
  function railing(mat, mx, u0, u1, z0, z1, out) {
    const n = Math.max(2, Math.round((u1 - u0) / 0.11));
    for (let i = 0; i <= n; i++) {
      const u = u0 + (u1 - u0) * i / n;
      addBox(mat, mx, u - 0.009, u + 0.009, z0, z1, out - 0.009, out + 0.009);
    }
    addBox(mat, mx, u0 - 0.02, u1 + 0.02, z1 - 0.035, z1, out - 0.025, out + 0.025);
    addBox(mat, mx, u0, u1, z0, z0 + 0.03, out - 0.015, out + 0.015);
  }
  function windowUnit(mx, o, face, depth) {
    const w = o.u1 - o.u0, fw = 0.07, gl = Math.min(0.15, depth * 0.55);
    if (o.kind === 'eingang') {
      addBox(M.frame, mx, o.u0, o.u1, o.z0, o.z1, face - gl - 0.06, face - gl);
      const lw = w / 2;
      for (let i = 0; i < 2; i++) {
        const a = o.u0 + i * lw;
        addBox(M.glass, mx, a + 0.16, a + lw - 0.16, o.z0 + 1.0, o.z1 - 0.22, face - gl + 0.005, face - gl + 0.012);
      }
      addBox(M.metal, mx, o.u0 + w / 2 - 0.2, o.u0 + w / 2 - 0.17, o.z0 + 0.9, o.z0 + 1.3, face - gl, face - gl + 0.06);
      return;
    }
    addBox(M.glass, mx, o.u0 + 0.02, o.u1 - 0.02, o.z0 + 0.02, o.z1 - 0.02, face - gl - 0.012, face - gl);
    const f0 = face - gl - 0.04, f1 = face - gl + 0.03;
    addBox(M.frame, mx, o.u0, o.u0 + fw, o.z0, o.z1, f0, f1);
    addBox(M.frame, mx, o.u1 - fw, o.u1, o.z0, o.z1, f0, f1);
    addBox(M.frame, mx, o.u0, o.u1, o.z1 - fw, o.z1, f0, f1);
    addBox(M.frame, mx, o.u0, o.u1, o.z0, o.z0 + fw, f0, f1);
    if (o.leaves === 2) { const c = (o.u0 + o.u1) / 2; addBox(M.frame, mx, c - 0.045, c + 0.045, o.z0, o.z1, f0, f1); }
    if (o.kind === 'fenster') addBox(M.sockel, mx, o.u0 - 0.05, o.u1 + 0.05, o.z0 - 0.05, o.z0, face - gl, face + 0.05);
    if (o.rail) railing(M.metal, mx, o.u0 + 0.04, o.u1 - 0.04, o.z0 + 0.05, o.rail, face + 0.02);
  }
  function buildFacade(side, parent) {
    const F = HOUSE.fas[side], mx = facadeMatrix(side), len = F.len;
    parent.add(wallWithHoles(len, 0, Zh.gesimsU, F.open, HOUSE.wall, [M.putzRust, M.putz], mx));
    for (const o of F.open) windowUnit(mx, o, 0, HOUSE.wall);
    for (const r of F.rails || []) {
      addBox(M.putzHell, mx, r.u0 - 0.05, r.u1 + 0.05, r.z0 - 0.1, r.z0, 0, 0.16);
      railing(M.metal, mx, r.u0, r.u1, r.z0, r.z1, 0.12);
    }
    for (const [a, b] of F.pil) addBox(M.putzHell, mx, a, b, Zh.sockel, Zh.gesimsU, 0, 0.08);
    addBox(M.sockel, mx, -0.04, len + 0.04, 0, Zh.sockel, 0, 0.04);
    addBox(M.putzHell, mx, -0.1, len + 0.1, Zh.gurtU, Zh.gurtO, 0, 0.1);
    addBox(M.putzHell, mx, -0.18, len + 0.18, Zh.gesimsU, 6.69, 0, 0.18);
    addBox(M.putzHell, mx, -0.35, len + 0.35, 6.69, Zh.gesimsO, 0, 0.35);
    for (const c of F.lamps || []) {
      addBox(M.metal, mx, c - 0.09, c + 0.09, 1.98, 2.36, 0.08, 0.1);
      addBox(M.lamp, mx, c - 0.06, c + 0.06, 2.02, 2.32, 0.1, 0.22);
    }
    if (F.portal) {
      const p = F.portal;
      addBox(M.putzHell, mx, p.u0, p.u0 + 0.25, Zh.ffbEG, p.z1, 0, 0.06);
      addBox(M.putzHell, mx, p.u1 - 0.25, p.u1, Zh.ffbEG, p.z1, 0, 0.06);
      addBox(M.putzHell, mx, p.u0, p.u1, 2.85, p.z1, 0, 0.06);
    }
    if (F.canopy) { const c = F.canopy; addBox(M.metal, mx, c.u0, c.u1, c.z0, c.z1, 0, c.depth); }
    if (F.eaveRail) {
      const e = F.eaveRail;
      railing(M.metal, mx, e.u0, e.u1, e.z0, e.z1, 0.13);
      for (const [a, b] of F.piers) {
        addBox(M.putzHell, mx, a, b, Zh.gesimsO, 7.92, -0.05, 0.3);
        addBox(M.putzHell, mx, a - 0.05, b + 0.05, 7.92, 8.0, -0.1, 0.35);
      }
    }
    for (const d of F.dormers || []) {
      const zb = 7.3, face = -d.front, frontMat = d.clad === 'putz' ? M.putz : M.zink;
      parent.add(wallWithHoles(d.u1 - d.u0, zb, d.top, d.win.map(w => ({ ...w, u0: w.u0 - d.u0, u1: w.u1 - d.u0 })), 0.12,
        frontMat, mx.clone().multiply(new THREE.Matrix4().makeTranslation(d.u0, 0, face))));
      addBox(M.zink, mx, d.u0, d.u1, zb, d.top, -2.7, face - 0.12);
      addBox(M.zink, mx, d.u0 - 0.06, d.u1 + 0.06, d.top - 0.06, d.top + 0.03, -2.7, face + 0.06);
      if (d.clad === 'putz') {
        addBox(M.putzHell, mx, d.u0 - 0.12, d.u1 + 0.12, d.top - 0.34, d.top - 0.12, face - 0.02, face + 0.14);
        addBox(M.putzHell, mx, d.u0, d.u0 + 0.22, zb, d.top - 0.34, face, face + 0.06);
        addBox(M.putzHell, mx, d.u1 - 0.22, d.u1, zb, d.top - 0.34, face, face + 0.06);
      }
      for (const w of d.win) windowUnit(mx, w, face, 0.12);
    }
  }
  function roofGeometry() {
    const o = HOUSE.ueberstand, ze = HOUSE.traufe, W = HOUSE.W, D = HOUSE.D, r1 = HOUSE.run1, r2 = HOUSE.run2, zk = Zh.knick, zf = Zh.first;
    const E = { x0: -o, x1: W + o, y0: -D - o, y1: o }, K = { x0: r1, x1: W - r1, y0: -D + r1, y1: -r1 }, R = { x0: r1 + r2, x1: W - r1 - r2, y: -D / 2 };
    const faces = [
      [P(E.x0, E.y0, ze), P(E.x1, E.y0, ze), P(K.x1, K.y0, zk), P(K.x0, K.y0, zk)],
      [P(E.x1, E.y1, ze), P(E.x0, E.y1, ze), P(K.x0, K.y1, zk), P(K.x1, K.y1, zk)],
      [P(E.x1, E.y0, ze), P(E.x1, E.y1, ze), P(K.x1, K.y1, zk), P(K.x1, K.y0, zk)],
      [P(E.x0, E.y1, ze), P(E.x0, E.y0, ze), P(K.x0, K.y0, zk), P(K.x0, K.y1, zk)],
      [P(K.x0, K.y0, zk), P(K.x1, K.y0, zk), P(R.x1, R.y, zf), P(R.x0, R.y, zf)],
      [P(K.x1, K.y1, zk), P(K.x0, K.y1, zk), P(R.x0, R.y, zf), P(R.x1, R.y, zf)],
      [P(K.x1, K.y0, zk), P(K.x1, K.y1, zk), P(R.x1, R.y, zf)],
      [P(K.x0, K.y1, zk), P(K.x0, K.y0, zk), P(R.x0, R.y, zf)],
    ];
    const pos = [], uv = [];
    for (const f of faces) {
      const a = f[0], e1 = f[1].clone().sub(a).normalize();
      const n = f[1].clone().sub(a).cross(f[f.length - 1].clone().sub(a)).normalize();
      const e2 = new THREE.Vector3().crossVectors(n, e1);
      for (let i = 1; i < f.length - 1; i++) for (const p of [a, f[i], f[i + 1]]) {
        pos.push(p.x, p.y, p.z); const d = p.clone().sub(a); uv.push(d.dot(e1), d.dot(e2));
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  }
  function buildHouse() {
    const g = new THREE.Group();
    for (const s of ['S', 'N', 'E', 'W']) buildFacade(s, g);
    const roof = new THREE.Mesh(roofGeometry(), M.roof); roof.castShadow = roof.receiveShadow = true; g.add(roof);
    const r1 = HOUSE.run1 + HOUSE.run2;
    boxPlan(M.zink, r1 - 0.05, HOUSE.W - r1 + 0.05, -HOUSE.D / 2 - 0.08, -HOUSE.D / 2 + 0.08, Zh.first - 0.03, Zh.first + 0.05);
    for (const [z0, z1] of [[-0.15, Zh.ffbEG], [Zh.gurtU, Zh.ffbOG], [Zh.deckeDG, Zh.ffbDG]]) boxPlan(M.slab, 0.36, 15.64, -11.29, -0.36, z0, z1);
    // Freisitz mit Dachterrasse
    const f = HOUSE.freisitz;
    boxPlan(M.stone, f.x0, f.x1, f.y0, f.y1, 0, f.z);
    for (const [a, b] of [[f.y0, f.y0 + f.col], [f.y1 - f.col, f.y1]]) boxPlan(M.putzHell, f.x1 - f.col, f.x1, a, b, f.z, f.slab[0]);
    boxPlan(M.putzHell, f.x0, f.x1 + 0.05, f.y0 - 0.05, f.y1, f.slab[0], f.slab[1]);
    const mxS = new THREE.Matrix4().makeTranslation(0, 0, -f.y0 - 0.06);
    railing(M.metal, mxS, f.x0 + 0.1, f.x1 - 0.06, f.slab[1], f.rail, 0);
    const mxE = new THREE.Matrix4().makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(f.x1 - 0.06, 0, 0));
    railing(M.metal, mxE, f.y0 + 0.06, f.y1 - 0.06, f.slab[1], f.rail, 0);
    const mxN = new THREE.Matrix4().makeTranslation(0, 0, -f.y1 + 0.06);
    railing(M.metal, mxN, f.x0 + 0.1, f.x1 - 0.06, f.slab[1], f.rail, 0);
    // Balkon über der Terrasse auf vier Säulen
    const bk = HOUSE.balkon;
    boxPlan(M.putzHell, bk.x0, bk.x1, bk.y0, bk.y1, bk.slab[0], bk.slab[1]);
    boxPlan(M.putzHell, bk.x0 - 0.06, bk.x1 + 0.06, bk.y0 - 0.06, bk.y1, bk.slab[1] - 0.12, bk.slab[1]);
    for (const x of bk.cols) column(x, bk.colY, HOUSE.terrasse.z, bk.slab[0], bk.colR);
    railing(M.metal, new THREE.Matrix4().makeTranslation(0, 0, -bk.y0 - 0.07), bk.x0 + 0.07, bk.x1 - 0.07, bk.slab[1], bk.rail, 0);
    for (const xr of [bk.x0 + 0.07, bk.x1 - 0.07]) {
      railing(M.metal, new THREE.Matrix4().makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(xr, 0, 0)), bk.y0 + 0.07, bk.y1 - 0.02, bk.slab[1], bk.rail, 0);
    }
    const t = HOUSE.terrasse, p = HOUSE.podest;
    flushBatches(g);
    boxPlan(M.stone, t.x0, t.x1, t.y0, t.y1, 0, t.z);
    boxPlan(M.stone, p.x0, p.x1, p.y0, p.y1, 0, p.z);
    return g;
  }
  function buildSite() {
    const g = new THREE.Group(), C = SITE.concept;
    const poolOuter = C.pool;
    // Rampe zur Tiefgarage in der Zufahrt (ca. 14 %), das letzte Stück läuft unter dem Poolhaus hindurch
    const R0 = HOUSE.rampe, trench = [[R0.x0, R0.y0], [R0.x1, R0.y0], [R0.x1, R0.yPH], [R0.x0, R0.yPH]];
    const zPH = -(R0.yPH - R0.y0) * R0.gefaelle;
    const ground = new THREE.Shape(rectPts(-260, -260, 280, 260));
    for (const h of [poolOuter, trench]) ground.holes.push(new THREE.Path(h.map(q => v2(q[0], q[1]))));
    const gg = new THREE.ShapeGeometry(ground); gg.rotateX(-Math.PI / 2);
    const gm = new THREE.Mesh(gg, M.ground); gm.position.y = -0.03; gm.receiveShadow = true; g.add(gm);
    L.grund = [gm];
    for (const s of SITE.streets) { const m = flat(s, M.street, -0.01); g.add(m); L.grund.push(m); }
    const lawn = flat(SITE.plot, M.lawn, 0.004, [poolOuter, trench]); g.add(lawn); L.grund.push(lawn);
    const zufahrtEben = [[19.732, -50.499], [24.731, -51.342], [24.731, -44.471], [R0.x1, -44.471], [R0.x1, R0.y0], [19.732, R0.y0]];
    for (const P0 of [C.zuwegung, zufahrtEben]) { const m = flat(P0, M.pave, 0.016); g.add(m); L.grund.push(m); }
    const rl = Math.hypot(R0.yPH - R0.y0, zPH), ramp = new THREE.Mesh(new THREE.BoxGeometry(R0.x1 - R0.x0, 0.2, rl), M.beton);
    ramp.position.set((R0.x0 + R0.x1) / 2, zPH / 2 - 0.1, -(R0.y0 + R0.yPH) / 2); ramp.rotation.x = -Math.atan2(-zPH, R0.yPH - R0.y0);
    ramp.receiveShadow = true; g.add(ramp);
    boxPlan(M.beton, R0.x0 - 0.2, R0.x0, R0.y0, R0.yPH, zPH - 0.3, 0.15);
    boxPlan(M.beton, R0.x1, R0.x1 + 0.2, R0.y0, R0.yPH, zPH - 0.3, 0.15);
    boxPlan(M.beton, R0.x0, R0.x1, R0.yPH - 0.3, R0.yPH, -0.35, 0.02);
    boxPlan(M.frame, R0.x0, R0.x1, R0.yPH - 0.6, R0.yPH - 0.3, zPH - 0.1, -0.35);
    for (const xr of [R0.x0 - 0.1, R0.x1 + 0.1]) {
      railing(M.metal, new THREE.Matrix4().makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(xr, 0, 0)), R0.y0 + 0.3, R0.yPH - 0.1, 0.15, 1.05, 0);
    }
    // Pool
    g.add(extrude(poolOuter, M.coping, 0, 0.06, [C.poolWasser]));
    const pw = C.poolWasser, w = pw[1][0] - pw[0][0], d = pw[0][1] - pw[2][1];
    const basin = new THREE.Mesh(new THREE.BoxGeometry(w, 1.5, d), M.tile);
    basin.position.set(pw[0][0] + w / 2, -0.75, -(pw[0][1] - d / 2)); basin.receiveShadow = true; g.add(basin);
    g.add(flat(pw, M.water, -0.12));
    // Poolhaus
    const ph = C.poolhaus;
    g.add(extrude(ph, M.site, 0, 3.0));
    const [px0, py1] = ph[0], [px1, py0] = ph[2];
    const roofPH = extrude([[px0 - 0.15, py1 + 0.15], [px1 + 0.15, py1 + 0.15], [px1 + 0.15, py0 - 0.15], [px0 - 0.15, py0 - 0.15]], M.siteHell, 3.0, 0.22);
    g.add(roofPH);
    const pg = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.45, 5.0), M.siteGlass);
    pg.position.set(px0 - 0.01, 0.25 + 1.225, -(py0 + py1) / 2); g.add(pg);
    // Grenze
    const pts = [...SITE.plot, SITE.plot[0]].map(q => P(q[0], q[1], 0.05));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x24292e, dashSize: 0.9, gapSize: 0.45 }));
    line.computeLineDistances();
    const grenze = new THREE.Group(); grenze.add(line);
    for (const s of SITE.stones) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.22), M.coping); m.position.copy(P(s[0], s[1], 0.06)); grenze.add(m); }
    g.add(grenze); L.grenze = grenze;
    // Bäume und Schutzbereiche
    const baeume = new THREE.Group(), ico = new THREE.IcosahedronGeometry(1, 3);
    ico.deleteAttribute('normal'); ico.deleteAttribute('uv');
    SITE.trees.forEach((t, i) => {
      const H = Math.min(24, 4 + 2.0 * t.r);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14 + 0.02 * t.r, 0.2 + 0.03 * t.r, H * 0.55, 8), M.trunk);
      trunk.position.copy(P(t.c[0], t.c[1], H * 0.275)); trunk.castShadow = true; baeume.add(trunk);
      const cg = mergeVertices(ico.clone()), pa = cg.attributes.position;
      for (let k = 0; k < pa.count; k++) {
        const x = pa.getX(k), y = pa.getY(k), z = pa.getZ(k);
        const h = Math.sin(Math.round(x * 997) * 12.9898 + Math.round(y * 991) * 78.233 + Math.round(z * 983) * 37.719 + i * 4.1) * 43758.5453;
        const f = 0.86 + 0.26 * (h - Math.floor(h));
        pa.setXYZ(k, x * f, y * f, z * f);
      }
      cg.computeVertexNormals();
      const crown = new THREE.Mesh(cg, M.crowns[i % 3]);
      crown.scale.set(t.r, t.r * 0.92, t.r); crown.position.copy(P(t.c[0], t.c[1], H - t.r * 0.92));
      crown.castShadow = true; crown.receiveShadow = true; baeume.add(crown);
    });
    const red = new THREE.MeshBasicMaterial({ color: 0xc23a2b, transparent: true, opacity: 0.85 });
    const redFill = new THREE.MeshBasicMaterial({ color: 0xc23a2b, transparent: true, opacity: 0.08, depthWrite: false });
    for (const z of SITE.schutz) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(z.r - 0.07, z.r + 0.07, 128), red);
      ring.rotation.x = -Math.PI / 2; ring.position.copy(P(z.c[0], z.c[1], 0.04)); baeume.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(z.r, 96), redFill);
      disc.rotation.x = -Math.PI / 2; disc.position.copy(P(z.c[0], z.c[1], 0.035)); baeume.add(disc);
    }
    baeume.add(plantBeds());
    g.add(baeume); L.baeume = baeume;
    // Nachbarschaft
    const nb = new THREE.Group();
    // Nachbarhäuser: Grundriss aus der Flurkarte, Dachform und -farbe nach Daniels Luftbild, Höhen als EG + Dachgeschoss
    for (const b of SITE.neighbors) {
      const st = neighborStyle(b.pts), rm = nbRoofMat(st.color);
      if (st.roof === 'walm') { nb.add(extrudeMulti(b.pts, [M.nb, M.nb], st.wall)); nb.add(roofOver(b.pts, st.wall, rm)); }
      else {
        nb.add(extrudeMulti(b.pts, [rm, M.nb], st.wall));
        if (st.roof === 'staffel') { const top = extrudeMulti(scalePts(b.pts, 0.7), [rm, M.nb], st.top - st.wall); top.position.y = st.wall; nb.add(top); }
      }
    }
    for (const b of SITE.secondary) nb.add(extrudeMulti(b.pts, [M.nbRoof, M.nb2], b.h));
    const seg = []; for (const [a, b, c, e] of SITE.parcelLines) seg.push(P(a, b, 0.03), P(c, e, 0.03));
    nb.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({ color: 0x5b6168 })));
    g.add(nb); L.nachbarn = nb;
    // Tiefgarage und Untergeschoss (unterirdisch, nur als Hülle)
    const tg = new THREE.Group();
    const tgm = extrude(C.tg, M.tg, -3.4, 2.8); tgm.castShadow = false; tg.add(tgm);
    tg.add(new THREE.LineSegments(new THREE.EdgesGeometry(tgm.geometry), new THREE.LineBasicMaterial({ color: 0xc8711c })));
    const ugm = extrude(C.haus, M.ug, -3.4, 3.4); ugm.castShadow = false; tg.add(ugm);
    tg.add(new THREE.LineSegments(new THREE.EdgesGeometry(ugm.geometry), new THREE.LineBasicMaterial({ color: 0x4f6f8c })));
    tg.visible = false; g.add(tg); L.tg = tg;
    // Baurecht: Wandhöhe 7,25 m und Firsthöhe 11,12 m als gestrichelte Höhenlinien
    const br = new THREE.Group();
    for (const [z, o] of [[Zh.wand, 0], [Zh.first, 0]]) {
      const q = [P(-o, 0, z), P(16 + o, 0, z), P(16 + o, -11.65, z), P(-o, -11.65, z), P(-o, 0, z)];
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(q), new THREE.LineDashedMaterial({ color: 0xd2382a, dashSize: 0.5, gapSize: 0.3 }));
      l.computeLineDistances(); br.add(l);
    }
    for (const z of [Zh.wand, Zh.first]) {
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([P(-3, -11.65 - 0.5, z), P(22, -11.65 - 0.5, z)]),
        new THREE.LineDashedMaterial({ color: 0xd2382a, dashSize: 0.5, gapSize: 0.3 }));
      l.computeLineDistances(); br.add(l);
    }
    br.visible = false; g.add(br); L.baurecht = br;
    flushBatches(g);
    return g;
  }
  // Beete wie im Rendering: Lavendel, weiße Hortensien und Buchskugeln vor der Fassade
  function plantBeds() {
    const grp = new THREE.Group(), sph = new THREE.SphereGeometry(1, 12, 9);
    const items = { lavendel: [], hortensie: [], buchs: [], gruen: [] };
    const bed = (x0, x1, y0, y1, kinds, dens) => {
      const n = Math.round((x1 - x0) * (y1 - y0) * dens);
      for (let i = 0; i < n; i++) {
        const k = kinds[Math.floor(rnd() * kinds.length)];
        const r = k === 'lavendel' ? 0.16 + rnd() * 0.07 : k === 'hortensie' ? 0.3 + rnd() * 0.12 : 0.28 + rnd() * 0.1;
        items[k].push([x0 + rnd() * (x1 - x0), y0 + rnd() * (y1 - y0), r]);
      }
    };
    bed(0.25, 4.3, -12.55, -11.78, ['lavendel', 'lavendel', 'hortensie', 'gruen'], 9);
    bed(11.7, 15.75, -12.55, -11.78, ['lavendel', 'lavendel', 'hortensie', 'gruen'], 9);
    bed(-0.95, -0.15, -11.4, -0.6, ['hortensie', 'gruen', 'lavendel'], 4);
    bed(19.1, 19.8, -10.8, -5.9, ['hortensie', 'lavendel'], 5);
    bed(0.3, 5.3, 0.15, 0.85, ['gruen', 'hortensie'], 4);
    bed(10.7, 15.7, 0.15, 0.85, ['gruen', 'hortensie'], 4);
    for (const [x, y] of [[4.15, -14.95], [11.85, -14.95], [19.35, -11.15], [5.2, 0.55], [10.8, 0.55], [-0.6, -12.2], [16.6, -12.2]]) items.buchs.push([x, y, 0.42]);
    for (const [k, list] of Object.entries(items)) {
      const im = new THREE.InstancedMesh(sph, M.plants[k], list.length), m = new THREE.Matrix4();
      const sy = k === 'lavendel' ? 1.5 : 0.9, lift = k === 'lavendel' ? 1.2 : 0.8;
      list.forEach(([x, y, r], i) => { m.makeScale(r, r * sy, r).setPosition(x, r * lift, -y); im.setMatrixAt(i, m); });
      im.castShadow = true; im.receiveShadow = true; grp.add(im);
    }
    return grp;
  }
  // Dachform und Farbe der Nachbarhäuser nach dem Luftbild (Google Earth, Foto vom 3.11.2026); Schlüssel = Hausnummer der Flurkarte
  const NB_STYLE = {
    '8a': { roof: 'walm', color: 0x9a4c3d, wall: 3.9 }, '8': { roof: 'staffel', color: 0xb8b4ab, wall: 3.4, top: 6.5 },
    '9': { roof: 'flach', color: 0x8b9375, wall: 6.4 }, '53': { roof: 'walm', color: 0x6c717b, wall: 4.2 },
    '12a': { roof: 'walm', color: 0x666a72, wall: 4.0 }, '55a': { roof: 'walm', color: 0x7e828a, wall: 4.0 },
    '55b': { roof: 'walm', color: 0x76717d, wall: 4.0 }, '10': { roof: 'walm', color: 0x72767f, wall: 4.0 },
  };
  function outline(pts) {
    let A = 0, Pm = 0, cx = 0, cy = 0;
    pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length], c = p[0] * q[1] - q[0] * p[1]; A += c / 2; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c; Pm += Math.hypot(q[0] - p[0], q[1] - p[1]); });
    return { A, Pm, cx: cx / (6 * A), cy: cy / (6 * A) };
  }
  const scalePts = (pts, k) => { const { cx, cy } = outline(pts); return pts.map(p => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]); };
  function neighborStyle(pts) {
    const { cx, cy } = outline(pts);
    let best = null, dBest = 1e9;
    for (const l of SITE.labels) { const d = Math.hypot(l.p[0] - cx, l.p[1] - cy); if (d < dBest) { dBest = d; best = l.t; } }
    return NB_STYLE[best] || { roof: 'walm', color: 0x777b83, wall: 3.9 };
  }
  const nbRoofMats = new Map();
  function nbRoofMat(c) {
    if (!nbRoofMats.has(c)) nbRoofMats.set(c, new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.05, side: THREE.DoubleSide }));
    return nbRoofMats.get(c);
  }
  // Steildach über einem beliebigen Grundriss: Traufe auf zEave, Dachfläche zur verkleinerten Firstfigur (wirkt wie ein Walmdach)
  function roofOver(pts, zEave, mat = M.nbRoof) {
    const { A, Pm, cx, cy } = outline(pts);
    const rise = Math.min(5.2, 1.6 * Math.abs(A) / Pm), k = 0.22, zt = zEave + rise;
    const top = pts.map(p => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]);
    const pos = [], E = (p, z) => [p[0], z, -p[1]];
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      pos.push(...E(pts[i], zEave), ...E(pts[j], zEave), ...E(top[j], zt), ...E(pts[i], zEave), ...E(top[j], zt), ...E(top[i], zt));
    }
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(top.map(p => v2(p[0], p[1])), [])) pos.push(...E(top[a], zt), ...E(top[b], zt), ...E(top[c], zt));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
  }
  function extrudeMulti(pts, mats, h) {
    const g = new THREE.ExtrudeGeometry(shapeFrom(pts), { depth: h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mats); m.castShadow = m.receiveShadow = true; return m;
  }

  // ---------- Licht, Himmel, Sonne ----------
  function setupLights(big) {
    hemi = new THREE.HemisphereLight(0xdde8f4, 0x6d6551, 0.4); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff0d8, 3); sun.castShadow = true;
    sun.shadow.mapSize.set(big ? 4096 : 2048, big ? 4096 : 2048);
    Object.assign(sun.shadow.camera, { left: -58, right: 58, top: 58, bottom: -58, near: 1, far: 420 }); sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    sun.target.position.set(10, 0, 20); scene.add(sun, sun.target);
    moon = new THREE.DirectionalLight(0x9db2ff, 0); moon.position.set(-60, 80, -30); scene.add(moon);
    sky = new Sky(); sky.scale.setScalar(4000);
    const u = sky.material.uniforms;
    u.turbidity.value = 5.5; u.rayleigh.value = 1.3; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.86;
    scene.add(sky);
    skyScene = new THREE.Scene(); const sky2 = new Sky(); sky2.material = sky.material; sky2.scale.setScalar(4000); skyScene.add(sky2);
    pmrem = new THREE.PMREMGenerator(renderer);
  }
  function updateSun() {
    const p = SUN.position(st.y, st.m, st.d, st.h, SITE.geo.lat, SITE.geo.lon);
    const v = SUN.planDir(p.az, p.el, SITE.north.true);
    const dir = new THREE.Vector3(v.x, v.z, -v.y).normalize();
    sky.material.uniforms.sunPosition.value.copy(dir);
    const day = smooth(p.el, -5, 8);
    sun.position.copy(sun.target.position).addScaledVector(dir, 180);
    sun.intensity = 3.2 * smooth(p.el, -0.5, 10);
    sun.color.setHSL(0.085, 0.85, 0.6 + 0.28 * smooth(p.el, 4, 45));
    hemi.intensity = 0.12 + 0.36 * day;
    moon.intensity = 0.55 * (1 - day);
    const night = 1 - smooth(p.el, -3, 6);
    M.glass.emissiveIntensity = M.siteGlass.emissiveIntensity = 0.28 + 0.85 * night;
    M.lamp.emissiveIntensity = 2.4 * night;
    renderer.toneMappingExposure = 0.62 + 0.3 * (1 - day);
    envDue = performance.now() + 120;
    const rs = SUN.riseSet(st.y, st.m, st.d, SITE.geo.lat, SITE.geo.lon);
    if (ui.info) ui.info.innerHTML =
      `<div><dt>Azimut</dt><dd>${Math.round(p.az)}°</dd></div><div><dt>Höhe</dt><dd>${p.el.toFixed(1).replace('.', ',')}°</dd></div>` +
      `<div><dt>Aufgang</dt><dd>${SUN.hhmm(rs.rise)}</dd></div><div><dt>Untergang</dt><dd>${SUN.hhmm(rs.set)}</dd></div>`;
    if (ui.hudSun) ui.hudSun.textContent = `${String(st.d).padStart(2, '0')}.${String(st.m + 1).padStart(2, '0')}.${st.y} · ${SUN.hhmm(st.h)} Uhr · Sonne ${p.el > 0 ? `${Math.round(p.az)}° / ${Math.round(p.el)}° hoch` : 'unter dem Horizont'}`;
  }
  function updateEnv() {
    const old = envRT; envRT = pmrem.fromScene(skyScene, 0, 0.1, 6000);
    scene.environment = envRT.texture; if (old) old.dispose();
  }

  // ---------- Kamera ----------
  const PRESETS = {
    garten: { pos: [8.6, 1.7, 38.5], tgt: [9.2, 5.0, 5.8] },
    eingang: { pos: [14.5, 2.2, -21], tgt: [8, 4.8, 5.8] },
    ost: { pos: [45, 3, 1], tgt: [12, 4.6, 5.8] },
    west: { pos: [-27, 2.5, 13], tgt: [8, 4.8, 5.8] },
    vogel: { pos: [-31, 37, 60], tgt: [10, 0, 18] },
    oben: { pos: [10.4, 98, 20.32], tgt: [10.4, 0, 20.3] },
    schnitt: { pos: [40, 7.5, 7], tgt: [8, 5, 5.8] },
  };
  function goTo(name) {
    if (name === 'front') { setOrtho(true); return; }
    setOrtho(false);
    const p = PRESETS[name];
    tween = { t0: performance.now(), dur: 1100, fp: camP.position.clone(), ft: controls.target.clone(), tp: new THREE.Vector3(...p.pos), tt: new THREE.Vector3(...p.tgt) };
  }
  function setOrtho(on) {
    st.ortho = on; cam = on ? camO : camP; controls.object = cam; tween = null;
    if (on) { camO.position.set(9.5, 5.7, 90); controls.target.set(9.5, 5.7, 0); camO.zoom = 1; }
    camO.near = on ? 90 - 16 : 0.1; camO.updateProjectionMatrix();
    controls.update();
    ui.scale.hidden = !on;
    if (on) setLayer('baurecht', true, true);
  }
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camP.aspect = w / h;
    camP.fov = w / h < 1.25 ? Math.min(68, 2 * Math.atan(Math.tan(19 * Math.PI / 180) * 1.25 / (w / h)) * 180 / Math.PI) : 38;
    camP.updateProjectionMatrix();
    const a = w / h, oh = Math.max(ORTHO_H, 24 / a);
    camO.left = -oh * a / 2; camO.right = oh * a / 2; camO.top = oh / 2; camO.bottom = -oh / 2; camO.updateProjectionMatrix();
  }
  function updateScale() {
    if (!st.ortho) return;
    const ppm = stage.clientHeight / ((camO.top - camO.bottom) / camO.zoom);
    const len = ppm * 5 > 220 ? 2 : ppm * 5 < 60 ? 10 : 5;
    ui.scaleBar.style.width = `${Math.round(ppm * len)}px`;
    ui.scaleTxt.textContent = `${len} m`;
  }
  function setLayer(name, on, syncUi) {
    if (!L[name]) return;
    const list = Array.isArray(L[name]) ? L[name] : [L[name]];
    for (const o of list) o.visible = on;
    if (name === 'tg') {
      for (const m of [M.lawn, M.ground, M.street, M.pave]) { m.transparent = on; m.opacity = on ? 0.32 : 1; m.depthWrite = !on; m.needsUpdate = true; }
      controls.maxPolarAngle = on ? Math.PI * 0.9 : Math.PI * 0.495;
    }
    if (syncUi) { const el = document.getElementById(`ly-${name}`); if (el) el.checked = on; }
  }
  function setCut(on, x = st.cutX) {
    st.cut = on; st.cutX = x; cutPlane.constant = x;
    for (const m of houseMats) { m.clippingPlanes = on ? [cutPlane] : []; m.needsUpdate = true; }
  }

  // ---------- Schleife ----------
  function loop(t) {
    raf = active ? requestAnimationFrame(loop) : 0;
    const dt = Math.min(0.1, (t - last) / 1000 || 0); last = t;
    if (tween) {
      const k = Math.min(1, (t - tween.t0) / tween.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camP.position.lerpVectors(tween.fp, tween.tp, e); controls.target.lerpVectors(tween.ft, tween.tt, e);
      if (k >= 1) tween = null;
    }
    if (st.play) {
      st.h += dt * 0.9; if (st.h > 22.5) st.h = 4;
      updateSun(); if (ui.time) { ui.time.value = st.h; ui.timeOut.textContent = SUN.hhmm(st.h); }
    }
    if (envDue && t > envDue) { envDue = 0; updateEnv(); }
    controls.autoRotate = st.rotate && !st.ortho;
    controls.update();
    renderer.render(scene, cam);
  }

  function init(stageEl) {
    stage = stageEl; canvas = stage.querySelector('canvas');
    Object.assign(ui, {
      scale: stage.querySelector('.scalebar'), scaleBar: stage.querySelector('.scalebar i'), scaleTxt: stage.querySelector('.scalebar span'),
      hudSun: stage.querySelector('.hud-sun'), info: document.getElementById('sunInfo'),
      time: document.getElementById('sunTime'), timeOut: document.getElementById('sunTimeOut'),
    });
    const big = Math.min(window.innerWidth, window.innerHeight) > 700;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.NeutralToneMapping; renderer.toneMappingExposure = 0.62;
    renderer.localClippingEnabled = true;
    scene = new THREE.Scene();
    scene.environmentIntensity = 0.75;
    camP = new THREE.PerspectiveCamera(38, 1.6, 0.3, 10000);
    camO = new THREE.OrthographicCamera(-12, 12, 7.75, -7.75, 0.1, 600);
    cam = camP;
    camP.position.set(...PRESETS.garten.pos);
    controls = new OrbitControls(camP, canvas);
    controls.target.set(...PRESETS.garten.tgt);
    controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI * 0.495;
    controls.minDistance = 4; controls.maxDistance = 260; controls.autoRotateSpeed = 0.6;
    controls.addEventListener('change', updateScale);
    controls.addEventListener('start', () => { tween = null; });
    makeMaterials();
    setupLights(big);
    scene.add(buildHouse());
    scene.add(buildSite());
    updateSun(); updateEnv();
    new ResizeObserver(() => { resize(); updateScale(); }).observe(stage);
    resize();
    ready = true;
  }
  function show(on) {
    active = on;
    if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }
  function setDate(y, m, d) { st.y = y; st.m = m; st.d = d; updateSun(); }
  function setTime(h) { st.h = h; updateSun(); }
  function snapshot() { renderer.render(scene, cam); return renderer.domElement.toDataURL('image/png'); }
  return {
    init, show, goTo, setLayer, setCut, setDate, setTime, snapshot,
    get ready() { return ready; }, state: st,
    play(on) { st.play = on; }, rotate(on) { st.rotate = on; },
  };
})();
