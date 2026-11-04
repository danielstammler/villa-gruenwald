  // Teil des 3D-Modells (src/view3d/, siehe 00-kern.js): Rampe, Tiefgarage mit Eingangsschleuse, Autos (Modelle aus src/car-*.js, sonst Ersatzform)
  // Offene Rampe zur Tiefgarage: Fahrbahn nach dem Längsprofil, Betonwände mit Geländer, Durchfahrt unter dem Poolhaus bis zum Tor
  function buildRamp(g) {
    const R0 = HOUSE.rampe, wx0 = R0.x0 - R0.wand, wx1 = R0.x1 + R0.wand, n = 90, pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const y = R0.y0 + (R0.yTor - R0.y0) * i / n, z = R0.z(y);
      pos.push(R0.x0, z, -y, R0.x1, z, -y);
      if (i) { const a = 2 * i - 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const road = new THREE.Mesh(geo, M.rampe); road.receiveShadow = true; g.add(road);
    // Wände: im offenen Teil 15 cm über Gelände, unter dem Poolhaus und im Anschluss der Tiefgarage unter der Decke
    for (const [a, b] of [[wx0, R0.x0], [R0.x1, wx1]]) {
      boxPlan(M.beton, a, b, R0.y0, R0.yPortal + 0.02, R0.zTG - 0.3, 0.15);
      boxPlan(M.beton, a, b, R0.yPortal + 0.02, R0.yTor, R0.zTG - 0.3, R0.decke);
    }
    // Decke unter dem Poolhaus (Sturz der Durchfahrt), dahinter die Decke der Tiefgarage; am Ende das Tor
    boxPlan(M.beton, wx0 + 0.01, wx1 - 0.01, R0.yPortal, R0.yPH, R0.decke, 0);
    const G = HOUSE.tg;
    boxPlan(M.beton, wx0 + 0.01, wx1 - 0.01, R0.yPH, R0.yTor, G.decke, G.decke + G.platte);
    // Tor in Anthrazit mit waagrechten Fugen; schwingt beim Herankommen nach innen unter die Decke (Drehachse oben, quer)
    const tx = (R0.x0 + R0.x1) / 2, zTop = G.decke - 0.06;
    boxPlan(M.tor, R0.x0, R0.x1, R0.yTor - 0.08, R0.yTor + 0.02, zTop, G.decke);
    leaf(g, new THREE.Vector3(tx, zTop, -R0.yTor), 1, new THREE.Vector3(tx, R0.zTG + 1.1, -R0.yTor), () => {
      boxPlan(M.tor, R0.x0, R0.x1, R0.yTor - 0.06, R0.yTor, R0.zTG, zTop);
      for (let z = R0.zTG + 0.5; z < zTop - 0.1; z += 0.5) boxPlan(M.tgSockel, R0.x0 + 0.02, R0.x1 - 0.02, R0.yTor - 0.07, R0.yTor - 0.055, z - 0.012, z + 0.012);
    }, Math.PI / 2);
    doors[doors.length - 1].axis = 'x';
    for (const xr of [R0.x0 - R0.wand / 2, R0.x1 + R0.wand / 2]) {
      railing(M.metal, new THREE.Matrix4().makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(xr, 0, 0)), R0.y0 + 0.3, R0.yPortal - 0.06, 0.15, 1.05, 0);
    }
  }
  // Stab zwischen zwei Punkten (Welt), z. B. für Fahrradrahmen
  function rod(mat, a, b, r) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length(), g = new THREE.CylinderGeometry(r, r, len, 6);
    g.translate(0, len / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
    addGeo(mat, g, null);
  }
  // Einfache Ersatzform der Autos, falls ein Modell aus src/car-*.js fehlt oder scheitert. Seitenprofil (u ab Front, v Höhe) mit Radläufen über die Breite gezogen,
  // zum Dach hin eingezogen und an Bug und Heck schmaler; Scheiben, Leuchten, Felgen mit Bremssätteln und typische Details.
  const CARS = {
    // Ferrari F8 Tributo: Mittelmotor, flacher Keil, Kabine weit vorn, Lufteinlässe in der Flanke, vier runde Rückleuchten
    ferrari: { L: 4.61, W: 1.98, H: 1.21, wf: 1.03, wr: 3.68, r: 0.34, tw: 0.28, sill: 0.13, belt: 0.84, cab: 0.72, paint: 'lackFerrari', rim: 'rim', cal: 'calYellow',
      top: [[0.04, 0.17], [0.0, 0.33], [0.04, 0.45], [0.28, 0.57], [0.85, 0.69], [1.45, 0.8], [1.95, 1.11], [2.28, 1.2], [2.62, 1.2], [3.05, 1.07], [3.7, 0.99], [4.3, 0.97], [4.56, 1.0], [4.61, 0.92], [4.6, 0.55], [4.52, 0.22]],
      win: [[1.62, 0.87], [2.02, 1.11], [2.55, 1.13], [2.98, 0.99], [2.92, 0.87]], ws: [1.5, 2.08], rw: [2.68, 3.28] },
    // Porsche Cayenne Coupé: SUV mit abfallendem Dach, durchgehendes Leuchtenband am Heck, vier Endrohre
    cayenne: { L: 4.93, W: 1.98, H: 1.68, wf: 0.99, wr: 3.89, r: 0.375, tw: 0.29, sill: 0.22, belt: 1.09, cab: 0.8, paint: 'lackCayenne', rim: 'rimDark', cal: 'calRed',
      top: [[0.04, 0.3], [0.0, 0.55], [0.03, 0.76], [0.2, 0.89], [0.9, 0.99], [1.5, 1.07], [1.66, 1.09], [2.32, 1.58], [2.86, 1.67], [3.38, 1.64], [4.12, 1.42], [4.58, 1.24], [4.8, 1.16], [4.91, 1.08], [4.93, 0.92], [4.92, 0.55], [4.85, 0.3]],
      win: [[1.78, 1.13], [2.34, 1.55], [3.33, 1.58], [4.05, 1.36], [4.07, 1.13]], ws: [1.7, 2.3], rw: [3.45, 4.1], pillars: [[2.74, 2.84]] },
    // Mercedes V-Klasse: Großraumlimousine, kurze Haube, langer Glasbereich mit Chromleiste, senkrechtes Heck
    vklasse: { L: 5.14, W: 1.93, H: 1.9, wf: 0.98, wr: 4.18, r: 0.35, tw: 0.245, sill: 0.2, belt: 1.15, cab: 0.93, paint: 'lackV', rim: 'rim', cal: 'rimDark',
      top: [[0.04, 0.3], [0.0, 0.6], [0.06, 0.88], [0.32, 1.0], [0.76, 1.1], [0.93, 1.15], [1.75, 1.84], [2.06, 1.9], [4.96, 1.9], [5.1, 1.85], [5.14, 1.62], [5.14, 0.55], [5.08, 0.3]],
      win: [[1.08, 1.2], [1.76, 1.79], [4.94, 1.8], [5.06, 1.62], [5.06, 1.2]], ws: [0.98, 1.76], rw: null, pillars: [[1.98, 2.08], [3.57, 3.67]] },
  };
  // Autos aus dem Baukasten (src/cars.js, je Modell eine Datei): in Auto-Koordinaten gebaut und hier an den Stellplatz gestellt.
  // Fehlt ein Modell oder scheitert es, steht dort die einfache Form aus carModel.
  function placeCar(key, X0, CY, zf) {
    if (typeof CarKit === 'undefined' || !CAR_MODELS[key]) { carModel(key, X0, CY, zf); return; }
    try {
      const mx = new THREE.Matrix4().makeTranslation(X0, zf, -CY);
      for (const [mat, geos] of CarKit.build(key, THREE, { mergeGeometries, toCreasedNormals }, carMats)) for (const g of geos) addGeo(mat, g, mx);
    } catch (e) { console.warn('Automodell', key, e); carModel(key, X0, CY, zf); }
  }
  function carModel(key, X0, CY, zf) {
    const s = CARS[key], { L, W, H, r, tw, sill, belt, cab } = s, hw = W / 2, ra = r + 0.075, paint = M[s.paint], bs = 0.035;
    const kU = u => 1 - 0.1 * Math.pow(Math.max(0, 1 - u / 0.55), 2) - 0.08 * Math.pow(Math.max(0, 1 - (L - u) / 0.45), 2);
    const kV = v => v <= belt ? 1 : 1 - (1 - cab) * Math.min(1, (v - belt) / (H - belt));
    const half = (u, v) => hw * kU(u) * kV(v);
    // Kontur als weiche Kurve durch die Stützpunkte (Haube, Scheibe, Dach und Heck gehen ineinander über)
    const top = new THREE.CatmullRomCurve3(s.top.map(([u, v]) => new THREE.Vector3(u, v, 0)), false, 'centripetal').getPoints(s.top.length * 5).map(p => [p.x, p.y]);
    // Höhe der Oberkante bei u (größter Wert der Kontur dort)
    const vTop = u => { let v = 0; for (let i = 0; i < top.length - 1; i++) { const [a, b] = top[i], [c, d] = top[i + 1]; if ((u - a) * (u - c) <= 0 && a !== c) v = Math.max(v, b + (d - b) * (u - a) / (c - a)); } return v; };
    const arcPts = c => Array.from({ length: 13 }, (_, k) => [c + ra * Math.cos(Math.PI * k / 12), r + ra * Math.sin(Math.PI * k / 12)]);
    const bot = [[L - 0.08, sill], [s.wr + ra, sill], ...arcPts(s.wr), [s.wr - ra, sill], [s.wf + ra, sill], ...arcPts(s.wf), [s.wf - ra, sill], [0.08, sill]];
    // Karosserie: extrudieren, einziehen, glatt schattieren
    const bt = 0.07;
    let body = new THREE.ExtrudeGeometry(new THREE.Shape([...top, ...bot].map(([u, v]) => v2(u, v))), { depth: W - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 3, curveSegments: 1 });
    body.translate(0, 0, -(W - 2 * bt) / 2);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) bp.setZ(i, bp.getZ(i) * kU(bp.getX(i)) * kV(bp.getY(i)));
    // Normalen nur bis 35° glätten: runde Fasen, aber klare Kanten an Schulter, Dach und Front
    body = toCreasedNormals(body, 0.6);
    body.translate(X0, zf, -CY); addGeo(paint, body, null);
    // Flächen auf der Flanke (Scheiben, Säulen, Einlässe), dem Dach bzw. der Haube und auf Front oder Heck
    const sideShape = (mat, pts, off = 0.006) => {
      for (const sg of [-1, 1]) {
        const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([u, v]) => v2(u, v)))), p = g.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, sg * (half(p.getX(i), p.getY(i)) + off));
        if (sg < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 2]; ix[i + 2] = t; } }
        g.computeVertexNormals(); g.translate(X0, zf, -CY); addGeo(mat, g, null);
      }
    };
    const topQuad = (mat, u0, u1, t0, t1, off = 0.008 + bs) => {
      const v0 = vTop(u0), v1 = vTop(u1), du = u1 - u0, dv = v1 - v0, l = Math.hypot(du, dv), nu = -dv / l * off, nv = du / l * off;
      const c0 = Math.min(Math.abs(t0), half(u0, v0) - 0.03) * Math.sign(t0 || 1), c1 = Math.min(Math.abs(t1), half(u0, v0) - 0.03) * Math.sign(t1 || 1);
      const d0 = Math.min(Math.abs(t0), half(u1, v1) - 0.03) * Math.sign(t0 || 1), d1 = Math.min(Math.abs(t1), half(u1, v1) - 0.03) * Math.sign(t1 || 1);
      const A = [X0 + u0 + nu, zf + v0 + nv], B = [X0 + u1 + nu, zf + v1 + nv], g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([A[0], A[1], -CY + c0, B[0], B[1], -CY + d1, B[0], B[1], -CY + d0, A[0], A[1], -CY + c0, A[0], A[1], -CY + c1, B[0], B[1], -CY + d1], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(12), 2)); g.computeVertexNormals(); addGeo(mat, g, null);
    };
    // Front und Heck liegen wegen der Fase 3,5 cm weiter außen als die Kontur
    const end = (mat, u, v0, v1, t0, t1, d = 0.024) => { const uu = u + (u > L / 2 ? bs : -bs); addBox(mat, null, X0 + uu - d / 2, X0 + uu + d / 2, zf + v0, zf + v1, -CY + t0, -CY + t1); };
    const both = (fn, a, b) => { fn(a, b); fn(-b, -a); };
    const disc = (mat, u, v, t, rr, len = 0.03) => { const g = new THREE.CylinderGeometry(rr, rr, len, 18); g.rotateZ(Math.PI / 2); g.translate(X0 + u, zf + v, -CY + t); addGeo(mat, g, null); };
    sideShape(M.carGlass, s.win, 0.004);
    for (const [a, b] of s.pillars || []) sideShape(M.trim, [[a, belt + 0.02], [b, belt + 0.02], [b + 0.01, H - 0.08], [a + 0.01, H - 0.08]], 0.009);
    topQuad(M.carGlass, s.ws[0], s.ws[1], -hw, hw);
    if (s.rw) topQuad(M.carGlass, s.rw[0], s.rw[1], -hw, hw);
    // Räder: Reifen, Felge mit fünf Speichen, Bremssattel, Radhausschale
    for (const uc of [s.wf, s.wr]) {
      const liner = new THREE.CylinderGeometry(ra, ra, W - 0.22, 18, 1, true); liner.rotateX(Math.PI / 2); liner.translate(X0 + uc, zf + r, -CY); addGeo(M.archLiner, liner, null);
      for (const sg of [-1, 1]) {
        const tc = sg * (hw * kU(uc) - tw / 2 - 0.02), to = tc + sg * tw / 2, cxw = X0 + uc, cyw = zf + r;
        const tire = new THREE.CylinderGeometry(r, r, tw, 30); tire.rotateX(Math.PI / 2); tire.translate(cxw, cyw, -CY + tc); addGeo(M.tire, tire, null);
        const rimG = new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.03, 30); rimG.rotateX(Math.PI / 2); rimG.translate(cxw, cyw, -CY + to - sg * 0.12); addGeo(M.rimDark, rimG, null);
        const lip = new THREE.TorusGeometry(r * 0.71, 0.018, 6, 30); lip.translate(cxw, cyw, -CY + to - sg * 0.02); addGeo(M[s.rim], lip, null);
        for (let k = 0; k < 5; k++) {
          const sp = new THREE.BoxGeometry(r * 0.66, 0.055, 0.028); sp.translate(r * 0.33, 0, 0); sp.rotateZ(k * Math.PI * 2 / 5 + 0.3); sp.translate(cxw, cyw, -CY + to - sg * 0.025); addGeo(M[s.rim], sp, null);
        }
        const hub = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 14); hub.rotateX(Math.PI / 2); hub.translate(cxw, cyw, -CY + to - sg * 0.02); addGeo(M[s.rim], hub, null);
        const cal = new THREE.BoxGeometry(0.15, 0.1, 0.05); cal.rotateZ(0.9); cal.translate(cxw - r * 0.42, cyw + r * 0.38, -CY + to - sg * 0.075); addGeo(M[s.cal], cal, null);
      }
    }
    // Spiegel und Kennzeichen (ohne Schrift)
    const mu = s.win[0][0] + 0.05, mv = belt + 0.06;
    for (const sg of [-1, 1]) addBox(paint, null, X0 + mu, X0 + mu + 0.16, zf + mv, zf + mv + 0.11, -CY + sg * (half(mu, mv) + 0.02), -CY + sg * (half(mu, mv) + 0.2));
    end(M.paint, L - 0.005, 0.5, 0.62, -0.26, 0.26, 0.012);
    // Modelltypische Details
    if (key === 'ferrari') {
      topQuad(M.headlight, 0.06, 0.26, 0.5, 0.86); topQuad(M.headlight, 0.06, 0.26, -0.86, -0.5);
      end(M.grille, 0.02, 0.18, 0.33, -0.72, 0.72); topQuad(M.grille, 0.4, 0.85, -0.3, 0.3);
      sideShape(M.grille, [[3.02, 0.48], [3.48, 0.57], [3.5, 0.83], [3.1, 0.8]], 0.008);
      topQuad(M.grille, 3.35, 4.25, -0.5, 0.5);
      for (const t of [0.55, 0.78]) for (const sg of [-1, 1]) { disc(M.taillight, L + bs + 0.004, 0.85, sg * t, 0.068); disc(M.trim, L + bs - 0.002, 0.85, sg * t, 0.085, 0.02); }
      end(M.grille, L - 0.05, 0.14, 0.34, -0.8, 0.8, 0.1);
      for (const sg of [-1, 1]) disc(M.chrome, L + bs - 0.01, 0.42, sg * 0.2, 0.05, 0.08);
    } else if (key === 'cayenne') {
      topQuad(M.headlight, 0.05, 0.3, 0.52, 0.88); topQuad(M.headlight, 0.05, 0.3, -0.88, -0.52);
      end(M.grille, 0.015, 0.33, 0.6, -0.32, 0.32); both((a, b) => end(M.grille, 0.02, 0.32, 0.58, a, b), 0.4, 0.86);
      end(M.taillight, L - 0.005, 0.98, 1.03, -0.86, 0.86); both((a, b) => end(M.taillight, L - 0.01, 0.92, 1.06, a, b), 0.62, 0.9);
      end(M.grille, L - 0.03, 0.28, 0.46, -0.9, 0.9, 0.06);
      for (const t of [0.5, 0.66]) for (const sg of [-1, 1]) disc(M.chrome, L + bs, 0.4, sg * t, 0.045, 0.08);
    } else if (key === 'vklasse') {
      topQuad(M.headlight, 0.08, 0.32, 0.55, 0.9); topQuad(M.headlight, 0.08, 0.32, -0.9, -0.55);
      end(M.grille, 0.035, 0.6, 0.86, -0.52, 0.52);
      for (const v of [0.66, 0.73, 0.8]) end(M.chrome, 0.02, v - 0.012, v + 0.012, -0.5, 0.5);
      end(M.grille, 0.025, 0.32, 0.5, -0.75, 0.75);
      sideShape(M.chrome, [[1.12, 1.165], [5.02, 1.165], [5.02, 1.19], [1.12, 1.19]], 0.009);
      for (const u of [2.08, 3.62]) sideShape(M.trim, [[u, 0.4], [u + 0.012, 0.4], [u + 0.012, 1.15], [u, 1.15]], 0.008);
      end(M.carGlass, L + 0.003, 1.16, 1.74, -0.78, 0.78, 0.012);
      both((a, b) => end(M.taillight, L + 0.002, 0.9, 1.45, a, b, 0.016), 0.8, 0.93);
    }
  }
  // Tiefgarage und Erdreich für den Blick in den Keller: 2,70 m lichte Höhe, heller Beschichtungsboden, weiße Wände mit dunklem Sockel,
  // Holzlamellen an der Stirnwand hinter den Autos, Lichtlinien an der Decke, Wallboxen, Schrankwand, Fahrräder
  function buildGarage() {
    const g = new THREE.Group(), R0 = HOUSE.rampe, G = HOUSE.tg, zf = R0.zTG, zc = G.decke;
    const TGF = [[4.5, -11.65], [23.499, -11.65], [23.499, -24.151], [11.498, -24.151], [11.498, -14.652], [4.5, -14.652]];
    g.add(extrude(TGF, M.tgFloor, zf - 0.3, 0.3), extrude(TGF, M.tgCeil, zc, G.platte));
    const walls = [[16, 23.499, -11.95, -11.65], [23.199, 23.499, -24.151, -11.65], [22.885, 23.499, -24.151, -23.851], [11.498, 19.38, -24.151, -23.851],
      [11.498, 11.798, -24.151, -14.652], [4.5, 11.798, -14.652, -14.352], [4.5, 4.8, -14.652, -11.65]];
    for (const r of walls) { boxPlan(M.tgWall, r[0], r[1], r[2], r[3], zf, zc); wallRects.push({ fl: 'UG', r, top: zc }); }
    // dunkler Sockel an den Innenseiten der Wände
    for (const [x0, x1, y0, y1] of [[16, 23.199, -11.97, -11.95], [23.179, 23.199, -23.851, -11.95], [11.798, 19.38, -23.871, -23.851], [11.798, 11.818, -23.851, -14.652], [4.8, 11.798, -14.372, -14.352]])
      boxPlan(M.tgSockel, x0, x1, y0, y1, zf, zf + 0.12);
    // Rampenwände unterhalb des Kellerschnitts ebenfalls mit Schnittfläche
    for (const [a, b] of [[R0.x0 - R0.wand, R0.x0], [R0.x1, R0.x1 + R0.wand]]) wallRects.push({ fl: 'UG', r: [a, b, cutRampY(), R0.yTor], top: 0 });
    // Drei Stellplätze 2,85 m breit, dunkle Linien auf hellem Boden
    const nA = G.autos.length, yEnd = G.y0 + nA * G.bucht;
    for (let i = 0; i <= nA; i++) boxPlan(M.tgLine, G.x0, G.x1, G.y0 + G.bucht * i - 0.05, G.y0 + G.bucht * i + 0.05, zf, zf + 0.004);
    // Stirnwand hinter den Autos: senkrechte Eichenlamellen, oben eine indirekte Lichtleiste
    for (let y = G.y0 + 0.05; y < yEnd - 0.05; y += 0.075) boxPlan(M.tgHolz, 11.8, 11.84, y, y + 0.045, zf + 0.12, zc - 0.12);
    boxPlan(M.led, 11.86, 11.9, G.y0, yEnd, zc - 0.11, zc - 0.07);
    // Wallboxen zwischen den Stellplätzen
    for (let i = 0; i < nA; i++) {
      const y = G.mitte(i) - 1.05;
      boxPlan(M.tgBox, 11.84, 11.97, y - 0.17, y + 0.17, zf + 1.05, zf + 1.5); boxPlan(M.ledGreen, 11.97, 11.975, y - 0.05, y + 0.05, zf + 1.38, zf + 1.42);
      boxPlan(M.trim, 11.84, 11.95, y - 0.1, y + 0.1, zf + 0.92, zf + 1.02);
    }
    // Schrankwand an der Nordwand neben der Fahrgasse
    for (let x = 17.4; x < 23.1; x += 0.95) { boxPlan(M.tgBox, x, x + 0.93, -12.55, -11.95, zf + 0.1, zf + 2.25); boxPlan(M.trim, x + 0.86, x + 0.88, -12.565, -12.55, zf + 0.9, zf + 1.4); }
    boxPlan(M.tgSockel, 17.4, 23.05, -12.5, -11.95, zf, zf + 0.1);
    // Lichtlinien an der Decke: über den Autos, über der Fahrgasse, quer über Schleuse und Fahrgasse, unter der Terrasse
    for (const [x0, x1, y0, y1] of [[13.5, 13.56, G.y0 + 0.3, yEnd - 0.3], [15.9, 15.96, G.y0 + 0.3, yEnd - 0.3], [20.2, 20.26, -23.4, -12.9],
      [17.4, 22.8, -12.86, -12.8], [5.2, 11.2, -13.05, -12.99]]) boxPlan(M.led, x0, x1, y0, y1, zc - 0.025, zc);
    // Eingangsschleuse vor dem Haus: Steinboden, Glaswände im schwarzen Stahlrahmen zur Fahrgasse und zum Fahrradraum, Glastüren,
    // Eichenpaneele an der Hauswand, Garderobe mit Bank, großer Spiegel, Lichtdecke; dahinter die zweiflügelige Glastür ins Foyer
    const E = G.schleuse, zg0 = zf + 0.012, zg1 = zc - 0.06;
    boxPlan(M.tgStone, E.x0, E.x1, E.y0, E.y1, zf, zg0);
    const post = (x, y) => boxPlan(M.tgFrame, x - 0.03, x + 0.03, y - 0.03, y + 0.03, zf, zc);
    // Glasfeld mit Deckenschiene und Bodenprofil; das Profil ist quer zur Scheibe breiter, damit es das Glas sauber fasst
    const pane = (x0, x1, y0, y1, za = zg0) => {
      const qx = Math.abs(x1 - x0) < Math.abs(y1 - y0) ? 0.015 : 0, qy = 0.015 - qx;
      boxPlan(M.tgGlass, x0, x1, y0, y1, za, zg1); boxPlan(M.tgFrame, Math.min(x0, x1) - 0.01, Math.max(x0, x1) + 0.01, Math.min(y0, y1) - 0.012, Math.max(y0, y1) + 0.012, zg1, zc);
      boxPlan(M.tgFrame, Math.min(x0, x1) - qx, Math.max(x0, x1) + qx, Math.min(y0, y1) - qy, Math.max(y0, y1) + qy, za === zg0 ? zf : za - 0.06, za + 0.04);
    };
    for (let k = 0; k <= 4; k++) post(E.x0 + (E.x1 - E.x0) * k / 4, E.y0);
    pane(E.x0 + 0.03, E.x1 - 0.03, E.y0 - 0.006, E.y0 + 0.006);
    pane(E.x1 - 0.006, E.x1 + 0.006, E.y0 + 0.03, E.tuer[0] - 0.03); pane(E.x1 - 0.006, E.x1 + 0.006, E.tuer[1] + 0.03, -11.98);
    for (const y of [E.tuer[0], E.tuer[1], -11.98]) post(E.x1, y);
    pane(E.x0 - 0.006, E.x0 + 0.006, -14.62, E.radTuer[0] - 0.03); pane(E.x0 - 0.006, E.x0 + 0.006, E.radTuer[1] + 0.03, E.y1 - 0.03);
    for (const y of [E.radTuer[0], E.radTuer[1]]) post(E.x0, y);
    // Glastüren: zwei Flügel zur Fahrgasse, einer zum Fahrradraum, zwei ins Foyer (dunkel lackiert mit Glasfeld); öffnen sich beim Herankommen
    const glassLeaf = (alongY, hinge, len, sign, c, dark) => {
      const hv = alongY ? new THREE.Vector3(c.x, 0, -hinge) : new THREE.Vector3(hinge, 0, -c.y);
      leaf(g, hv, sign, new THREE.Vector3(c.x, zf + 1.1, -c.y), () => {
        const a = hinge, b = hinge + len, lo = Math.min(a, b), hi = Math.max(a, b);
        const bx = (u0, u1, v0, v1, mat, z0, z1) => alongY ? boxPlan(mat, c.x + v0, c.x + v1, u0, u1, z0, z1) : boxPlan(mat, u0, u1, c.y + v0, c.y + v1, z0, z1);
        // die Foyertür gehört zum Haus (der Hausschnitt erfasst sie ganz), die Glastüren zur Schleuse
        const fr = dark ? M.frame : M.tgFrame, gl = dark ? M.glass : M.tgGlass;
        bx(lo + 0.05, hi - 0.05, -0.006, 0.006, dark ? M.door : gl, zf + 0.06, zf + 2.24);
        if (dark) bx(lo + 0.16, hi - 0.16, 0.006, 0.012, gl, zf + 0.5, zf + 2.0);
        for (const [u0, u1, z0, z1] of [[lo, lo + 0.05, zf + 0.02, zf + 2.28], [hi - 0.05, hi, zf + 0.02, zf + 2.28], [lo, hi, zf + 0.02, zf + 0.08], [lo, hi, zf + 2.22, zf + 2.28]]) bx(u0, u1, -0.022, 0.022, fr, z0, z1);
        const gu = len > 0 ? hi - 0.11 : lo + 0.11; bx(gu - 0.012, gu + 0.012, -0.06, 0.06, dark ? M.metal : M.fOutMetal, zf + 0.85, zf + 1.4);
      });
    };
    const tm = (E.tuer[0] + E.tuer[1]) / 2, tc = { x: E.x1, y: tm }, hw2 = (E.tuer[1] - E.tuer[0]) / 2 - 0.01;
    glassLeaf(true, E.tuer[0], hw2, 1, tc); glassLeaf(true, E.tuer[1], -hw2, -1, tc);
    glassLeaf(true, E.radTuer[0], E.radTuer[1] - E.radTuer[0], -1, { x: E.x0, y: (E.radTuer[0] + E.radTuer[1]) / 2 });
    // Oberlichter über den Glastüren bis zur Decke, damit die Schleuse auch oben geschlossen ist
    pane(E.x1 - 0.006, E.x1 + 0.006, E.tuer[0] + 0.03, E.tuer[1] - 0.03, zf + 2.36);
    pane(E.x0 - 0.006, E.x0 + 0.006, E.radTuer[0] + 0.03, E.radTuer[1] - 0.03, zf + 2.36);
    const [ha, hb] = E.hausTuer, hc = { x: (ha + hb) / 2, y: -11.47 }, hl = (hb - ha) / 2 - 0.01;
    glassLeaf(false, ha, hl, 1, hc, true); glassLeaf(false, hb, -hl, -1, hc, true);
    boxPlan(M.tgStone, ha, hb, -11.65, -11.29, zf, zg0);
    // Hauswand: Eichenpaneele, Garderobe mit Haken und Schuhbank links der Tür, großer Spiegel rechts davon; Bank an der Glaswand
    for (const [x0, x1] of [[E.x0, ha - 0.06], [hb + 0.06, 16]]) boxPlan(M.tgHolz, x0, x1, -11.68, -11.65, zf, zc - 0.05);
    boxPlan(M.tgHolz, ha - 0.06, hb + 0.06, -11.68, -11.65, zf + 2.34, zc - 0.05);
    boxPlan(M.tgHolz, 16, E.x1 - 0.04, -11.98, -11.95, zf, zc - 0.05);
    boxPlan(M.tgHolz, E.x0 + 0.1, ha - 0.2, -12.1, -11.68, zf + 0.0, zf + 0.45); boxPlan(M.fOutMetal, E.x0 + 0.1, ha - 0.2, -11.74, -11.68, zf + 1.72, zf + 1.76);
    for (let x = E.x0 + 0.2; x < ha - 0.25; x += 0.16) boxPlan(M.fOutMetal, x - 0.008, x + 0.008, -11.8, -11.68, zf + 1.66, zf + 1.74);
    boxPlan(M.chrome, hb + 0.3, hb + 1.4, -11.7, -11.69, zf + 0.5, zf + 2.2); boxPlan(M.tgSockel, hb + 0.27, hb + 1.43, -11.69, -11.68, zf + 0.47, zf + 2.23);
    boxPlan(M.tgHolz, 14.8, 16.9, -14.88, -14.42, zf + 0.4, zf + 0.46);
    for (const x of [14.9, 16.8]) boxPlan(M.fOutMetal, x - 0.02, x + 0.02, -14.85, -14.45, zf, zf + 0.4);
    boxPlan(M.trim, ha - 0.1, hb + 0.1, -12.6, -11.72, zg0, zg0 + 0.008);
    boxPlan(M.led, 12.4, 16.6, -14.4, -14.3, zc - 0.03, zc - 0.01); boxPlan(M.led, 12.4, 16.6, -12.35, -12.25, zc - 0.03, zc - 0.01);
    // Autos auf P1 bis P3 mit der Front zur Holzwand
    G.autos.forEach((c, i) => placeCar(c.k, G.x0 + 0.05, G.mitte(i), zf));
    // Echtes Licht unter den Lichtlinien (ohne Schatten); brennt nur, wenn man in der Tiefgarage ist oder von oben hineinsieht
    L.tgLights = [[14.7, -21.4], [14.7, -17.6], [20.2, -20.5], [20.2, -14.5], [14.5, -13.3], [8.0, -13.0]].map(([x, y]) => {
      const l = new THREE.PointLight(0xfff0dc, 0, 10, 2); l.position.set(x, zc - 0.35, -y); g.add(l); return l;
    });
    // Fahrräder im Bereich unter der Terrasse
    for (let i = 0; i < 5; i++) {
      const x = 5.4 + i * 1.1, yR = -13.4, yF = -12.3, hz = zf + 0.35, P3 = (yy, zz) => new THREE.Vector3(x, zz, -yy);
      for (const yy of [yR, yF]) { const t = new THREE.TorusGeometry(0.33, 0.022, 6, 28); t.rotateY(Math.PI / 2); t.translate(x, hz, -yy); addGeo(M.tire, t, null); }
      const seat = P3(-13.05, zf + 0.95), bar = P3(-12.45, zf + 1.02), bb = P3(-12.9, zf + 0.32);
      rod(M.bikeFrame, P3(yR, hz), seat, 0.018); rod(M.bikeFrame, P3(yR, hz), bb, 0.018); rod(M.bikeFrame, bb, seat, 0.02);
      rod(M.bikeFrame, bb, P3(-12.45, zf + 0.85), 0.02); rod(M.bikeFrame, seat, P3(-12.45, zf + 0.85), 0.018); rod(M.bikeFrame, P3(yF, hz), bar, 0.018);
      rod(M.tire, P3(-12.45, zf + 1.02).add(new THREE.Vector3(-0.25, 0, 0)), P3(-12.45, zf + 1.02).add(new THREE.Vector3(0.25, 0, 0)), 0.014);
    }
    flushBatches(g);
    // Erdreich auf Höhe des Kellerschnitts mit einer Öffnung für Keller, Tiefgarage und Rampe (nur im Kellerblick sichtbar)
    const yc = cutRampY(), hole = [[0, 0], [16, 0], [16, -11.65], [23.499, -11.65], [23.499, -24.151], [22.885, -24.151], [22.885, yc], [19.38, yc],
      [19.38, -24.151], [11.498, -24.151], [11.498, -14.652], [4.5, -14.652], [4.5, -11.65], [0, -11.65]];
    // In Stücken, damit keine langen, spitzen Dreiecke von der Öffnung bis zum Rand entstehen (helle Nähte im Bild)
    const erde = new THREE.Group(), ze = LEVEL_CUT.UG - 0.004, bx0 = -2, bx1 = 25.5, by0 = yc - 2, by1 = 2;
    for (const [a, b, c, e] of [[-120, bx0, -140, 120], [bx1, 150, -140, 120], [bx0, bx1, -140, by0], [bx0, bx1, by1, 120]]) erde.add(flat([[a, c], [b, c], [b, e], [a, e]], M.earth, ze));
    erde.add(flat([[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]], M.earth, ze, [hole]));
    erde.visible = false; g.add(erde); L.erde = erde;
    return g;
  }
  // Wo die Rampe die Schnitthöhe des Kellerblicks unterschreitet
  function cutRampY() {
    const R0 = HOUSE.rampe, zc = LEVEL_CUT.UG;
    let a = R0.y0, b = R0.y1;
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (R0.z(m) > zc) a = m; else b = m; }
    return b;
  }
