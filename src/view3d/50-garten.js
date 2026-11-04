  // Teil des 3D-Modells (src/view3d/, siehe 00-kern.js): Bäume der Nachbarn, Ziegelmauer, Poolhaus, Gartenmöbel und Zaun
  // Bäume in den Nachbargärten nach den Luftbildern: dichter Bestand aus Laub- und Nadelbäumen, einzelne Blutbuchen.
  // Nicht auf Häusern, Straßen und dem eigenen Grundstück und nicht in den Sichtachsen der Kamerablicke.
  function neighborGreen() {
    // feste Zufallsfolge (Stand 4.11.2026), damit Änderungen an Beeten oder Bäumen davor die Nachbarbäume nicht umwürfeln
    seed = 523963437;
    const grp = new THREE.Group(), leaf = [], needle = [], barkParts = [], Yax = new THREE.Vector3(0, 1, 0);
    const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const segDist = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); };
    const polyDist = (x, y, P) => { let d = 1e9; for (let i = 0; i < P.length; i++) d = Math.min(d, segDist(x, y, P[i], P[(i + 1) % P.length])); return d; };
    const blocks = [...SITE.neighbors, ...SITE.secondary].map(b => b.pts);
    const sights = ['garten', 'eingang', 'ost', 'west', 'zufahrt', 'schnitt'].map(k => [[PRESETS[k].pos[0], -PRESETS[k].pos[2]], [PRESETS[k].tgt[0], -PRESETS[k].tgt[2]]]);
    const limb = (a, b, r0, r1) => {
      const d = new THREE.Vector3().subVectors(b, a), len = d.length(), cg = new THREE.CylinderGeometry(r1, r0, len, 7, 1, true);
      cg.translate(0, len / 2, 0); cg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Yax, d.normalize())); cg.translate(a.x, a.y, a.z); barkParts.push(cg);
    };
    let n = 0;
    for (let gx = -56; gx <= 86; gx += 7.5) for (let gy = -86; gy <= 62; gy += 7.5) {
      const x = gx + (rnd() - 0.5) * 5, y = gy + (rnd() - 0.5) * 5, kind = rnd(), r = 2.6 + rnd() * 3.4;
      if (rnd() > 0.62) continue;
      const conifer = kind < 0.38, beech = kind > 0.9, rr = conifer ? 1.6 + rnd() * 1.4 : r;
      if (inPoly(x, y, SITE.plot) || polyDist(x, y, SITE.plot) < rr * 0.6) continue;
      if (SITE.streets.some(st => inPoly(x, y, st) || polyDist(x, y, st) < rr * 0.7)) continue;
      if (blocks.some(B => inPoly(x, y, B) || polyDist(x, y, B) < rr * 0.8)) continue;
      if (sights.some(([a, b]) => segDist(x, y, a, b) < rr + 1.5)) continue;
      const far = Math.hypot(x - 10, y + 15) > 55 ? 0.6 : 1, cx = x, cz = -y;
      if (conifer) {
        // Nadelbaum: kurzer Stamm, kegelförmige Krone aus Nadelzweigen
        const H = 11 + rnd() * 10, base = 1.2 + rnd() * 1.5, R = rr;
        limb(new THREE.Vector3(cx, -0.1, cz), new THREE.Vector3(cx, H * 0.85, cz), 0.16 + 0.04 * R, 0.05);
        const cnt = Math.round(far * 3.2 * Math.PI * R * (H - base) / 0.8);
        for (let k = 0; k < cnt; k++) {
          const t = Math.pow(rnd(), 0.8), hgt = base + t * (H - base), rad = R * Math.pow(1 - t, 0.9) * (0.55 + 0.45 * Math.sqrt(rnd())), a = rnd() * Math.PI * 2;
          const nrm = new THREE.Vector3(Math.cos(a), 0.35, Math.sin(a)).normalize(), k0 = (0.55 + 0.45 * rad / Math.max(0.3, R)) * (0.85 + 0.25 * rnd()), sz = 0.75 + 0.4 * rnd();
          needle.push({ p: [cx + Math.cos(a) * rad, hgt, cz + Math.sin(a) * rad], n: [nrm.x, nrm.y, nrm.z], q: faceQ(nrm, 1.6), w: sz, h: sz, c: [k0 * 0.95, k0, k0 * 1.02], flip: rnd() < 0.5 });
        }
      } else {
        // Laubbaum oder Blutbuche: Stamm, ein paar Äste, kugelige Krone aus Blattbüscheln
        const H = 7 + 1.7 * r, zc = H - r * 0.9, ry = r * 0.82;
        limb(new THREE.Vector3(cx, -0.1, cz), new THREE.Vector3(cx, zc - ry * 0.2, cz), 0.14 + 0.035 * r, 0.07 + 0.015 * r);
        for (let k = 0; k < 4; k++) { const a = rnd() * Math.PI * 2; limb(new THREE.Vector3(cx, zc - ry * 0.5, cz), new THREE.Vector3(cx + Math.cos(a) * r * 0.6, zc + ry * 0.2, cz + Math.sin(a) * r * 0.6), 0.06 + 0.015 * r, 0.02); }
        const tint = beech ? [1.3, 0.52, 0.6] : [[1, 1, 0.92], [0.9, 0.98, 0.88], [1.05, 1.03, 0.84]][n % 3], cs = 1.1 + 0.05 * r, cnt = Math.round(far * 34 * r * r / (cs * cs) / 9);
        for (let c = 0; c < cnt; c++) {
          const u1 = rnd() * 2 - 1, phi = rnd() * Math.PI * 2, sq = Math.sqrt(1 - u1 * u1), rr2 = r * (0.62 + 0.38 * Math.cbrt(rnd()));
          const px = cx + sq * Math.cos(phi) * rr2, py = zc + u1 * rr2 * 0.85, pz = cz + sq * Math.sin(phi) * rr2;
          if (py < Math.max(2.2, zc - ry)) continue;
          const out = new THREE.Vector3((px - cx) / r, (py - zc) / ry, (pz - cz) / r), dep = Math.min(1, out.length()), nO = out.normalize(), k0 = (0.55 + 0.45 * dep) * (0.88 + 0.24 * rnd());
          for (let j = 0; j < 9; j++) {
            const off = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(cs * 1.5), nn = nO.clone().multiplyScalar(0.85).addScaledVector(off.clone().normalize(), 0.3).normalize();
            leaf.push({ p: [px + off.x, py + off.y, pz + off.z], n: [nn.x, nn.y, nn.z], q: randQ(), w: cs, h: cs, c: [tint[0] * k0, tint[1] * k0, tint[2] * k0], flip: rnd() < 0.5 });
          }
        }
      }
      n++;
    }
    grp.add(cardMesh(leaf, M.leafTree), cardMesh(needle, M.leafNeedle));
    const bark = new THREE.Mesh(mergeGeometries(barkParts, false), M.bark); bark.castShadow = bark.receiveShadow = true; grp.add(bark);
    return grp;
  }
  // Geschwungene Ziegelmauer an der Straßenecke im Südosten (Luftbild), 1,60 m hoch mit heller Abdeckung
  function brickWall() {
    const wallPts = [[38, -54.4], [43.8, -55.7], [46.8, -55.85], [50.1, -54.95], [52.7, -53.15], [54.45, -50.85], [55.25, -48.4], [55.3, -44.5]];
    for (let i = 0; i < wallPts.length - 1; i++) {
      const [ax, ay] = wallPts[i], [bx, by] = wallPts[i + 1], len = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax);
      const m = new THREE.Matrix4().makeRotationY(ang).setPosition((ax + bx) / 2, 0, -(ay + by) / 2);
      addBox(M.brick, m, -len / 2 - 0.15, len / 2 + 0.15, 0, 1.6, -0.15, 0.15);
      addBox(M.brickCap, m, -len / 2 - 0.18, len / 2 + 0.18, 1.6, 1.68, -0.19, 0.19);
    }
  }
  // Kontaktschatten am Boden: Grundrisse von Häusern, Hecken und Stämmen, weich gezeichnet. Wirkt als aoMap nur auf das Himmelslicht.
  function groundAO() {
    const N = 640, k = N / AO.s, X = x => (x - AO.x0) * k, Y = y => (AO.y0 + AO.s - y) * k, C = SITE.concept;
    const mask = document.createElement('canvas'); mask.width = mask.height = N;
    const s = mask.getContext('2d'); s.fillStyle = s.strokeStyle = '#000'; s.lineCap = s.lineJoin = 'round';
    const poly = P => { s.beginPath(); P.forEach(([x, y], i) => (i ? s.lineTo(X(x), Y(y)) : s.moveTo(X(x), Y(y)))); s.closePath(); s.fill(); };
    for (const b of [...SITE.neighbors, ...SITE.secondary]) poly(b.pts);
    for (const P0 of [C.haus, C.freisitz, C.poolhaus]) poly(P0);
    for (const H of HOUSE.garten.hecken) { s.lineWidth = (H.b + 0.3) * k; s.beginPath(); H.linie.forEach(([x, y], i) => (i ? s.lineTo(X(x), Y(y)) : s.moveTo(X(x), Y(y)))); s.stroke(); }
    for (const t of SITE.trees) { s.beginPath(); s.arc(X(t.c[0]), Y(t.c[1]), (0.5 + 0.05 * t.r) * k, 0, 6.2832); s.fill(); }
    const c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, N, N); g.imageSmoothingEnabled = true;
    for (const [div, a] of [[16, 0.35], [6, 0.4], [3, 0.35]]) {
      const sm = document.createElement('canvas'); sm.width = sm.height = N / div;
      sm.getContext('2d').drawImage(mask, 0, 0, N / div, N / div);
      g.globalAlpha = a; g.drawImage(sm, 0, 0, N, N);
    }
    const t = new THREE.CanvasTexture(c); t.channel = 1; t.colorSpace = THREE.NoColorSpace;
    for (const m of [M.lawn, M.ground, M.pave, M.street]) { m.aoMap = t; m.aoMapIntensity = 1; m.needsUpdate = true; }
  }
  // Walmdach über einem Rechteck im Plan, Traufe ze, Neigung tn; First in der längeren Richtung. UV in Metern wie beim Hausdach.
  function hipRoof(X0, X1, Y0, Y1, ze, tn) {
    const alongY = Y1 - Y0 >= X1 - X0, h = (alongY ? X1 - X0 : Y1 - Y0) / 2, zr = ze + tn * h, xm = (X0 + X1) / 2, ym = (Y0 + Y1) / 2;
    const c = [[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]].map(([x, y]) => P(x, y, ze));
    const r0 = alongY ? P(xm, Y0 + h, zr) : P(X0 + h, ym, zr), r1 = alongY ? P(xm, Y1 - h, zr) : P(X1 - h, ym, zr);
    const faces = alongY ? [[c[0], c[1], r0], [c[1], c[2], r1, r0], [c[2], c[3], r1], [c[3], c[0], r0, r1]] : [[c[0], c[1], r1, r0], [c[1], c[2], r1], [c[2], c[3], r0, r1], [c[3], c[0], r0]];
    const pos = [], uv = [];
    for (const f of faces) {
      const a = f[0], e1 = f[1].clone().sub(a).normalize(), n = f[1].clone().sub(a).cross(f[f.length - 1].clone().sub(a)).normalize(), e2 = new THREE.Vector3().crossVectors(n, e1);
      for (let i = 1; i < f.length - 1; i++) for (const p of [a, f[i], f[i + 1]]) { pos.push(p.x, p.y, p.z); const d = p.clone().sub(a); uv.push(d.dot(e1), d.dot(e2)); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    return { g, c, r0, r1, near: k => (alongY ? k < 2 : k === 0 || k === 3) ? r0 : r1 };
  }
  // Poolhaus im Stil des Hauses: weiße Wände mit Sockel und Gesims, zum Pool ganz offen (5,40 m breite Glas-Schiebewand, zwei Flügel
  // zur Seite geschoben), nach Norden ein großes Fenster; Veranda auf zwei quadratischen Pfeilern, flaches Walmdach mit Schiefer.
  // Innen Bar, Liege und Handtücher. Boden eine Stufe über der Poolterrasse (H.z) auf der Decke der Durchfahrt; Gesims und Dach bleiben auf ihrer Höhe.
  function buildPoolhaus(g) {
    const H = HOUSE.poolhaus, { x0, x1, y0, y1, z, wand: t, gesims, traufe } = H, xv = x0 - H.veranda, ov = 0.25, len = y1 - y0;
    boxPlan(M.stone, x0, x1, y0, y1, 0, z);
    boxPlan(M.site, x0, x1, y0, y0 + t, 0, gesims); boxPlan(M.site, x1 - t, x1, y0 + t, y1 - t, 0, gesims);
    // Nordwand mit großem Fenster (u ab der Ostecke nach Westen)
    const mn = frameMx({ o: [x1, y1], r: [-1, 0], n: [0, 1] }), [fa, fb] = H.fenster.map(x => x1 - x).sort((p, q) => p - q);
    g.add(wallWithHoles(x1 - x0, 0, gesims, [{ u0: fa, u1: fb, z0: 0.9, z1: 2.45 }], t, [M.site, M.site], mn));
    addBox(M.siteGlass, mn, fa + 0.04, fb - 0.04, 0.94, 2.41, -0.13, -0.12);
    for (const [p, q, r0, r1] of [[fa, fa + 0.04, 0.9, 2.45], [fb - 0.04, fb, 0.9, 2.45], [fa, fb, 0.9, 0.94], [fa, fb, 2.41, 2.45], [(fa + fb) / 2 - 0.02, (fa + fb) / 2 + 0.02, 0.9, 2.45]]) addBox(M.siteFrame, mn, p, q, r0, r1, -0.15, -0.1);
    addBox(M.coping, mn, fa - 0.04, fb + 0.04, 0.85, 0.9, -0.02, 0.05);
    // Poolseite: eine breite Öffnung zwischen den Eckpilastern, darin drei Schiebeflügel, zwei davon hinter den dritten geschoben
    const mx = frameMx({ o: [x0, y1], r: [0, -1], n: [-1, 0] }), [oa, ob] = H.front;
    g.add(wallWithHoles(len, 0, gesims, [{ u0: oa, u1: ob, z0: z, z1: 2.45 }], t, [M.site, M.site], mx));
    for (const [a, b] of [[-0.04, oa], [ob, len + 0.04]]) addBox(M.coping, mx, a, b, 0, 0.18, 0, 0.03);
    // vor der Öffnung eine Stufe aus Naturstein auf Bodenhöhe: der Boden liegt eine Stufe über Veranda und Poolterrasse
    addBox(M.stone, mx, oa - 0.05, ob + 0.05, 0, z, 0, H.stufe);
    for (const [a, b] of [[0, oa], [ob, len]]) addBox(M.siteHell, mx, a, b, 0.18, gesims, 0, 0.05);
    addBox(M.siteHell, mx, oa - 0.05, ob + 0.05, 2.45, 2.6, 0, 0.06);
    for (const [r0, r1] of [[z, z + 0.03], [2.41, 2.45]]) addBox(M.siteFrame, mx, oa, ob, r0, r1, -0.2, -0.05);
    const pw = (ob - oa) / 3 + 0.04;
    [[ob - pw, ob, -0.085], [ob - pw - 0.04, ob - 0.04, -0.125], [ob - pw - 0.08, ob - 0.08, -0.165]].forEach(([pa, pb, d]) => {
      addBox(M.siteGlass, mx, pa + 0.04, pb - 0.04, z + 0.07, 2.37, d - 0.004, d + 0.004);
      for (const [p, q, r0, r1] of [[pa, pa + 0.04, z + 0.03, 2.41], [pb - 0.04, pb, z + 0.03, 2.41], [pa, pb, z + 0.03, z + 0.07], [pa, pb, 2.37, 2.41]]) addBox(M.siteFrame, mx, p, q, r0, r1, d - 0.018, d + 0.018);
      addBox(M.siteFrame, mx, pa + 0.06, pa + 0.085, 0.95, 1.25, d - 0.03, d - 0.018);
    });
    // innen: Bar mit Steinplatte und Hockern an der Ostwand, Liege an der Südwand, Regal mit Handtüchern, zwei Pendelleuchten
    const ix0 = x0 + t, ix1 = x1 - t, iy0 = y0 + t;
    boxPlan(M.siteHell, ix1 - 0.6, ix1, -32.4, -29.6, z, z + 1.0); boxPlan(M.fOutTop, ix1 - 0.66, ix1, -32.46, -29.54, z + 1.0, z + 1.05);
    for (const y of [-31.8, -31.0, -30.2]) { addCyl(M.fOutMetal, ix1 - 0.98, y, z, z + 0.74, 0.02, 0.02, 8); addCyl(M.fOut, ix1 - 0.98, y, z + 0.74, z + 0.8, 0.19, 0.19, 16); }
    loungerAt(ix0 + 0.15, ix0 + 2.15, iy0 + 0.1, iy0 + 0.85, z);
    for (const y of [-29.3, -28.0]) boxPlan(M.siteHell, ix1 - 0.4, ix1, y - 0.015, y + 0.015, z, z + 1.9);
    for (let k = 0; k < 4; k++) {
      const zz = z + 0.3 + k * 0.45; boxPlan(M.siteHell, ix1 - 0.4, ix1, -29.3, -28.0, zz, zz + 0.025);
      for (const y of [-29.2, -28.65]) boxPlan(M.fOut, ix1 - 0.36, ix1 - 0.04, y, y + 0.5, zz + 0.025, zz + 0.2);
    }
    for (const y of [-31.6, -30.4]) { addCyl(M.fOutMetal, ix1 - 0.33, y, z + 1.85, gesims - 0.1, 0.006, 0.006, 6); addCyl(M.siteLamp, ix1 - 0.33, y, z + 1.7, z + 1.85, 0.16, 0.09, 14); }
    // Veranda und Dach; Einbauleuchten in der Verandadecke
    for (const y of [y0 + 0.22, y1 - 0.22]) column(xv + 0.22, y, HOUSE.poolDeck.z, gesims, H.pfeiler, M.siteHell);
    boxPlan(M.siteHell, xv - 0.1, x1 + 0.1, y0 - 0.1, y1 + 0.1, gesims, traufe - 0.06);
    boxPlan(M.siteHell, xv - 0.16, x1 + 0.16, y0 - 0.16, y1 + 0.16, traufe - 0.06, traufe);
    for (const y of [-32.2, -30.65, -29.1]) addCyl(M.siteLamp, xv + 0.9, y, gesims - 0.012, gesims, 0.07, 0.07, 14);
    const roof = hipRoof(xv - ov, x1 + ov, y0 - ov, y1 + ov, traufe, Math.tan(H.neigung * Math.PI / 180));
    const rm = new THREE.Mesh(roof.g, M.siteRoof); rm.castShadow = rm.receiveShadow = true; g.add(rm);
    rod(M.siteZink, roof.r0, roof.r1, 0.04);
    for (let k = 0; k < 4; k++) rod(M.siteZink, roof.c[k], roof.near(k), 0.03);
    // Außendusche an der Nordwand neben dem Fenster: Steinwanne, schwarze Säule mit Brausekopf
    boxPlan(M.fOutTop, 19.5, 20.4, y1, y1 + 0.9, 0, 0.06);
    addCyl(M.fOutMetal, 19.95, y1 + 0.08, 0.06, 2.25, 0.022, 0.022, 8);
    boxPlan(M.fOutMetal, 19.93, 19.97, y1 + 0.08, y1 + 0.42, 2.21, 2.25); addCyl(M.fOutMetal, 19.95, y1 + 0.42, 2.17, 2.21, 0.11, 0.11, 18);
  }
  // Möbel am Pool: vier Liegen mit zwei Sonnenschirmen auf der Ostseite, unter der Veranda eine Liege mit Beistelltisch
  function gardenFurniture() {
    const z = HOUSE.poolDeck.z, H = HOUSE.poolhaus, xv = H.x0 - H.veranda;
    for (const y of [-25.9, -27.0, -34.6, -35.7]) loungerAt(10.65, 12.65, y - 0.37, y + 0.37, z);
    for (const y of [-26.45, -35.15]) parasolAt(13.05, y, z);
    loungerAt(xv + 0.62, xv + 1.37, -33.15, -31.15, z);
    addCyl(M.fOutTop, xv + 0.37, -31.75, z + 0.45, z + 0.48, 0.24, 0.24, 18); addCyl(M.fOutMetal, xv + 0.37, -31.75, z, z + 0.45, 0.02, 0.02, 8);
  }
  // Zaun an der Straße, durchgehend über die ganze Straßenseite: weißer Sockel mit Steinabdeckung, schwarze Stäbe mit Spitzen, Pfeiler mit
  // Abdeckplatten; an Stämmen auf der Grenze endet das Feld mit einem schmalen Pfosten und geht hinter dem Stamm weiter.
  // Zweiflügeliges Einfahrtstor mit flachem Bogen und Gartentür, beide öffnen sich nach innen, wenn man herankommt; Leuchten vorn an den
  // Torpfeilern. Alles höchstens hb = 1,60 m hoch (Pfeiler mit Abdeckung, Torbogen mit Spitzen), Stäbe mit Spitzen bis 1,55 m.
  function buildFence(g) {
    const Zn = HOUSE.zaun, P0 = SITE.plot, pw2 = Zn.pfeiler / 2, hb = Zn.hoehe, zt = Zn.stab - 0.07;
    const spike = (mx, s, zz) => { const c = new THREE.ConeGeometry(0.022, 0.07, 4); c.rotateY(Math.PI / 4); c.translate(s, zz + 0.035, 0); addGeo(M.fOutMetal, c, mx); };
    const bars = (mx, s0, s1, zb0, top) => {
      const n = Math.max(1, Math.round((s1 - s0) / 0.12));
      addBox(M.fOutMetal, mx, s0, s1, zb0 + 0.06, zb0 + 0.1, -0.015, 0.015);
      for (let j = 0; j <= n; j++) { const s = s0 + (s1 - s0) * j / n, zt = top(s); addBox(M.fOutMetal, mx, s - 0.01, s + 0.01, zb0, zt, -0.01, 0.01); spike(mx, s, zt); }
      // Handlauf knapp unter den Spitzen, folgt bei den Toren dem Bogen
      for (let j = 0; j < n; j++) { const sa = s0 + (s1 - s0) * j / n, sb = s0 + (s1 - s0) * (j + 1) / n, zm = (top(sa) + top(sb)) / 2 - 0.1; addBox(M.fOutMetal, mx, sa, sb, zm - 0.02, zm + 0.02, -0.018, 0.018); }
    };
    // Pfeiler bis 1,50 m, Abdeckplatte und flache Haube bis hb
    const pillar = (mx, s) => {
      const h = hb - 0.1;
      addBox(M.siteHell, mx, s - pw2, s + pw2, 0, h, -pw2, pw2);
      addBox(M.brickCap, mx, s - pw2 - 0.04, s + pw2 + 0.04, h, h + 0.06, -pw2 - 0.04, pw2 + 0.04);
      addBox(M.brickCap, mx, s - pw2 + 0.06, s + pw2 - 0.06, h + 0.06, hb, -pw2 + 0.06, pw2 - 0.06);
    };
    // Wandleuchte vorn am Pfeiler (zur Straße): schwarzer Rahmen, Milchglas, Oberkante 1,52 m
    const lantern = (mx, s) => {
      addBox(M.siteFrame, mx, s - 0.075, s + 0.075, 1.28, 1.52, pw2, pw2 + 0.015);
      addBox(M.siteLamp, mx, s - 0.055, s + 0.055, 1.31, 1.49, pw2 + 0.015, pw2 + 0.11);
      for (const [z0, z1] of [[1.29, 1.31], [1.49, 1.515]]) addBox(M.siteFrame, mx, s - 0.07, s + 0.07, z0, z1, pw2 + 0.01, pw2 + 0.125);
    };
    // Lauf von a nach b, um 15 cm nach innen versetzt; links der Laufrichtung liegt das Grundstück
    const frameOf = (a, b) => {
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l, o = [a[0] - uy * 0.15, a[1] + ux * 0.15];
      return { l, ux, uy, o, mx: frameMx({ o, r: [ux, uy], n: [uy, -ux] }), on: s => [a[0] + ux * s, a[1] + uy * s] };
    };
    // Stämme an der Zaunlinie (Stammradius wie im Modell und 8 cm Luft, über die ganze Zauntiefe): Abschnitte [s0, s1] ohne Zaun
    const cuts = F => SITE.trees.map(t => {
      const r = 0.24 + 0.035 * t.r, dx = t.c[0] - F.o[0], dy = t.c[1] - F.o[1], s = dx * F.ux + dy * F.uy, d = Math.max(0, Math.abs(dx * F.uy - dy * F.ux) - 0.17);
      return d < r ? [s - Math.sqrt(r * r - d * d), s + Math.sqrt(r * r - d * d)] : null;
    }).filter(Boolean);
    const run = (a, b, noStart, noEnd) => {
      const F = frameOf(a, b), k = Math.max(1, Math.round(F.l / 2.6)), step = F.l / k, cut = cuts(F);
      for (let i = 0; i <= k; i++) {
        if ((i === 0 && noStart) || (i === k && noEnd) || cut.some(([c0, c1]) => i * step + pw2 > c0 && i * step - pw2 < c1)) continue;
        pillar(F.mx, i * step);
      }
      for (let i = 0; i < k; i++) {
        const s0 = i * step + pw2, s1 = (i + 1) * step - pw2;
        let u = s0;
        for (const [c0, c1] of [...cut.filter(([c0, c1]) => c1 > s0 && c0 < s1), [s1, s1]].sort((p, q) => p[0] - q[0])) {
          const v = Math.min(c0, s1);
          if (v - u > 0.06) {
            addBox(M.siteHell, F.mx, u, v, 0, Zn.sockel, -0.14, 0.14); addBox(M.brickCap, F.mx, u - 0.01, v + 0.01, Zn.sockel, Zn.sockel + 0.04, -0.17, 0.17);
            bars(F.mx, u, v, Zn.sockel + 0.04, () => zt);
            for (const s of [u > s0 ? u : null, v < s1 ? v : null]) if (s !== null) addBox(M.fOutMetal, F.mx, s - 0.025, s + 0.025, Zn.sockel, zt + 0.02, -0.025, 0.025);
          }
          u = Math.max(u, c1);
        }
      }
      return F;
    };
    run(P0[0], P0[1]); run(P0[1], P0[2], true);
    // an der Zufahrt: Pfeiler A mit Leuchte, zweiflügeliges Tor, Pfeiler B mit Briefkasten, Klingel und Leuchte, Gartentür, Eckpfeiler C
    const F = frameOf(P0[2], P0[3]), sx = x => (x - F.o[0]) / F.ux, sA = sx(Zn.tor[0]) - pw2, sB = sx(Zn.tor[1]) + pw2, sC = sx(Zn.tuer[1]) + pw2;
    run(P0[2], F.on(sA), true, true);
    pillar(F.mx, sA); pillar(F.mx, sB); pillar(F.mx, sC); lantern(F.mx, sA); lantern(F.mx, sB);
    addBox(M.trim, F.mx, sB - 0.14, sB + 0.14, 0.72, 1.02, pw2, pw2 + 0.05); addBox(M.siteFrame, F.mx, sB - 0.06, sB + 0.06, 1.08, 1.24, pw2, pw2 + 0.02); addBox(M.siteLamp, F.mx, sB - 0.02, sB + 0.02, 1.18, 1.21, pw2 + 0.02, pw2 + 0.025);
    // Torbogen flach: Stäbe am Pfeiler bis 1,40 m, in der Mitte bis 1,53 m, mit Spitzen höchstens hb
    const wid = sB - pw2 - (sA + pw2), arch = s => hb - 0.2 + 0.13 * Math.sin(Math.PI * Math.min(1, Math.max(0, (s - sA - pw2) / wid)));
    const gateLeaf = (s0, s1, hinge, sg, top, center) => leaf(g, new THREE.Vector3(hinge, 0, 0).applyMatrix4(F.mx), sg, center, () => {
      for (const s of [s0 + 0.03, s1 - 0.03]) addBox(M.fOutMetal, F.mx, s - 0.03, s + 0.03, 0.06, top(s) - 0.02, -0.02, 0.02);
      addBox(M.fOutMetal, F.mx, s0, s1, 0.06, 0.12, -0.02, 0.02);
      bars(F.mx, s0 + 0.06, s1 - 0.06, 0.12, top);
    }, 1.35);
    const gc = new THREE.Vector3((sA + sB) / 2, 1.0, 0).applyMatrix4(F.mx), sm = (sA + sB) / 2;
    gateLeaf(sA + pw2 + 0.02, sm - 0.01, sA + pw2 + 0.02, 1, arch, gc);
    gateLeaf(sm + 0.01, sB - pw2 - 0.02, sB - pw2 - 0.02, -1, arch, gc);
    const tc = new THREE.Vector3((sB + sC) / 2, 1.0, 0).applyMatrix4(F.mx);
    gateLeaf(sB + pw2 + 0.02, sC - pw2 - 0.02, sC - pw2 - 0.02, -1, () => zt, tc);
    run(P0[3], [25.059, -44.0], true);
  }
