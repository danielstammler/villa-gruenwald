  // Teil des 3D-Modells (src/view3d/, siehe 00-kern.js): Rampe, Tiefgarage mit Eingangsbereich vor dem Foyer, Autos (Modelle aus src/car-*.js, sonst Ersatzform)
  // Rampe zur Tiefgarage (Längsprofil HOUSE.rampe.z): Vorplatz ab der Grenze bis zur Rinne, Fahrbahn zwischen Betonwänden mit Geländer,
  // Durchfahrt unter dem Poolhaus mit Unterzug unter dessen Nordwand, unten Rinne mit Pumpensumpf und das Sektionaltor
  function buildRamp(g) {
    const R0 = HOUSE.rampe, G = HOUSE.tg, gr = R0.grenze, wx0 = R0.x0 - R0.wand, wx1 = R0.x1 + R0.wand, pos = [], idx = [];
    // Fahrbahn: Querreihen alle 25 cm und an jedem Knick, vorne an der schrägen Grenze abgeschnitten (dort eben)
    const ys = [R0.yG, R0.y0, R0.y0 + R0.lm, R0.y1, R0.yTor];
    for (let y = gr(R0.x1); y < R0.yTor; y += 0.25) ys.push(y);
    ys.sort((a, b) => a - b).filter((y, i, A) => !i || y - A[i - 1] > 0.005).forEach((y, i) => {
      const ya = Math.max(y, gr(R0.x0)), yb = Math.max(y, gr(R0.x1));
      pos.push(R0.x0, R0.z(ya), -ya, R0.x1, R0.z(yb), -yb);
      if (i) { const a = 2 * i - 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const road = new THREE.Mesh(geo, M.rampe); road.receiveShadow = true; g.add(road);
    // Rinnen mit Gitterrost quer über die Fahrbahn: am Ende des Vorplatzes und vor dem Tor, dort mit Deckel über dem Pumpensumpf am Westrand
    const rinne = (yc, xa) => {
      const z = R0.z(yc);
      boxPlan(M.tgSockel, xa, R0.x1, yc - 0.08, yc + 0.08, z - 0.03, z + 0.004);
      for (let x = xa + 0.04; x < R0.x1 - 0.03; x += 0.06) boxPlan(M.metal, x, x + 0.025, yc - 0.07, yc + 0.07, z - 0.002, z + 0.006);
    };
    rinne(R0.y0 - 0.09, R0.x0); rinne(R0.y1 + 0.15, R0.x0 + 0.5);
    boxPlan(M.metal, R0.x0 + 0.04, R0.x0 + 0.46, R0.y1 - 0.06, R0.y1 + 0.36, R0.zTG - 0.03, R0.zTG + 0.005);
    // Wände: neben dem Vorplatz bodengleiche Randsteine, ab der Rinne im offenen Teil 15 cm über Gelände, unter dem Poolhaus und im Anschluss
    // der Tiefgarage bis unter die Decke (Leibung und Sturz der Toröffnung gehören zur Tiefgarage, buildGarage)
    for (const [a, b] of [[wx0, R0.x0], [R0.x1, wx1]]) {
      boxPlan(M.beton, a, b, Math.max(gr(a), gr(b)) + 0.02, R0.y0, R0.zR - 0.3, 0.02);
      boxPlan(M.beton, a, b, R0.y0, R0.yPortal + 0.02, R0.zTG - 0.3, 0.15);
      boxPlan(M.beton, a, b, R0.yPortal + 0.02, R0.yTor, R0.zTG - 0.3, R0.decke);
    }
    // Decke unter dem Poolhaus (−0,15 bis 0, darauf dessen Boden), an dessen Nordwand der Unterzug bis zur Decke der Tiefgarage, dahinter deren Decke
    boxPlan(M.beton, wx0 + 0.01, wx1 - 0.01, R0.yPortal, R0.yPH, R0.decke, 0);
    boxPlan(M.beton, wx0 + 0.01, wx1 - 0.01, R0.yPH - R0.unterzug.b, R0.yPH, G.decke, R0.decke);
    boxPlan(M.beton, wx0 + 0.01, wx1 - 0.01, R0.yPH, R0.yTor, G.decke, G.decke + G.platte);
    sectionalDoor(g);
    for (const xr of [R0.x0 - R0.wand / 2, R0.x1 + R0.wand / 2]) {
      railing(M.metal, new THREE.Matrix4().makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(xr, 0, 0)), R0.y0 + 0.3, R0.yPortal - 0.06, 0.15, 1.05, 0);
    }
  }
  // Sektionaltor 2,80 × 2,30 m hinter der Öffnung (Innenseite der Wand): vier Paneele in Anthrazit mit waagrechten Fugen laufen in seitlichen
  // Schienen senkrecht hoch, um einen Bogen (r 0,25 m) und liegen offen waagrecht unter der Decke. Torsionsfeder über der Öffnung, Antrieb an
  // der Decke. Öffnet beim Herankommen: updateDoors ruft d.set(t) mit t = 0 (zu) bis 1 (offen).
  function sectionalDoor(g) {
    const R0 = HOUSE.rampe, G = HOUSE.tg, zf = R0.zTG, n = 4, hb = R0.tor.h + 0.05, hp = hb / n, rb = 0.25, th = 0.042, lb = Math.PI * rb / 2;
    const xa = R0.x0 - 0.05, xb = R0.x1 + 0.05, yL = R0.yE + 0.03, zb = zf + hb, zh = zb + rb, xm = (R0.x0 + R0.x1) / 2;
    // Weg der Paneelmitte (Plan-y, Höhe) über der Bogenlänge s ab dem Boden: senkrecht, Viertelkreis, waagrecht
    const at = s => s <= hb ? [yL, zf + s] : s <= hb + lb ? [yL + rb - rb * Math.cos((s - hb) / rb), zb + rb * Math.sin((s - hb) / rb)] : [yL + rb + s - hb - lb, zh];
    const mxAt = (s0, s1) => { const [ya, za] = at(s0), [yb, zz] = at(s1); return [new THREE.Matrix4().makeTranslation(0, za, -ya).multiply(new THREE.Matrix4().makeRotationX(-Math.atan2(yb - ya, zz - za))), Math.hypot(yb - ya, zz - za)]; };
    const panels = [];
    for (let i = 0; i < n; i++) {
      // Paneel lokal: x wie die Welt, entlang +y von 0 bis hp, Außenseite (zur Rampe, offen nach oben) bei +z; Fuge an der Unterkante (die Paneele
      // greifen wie Nut und Feder ineinander, kein Lichtspalt), Laufrollen
      const saved = [...batches]; batches.clear();
      addBox(M.tor, null, xa, xb, -0.003, hp + 0.003, -th / 2, th / 2);
      addBox(M.trim, null, xa + 0.01, xb - 0.01, -0.002, 0.008, th / 2, th / 2 + 0.002); addBox(M.trim, null, xa + 0.06, xb - 0.06, -0.002, 0.006, -th / 2 - 0.002, -th / 2);
      if (!i) addBox(M.trim, null, xa + 0.01, xb - 0.01, -0.01, 0.006, -th / 2 + 0.006, th / 2 - 0.006);
      for (const x of [xa - 0.035, xb + 0.005]) addBox(M.metal, null, x, x + 0.03, 0.04, 0.09, -0.015, 0.015);
      const grp = new THREE.Group(); flushBatches(grp);
      for (const [k, v] of saved) batches.set(k, v);
      g.add(grp); panels.push(grp);
    }
    // offen liegt die Unterkante des untersten Paneels am Ende des Bogens, alle Paneele waagrecht
    const set = t => panels.forEach((p, i) => mxAt(i * hp + t * (hb + lb), (i + 1) * hp + t * (hb + lb))[0].decompose(p.position, p.quaternion, p.scale));
    set(0);
    doors.push({ c: new THREE.Vector3(xm, zf + 1.1, -R0.yTor), open: 0, set, v: 0.9 });
    // Schienen neben dem Torblatt: senkrecht an der Wand, Bogen in acht Stücken, waagrecht bis hinter das offene Tor mit Abhängern zur Decke
    for (const [x0, x1] of [[xa - 0.065, xa - 0.005], [xb + 0.005, xb + 0.065]]) {
      boxPlan(M.metal, x0, x1, yL - 0.035, yL + 0.035, zf, zb);
      for (let k = 0; k < 8; k++) { const [m, l] = mxAt(hb + lb * k / 8, hb + lb * (k + 1) / 8); addBox(M.metal, m, x0, x1, 0, l + 0.004, -0.035, 0.035); }
      boxPlan(M.metal, x0, x1, yL + rb, yL + rb + hb + 0.15, zh - 0.035, zh + 0.035);
      for (const yy of [yL + rb + 1.0, yL + rb + hb + 0.1]) boxPlan(M.metal, x0 + 0.02, x1 - 0.02, yy - 0.015, yy + 0.015, zh + 0.035, G.decke);
    }
    // Torsionsfederwelle mit zwei Federn an der Innenseite des Sturzes, Antrieb mit Laufschiene in der Mitte unter der Decke
    const shaft = (r, len, x, mat) => { const c = new THREE.CylinderGeometry(r, r, len, 12); c.rotateZ(Math.PI / 2); c.translate(x, G.decke - 0.1, -(R0.yE + 0.07)); addGeo(mat, c, null); };
    shaft(0.02, xb - xa + 0.1, xm, M.metal); shaft(0.045, 0.7, xm - 0.45, M.tgSockel); shaft(0.045, 0.7, xm + 0.45, M.tgSockel);
    for (const x of [xa - 0.02, xm, xb + 0.02]) boxPlan(M.metal, x - 0.04, x + 0.04, R0.yE, R0.yE + 0.12, G.decke - 0.15, G.decke - 0.05);
    const yM = yL + rb + hb + 0.35;
    boxPlan(M.metal, xm - 0.03, xm + 0.03, R0.yE + 0.12, yM, G.decke - 0.04, G.decke);
    boxPlan(M.tgBox, xm - 0.16, xm + 0.16, yM, yM + 0.38, G.decke - 0.17, G.decke);
  }
  // Stab zwischen zwei Punkten (Welt), z. B. für Fahrradrahmen
  function rod(mat, a, b, r) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length(), g = new THREE.CylinderGeometry(r, r, len, 6);
    g.translate(0, len / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
    addGeo(mat, g, null);
  }
  // Fahrrad (Radstand 1,10 m, Räder 0,68 m) halb hochgestellt vor der Wand bei yW: um 57° um die Hinterradnabe gekippt, Vorderrad 6 cm vor der
  // Wand im Halter, Hinterrad in einer Führung am Boden; reicht 1,35 m in den Raum (HOUSE.tg.raeder.tief)
  function bike(x, yW, zf, mat) {
    const al = 1.0, c = Math.cos(al), s = Math.sin(al), r = 0.34, hz = zf + r, yH = yW - 0.06 - r - 1.1 * c;
    // Punkt am Rad: u entlang des Rads ab der Hinterradnabe (zur Wand), w nach oben
    const P3 = (u, w) => new THREE.Vector3(x, hz + u * s + w * c, -(yH + u * c - w * s));
    for (const u of [0, 1.1]) { const t = new THREE.TorusGeometry(r - 0.012, 0.024, 6, 28), p = P3(u, 0); t.rotateY(Math.PI / 2); t.translate(p.x, p.y, p.z); addGeo(M.tire, t, null); }
    const rear = P3(0, 0), front = P3(1.1, 0), seat = P3(0.35, 0.6), bb = P3(0.5, -0.03), head = P3(0.95, 0.5), bar = P3(0.95, 0.67);
    rod(mat, rear, seat, 0.018); rod(mat, rear, bb, 0.018); rod(mat, bb, seat, 0.02); rod(mat, bb, head, 0.02); rod(mat, seat, head, 0.018); rod(mat, front, bar, 0.018);
    rod(M.tire, bar.clone().add(new THREE.Vector3(-0.25, 0, 0)), bar.clone().add(new THREE.Vector3(0.25, 0, 0)), 0.014);
    // Sattel längs des gekippten Rahmens (lokal +y entlang des Rads)
    const sd = P3(0.33, 0.64); addBox(M.trim, new THREE.Matrix4().makeTranslation(sd.x, sd.y, sd.z).multiply(new THREE.Matrix4().makeRotationX(al - Math.PI / 2)), -0.07, 0.07, -0.13, 0.11, -0.02, 0.025);
    // Wandhalter am Vorderrad, Führung für das Hinterrad
    boxPlan(M.fOutMetal, x - 0.03, x + 0.03, yW - 0.14, yW, front.y + r - 0.08, front.y + r + 0.04);
    boxPlan(M.fOutMetal, x - 0.035, x + 0.035, yH - 0.36, yH + 0.12, zf, zf + 0.05);
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
    // Wände (HOUSE.tg.waende); in der Südwand die Toröffnung 2,80 × 2,30 m mit Leibungen und 40 cm Sturz bis zur Decke
    for (const r of G.waende) { boxPlan(M.tgWall, r[0], r[1], r[2], r[3], zf, zc); wallRects.push({ fl: 'UG', r, top: zc }); }
    boxPlan(M.tgWall, R0.x0, R0.x1, R0.yTor, R0.yE, zf + R0.tor.h, zc);
    // Unterzug 30 × 50 cm an der Kante Stellplätze/Fahrgasse von der Süd- bis zur Nordwand, darunter 2,20 m
    const U = G.unterzug;
    boxPlan(M.tgCeil, U.x - U.b / 2, U.x + U.b / 2, -23.851, -11.95, zc - U.h, zc);
    // dunkler Sockel an den Innenseiten der Wände (neben dem Tor bis an die Laufschienen)
    for (const [x0, x1, y0, y1] of [[16, 23.199, -11.97, -11.95], [23.179, 23.199, -23.851, -11.95], [11.798, R0.x0 - 0.12, -23.871, -23.851], [R0.x1 + 0.12, 23.179, -23.871, -23.851],
      [11.798, 11.818, -23.851, -14.652], [4.8, 11.798, -14.372, -14.352]])
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
    // Lichtlinien an der Decke: über den Autos, über der Fahrgasse (erst hinter dem offenen Tor und seinem Antrieb), quer vor der Schrankwand,
    // über den Fahrrädern und dem Weg davor, mittig im Eingangsbereich (vor der Tür, nicht darüber)
    const R = G.raeder, rx0 = R.x[0] - 0.3, rx1 = R.x[R.x.length - 1] + 0.05;
    for (const [x0, x1, y0, y1] of [[13.5, 13.56, G.y0 + 0.3, yEnd - 0.3], [15.9, 15.96, G.y0 + 0.3, yEnd - 0.3], [20.2, 20.26, -20.3, -12.9],
      [17.4, 22.8, -12.86, -12.8], [rx0, rx1, -12.33, -12.27], [11.95, rx1, -13.68, -13.62], [5.2, 11.2, -13.05, -12.99]]) boxPlan(M.led, x0, x1, y0, y1, zc - 0.025, zc);
    // Eingangsbereich vor dem Haus, offen zur Tiefgarage (ohne Glaswände, Daniel 4.11.2026): Steinboden, Eichenpaneele an der Hauswand,
    // Garderobe mit Haken und Schuhbank, großer Spiegel, Lichtlinien; dahinter die zweiflügelige Tür ins Foyer
    const E = G.schleuse, zg0 = zf + 0.012;
    boxPlan(M.tgStone, E.x0, E.x1, E.y0, E.y1, zf, zg0);
    // Tür ins Foyer: zwei dunkel lackierte Flügel mit Glasfeld; gehört zum Haus (der Hausschnitt erfasst sie ganz), öffnet sich beim Herankommen
    const [ha, hb] = E.hausTuer, hc = { x: (ha + hb) / 2, y: -11.47 }, hl = (hb - ha) / 2 - 0.01;
    const foyerLeaf = (hinge, len, sign) => leaf(g, new THREE.Vector3(hinge, 0, -hc.y), sign, new THREE.Vector3(hc.x, zf + 1.1, -hc.y), () => {
      const lo = Math.min(hinge, hinge + len), hi = Math.max(hinge, hinge + len), bx = (u0, u1, v0, v1, mat, z0, z1) => boxPlan(mat, u0, u1, hc.y + v0, hc.y + v1, z0, z1);
      bx(lo + 0.05, hi - 0.05, -0.006, 0.006, M.door, zf + 0.06, zf + 2.24);
      bx(lo + 0.16, hi - 0.16, 0.006, 0.012, M.glass, zf + 0.5, zf + 2.0);
      for (const [u0, u1, z0, z1] of [[lo, lo + 0.05, zf + 0.02, zf + 2.28], [hi - 0.05, hi, zf + 0.02, zf + 2.28], [lo, hi, zf + 0.02, zf + 0.08], [lo, hi, zf + 2.22, zf + 2.28]]) bx(u0, u1, -0.022, 0.022, M.frame, z0, z1);
      const gu = len > 0 ? hi - 0.11 : lo + 0.11; bx(gu - 0.012, gu + 0.012, -0.06, 0.06, M.metal, zf + 0.85, zf + 1.4);
    });
    foyerLeaf(ha, hl, 1); foyerLeaf(hb, -hl, -1);
    boxPlan(M.tgStone, ha, hb, -11.65, -11.29, zf, zg0);
    // Hauswand im Eingangsbereich: Eichenpaneele links und rechts der Tür und darüber (östlich davon, bei den Fahrrädern, bleibt sie weiß),
    // Garderobe mit Haken und Schuhbank links der Tür, großer Spiegel rechts davon, Fußmatte
    for (const [x0, x1] of [[E.x0, ha - 0.06], [hb + 0.06, E.x1]]) boxPlan(M.tgHolz, x0, x1, -11.68, -11.65, zf, zc - 0.05);
    boxPlan(M.tgHolz, ha - 0.06, hb + 0.06, -11.68, -11.65, zf + 2.34, zc - 0.05);
    boxPlan(M.tgHolz, E.x0 + 0.1, ha - 0.2, -12.1, -11.68, zf + 0.0, zf + 0.45); boxPlan(M.fOutMetal, E.x0 + 0.1, ha - 0.2, -11.74, -11.68, zf + 1.72, zf + 1.76);
    for (let x = E.x0 + 0.2; x < ha - 0.25; x += 0.16) boxPlan(M.fOutMetal, x - 0.008, x + 0.008, -11.8, -11.68, zf + 1.66, zf + 1.74);
    boxPlan(M.chrome, hb + 0.3, hb + 1.4, -11.7, -11.69, zf + 0.5, zf + 2.2); boxPlan(M.tgSockel, hb + 0.27, hb + 1.43, -11.69, -11.68, zf + 0.47, zf + 2.23);
    boxPlan(M.trim, ha - 0.1, hb + 0.1, -12.6, -11.72, zg0, zg0 + 0.008);
    // Autos auf P1 bis P3 mit der Front zur Holzwand
    G.autos.forEach((c, i) => placeCar(c.k, G.x0 + 0.05, G.mitte(i), zf));
    // Echtes Licht unter den Lichtlinien (ohne Schatten); brennt nur, wenn man in der Tiefgarage ist oder von oben hineinsieht
    L.tgLights = [[14.7, G.mitte(0)], [14.7, G.mitte(2)], [20.2, -19.6], [20.2, -14.5], [14.6, -13.0], [8.0, -13.0]].map(([x, y]) => {
      const l = new THREE.PointLight(0xfff0dc, 0, 10, 2); l.position.set(x, zc - 0.35, -y); g.add(l); return l;
    });
    // Fahrräder an der Hauswand östlich des Eingangsbereichs (bei x 16 springt die Wand 30 cm zurück): halb hochgestellt, Hinterrad in einer
    // Führung am Boden, Vorderrad im Wandhalter; Wandschiene über die ganze Reihe
    R.x.forEach((x, i) => bike(x, R.wand(x), zf, i % 3 === 1 ? M.paint : M.bikeFrame));
    boxPlan(M.fOutMetal, rx0, Math.min(rx1 + 0.25, 16), -11.68, -11.65, zf + 1.16, zf + 1.22);
    if (rx1 > 16) boxPlan(M.fOutMetal, 16, rx1 + 0.25, -11.98, -11.95, zf + 1.16, zf + 1.22);
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
