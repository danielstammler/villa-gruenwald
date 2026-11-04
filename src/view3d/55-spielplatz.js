  // Teil des 3D-Modells (src/view3d/, siehe 00-kern.js): Spielplatz im Vorgarten, Lage und Maße in HOUSE.garten.spiel
  // Spielturm mit Satteldach und Sandkasten, Kletterwand, Kletternetz und Rutsche, daneben eine Doppelschaukel. Schwarzer Stahl wie die
  // Außenmöbel, Lärche und helle Seile als Akzente, Rutsche aus Edelstahl; Fallschutz aus Holzhackschnitzeln mit schmaler Stahlkante.
  function buildSpielplatz(g) {
    const S = HOUSE.garten.spiel, T = S.turm, a = T.a, zP = T.podest, zE = T.traufe, zF = T.first;
    const x0 = T.x - a, x1 = T.x + a, y0 = T.y - a, y1 = T.y + a, Y = new THREE.Vector3(0, 1, 0);
    const std = (color, r, m = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: m, ...extra });
    // Holzhackschnitzel: helle und dunklere Späne kreuz und quer, am Rand auch gegenüber gezeichnet (kachelbar, 1,5 m, ein Pixel knapp 6 mm)
    const chips = canvasTex(256, 256, (c, w, h) => {
      c.fillStyle = '#9b7d59'; c.fillRect(0, 0, w, h);
      const pal = ['#c8a97e', '#89694a', '#b49369', '#d8c29c', '#7b5e40', '#a9895f'];
      for (let i = 0; i < 5200; i++) {
        const x = rnd() * w, y = rnd() * h, l = 2 + rnd() * 6, b = 1 + rnd() * 1.6, ang = rnd() * Math.PI;
        c.fillStyle = pal[i % pal.length];
        for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) {
          if (x + dx < -8 || x + dx > w + 8 || y + dy < -8 || y + dy > h + 8) continue;
          c.save(); c.translate(x + dx, y + dy); c.rotate(ang); c.fillRect(-l / 2, -b / 2, l, b); c.restore();
        }
      }
    }, [1 / 1.5, 1 / 1.5]);
    Object.assign(M, {
      spielStahl: std(0x1c1d1f, 0.42, 0.55), spielHolz: std(0xb98f60, 0.72), spielHolz2: std(0xa98154, 0.76), spielSeil: std(0xdcd1b8, 0.95),
      spielRutsche: std(0xd5d8db, 0.22, 0.9), spielGummi: std(0x2a2b2e, 0.85), spielSand: std(0xe4d6b2, 1), spielBoden: std(0xffffff, 1, 0, { map: chips }),
    });
    const st = M.spielStahl, ho = M.spielHolz, ho2 = M.spielHolz2, se = M.spielSeil;
    // Quader von p nach q (Welt), bw breit (waagrecht quer zur Achse) und bh hoch (senkrecht dazu)
    const beam = (mat, p, q, bw, bh) => {
      const d = q.clone().sub(p), len = d.length(); d.normalize();
      const s = Math.abs(d.y) > 0.99 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3().crossVectors(d, Y).normalize(), n = new THREE.Vector3().crossVectors(s, d);
      addBox(mat, new THREE.Matrix4().makeBasis(d, n, s).setPosition(p.clone().add(q).multiplyScalar(0.5)), -len / 2, len / 2, -bh / 2, bh / 2, -bw / 2, bw / 2);
    };
    const knot = (p, r) => addGeo(se, new THREE.IcosahedronGeometry(r, 0), new THREE.Matrix4().setPosition(p));

    // Fallschutzfläche knapp über dem Rasen, ringsum eine Stahlkante
    g.add(flat(S.flaeche, M.spielBoden, 0.02));
    S.flaeche.forEach((p, i) => {
      const q = S.flaeche[(i + 1) % S.flaeche.length], l = Math.hypot(q[0] - p[0], q[1] - p[1]);
      if (l < 0.01) return;
      const ux = (q[0] - p[0]) / l, uy = (q[1] - p[1]) / l;
      addBox(st, frameMx({ o: p, r: [ux, uy], n: [uy, -ux] }), -0.004, l + 0.004, -0.02, 0.04, -0.005, 0.005);
    });

    // Turm: vier Stahlpfosten 9 × 9 cm bis zur Traufe, Podest aus Lärchendielen auf einem Stahlrahmen
    for (const x of [x0, x1]) for (const y of [y0, y1]) boxPlan(st, x - 0.045, x + 0.045, y - 0.045, y + 0.045, 0, zE);
    for (const y of [y0, y1, T.y]) boxPlan(st, x0, x1, y - 0.03, y + 0.03, zP - 0.13, zP - 0.03);
    for (const x of [x0, x1]) boxPlan(st, x - 0.03, x + 0.03, y0, y1, zP - 0.13, zP - 0.03);
    const nd = 7, dw = (2 * a - 0.09 - (nd - 1) * 0.015) / nd;
    for (let i = 0; i < nd; i++) { const yy = y0 + 0.045 + i * (dw + 0.015); boxPlan(i % 2 ? ho2 : ho, x0 - 0.02, x1 + 0.02, yy, yy + dw, zP - 0.03, zP); }
    // Sandkasten unter dem Podest: Einfassung aus Lärche, heller Sand
    const sx0 = x0 + 0.06, sx1 = x1 - 0.06, sy0 = y0 + 0.06, sy1 = y1 - 0.06;
    boxPlan(ho2, sx0, sx1, sy0, sy0 + 0.035, 0, 0.26); boxPlan(ho2, sx0, sx1, sy1 - 0.035, sy1, 0, 0.26);
    boxPlan(ho2, sx0, sx0 + 0.035, sy0 + 0.035, sy1 - 0.035, 0, 0.26); boxPlan(ho2, sx1 - 0.035, sx1, sy0 + 0.035, sy1 - 0.035, 0, 0.26);
    boxPlan(M.spielSand, sx0 + 0.035, sx1 - 0.035, sy0 + 0.035, sy1 - 0.035, 0, 0.19);

    // Brüstung 70 cm über dem Podest: Stäbe mit Handlauf (lichter Abstand unter 9 cm), im Westen Lärchenlatten.
    // Öffnungen für Kletterwand (Norden), Kletternetz (Süden) und Rutsche (Osten), daneben senkrechte Haltegriffe
    const zR = zP + 0.7, e = 0.045;
    const gitter = (xa, ya, xb, yb) => {
      const n = Math.max(1, Math.ceil(Math.hypot(xb - xa, yb - ya) / 0.1)), ax = Math.min(xa, xb), bx = Math.max(xa, xb), ay = Math.min(ya, yb), by = Math.max(ya, yb);
      boxPlan(st, ax - 0.0225, bx + 0.0225, ay - 0.0225, by + 0.0225, zR - 0.045, zR);
      boxPlan(st, ax - 0.012, bx + 0.012, ay - 0.012, by + 0.012, zP + 0.05, zP + 0.08);
      for (let j = 1; j < n; j++) { const x = xa + (xb - xa) * j / n, y = ya + (yb - ya) * j / n; boxPlan(st, x - 0.01, x + 0.01, y - 0.01, y + 0.01, zP, zR - 0.045); }
    };
    const ow = 0.3, on = 0.35, orr = S.rutsche.b / 2 + 0.03;
    gitter(x0 + e, y1, T.x - ow, y1); gitter(T.x + ow, y1, x1 - e, y1);
    gitter(x0 + e, y0, T.x - on, y0); gitter(T.x + on, y0, x1 - e, y0);
    gitter(x1, y0 + e, x1, T.y - orr); gitter(x1, T.y + orr, x1, y1 - e);
    const nl = 12, lw = (2 * a - 2 * e) / nl;
    for (let i = 0; i < nl; i++) boxPlan(i % 2 ? ho2 : ho, x0 - 0.012, x0 + 0.012, y0 + e + i * lw + 0.02, y0 + e + (i + 1) * lw - 0.02, zP, zR - 0.02);
    boxPlan(st, x0 - 0.0225, x0 + 0.0225, y0, y1, zR - 0.03, zR + 0.01);
    for (const [x, y] of [[T.x - ow, y1], [T.x + ow, y1], [T.x - on, y0], [T.x + on, y0], [x1, T.y - orr], [x1, T.y + orr]]) addCyl(st, x, y, zP, zP + 0.98, 0.016, 0.016, 8);
    // Querstange über dem Rutschenstart: man setzt sich darunter hindurch
    boxPlan(st, x1 - 0.015, x1 + 0.015, T.y - orr, T.y + orr, zP + 0.6, zP + 0.63);

    // Satteldach: offene Giebel aus Stahl nach Norden und Süden (Hausform), Dachflächen aus Lärchenbrettern mit 14 cm Überstand, Firstblech
    for (const x of [x0, x1]) boxPlan(st, x - 0.045, x + 0.045, y0 - 0.045, y1 + 0.045, zE - 0.08, zE);
    boxPlan(st, T.x - 0.035, T.x + 0.035, y0 - 0.045, y1 + 0.045, zF - 0.07, zF);
    for (const y of [y0, y1]) for (const x of [x0, x1]) beam(st, P(x, y, zE - 0.03), P(T.x, y, zF - 0.035), 0.07, 0.06);
    const ang = Math.atan2(zF - zE, a), ov = 0.14, sL = Math.hypot(a, zF - zE) + ov, nb = 6;
    for (const sg of [-1, 1]) {
      const e1 = new THREE.Vector3(sg * Math.cos(ang), -Math.sin(ang), 0), e2 = new THREE.Vector3(sg * Math.sin(ang), Math.cos(ang), 0);
      const mx = new THREE.Matrix4().makeBasis(e1, e2, new THREE.Vector3().crossVectors(e1, e2)).setPosition(T.x, zF, -T.y);
      for (let i = 0; i < nb; i++) addBox(i % 2 ? ho2 : ho, mx, i * sL / nb + 0.004, (i + 1) * sL / nb - 0.004, 0, 0.025, -(a + ov), a + ov);
    }
    boxPlan(st, T.x - 0.06, T.x + 0.06, T.y - a - ov, T.y + a + ov, zF - 0.03, zF + 0.045);

    // Kletterwand nach Norden: Lärchenplatte zwischen zwei Stahlholmen, Griffe hell und schwarz, in der Mitte ein Knotenseil
    const W = S.wand, wa = P(T.x, y1, zP), wb = P(T.x, y1 + W.tief, 0);
    beam(ho, wa, wb, W.b, 0.035);
    for (const sg of [-1, 1]) { const o = new THREE.Vector3(sg * (W.b / 2 + 0.025), 0, 0); beam(st, wa.clone().add(o), wb.clone().add(o), 0.05, 0.06); }
    const dw2 = wb.clone().sub(wa), lw2 = dw2.length(); dw2.normalize();
    const sw = new THREE.Vector3(1, 0, 0), nw = new THREE.Vector3().crossVectors(sw, dw2), gm = new THREE.Matrix4().makeBasis(dw2, nw, sw);
    [[0.18, -0.28], [0.3, 0.2], [0.48, -0.14], [0.6, 0.32], [0.78, -0.33], [0.88, 0.14], [1.05, -0.2], [1.18, 0.29], [1.34, -0.31], [1.46, 0.16]].forEach(([v, u], i) => {
      const geo = new THREE.IcosahedronGeometry(0.04, 0); geo.scale(1.25, 0.5, 1);
      addGeo(i % 3 ? st : se, geo, gm.clone().setPosition(wa.clone().addScaledVector(dw2, v).addScaledVector(sw, u).addScaledVector(nw, 0.03)));
    });
    const ro = v => wa.clone().addScaledVector(nw, 0.032).addScaledVector(dw2, v);
    rod(se, ro(0.02), ro(lw2 - 0.12), 0.014);
    for (const v of [0.35, 0.7, 1.05, 1.4]) knot(ro(v), 0.032);

    // Kletternetz nach Süden: helle Seile mit Knoten, oben am Podest, unten an einer Stahlstange auf zwei kurzen Pfosten
    const N = S.netz, za = zP - 0.06, zb = 0.26, yb = y0 - N.tief, np = (u, t) => P(T.x + u, y0 + (yb - y0) * t, za + (zb - za) * t);
    boxPlan(st, T.x - N.b / 2 - 0.06, T.x + N.b / 2 + 0.06, yb - 0.03, yb + 0.03, zb - 0.03, zb + 0.03);
    for (const sg of [-1, 1]) boxPlan(st, T.x + sg * (N.b / 2 + 0.03) - 0.03, T.x + sg * (N.b / 2 + 0.03) + 0.03, yb - 0.03, yb + 0.03, 0, zb - 0.03);
    for (let j = 0; j <= 5; j++) { const u = -N.b / 2 + N.b * j / 5; rod(se, np(u, 0), np(u, 1), j % 5 ? 0.011 : 0.015); }
    for (let i = 0; i <= 6; i++) rod(se, np(-N.b / 2, i / 6), np(N.b / 2, i / 6), 0.011);
    for (let i = 1; i < 6; i++) for (let j = 1; j < 5; j++) knot(np(-N.b / 2 + N.b * j / 5, i / 6), 0.022);

    // Rutsche aus Edelstahl nach Osten: Wanne mit 17 cm hohen Seitenwänden entlang des Längsprofils (Start eben, in der Mitte höchstens 45°,
    // Auslauf eben in 25 cm Höhe). Querschnitt im Uhrzeigersinn (q quer nach Norden, h nach oben), je Kante ein eigener Streifen.
    const R = S.rutsche, zt = zP - 0.02, sl = R.len - 0.75, hq = R.b / 2;
    const zs = u => u < 0.3 ? zt : u > R.len - 0.45 ? R.aus : R.aus + (zt - R.aus) * (1 + Math.cos(Math.PI * (u - 0.3) / sl)) / 2;
    const ds = u => u < 0.3 || u > R.len - 0.45 ? 0 : -(zt - R.aus) * Math.PI / (2 * sl) * Math.sin(Math.PI * (u - 0.3) / sl);
    const prof = [[-hq, 0.17], [-hq + 0.025, 0.17], [-hq + 0.025, 0.045], [-hq + 0.04, 0.012], [-hq + 0.07, 0], [hq - 0.07, 0], [hq - 0.04, 0.012],
      [hq - 0.025, 0.045], [hq - 0.025, 0.17], [hq, 0.17], [hq, -0.025], [-hq, -0.025]];
    const nr = 30, ring = [], pos = [], idx = [];
    for (let i = 0; i <= nr; i++) {
      const u = 0.03 + (R.len - 0.03) * i / nr, s = ds(u), l = Math.hypot(1, s);
      ring.push(prof.map(([q, h]) => [x1 + u - h * s / l, zs(u) + h / l, -(T.y + q)]));
    }
    prof.forEach((_, k) => {
      const k2 = (k + 1) % prof.length, b0 = pos.length / 3;
      for (let i = 0; i <= nr; i++) pos.push(...ring[i][k], ...ring[i][k2]);
      for (let i = 0; i < nr; i++) { const A = b0 + 2 * i; idx.push(A, A + 2, A + 3, A, A + 3, A + 1); }
    });
    // Stirnseiten: Dreiecke des Querschnitts, am Start umgedreht
    const tri = THREE.ShapeUtils.triangulateShape(prof.map(([q, h]) => new THREE.Vector2(q, h)), []);
    for (const [i, flip] of [[0, true], [nr, false]]) {
      const b0 = pos.length / 3; for (const p of ring[i]) pos.push(...p);
      for (const f of tri) idx.push(...(flip ? [f[0], f[2], f[1]] : f).map(j => b0 + j));
    }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); rg.setIndex(idx); rg.computeVertexNormals();
    rg.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
    addGeo(M.spielRutsche, rg);
    const xr = x1 + R.len - 0.29;
    for (const sg of [-1, 1]) boxPlan(st, xr - 0.03, xr + 0.03, T.y + sg * 0.17 - 0.03, T.y + sg * 0.17 + 0.03, 0, R.aus - 0.07);
    boxPlan(st, xr - 0.03, xr + 0.03, T.y - 0.2, T.y + 0.2, R.aus - 0.07, R.aus - 0.025);

    // Doppelschaukel: Balken 10 × 10 cm auf zwei A-Gestellen aus schwarzem Stahl mit Querstrebe, zwei Gummisitze an hellen Seilen
    const SW = S.schaukel, zB = SW.h;
    beam(st, P(SW.x0 - 0.1, SW.y, zB), P(SW.x1 + 0.1, SW.y, zB), 0.1, 0.1);
    for (const x of [SW.x0, SW.x1]) {
      for (const sg of [-1, 1]) beam(st, P(x, SW.y, zB - 0.02), P(x, SW.y + sg * 0.95, 0), 0.08, 0.08);
      const yq = 0.95 * (1 - 0.9 / (zB - 0.02));
      boxPlan(st, x - 0.025, x + 0.025, SW.y - yq, SW.y + yq, 0.875, 0.925);
    }
    for (const xs of SW.sitze) {
      boxPlan(M.spielGummi, xs - 0.225, xs + 0.225, SW.y - 0.085, SW.y + 0.085, SW.sitz - 0.03, SW.sitz);
      for (const sg of [-1, 1]) {
        addCyl(se, xs + sg * 0.2, SW.y, SW.sitz - 0.01, zB - 0.07, 0.011, 0.011, 6);
        boxPlan(st, xs + sg * 0.2 - 0.025, xs + sg * 0.2 + 0.025, SW.y - 0.025, SW.y + 0.025, zB - 0.09, zB - 0.05);
      }
    }
  }
