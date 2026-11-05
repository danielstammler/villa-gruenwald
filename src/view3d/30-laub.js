  // Teil des 3D-Modells (src/view3d/, siehe 00-kern.js): Laub aus Blattkarten und Hecken
  // ---------- Laub aus Blattkarten ----------
  // Viele kleine, gedrehte Quadrate mit Blatt-Textur. Die Normalen zeigen von der Mitte des Busches oder der Krone nach außen,
  // so wird das Laub wie ein Volumen beleuchtet. Jede Karte hat Vorder- und Rückseite mit derselben Normalen.
  // Karte: { p: Weltposition, n: Normale, q: Drehung, w, h: Größe, c: Farbfaktor, flip }
  function cardMesh(cards, mat) {
    const n = cards.length, pos = new Float32Array(n * 12), nor = new Float32Array(n * 12), col = new Float32Array(n * 12), uv = new Float32Array(n * 8), idx = new Uint32Array(n * 12);
    const u = new THREE.Vector3(), v = new THREE.Vector3(), corner = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    cards.forEach((c, i) => {
      u.set(1, 0, 0).applyQuaternion(c.q).multiplyScalar(c.w / 2); v.set(0, 1, 0).applyQuaternion(c.q).multiplyScalar(c.h / 2);
      corner.forEach(([a, b], k) => {
        const o = i * 12 + k * 3;
        pos[o] = c.p[0] + u.x * a + v.x * b; pos[o + 1] = c.p[1] + u.y * a + v.y * b; pos[o + 2] = c.p[2] + u.z * a + v.z * b;
        nor[o] = c.n[0]; nor[o + 1] = c.n[1]; nor[o + 2] = c.n[2];
        col[o] = c.c[0]; col[o + 1] = c.c[1]; col[o + 2] = c.c[2];
        uv[i * 8 + k * 2] = c.flip ? (1 - a) / 2 : (1 + a) / 2; uv[i * 8 + k * 2 + 1] = (1 + b) / 2;
      });
      const b0 = i * 4;
      idx.set([b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3, b0, b0 + 2, b0 + 1, b0, b0 + 3, b0 + 2], i * 12);
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; m.customDepthMaterial = mat.userData.depth;
    return m;
  }
  // Gleichverteilte Zufallsdrehung bzw. Ausrichtung auf eine Normale mit etwas Streuung; rnd = Zufallsfolge des Bereichs (zufall)
  const randQ = rnd => { const u1 = rnd(), u2 = rnd() * 6.2832, u3 = rnd() * 6.2832, a = Math.sqrt(1 - u1), b = Math.sqrt(u1); return new THREE.Quaternion(a * Math.sin(u2), a * Math.cos(u2), b * Math.sin(u3), b * Math.cos(u3)); };
  const AXZ = new THREE.Vector3(0, 0, 1);
  const faceQ = (n, tilt, rnd) => new THREE.Quaternion().setFromUnitVectors(AXZ, n).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * tilt, (rnd() - 0.5) * tilt, rnd() * 6.2832)));
  // Dunkler Kern unter dem Laub, damit man nicht durch Büsche hindurchsieht
  function cores(list, mat, seg = 10) {
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)), mat, list.length), m = new THREE.Matrix4();
    list.forEach(([x, y, z, rx, ry], i) => { m.makeScale(rx, ry, rx).setPosition(x, y, z); im.setMatrixAt(i, m); });
    im.castShadow = im.receiveShadow = true;
    return im;
  }
  // Hecken nach HOUSE.garten.hecken, je Lauf in Stücken von etwa 1,80 m: dunkler Kern, außen dicht mit Blattkarten besetzt.
  // Die Hecke vor dem Zaun im Osten steht in Pflanztrögen aus dunklem Stahl, je knapp 2 m lang.
  // Zufall je Lauf, benannt nach seinem ersten Punkt (bleibt, wenn andere Läufe dazukommen oder wegfallen): Maße der Stücke und Laub je eine Folge
  function hedges() {
    const grp = new THREE.Group(), boxes = [];
    for (const H of HOUSE.garten.hecken) {
      const rnd = zufall('hecke ' + H.pts[0]), laub = zufall('hecke ' + H.pts[0] + ' laub');
      H.linie.slice(1).forEach((b, i) => {
        const a = H.linie[i], L0 = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L0, uy = (b[1] - a[1]) / L0, n = Math.max(1, Math.round(L0 / 1.8)), z0 = H.z0 || 0;
        for (let k = 0; k < n; k++) {
          const s = L0 * (k + 0.5) / n;
          boxes.push({ cx: a[0] + ux * s, cy: a[1] + uy * s, len: L0 / n + 0.08, w: H.b + (rnd() - 0.5) * 0.08, h: H.h + rnd() * H.dh, z0, ux, uy, laub,
            ende: [i === 0 && k === 0, i === H.linie.length - 2 && k === n - 1] });
        }
        if (H.trog) {
          const mx = frameMx({ o: a, r: [ux, uy], n: [uy, -ux] }), nt = Math.max(1, Math.round(L0 / 2));
          for (let k = 0; k < nt; k++) addBox(M.kuebel, mx, L0 * k / nt + 0.01, L0 * (k + 1) / nt - 0.01, 0, z0, -H.trog / 2, H.trog / 2);
        }
      });
    }
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.hedgeCore, boxes.length), m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const cards = [], up = new THREE.Vector3(0, 1, 0);
    boxes.forEach((b, i) => {
      const rnd = b.laub;
      q.setFromAxisAngle(up, Math.atan2(b.uy, b.ux));
      m.compose(new THREE.Vector3(b.cx, b.z0 + (b.h - 0.08) / 2, -b.cy), q, new THREE.Vector3(b.len, b.h - 0.08, b.w - 0.14)); im.setMatrixAt(i, m);
      // Plan: s entlang der Hecke, t quer dazu; Welt: x = Plan-x, z = −Plan-y; Höhe ab Fuß der Hecke (im Trog ab Trogrand)
      const at = (s, t, z) => [b.cx + b.ux * s - b.uy * t, b.z0 + z, -(b.cy + b.uy * s + b.ux * t)];
      const side = sg => new THREE.Vector3(-b.uy * sg, 0, -b.ux * sg);
      const add = (p, n, sz) => { const k = (0.72 + 0.32 * rnd()) * (p[1] - b.z0 < 0.45 ? 0.8 : 1); cards.push({ p, n: [n.x, n.y, n.z], q: faceQ(n, 1.3, rnd), w: sz, h: sz, c: [k, k * 1.02, k * 0.96], flip: rnd() < 0.5 }); };
      const nTop = Math.round(b.len * b.w * 16), nSide = Math.round(b.len * b.h * 14);
      for (let k = 0; k < nTop; k++) {
        const t = (rnd() - 0.5) * b.w, n = up.clone().add(side(Math.sign(t)).multiplyScalar(Math.max(0, Math.abs(t) / (b.w / 2) - 0.5) * 1.6)).normalize();
        add(at((rnd() - 0.5) * b.len, t, b.h - 0.05 + rnd() * 0.07), n, 0.34 + rnd() * 0.16);
      }
      // seitlich; die obersten 35 cm neigen sich zur Kante hin nach oben, auch bei hohen Hecken
      for (const sg of [-1, 1]) for (let k = 0; k < nSide; k++) {
        const z = 0.08 + rnd() * (b.h - 0.12), n = side(sg).add(up.clone().multiplyScalar(Math.max(0, z - b.h + 0.35) * 2.2)).normalize();
        add(at((rnd() - 0.5) * b.len, sg * (b.w / 2 - 0.02 + rnd() * 0.05), z), n, 0.32 + rnd() * 0.16);
      }
      // Stirnseite am Anfang und Ende eines Laufs, sonst sähe man dort den dunklen Kern
      [-1, 1].forEach((sg, e) => {
        if (!b.ende[e]) return;
        const d = new THREE.Vector3(b.ux * sg, 0, -b.uy * sg);
        for (let k = 0, nE = Math.round(b.w * b.h * 14); k < nE; k++) {
          const z = 0.08 + rnd() * (b.h - 0.12), n = d.clone().add(up.clone().multiplyScalar(Math.max(0, z - b.h + 0.35) * 2.2)).normalize();
          add(at(sg * (b.len / 2 - 0.02 + rnd() * 0.05), (rnd() - 0.5) * b.w, z), n, 0.32 + rnd() * 0.16);
        }
      });
    });
    im.castShadow = im.receiveShadow = true;
    grp.add(im, cardMesh(cards, M.leafHedge));
    return grp;
  }
