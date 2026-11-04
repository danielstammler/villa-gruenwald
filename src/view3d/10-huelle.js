  // Teil des 3D-Modells (src/view3d/, siehe 00-kern.js): Geländer, Türflügel, Fenster, Fassaden, Dach und Rohbau des Hauses
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
  // Bewegliche Türflügel: Geometrie wie üblich sammeln, dann in eine eigene Gruppe, die sich um die Angel dreht.
  // Sie öffnen sich nach innen, sobald die Kamera nahe herankommt (Rundgang, Hineinzoomen).
  function leaf(parent, hinge, sign, center, build, max = 1.5) {
    const saved = [...batches]; batches.clear();
    build();
    const grp = new THREE.Group(), tmp = new THREE.Group();
    flushBatches(tmp);
    for (const m of [...tmp.children]) { m.geometry.translate(-hinge.x, -hinge.y, -hinge.z); grp.add(m); }
    for (const [k, v] of saved) batches.set(k, v);
    grp.position.copy(hinge); parent.add(grp);
    doors.push({ grp, sign, max, c: center, open: 0 });
  }
  function windowUnit(mx, o, face, depth, parent) {
    const w = o.u1 - o.u0, fw = 0.07, gl = Math.min(0.15, depth * 0.55);
    const at = (u, z, d) => new THREE.Vector3(u, z, d).applyMatrix4(mx);
    if (o.kind === 'eingang') {
      // Haustür in dunklem Lack mit hohem Glasfeld und langem Stoßgriff (einflügelig oder zweiflügelig), verglaste Seitenteile, Oberlicht
      const zt = o.z1 - 0.32, d0 = face - gl - 0.06, d1 = face - gl, sd = o.side || 0, a0 = o.u0 + sd, a1 = o.u1 - sd, nl = o.single ? 1 : 2, lw = (a1 - a0) / nl;
      addBox(M.stairMat, mx, o.u0, o.u1, o.z0 - 0.06, o.z0 + 0.008, face - depth - 0.01, face + 0.03);
      for (const [b0, b1] of sd ? [[o.u0, a0], [a1, o.u1]] : []) {
        addBox(M.door, mx, b0, b1, o.z0, o.z0 + 0.5, d0, d1);
        addBox(M.glass, mx, b0 + 0.05, b1 - 0.05, o.z0 + 0.55, zt, d0 + 0.02, d0 + 0.03);
        for (const [c0, c1] of [[b0, b0 + 0.05], [b1 - 0.05, b1]]) addBox(M.frame, mx, c0, c1, o.z0 + 0.5, zt, d0, d1);
        addBox(M.frame, mx, b0, b1, o.z0 + 0.5, o.z0 + 0.55, d0, d1);
      }
      addBox(M.frame, mx, o.u0, o.u1, zt, zt + 0.06, d0, d1 + 0.012);
      addBox(M.glass, mx, o.u0 + 0.05, o.u1 - 0.05, zt + 0.06, o.z1 - 0.05, d0 + 0.02, d0 + 0.03);
      for (const [a, b] of [[o.u0, o.u0 + 0.05], [o.u1 - 0.05, o.u1], ...(nl === 2 ? [[a0 + lw - 0.02, a0 + lw + 0.02]] : []), ...(sd ? [[a0 - 0.025, a0 + 0.025], [a1 - 0.025, a1 + 0.025]] : [])]) addBox(M.frame, mx, a, b, zt, o.z1, d0, d1);
      addBox(M.frame, mx, o.u0, o.u1, o.z1 - 0.05, o.z1, d0, d1);
      const center = at((a0 + a1) / 2, o.z0 + 1.1, face);
      for (let i = 0; i < nl; i++) {
        // einflügelig: Angel bei a1, Griff auf der Schlossseite bei a0
        const a = a0 + i * lw, h = nl === 1 || i ? a1 : a0, hinge = at(h, 0, (d0 + d1) / 2), sg = h === a1 ? -1 : 1, g0 = nl === 1 ? 0.3 : 0.18;
        leaf(parent, hinge, sg, center, () => {
          addBox(M.door, mx, a + (i ? 0.004 : 0), a + lw - (i || nl === 1 ? 0 : 0.004), o.z0 + 0.01, zt, d0, d1);
          addBox(M.glass, mx, a + g0, a + lw - 0.18, o.z0 + 0.7, zt - 0.18, d1 + 0.002, d1 + 0.008);
          for (const [c0, c1, e0, e1] of [[a + g0 - 0.03, a + lw - 0.15, o.z0 + 0.67, o.z0 + 0.7], [a + g0 - 0.03, a + lw - 0.15, zt - 0.18, zt - 0.15], [a + g0 - 0.03, a + g0, o.z0 + 0.67, zt - 0.15], [a + lw - 0.18, a + lw - 0.15, o.z0 + 0.67, zt - 0.15]]) addBox(M.metal, mx, c0, c1, e0, e1, d1, d1 + 0.012);
          const gx = nl === 1 ? a + 0.12 : i ? a + 0.08 : a + lw - 0.08, gz0 = o.z0 + (nl === 1 ? 0.55 : 0.75), gz1 = o.z0 + (nl === 1 ? 1.85 : 1.65);
          addBox(M.metal, mx, gx - 0.015, gx + 0.015, gz0, gz1, d1 + 0.04, d1 + 0.07);
          for (const gz of [gz0 + 0.05, gz1 - 0.05]) addBox(M.metal, mx, gx - 0.012, gx + 0.012, gz - 0.012, gz + 0.012, d1, d1 + 0.05);
          if (!i && nl === 2) addBox(M.frame, mx, a + lw - 0.016, a + lw - 0.004, o.z0, zt, d1, d1 + 0.014);
        });
      }
      return;
    }
    const f0 = face - gl - 0.04, f1 = face - gl + 0.03;
    // Aufgesetzte Sprosse (einflügelige Türen, sprosse: true): 5 cm breite Leiste außen und innen auf dem Glas, wirkt wie die Mittelsprosse
    const sprosse = (c, z0, z1) => { for (const [d0, d1] of [[face - gl, face - gl + 0.018], [face - gl - 0.03, face - gl - 0.012]]) addBox(M.frame, mx, c - 0.025, c + 0.025, z0, z1, d0, d1); };
    if (o.kind === 'tuer' || o.kind === 'franz') addBox(M.stairMat, mx, o.u0, o.u1, o.z0 - 0.06, o.z0 + 0.008, face - depth - 0.01, face + 0.03);
    if (o.move && parent) {
      // Gartentür bzw. Balkontür mit beweglichen Flügeln (zwei, bei leaves: 1 einer mit Angel links): feste Zarge, Flügel mit Glas, Rahmen und Griff
      for (const [p, q, r0, r1] of [[o.u0, o.u0 + fw, o.z0, o.z1], [o.u1 - fw, o.u1, o.z0, o.z1], [o.u0, o.u1, o.z1 - fw, o.z1], [o.u0, o.u1, o.z0, o.z0 + 0.03]]) addBox(M.frame, mx, p, q, r0, r1, f0, f1);
      const c = (o.u0 + o.u1) / 2, za = o.z0 + 0.03, zb = o.z1 - fw, center = at(c, o.z0 + 1.1, face);
      for (const [a, b, h, sg] of o.leaves === 1 ? [[o.u0 + fw, o.u1 - fw, o.u0 + fw, 1]] : [[o.u0 + fw, c, o.u0 + fw, 1], [c, o.u1 - fw, o.u1 - fw, -1]]) {
        leaf(parent, at(h, 0, (f0 + f1) / 2), sg, center, () => {
          addBox(M.glass, mx, a + 0.05, b - 0.05, za + 0.05, zb - 0.05, face - gl - 0.012, face - gl);
          for (const [p, q, r0, r1] of [[a, a + 0.055, za, zb], [b - 0.055, b, za, zb], [a, b, za, za + 0.09], [a, b, zb - 0.055, zb]]) addBox(M.frame, mx, p + (sg < 0 && p === a ? 0.003 : 0), q, r0, r1, f0 + 0.005, f1 - 0.005);
          if (o.sprosse) sprosse((a + b) / 2, za + 0.09, zb - 0.055);
          const gx = sg > 0 ? b - 0.1 : a + 0.1;
          addBox(M.metal, mx, gx - 0.012, gx + 0.012, o.z0 + 0.95, o.z0 + 1.12, f0 - 0.05, f0);
        });
      }
    } else {
      addBox(M.glass, mx, o.u0 + 0.02, o.u1 - 0.02, o.z0 + 0.02, o.z1 - 0.02, face - gl - 0.012, face - gl);
      addBox(M.frame, mx, o.u0, o.u0 + fw, o.z0, o.z1, f0, f1);
      addBox(M.frame, mx, o.u1 - fw, o.u1, o.z0, o.z1, f0, f1);
      addBox(M.frame, mx, o.u0, o.u1, o.z1 - fw, o.z1, f0, f1);
      addBox(M.frame, mx, o.u0, o.u1, o.z0, o.z0 + fw, f0, f1);
      if (o.leaves === 2) { const c = (o.u0 + o.u1) / 2; addBox(M.frame, mx, c - 0.045, c + 0.045, o.z0, o.z1, f0, f1); }
      else if (o.sprosse) sprosse((o.u0 + o.u1) / 2, o.z0 + fw, o.z1 - fw);
    }
    if (o.kind === 'fenster') addBox(M.sockel, mx, o.u0 - 0.05, o.u1 + 0.05, o.z0 - 0.05, o.z0, face - gl, face + 0.05);
    if (o.rail) railing(M.metal, mx, o.u0 + 0.04, o.u1 - 0.04, o.z0 + 0.05, o.rail, face + 0.02);
    if (o.kind !== 'eingang') {
      const cw = Math.min(0.24, w * 0.2), cz0 = o.z0 + 0.06, cz1 = o.z1 - 0.08, cd = face - depth - 0.02;
      addBox(M.curtain, mx, o.u0 + 0.04, o.u0 + 0.04 + cw, cz0, cz1, cd - 0.03, cd);
      addBox(M.curtain, mx, o.u1 - 0.04 - cw, o.u1 - 0.04, cz0, cz1, cd - 0.03, cd);
    }
  }
  function buildFacade(side, parent) {
    const F = HOUSE.fas[side], mx = facadeMatrix(side), len = F.len;
    parent.add(wallWithHoles(len, 0, Zh.gesimsU, F.open, HOUSE.wall, [M.putzRust, M.putz], mx));
    for (const o of F.open) windowUnit(mx, o, 0, HOUSE.wall, parent);
    for (const r of F.rails || []) {
      addBox(M.putzHell, mx, r.u0 - 0.05, r.u1 + 0.05, r.z0 - 0.1, r.z0, 0, 0.16);
      railing(M.metal, mx, r.u0, r.u1, r.z0, r.z1, 0.12);
    }
    for (const [a, b] of F.pil) addBox(M.putzHell, mx, a, b, Zh.sockel, Zh.gesimsU, 0, 0.08);
    addBox(M.sockel, mx, -0.04, len + 0.04, 0, Zh.sockel, 0, 0.04);
    addBox(M.putzHell, mx, -0.1, len + 0.1, Zh.gurtU, Zh.gurtO, 0, 0.1);
    // Traufgesims; am Zwerchhaus unterbrochen, dort ersetzt es die Balkonplatte
    const zw = (F.dormers || []).find(d => d.zwerch), gs = zw ? [[-0.35, zw.u0], [zw.u1, len + 0.35]] : [[-0.35, len + 0.35]];
    for (const [a, b] of gs) {
      addBox(M.putzHell, mx, Math.max(a, -0.18), Math.min(b, len + 0.18), Zh.gesimsU, 6.69, 0, 0.18);
      addBox(M.putzHell, mx, a, b, 6.69, Zh.gesimsO, 0, 0.35);
    }
    for (const c of F.lamps || []) {
      addBox(M.metal, mx, c - 0.09, c + 0.09, 1.98, 2.36, 0.08, 0.1);
      addBox(M.lamp, mx, c - 0.06, c + 0.06, 2.02, 2.32, 0.1, 0.22);
    }
    if (F.portikus) {
      // Portikus: zwei quadratische Pfeiler auf dem Podest, Gebälk mit Gesims, Dach mit Blechabdeckung, Türrahmung an der Wand
      const p = F.portikus, h = p.pw / 2, zp = HOUSE.podest.z;
      for (const c of p.pillars) {
        addBox(M.putzHell, mx, c - h - 0.05, c + h + 0.05, zp, zp + 0.14, p.py - h - 0.05, p.py + h + 0.05);
        addBox(M.putzHell, mx, c - h, c + h, zp + 0.14, p.z0 - 0.14, p.py - h, p.py + h);
        addBox(M.putzHell, mx, c - h - 0.04, c + h + 0.04, p.z0 - 0.14, p.z0, p.py - h - 0.04, p.py + h + 0.04);
        addBox(M.putzHell, mx, c - 0.04 - h, c + h + 0.04, zp, p.z0, -0.01, 0.06);   // Wandpfeiler gegenüber
      }
      addBox(M.putzHell, mx, p.u0, p.u1, p.z0, p.z1 - 0.12, 0, p.depth);
      addBox(M.putzHell, mx, p.u0 - 0.08, p.u1 + 0.08, p.z1 - 0.12, p.z1, 0, p.depth + 0.08);
      addBox(M.zink, mx, p.u0 - 0.04, p.u1 + 0.04, p.z1, p.z1 + 0.03, 0.02, p.depth + 0.04);
      const door = F.open.find(q => q.kind === 'eingang');
      if (door) {
        addBox(M.putzHell, mx, door.u0 - 0.22, door.u0 - 0.04, Zh.ffbEG, door.z1 + 0.18, 0, 0.07);
        addBox(M.putzHell, mx, door.u1 + 0.04, door.u1 + 0.22, Zh.ffbEG, door.z1 + 0.18, 0, 0.07);
        addBox(M.putzHell, mx, door.u0 - 0.3, door.u1 + 0.3, door.z1 + 0.04, door.z1 + 0.22, 0, 0.1);
        // Laterne an einer Stange unter dem Vordach und eine eingelassene Fußmatte vor der Tür
        const uc = (door.u0 + door.u1) / 2, yl = 0.62;
        addBox(M.metal, mx, uc - 0.012, uc + 0.012, 2.8, p.z0, yl - 0.012, yl + 0.012);
        addBox(M.metal, mx, uc - 0.16, uc + 0.16, 2.76, 2.8, yl - 0.16, yl + 0.16);
        addBox(M.lamp, mx, uc - 0.12, uc + 0.12, 2.4, 2.76, yl - 0.12, yl + 0.12);
        addBox(M.metal, mx, uc - 0.14, uc + 0.14, 2.36, 2.4, yl - 0.14, yl + 0.14);
        addBox(M.fDark, mx, uc - 0.7, uc + 0.7, zp, zp + 0.008, 0.1, 0.75);
      }
    }
    for (const d of F.dormers || []) {
      // Gaube innen offen: Front, zwei dreieckige Wangen bis zur Dachfläche und das Gaubendach
      const zb = d.zwerch ? Zh.gesimsU : 7.3, face = -d.front, frontMat = d.clad === 'putz' ? M.putz : M.zink;
      const back = (d.top - Zh.wand) / HOUSE.tan1, cheek = d.clad === 'putz' ? M.putzDS : M.zinkDS;
      parent.add(wallWithHoles(d.u1 - d.u0, zb, d.top, d.win.map(w => ({ ...w, u0: w.u0 - d.u0, u1: w.u1 - d.u0 })), 0.12,
        frontMat, mx.clone().multiply(new THREE.Matrix4().makeTranslation(d.u0, 0, face))));
      for (const u of [d.u0 + 0.03, d.u1 - 0.03]) {
        const tg = new THREE.BufferGeometry();
        tg.setAttribute('position', new THREE.Float32BufferAttribute([u, HOUSE.roofZ(d.front) - 0.05, face - 0.12, u, d.top, face - 0.12, u, d.top, -back - 0.05], 3));
        tg.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1], 2)); tg.computeVertexNormals();
        addGeo(cheek, tg, mx);
      }
      addBox(M.zink, mx, d.u0 - 0.06, d.u1 + 0.06, d.top - 0.06, d.top + 0.03, -back - 0.15, face + 0.06);
      if (d.clad === 'putz') {
        addBox(M.putzHell, mx, d.u0 - 0.12, d.u1 + 0.12, d.top - 0.34, d.top - 0.12, face - 0.02, face + 0.14);
        addBox(M.putzHell, mx, d.u0, d.u0 + 0.22, zb, d.top - 0.34, face, face + 0.06);
        addBox(M.putzHell, mx, d.u1 - 0.22, d.u1, zb, d.top - 0.34, face, face + 0.06);
      }
      for (const w of d.win) windowUnit(mx, w, face, 0.12, parent);
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
    // Untere, steile Dachflächen (rund 70°) je Seite: u entlang der Traufe wie die Fassade, v die Fläche hinauf.
    // Gauben bekommen eine Öffnung, das Zwerchhaus einen Ausschnitt ab der Traufe; so sieht man auch von innen hinaus.
    const cosA = Math.cos(Math.atan(HOUSE.tan1)), sinA = Math.sin(Math.atan(HOUSE.tan1)), Lv = (r1 + o) / cosA;
    for (const side of ['S', 'N', 'E', 'W']) {
      const F = HOUSE.fas[side], fr = HOUSE.frame[side], len = F.len, vAt = s => (s + o) / cosA;
      let outline = [[-o, 0], [len + o, 0], [len - r1, Lv], [r1, Lv]];
      const holes = [];
      for (const d of F.dormers || []) {
        const vb = vAt((d.top - Zh.wand) / HOUSE.tan1);
        if (d.zwerch) outline = [[-o, 0], [d.u0, 0], [d.u0, vb], [d.u1, vb], [d.u1, 0], [len + o, 0], [len - r1, Lv], [r1, Lv]];
        else holes.push([[d.u0, vAt(d.front)], [d.u0, vb], [d.u1, vb], [d.u1, vAt(d.front)]].map(([u, v]) => v2(u, v)));
      }
      for (const w of F.roofWindows || []) holes.push([[w.u0, w.v0], [w.u0, w.v1], [w.u1, w.v1], [w.u1, w.v0]].map(([u, v]) => v2(u, v)));
      const c2 = outline.map(([u, v]) => v2(u, v)), all = [...c2, ...holes.flat()];
      const at = (u, v) => P(fr.o[0] + fr.r[0] * u + fr.n[0] * (o - v * cosA), fr.o[1] + fr.r[1] * u + fr.n[1] * (o - v * cosA), ze + v * sinA);
      for (const tri of THREE.ShapeUtils.triangulateShape(c2, holes)) for (const k of tri) { const q = at(all[k].x, all[k].y); pos.push(q.x, q.y, q.z); uv.push(all[k].x, all[k].y); }
    }
    for (const f of faces.slice(4)) {
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
    // Decken mit Öffnungen über den Treppenläufen und am Aufzug; im OG der Luftraum über der Halle zusammen mit der Öffnung der Haupttreppe
    const { HOLES, LIFT, VOID } = Plans.CORE, rp = ([a, b, c, e]) => [[a, c], [b, c], [b, e], [a, e]];
    const V = VOID[0], H = HOLES.OG, hall = [[V[0], V[3]], [V[1], V[3]], [V[1], V[2]], [H[1], V[2]], [H[1], H[2]], [H[0], H[2]], [H[0], H[3]], [V[0], H[3]]];
    for (const [z0, z1, holes] of [[-0.15, Zh.ffbEG, [rp(HOLES.EG), rp(LIFT)]], [Zh.gurtU, Zh.ffbOG, [hall, rp(LIFT)]], [Zh.deckeDG, Zh.ffbDG, [rp(HOLES.DG), rp(LIFT)]]]) {
      const sl = extrude([[0.3, -11.35], [15.7, -11.35], [15.7, -0.3], [0.3, -0.3]], M.slab, z0, z1 - z0, holes); sl.castShadow = false; g.add(sl);
    }
    buildInterior();
    // Balkon im DG vor dem Zwerchhaus: Platte mit Kante auf zwei quadratischen Pfeilern über dem OG-Balkon, Geländer an drei Seiten.
    // Belag bündig mit der Plattenoberkante (10 cm unter FFB DG); vor den Türen eine Rinne mit Gitterrost, die Schwellen kragen darüber
    const bd = HOUSE.balkonDG, zr = bd.slab[1], [ra, rb, rw] = bd.rinne, yr = bd.y1 - rw;
    boxPlan(M.putzHell, bd.x0, bd.x1, bd.y0, bd.y1, bd.slab[0], zr - 0.02);
    boxPlan(M.putzHell, bd.x0 - 0.06, bd.x1 + 0.06, bd.y0 - 0.06, bd.y1, zr - 0.12, zr - 0.02);
    for (const [a, b, c, e] of [[bd.x0, bd.x1, bd.y0, yr], [bd.x0, ra, yr, bd.y1], [rb, bd.x1, yr, bd.y1]]) boxPlan(M.stone, a, b, c, e, zr - 0.02, zr);
    // Rinne: dunkler Kasten, darüber der Rost aus zwei Randwinkeln und Querstäben alle 3 cm, oben bündig mit dem Belag
    boxPlan(M.frame, ra, rb, yr, bd.y1, zr - 0.1, zr - 0.016);
    for (const [c, e] of [[yr, yr + 0.012], [bd.y1 - 0.012, bd.y1]]) boxPlan(M.zink, ra, rb, c, e, zr - 0.02, zr);
    for (let x = ra + 0.015; x < rb; x += 0.03) boxPlan(M.zink, x - 0.004, x + 0.004, yr + 0.012, bd.y1 - 0.012, zr - 0.016, zr - 0.002);
    for (const x of bd.cols) column(x, bd.colY, HOUSE.balkon.slab[1], bd.slab[0], bd.colW);
    railing(M.metal, new THREE.Matrix4().makeTranslation(0, 0, -bd.y0 - 0.06), bd.x0 + 0.06, bd.x1 - 0.06, zr, bd.rail, 0);
    for (const xr of [bd.x0 + 0.06, bd.x1 - 0.06]) {
      railing(M.metal, new THREE.Matrix4().makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(xr, 0, 0)), bd.y0 + 0.06, bd.y1 - 0.02, zr, bd.rail, 0);
    }
    // Dachfenster: Rahmen und durchsichtiges Glas in der Öffnung der steilen Dachfläche
    const slope = new THREE.Matrix4().makeRotationX(-(Math.PI / 2 - Math.atan(HOUSE.tan1)));
    for (const side of ['S', 'N', 'E', 'W']) for (const w of HOUSE.fas[side].roofWindows || []) {
      // lokales System der Dachfläche: x entlang der Traufe, y die Fläche hinauf, z aus der Fläche heraus
      const m = facadeMatrix(side).multiply(new THREE.Matrix4().makeTranslation(0, HOUSE.traufe, HOUSE.ueberstand)).multiply(slope);
      for (const [a, b, c, e] of [[w.u0 - 0.07, w.u1 + 0.07, w.v0 - 0.07, w.v0], [w.u0 - 0.07, w.u1 + 0.07, w.v1, w.v1 + 0.07], [w.u0 - 0.07, w.u0, w.v0, w.v1], [w.u1, w.u1 + 0.07, w.v0, w.v1]]) addBox(M.frame, m, a, b, c, e, -0.05, 0.05);
      addBox(M.glass, m, w.u0, w.u1, w.v0, w.v1, -0.01, 0.01);
      // senkrechte Sprosse wie bei allen Fenstern
      const c = (w.u0 + w.u1) / 2; addBox(M.frame, m, c - 0.03, c + 0.03, w.v0, w.v1, -0.03, 0.03);
    }
    // Flache Decke im DG unter dem Spitzboden (dort, wo die steile Dachfläche sie nicht schneidet); in den Zwerchhäusern bis an die Front
    // (innen 0,12 m hinter der Fassade, seitlich knapp innerhalb der Wangen), so wie im Schnitt A–A
    const zD = Zh.deckeSpitz, sD = (zD - HOUSE.roofIn(0)) / HOUSE.tan1;
    boxPlan(M.slab, sD, HOUSE.W - sD, -HOUSE.D + sD, -sD, zD, zD + 0.12);
    for (const side of ['S', 'N']) for (const d of (HOUSE.fas[side].dormers || []).filter(q => q.zwerch)) {
      const [a, b] = side === 'S' ? [d.u0, d.u1] : [HOUSE.W - d.u1, HOUSE.W - d.u0], [c, e] = side === 'S' ? [-HOUSE.D + 0.12, -HOUSE.D + sD] : [-sD, -0.12];
      boxPlan(M.slab, a + 0.035, b - 0.035, c, e, zD, zD + 0.12);
    }
    // Kamine: weiß verputzt mit dunkler Abdeckung
    for (const k of HOUSE.kamine) {
      boxPlan(M.putzHell, k.x - k.w / 2, k.x + k.w / 2, k.y - k.d / 2, k.y + k.d / 2, Zh.knick - 0.2, k.top - 0.12);
      boxPlan(M.putzHell, k.x - k.w / 2 - 0.05, k.x + k.w / 2 + 0.05, k.y - k.d / 2 - 0.05, k.y + k.d / 2 + 0.05, k.top - 0.32, k.top - 0.22);
      boxPlan(M.zink, k.x - k.w / 2 - 0.06, k.x + k.w / 2 + 0.06, k.y - k.d / 2 - 0.06, k.y + k.d / 2 + 0.06, k.top - 0.12, k.top);
    }
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
    // Balkon über der Terrasse auf zwei quadratischen Pfeilern
    const bk = HOUSE.balkon;
    boxPlan(M.putzHell, bk.x0, bk.x1, bk.y0, bk.y1, bk.slab[0], bk.slab[1]);
    boxPlan(M.stone, bk.x0 + 0.02, bk.x1 - 0.02, bk.y0 + 0.02, bk.y1, bk.slab[1], bk.slab[1] + 0.02);
    boxPlan(M.putzHell, bk.x0 - 0.06, bk.x1 + 0.06, bk.y0 - 0.06, bk.y1, bk.slab[1] - 0.12, bk.slab[1]);
    for (const x of bk.cols) column(x, bk.colY, HOUSE.terrasse.z, bk.slab[0], bk.colW);
    railing(M.metal, new THREE.Matrix4().makeTranslation(0, 0, -bk.y0 - 0.07), bk.x0 + 0.07, bk.x1 - 0.07, bk.slab[1], bk.rail, 0);
    for (const xr of [bk.x0 + 0.07, bk.x1 - 0.07]) {
      railing(M.metal, new THREE.Matrix4().makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(xr, 0, 0)), bk.y0 + 0.07, bk.y1 - 0.02, bk.slab[1], bk.rail, 0);
    }
    const t = HOUSE.terrasse, p = HOUSE.podest;
    flushBatches(g);
    // Durchgehende Terrasse aus Travertin bis an den Freisitz, in der Mitte eine Stufe hinunter zum Weg an den Pool
    g.add(extrude(t.poly, M.deck, 0, t.z));
    boxPlan(M.stone, t.stufe[0], t.stufe[1], t.y0 - 0.35, t.y0, 0, t.z / 2);
    boxPlan(M.stone, p.x0, p.x1, p.y0, p.y1, 0, p.z);
    return g;
  }
