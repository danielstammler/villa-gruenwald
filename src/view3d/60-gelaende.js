  // Teil des 3D-Modells (src/view3d/, siehe 00-kern.js): Gelände mit Wegen, Pool, Bäumen und Beeten, Nachbarhäuser
  function buildSite() {
    const g = new THREE.Group(), C = SITE.concept, R0 = HOUSE.rampe;
    groundAO();
    const poolOuter = C.pool, trench = [[R0.x0, R0.y0], [R0.x1, R0.y0], [R0.x1, R0.yPortal], [R0.x0, R0.yPortal]];
    const ground = new THREE.Shape(rectPts(-260, -260, 280, 260));
    for (const h of [poolOuter, trench, C.haus]) ground.holes.push(new THREE.Path(h.map(q => v2(q[0], q[1]))));
    const gg = addUV1(new THREE.ShapeGeometry(ground)); gg.rotateX(-Math.PI / 2);
    const gm = new THREE.Mesh(gg, M.ground); gm.position.y = -0.03; gm.receiveShadow = true; g.add(gm);
    L.grund = [gm];
    for (const s of SITE.streets) { const m = flat(s, M.street, -0.01); g.add(m); L.grund.push(m); }
    const lawn = flat(SITE.plot, M.lawn, 0.004, [poolOuter, trench, C.haus]); g.add(lawn); L.grund.push(lawn);
    // Zufahrt: vorne eben, dahinter die offene Rampe in die Tiefgarage
    const zufahrtEben = [[19.732, -50.499], [24.731, -51.342], [24.731, -44.471], [R0.x1 + R0.wand, -44.471], [R0.x1 + R0.wand, R0.y0], [19.732, R0.y0]];
    for (const P0 of [C.zuwegung, zufahrtEben]) { const m = flat(P0, M.pave, 0.016); g.add(m); L.grund.push(m); }
    buildRamp(g);
    // Pool: Rand, Becken 1,40 m tief, Wasser 12 cm unter dem Rand, Stufen über die ganze Breite an der Nordseite
    const PO = HOUSE.pool, pw = C.poolWasser, w = pw[1][0] - pw[0][0], d = pw[0][1] - pw[2][1];
    g.add(extrude(poolOuter, M.coping, 0, 0.06, [pw]));
    const basin = new THREE.Mesh(new THREE.BoxGeometry(w, -PO.boden, d), M.tile);
    basin.position.set(pw[0][0] + w / 2, PO.boden / 2, -(pw[0][1] - d / 2)); basin.receiveShadow = true; g.add(basin);
    PO.stufen.forEach((z, i) => boxPlan(M.poolStep, pw[0][0], pw[1][0], pw[0][1] - PO.tritt * (i + 1), pw[0][1] - PO.tritt * i, PO.boden, z));
    g.add(flat(pw, M.water, PO.wasser));
    // Poolterrasse aus Travertin rund um den Pool bis an die Veranda des Poolhauses, Weg von der Terrasse herüber
    g.add(extrude(HOUSE.poolDeck.poly, M.deck, 0, HOUSE.poolDeck.z, [poolOuter]));
    const PW = HOUSE.poolWeg;
    boxPlan(M.stone, PW.x0, PW.x1, PW.y0 - 0.02, PW.y1 - 0.36, 0, 0.03);
    buildPoolhaus(g);
    gardenFurniture();
    buildFence(g);
    g.add(hedges());
    // Grenze
    const pts = [...SITE.plot, SITE.plot[0]].map(q => P(q[0], q[1], 0.05));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x24292e, dashSize: 0.9, gapSize: 0.45 }));
    line.computeLineDistances();
    const grenze = new THREE.Group(); grenze.add(line);
    for (const s of SITE.stones) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.22), M.coping); m.position.copy(P(s[0], s[1], 0.06)); grenze.add(m); }
    const seg = []; for (const [a, b, c, e] of SITE.parcelLines) seg.push(P(a, b, 0.03), P(c, e, 0.03));
    grenze.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({ color: 0x5b6168 })));
    grenze.visible = false; g.add(grenze); L.grenze = grenze;
    // Bäume: Stamm mit Hauptästen, Krone aus mehreren Teilkronen, die dicht mit Blattbüscheln besetzt sind
    const baeume = new THREE.Group(), barkParts = [], leafCards = [], Yax = new THREE.Vector3(0, 1, 0);
    const limb = (a, b, r0, r1) => {
      const d = new THREE.Vector3().subVectors(b, a), len = d.length(), cg = new THREE.CylinderGeometry(r1, r0, len, 9, 1, true);
      cg.translate(0, len / 2, 0); cg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Yax, d.normalize())); cg.translate(a.x, a.y, a.z);
      barkParts.push(cg);
    };
    const tints = [[1, 1, 0.92], [0.92, 0.98, 0.9], [1.04, 1.02, 0.84]];
    SITE.trees.forEach((t, i) => {
      const r = t.r, H = Math.min(24, 4 + 2.0 * r), zc = H - r * 0.95, ry = r * 0.82, cx = t.c[0], cz = -t.c[1];
      const hs = k => { const v = Math.sin((k + 1) * 127.1 + i * 311.7) * 43758.5453; return v - Math.floor(v); };
      const r0 = 0.16 + 0.035 * r, top = new THREE.Vector3(cx + (hs(1) - 0.5) * 0.5, zc - ry * 0.2, cz + (hs(2) - 0.5) * 0.5);
      limb(new THREE.Vector3(cx, -0.1, cz), top, r0, r0 * 0.5);
      const nb = 5 + Math.floor(hs(3) * 3);
      for (let k = 0; k < nb; k++) {
        const a = (k / nb + hs(10 + k) * 0.15) * Math.PI * 2, f = 0.45 + 0.4 * hs(20 + k), z0 = top.y * f;
        const start = new THREE.Vector3(cx + (top.x - cx) * f, z0, cz + (top.z - cz) * f);
        limb(start, new THREE.Vector3(cx + Math.cos(a) * r * 0.7, zc + ry * (0.05 + 0.45 * hs(30 + k)), cz + Math.sin(a) * r * 0.7), r0 * 0.42, r0 * 0.1);
      }
      // Teilkronen: eine große in der Mitte, ringsum kleinere, leicht nach oben versetzt
      const lumps = [], nl = 6 + Math.floor(hs(4) * 4);
      for (let k = 0; k <= nl; k++) {
        const a = hs(40 + k) * Math.PI * 2, el = (hs(50 + k) - 0.3) * 1.1, off = k === nl ? 0 : 0.42 + 0.18 * hs(60 + k);
        lumps.push({ c: new THREE.Vector3(cx + Math.cos(a) * Math.cos(el) * r * off, zc + Math.sin(el) * ry * off, cz + Math.sin(a) * Math.cos(el) * r * off), r: r * (k === nl ? 0.62 : 0.42 + 0.16 * hs(70 + k)) });
      }
      const cs0 = 0.7 + 0.05 * r, total = 62 * r * r / (cs0 * cs0), sum = lumps.reduce((s, l) => s + l.r * l.r, 0), tint = tints[i % tints.length];
      for (const lp of lumps) {
        const clumps = Math.max(2, Math.round(total * lp.r * lp.r / sum / 10));
        for (let c = 0; c < clumps; c++) {
          const u1 = rnd() * 2 - 1, phi = rnd() * Math.PI * 2, s = Math.sqrt(1 - u1 * u1), rr = lp.r * (0.7 + 0.3 * Math.cbrt(rnd()));
          const p = new THREE.Vector3(lp.c.x + s * Math.cos(phi) * rr, lp.c.y + u1 * rr * 0.9, lp.c.z + s * Math.sin(phi) * rr);
          if (p.y < Math.max(2.4, zc - ry * 0.95)) continue;
          const out = new THREE.Vector3((p.x - cx) / r, (p.y - zc) / ry, (p.z - cz) / r), depth = Math.min(1, out.length()), nOut = out.normalize();
          const k = (0.55 + 0.45 * Math.pow(depth, 0.8)) * (0.88 + 0.24 * rnd());
          for (let j = 0; j < 10; j++) {
            const cs = cs0 * (0.8 + 0.4 * rnd()), off = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(cs0 * 1.5);
            const n = nOut.clone().multiplyScalar(0.85).addScaledVector(off.clone().normalize(), 0.3).normalize();
            leafCards.push({ p: [p.x + off.x, p.y + off.y, p.z + off.z], n: [n.x, n.y, n.z], q: randQ(), w: cs, h: cs, c: [tint[0] * k, tint[1] * k, tint[2] * k], flip: rnd() < 0.5 });
          }
        }
      }
    });
    const bark = new THREE.Mesh(mergeGeometries(barkParts, false), M.bark); bark.castShadow = bark.receiveShadow = true;
    baeume.add(bark, cardMesh(leafCards, M.leafTree), plantBeds());
    g.add(baeume); L.baeume = baeume;
    // Wurzelschutzbereiche als rote Kreise (nur zur Information, standardmäßig aus)
    const schutz = new THREE.Group();
    const red = new THREE.MeshBasicMaterial({ color: 0xc23a2b, transparent: true, opacity: 0.85 });
    const redFill = new THREE.MeshBasicMaterial({ color: 0xc23a2b, transparent: true, opacity: 0.08, depthWrite: false });
    for (const z of SITE.schutz) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(z.r - 0.07, z.r + 0.07, 128), red);
      ring.rotation.x = -Math.PI / 2; ring.position.copy(P(z.c[0], z.c[1], 0.04)); schutz.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(z.r, 96), redFill);
      disc.rotation.x = -Math.PI / 2; disc.position.copy(P(z.c[0], z.c[1], 0.035)); schutz.add(disc);
    }
    schutz.visible = false; g.add(schutz); L.schutz = schutz;
    flushBatches(g);
    baeume.add(neighborGreen());
    brickWall();
    // Nachbarschaft
    const nb = new THREE.Group();
    if (typeof LOD2 !== 'undefined') {
      // Nachbarhäuser aus dem amtlichen 3D-Gebäudemodell (LoD2) mit echten Dachformen und Höhen; Dachfarbe nach Luftbild.
      // Wände mit Putz und Sockel, Dächer mit Ziegeln in Fallrichtung, Fenster mit Rahmen und Fensterbank.
      const walls = { pos: [], uv: [], col: [] }, roofs = new Map(), flatRoof = { pos: [], uv: [] };
      const tones = [0xdcd5c6, 0xd2c9b8, 0xe4dfd3, 0xcdc3b0, 0xd8d1c3].map(c => new THREE.Color(c));
      LOD2.b.forEach((b, bi) => {
        const rm = nbRoofMat((NB_STYLE[b.nr] || {}).color || 0x707379), tc = tones[bi % tones.length];
        if (!roofs.has(rm)) roofs.set(rm, { pos: [], uv: [] });
        const bot = b.s.filter(([k]) => k === 'W').flatMap(([, ring]) => ring.filter(p => p[2] < 0.3));
        const mx = bot.reduce((s, p) => s + p[0], 0) / Math.max(1, bot.length), my = bot.reduce((s, p) => s + p[1], 0) / Math.max(1, bot.length);
        b.s.forEach(([k, ring], si) => {
          const n = ringNormal(ring), tri = triangulate3D(ring);
          if (k === 'R') {
            if (n.z < 0) n.multiplyScalar(-1);
            const dst = n.z > 0.97 ? flatRoof : roofs.get(rm), hl = Math.hypot(n.x, n.y) || 1, dx = n.x / hl, dy = n.y / hl;
            for (let v = 0; v < tri.length; v += 3) {
              const x = tri[v], y = -tri[v + 2];
              dst.pos.push(tri[v], tri[v + 1], tri[v + 2]);
              if (n.z > 0.97) dst.uv.push(x, y); else dst.uv.push((x * -dy + y * dx) / 1.2, (x * dx + y * dy) / n.z / 1.2);
            }
          } else {
            const hl = Math.hypot(n.x, n.y) || 1, ex = -n.y / hl, ey = n.x / hl;
            for (let v = 0; v < tri.length; v += 3) {
              walls.pos.push(tri[v], tri[v + 1], tri[v + 2]); walls.uv.push((tri[v] * ex - tri[v + 2] * ey) / 4, tri[v + 1] / 12); walls.col.push(tc.r, tc.g, tc.b);
            }
            if (b.h > 5.5) nbWindows(ring, b, si, mx, my);
          }
        });
      });
      const geo = (d, col) => {
        const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3)); gm.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
        if (col) gm.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        gm.computeVertexNormals(); return gm;
      };
      const mesh = (gm, mat) => { const m = new THREE.Mesh(gm, mat); m.castShadow = m.receiveShadow = true; return m; };
      nb.add(mesh(geo(walls, walls.col), M.nbWall));
      for (const [m, d] of roofs) if (d.pos.length) nb.add(mesh(geo(d), m));
      if (flatRoof.pos.length) nb.add(mesh(geo(flatRoof), M.nbFlat));
    } else {
      // Ersatz ohne LoD2: Grundriss aus der Flurkarte, Dachform nach Luftbild
      for (const b of SITE.neighbors) {
        const st = neighborStyle(b.pts), rm = nbRoofMat(st.color);
        if (st.roof === 'walm') { nb.add(extrudeMulti(b.pts, [M.nb, M.nb], st.wall)); nb.add(roofOver(b.pts, st.wall, rm)); }
        else {
          nb.add(extrudeMulti(b.pts, [rm, M.nb], st.wall));
          if (st.roof === 'staffel') { const top = extrudeMulti(scalePts(b.pts, 0.7), [rm, M.nb], st.top - st.wall); top.position.y = st.wall; nb.add(top); }
        }
      }
      for (const b of SITE.secondary) nb.add(extrudeMulti(b.pts, [M.nbRoof, M.nb2], b.h));
    }
    g.add(nb); L.nachbarn = nb;
    // Tiefgarage und Untergeschoss (unterirdisch, nur als Hülle)
    const tg = new THREE.Group();
    const tgm = extrude(C.tg, M.tg, -3.4, 2.8); tgm.castShadow = false; tg.add(tgm);
    tg.add(new THREE.LineSegments(new THREE.EdgesGeometry(tgm.geometry), new THREE.LineBasicMaterial({ color: 0xc8711c })));
    const ugm = extrude(C.haus, M.ug, -3.4, 3.4); ugm.castShadow = false; tg.add(ugm);
    tg.add(new THREE.LineSegments(new THREE.EdgesGeometry(ugm.geometry), new THREE.LineBasicMaterial({ color: 0x4f6f8c })));
    // Durchfahrt unter dem Poolhaus
    const dfm = extrude(C.poolhaus, M.tg, -3.4, 3.4 + R0.decke); dfm.castShadow = false; tg.add(dfm);
    tg.add(new THREE.LineSegments(new THREE.EdgesGeometry(dfm.geometry), new THREE.LineBasicMaterial({ color: 0xc8711c })));
    tg.visible = false; g.add(tg); L.tg = tg;
    flushBatches(g);
    return g;
  }
  // Beete wie im Rendering: Lavendel, weiße Hortensien und Buchskugeln vor der Fassade
  function plantBeds() {
    const grp = new THREE.Group();
    const items = { lavendel: [], hortensie: [], buchs: [], gruen: [] };
    const bed = (x0, x1, y0, y1, kinds, dens) => {
      const n = Math.round((x1 - x0) * (y1 - y0) * dens);
      for (let i = 0; i < n; i++) {
        const k = kinds[Math.floor(rnd() * kinds.length)];
        const r = k === 'lavendel' ? 0.16 + rnd() * 0.07 : k === 'hortensie' ? 0.3 + rnd() * 0.12 : 0.28 + rnd() * 0.1;
        const px = x0 + rnd() * (x1 - x0), py = y0 + rnd() * (y1 - y0);
        items[k].push([px, py, r]);
        if (k === 'hortensie' || k === 'gruen') for (let q = 0; q < 3; q++) items[k].push([px + (rnd() - 0.5) * r * 1.2, py + (rnd() - 0.5) * r * 1.2, r * (0.55 + rnd() * 0.25)]);
      }
    };
    // Lavendel und Hortensien am Rand der durchgehenden Terrasse, die Mitte bleibt frei für die Stufe zum Pool
    bed(0.1, 6.2, -16.45, -15.8, ['lavendel', 'lavendel', 'hortensie', 'gruen'], 9);
    bed(9.8, 18.9, -16.45, -15.8, ['lavendel', 'lavendel', 'hortensie', 'gruen'], 9);
    bed(-0.95, -0.15, -11.4, -0.6, ['hortensie', 'gruen', 'lavendel'], 4);
    bed(19.1, 19.8, -10.8, -5.9, ['hortensie', 'lavendel'], 5);
    bed(0.3, 5.3, 0.15, 0.85, ['gruen', 'hortensie'], 4);
    bed(10.7, 15.7, 0.15, 0.85, ['gruen', 'hortensie'], 4);
    for (const [x, y] of [[6.35, -16.1], [9.65, -16.1], [-0.55, -16.0], [19.5, -15.95], [19.35, -11.15], [5.2, 0.55], [10.8, 0.55], [-0.6, -12.2]]) items.buchs.push([x, y, 0.42]);
    // kleine Buchskugeln als Allee am Weg zum Pool
    for (let y = -17.2; y > -22.6; y -= 1.35) for (const x of [7.12, 8.88]) items.buchs.push([x, y, 0.26]);
    // Zwei Pflanzkübel mit Buchskugeln unter dem Vordach links und rechts der Haustür
    const zk = HOUSE.podest.z + 0.55;
    for (const x of [6.15, 9.85]) { boxPlan(M.kuebel, x - 0.2, x + 0.2, 0.12, 0.52, HOUSE.podest.z, zk); items.buchs.push([x, 0.32, 0.23, zk]); }
    // Jede Pflanze: dunkler Kern und darauf Blatt- bzw. Blütenkarten; Lavendel als gekreuzte, senkrechte Karten
    const core = [], cards = { blatt: [], hortensie: [], buchs: [], lavendel: [] };
    const shell = (list, x, y, cy, r, ry, n, sz, k0) => {
      for (let j = 0; j < n; j++) {
        const u1 = rnd() * 1.6 - 0.6, phi = rnd() * 6.2832, s = Math.sqrt(1 - u1 * u1), nrm = new THREE.Vector3(s * Math.cos(phi), u1, s * Math.sin(phi));
        const k = k0 * (0.8 + 0.3 * rnd()) * (0.75 + 0.25 * (u1 + 0.6) / 1.6);
        list.push({ p: [x + nrm.x * r, cy + nrm.y * ry, -y + nrm.z * r], n: [nrm.x, nrm.y, nrm.z], q: faceQ(nrm, 1.4), w: sz * (0.8 + 0.4 * rnd()), h: sz * (0.8 + 0.4 * rnd()), c: [k, k, k], flip: rnd() < 0.5 });
      }
    };
    for (const [x, y, r, z0 = 0] of items.buchs) { core.push([x, z0 + r * 0.92, -y, r * 0.88, r * 0.82]); shell(cards.buchs, x, y, z0 + r * 0.92, r * 0.95, r * 0.9, r < 0.3 ? 46 : 70, 0.2, 1); }
    for (const [x, y, r] of items.gruen) { core.push([x, r * 0.7, -y, r * 0.8, r * 0.62]); shell(cards.blatt, x, y, r * 0.7, r, r * 0.8, 16, r * 0.9, 0.95); }
    for (const [x, y, r] of items.hortensie) {
      core.push([x, r * 0.7, -y, r * 0.8, r * 0.62]);
      shell(cards.blatt, x, y, r * 0.7, r, r * 0.78, 9, r * 0.85, 0.9); shell(cards.hortensie, x, y, r * 0.78, r * 0.98, r * 0.8, 9, r * 0.95, 1);
    }
    for (const [x, y, r] of items.lavendel) for (let j = 0; j < 3; j++) {
      const a = j * Math.PI / 3 + rnd(), w = r * 2.4, h = r * 2.8, n = new THREE.Vector3(Math.cos(a), 0.25, Math.sin(a)).normalize(), k = 0.85 + 0.25 * rnd();
      cards.lavendel.push({ p: [x, h / 2, -y], n: [n.x, n.y, n.z], q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a), w, h, c: [k, k, k], flip: rnd() < 0.5 });
    }
    grp.add(cores(core, M.shrubCore), cardMesh(cards.buchs, M.leafBox), cardMesh(cards.blatt, M.leafTree), cardMesh(cards.hortensie, M.leafHydr), cardMesh(cards.lavendel, M.leafLav));
    return grp;
  }
  // Dachform und Farbe der Nachbarhäuser nach dem Luftbild (Google Earth, Foto vom 3.11.2026); Schlüssel = Hausnummer der Flurkarte
  const NB_STYLE = {
    '8a': { roof: 'walm', color: 0x5f6369, wall: 3.9 }, '8': { roof: 'walm', color: 0x9a5c48, wall: 3.6 },
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
  // Ebenes 3D-Polygon (Plan-Koordinaten x, y, z) in Dreiecke zerlegen; Rückgabe als Weltkoordinaten
  function triangulate3D(ring) {
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < ring.length; i++) {
      const [x1, y1, z1] = ring[i], [x2, y2, z2] = ring[(i + 1) % ring.length];
      nx += (y1 - y2) * (z1 + z2); ny += (z1 - z2) * (x1 + x2); nz += (x1 - x2) * (y1 + y2);
    }
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    const pr = az >= ax && az >= ay ? p => v2(p[0], p[1]) : ax >= ay ? p => v2(p[1], p[2]) : p => v2(p[0], p[2]);
    const out = [];
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(ring.map(pr), [])) for (const k of [a, b, c]) { const p = ring[k]; out.push(p[0], p[2], -p[1]); }
    return out;
  }
  function meshFrom(pos, mat) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
  }
  const nbRoofMats = new Map();
  function nbRoofMat(c) {
    // Ziegel-Textur ist hell; die Luftbild-Farbe wird dafür etwas angehoben
    if (!nbRoofMats.has(c)) nbRoofMats.set(c, new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(1.25), map: M.tiles, roughness: 0.8, metalness: 0.02, side: THREE.DoubleSide }));
    return nbRoofMats.get(c);
  }
  // Flächennormale eines ebenen Polygons (Newell), in Plan-Koordinaten x, y und Höhe z
  function ringNormal(ring) {
    const n = new THREE.Vector3();
    for (let i = 0; i < ring.length; i++) {
      const [x1, y1, z1] = ring[i], [x2, y2, z2] = ring[(i + 1) % ring.length];
      n.x += (y1 - y2) * (z1 + z2); n.y += (z1 - z2) * (x1 + x2); n.z += (x1 - x2) * (y1 + y2);
    }
    return n.normalize();
  }
  const hash01 = (...a) => { let h = 2166136261; for (const ch of a.join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
  // Fenster an einer LoD2-Wand: Raster von etwa 2,8 m, Erdgeschoss immer, darüber nur dort, wo die Wand hoch genug ist (Giebel)
  function nbWindows(ring, b, si, cxB, cyB) {
    const bot = ring.filter(p => p[2] < 0.3);
    if (bot.length < 2) return;
    let A = null, B = null, best = 0;
    for (const p of bot) for (const q of bot) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d > best) { best = d; A = p; B = q; } }
    if (best < 2.4) return;
    let ux = (B[0] - A[0]) / best, uy = (B[1] - A[1]) / best;
    // Außenseite: weg von der Gebäudemitte; Richtung so wählen, dass die Basis rechtshändig bleibt
    if (((A[0] + B[0]) / 2 - cxB) * uy - ((A[1] + B[1]) / 2 - cyB) * ux < 0) { [A, B] = [B, A]; ux = -ux; uy = -uy; }
    const P2 = ring.map(p => [(p[0] - A[0]) * ux + (p[1] - A[1]) * uy, p[2]]);
    const topAt = s => { let t = 0; for (let i = 0; i < P2.length; i++) { const [a0, z0] = P2[i], [a1, z1] = P2[(i + 1) % P2.length]; if ((a0 - s) * (a1 - s) <= 0 && a0 !== a1) t = Math.max(t, z0 + (z1 - z0) * (s - a0) / (a1 - a0)); } return t; };
    const mx = new THREE.Matrix4().makeBasis(new THREE.Vector3(ux, 0, -uy), new THREE.Vector3(0, 1, 0), new THREE.Vector3(uy, 0, ux)).setPosition(A[0], 0, -A[1]);
    const n = Math.max(1, Math.floor((best - 1.6) / 2.8) + 1), s0 = (best - (n - 1) * 2.8) / 2;
    for (let k = 0; k < n; k++) {
      const s = s0 + k * 2.8, h0 = hash01(b.id, si, k);
      if (h0 < 0.12) continue;
      for (const [z0, z1, w] of [[0.95, 2.25, h0 > 0.8 ? 1.5 : 1.15], [3.75, 4.95, 1.0], [6.45, 7.35, 0.8]]) {
        if (Math.min(topAt(s - w / 2), topAt(s + w / 2)) < z1 + 0.35) continue;
        const u0 = s - w / 2, u1 = s + w / 2;
        addBox(M.nbFrame, mx, u0 - 0.06, u1 + 0.06, z0 - 0.06, z1 + 0.06, 0, 0.04);
        addBox(M.nbGlass, mx, u0, u1, z0, z1, 0.04, 0.05);
        if (w > 1.3) addBox(M.nbFrame, mx, s - 0.04, s + 0.04, z0, z1, 0.05, 0.06);
        addBox(M.nbSill, mx, u0 - 0.1, u1 + 0.1, z0 - 0.1, z0 - 0.04, 0, 0.1);
      }
    }
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

