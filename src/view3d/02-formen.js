  // Teil des 3D-Modells (src/view3d/, siehe 00-kern.js): Geometrie-Hilfen (addGeo, boxPlan, extrude, wallWithHoles …)
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
  // Quadratischer Pfeiler mit schlichtem Sockel und Kapitell vom Boden z0 bis zur Balkonplatte z1 (Seitenlänge w)
  function column(x, y, z0, z1, w, mat = M.putzHell) {
    const h = w / 2;
    boxPlan(mat, x - h - 0.05, x + h + 0.05, y - h - 0.05, y + h + 0.05, z0, z0 + 0.14);
    boxPlan(mat, x - h, x + h, y - h, y + h, z0 + 0.14, z1 - 0.16);
    boxPlan(mat, x - h - 0.04, x + h + 0.04, y - h - 0.04, y + h + 0.04, z1 - 0.16, z1 - 0.06);
    boxPlan(mat, x - h - 0.07, x + h + 0.07, y - h - 0.07, y + h + 0.07, z1 - 0.06, z1);
  }
  // Quader in Plan-Koordinaten (x, yPlan) und Höhe z
  const boxPlan = (mat, x0, x1, y0, y1, z0, z1) => addBox(mat, null, x0, x1, z0, z1, -Math.max(y0, y1), -Math.min(y0, y1));
  function flushBatches(parent) {
    for (const [mat, geos] of batches) {
      const geo = mergeGeometries(geos, false), s = mat.userData.worldUV;
      if (s) { const pos = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / s, -pos.getZ(i) / s); }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = mat !== M.glass && mat !== M.siteGlass && mat !== M.water;
      mesh.receiveShadow = true;
      parent.add(mesh);
    }
    batches.clear();
  }
  // Lokales System einer Wand { o, r, n } im Plan: u entlang r, z nach oben, Tiefe entlang der Außennormalen n
  function frameMx(f) {
    const m = new THREE.Matrix4();
    m.makeBasis(new THREE.Vector3(f.r[0], 0, -f.r[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(f.n[0], 0, -f.n[1]));
    return m.setPosition(f.o[0], 0, -f.o[1]);
  }
  const facadeMatrix = side => frameMx(HOUSE.frame[side]);
  const v2 = (x, y) => new THREE.Vector2(x, y);
  const isInside = (o, root) => { for (let q = o; q; q = q.parent) if (q === root) return true; return false; };
  const rectPts = (x0, y0, x1, y1) => [v2(x0, y0), v2(x1, y0), v2(x1, y1), v2(x0, y1)];
  function shapeFrom(pts, holes = []) {
    const s = new THREE.Shape(pts.map(p => v2(p[0], p[1])));
    for (const h of holes) s.holes.push(new THREE.Path(h.map(p => v2(p[0], p[1]))));
    return s;
  }
  // Zweiter UV-Satz für die Bodenverschattung: Plan-Ausschnitt AO (Meter), nicht wiederholt
  const AO = { x0: -70, y0: -90, s: 160 };
  function addUV1(g) {
    const uv = g.attributes.uv, a = new Float32Array(uv.count * 2);
    for (let i = 0; i < uv.count; i++) { a[2 * i] = (uv.getX(i) - AO.x0) / AO.s; a[2 * i + 1] = (uv.getY(i) - AO.y0) / AO.s; }
    g.setAttribute('uv1', new THREE.BufferAttribute(a, 2));
    return g;
  }
  function flat(pts, mat, y, holes) {
    const g = addUV1(new THREE.ShapeGeometry(shapeFrom(pts, holes))); g.rotateX(-Math.PI / 2);
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

