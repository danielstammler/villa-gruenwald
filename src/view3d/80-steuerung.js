  // Teil des 3D-Modells (src/view3d/, siehe 00-kern.js): Kamera, Rundgänge, Zoom, Tasten, Ebenen und Schnitt
  // ---------- Kamera ----------
  const PRESETS = {
    garten: { pos: [8.6, 1.7, 38.5], tgt: [9.2, 5.0, 5.8] },
    eingang: { pos: [14.5, 2.2, -21], tgt: [8, 4.8, 5.8] },
    // Ost und West aus den Nachbargärten, so gewählt, dass kein Nachbarhaus und keine Baumkrone die Fassade verdeckt
    ost: { pos: [38, 3.2, 17], tgt: [13.5, 4.6, 6.2] },
    west: { pos: [-21.8, 2.5, -4.3], tgt: [2.5, 4.8, 6.0] },
    ueberblick: { pos: [-31, 37, 60], tgt: [10, 0, 18] },
    innen: { pos: [10.9, 1.75, 9.9], tgt: [2.2, 1.35, 7.4] },
    zufahrt: { pos: [24.2, 4.4, 58.5], tgt: [20.6, -0.6, 35.5] },
    oben: { pos: [10.4, 98, 20.32], tgt: [10.4, 0, 20.3] },
    schnitt: { pos: [28.2, 7.5, 9.3], tgt: [8, 5, 5.8] },
  };
  // ---------- Rundgänge ----------
  // Wege in Augenhöhe: [x, y (Plan), Boden, { eye, label, wait, look: [x, y, Höhe], v }]. Ecken werden gerundet, die Kamera schaut
  // voraus und an Haltepunkten zum Blickziel. Türen und Tore öffnen sich von selbst, unter Wasser wird es blau.
  const EYE = 1.62, EG = Zh.ffbEG + 0.005, UG = Zh.ffbUG, OG = Zh.ffbOG + 0.005, DG = Zh.ffbDG + 0.005;
  // Gerade Treppenläufe (Plans.CORE): Antritt im Osten, Austritt am Westpodest neben dem Aufzug, Gehlinie in der Mitte der Treppenbahn
  const { LINE: TL, FLIGHTS: TF } = Plans.CORE, TY = (TL[2] + TL[3]) / 2;
  const lauf = (fl, za, zb) => [[TF[fl].x0, TY, za], [TF[fl].x1, TY, zb]];
  // Rampe im Längsprofil (HOUSE.rampe.z) etwa im Metertakt abfahren, damit die Knicke stimmen
  const rampWay = (x = 21.13) => {
    const R = HOUSE.rampe, y1 = R.yTor - 0.4, n = Math.ceil(y1 - R.y0), iP = Math.round((R.yPortal - R.y0) / (y1 - R.y0) * n);
    return Array.from({ length: n + 1 }, (_, i) => { const y = R.y0 + (y1 - R.y0) * i / n; return [x, y, R.z(y), { v: 1.8, ...(i === iP ? { label: 'Unter dem Poolhaus' } : {}) }]; });
  };
  const zBalk = HOUSE.balkonDG.slab[1] + 0.02;
  const TOURS = {
    ankommen: [
      [24.25, -54.2, 0, { label: 'Ebertstraße', wait: 1.2, look: [24.0, -46, 1.4] }], [24.25, -52.4, 0, { label: 'Gartentür' }], [24.25, -50.4, 0.016],
      [23.64, -48.4, 0.016, { label: 'Weg zum Haus', v: 2.5 }], [23.64, -30.6, 0.016, { label: 'Am Poolhaus vorbei', v: 2.5 }], [23.64, 1.75, 0.016, { label: 'Nordseite', v: 2.1 }],
      [12.5, 1.75, 0.016], [8.0, 2.05, 0.016, { label: 'Eingang', wait: 1.4, look: [8.0, -0.2, 2.2] }], [8.0, 0.6, 0.18], [8.0, -0.6, EG, { label: 'Halle' }],
      // Blick auf die Treppe an der Rückwand der Halle, dann am Westpodest vorbei ins Wohnen und durchs Essen zur Gartentür
      [8.0, -2.2, EG, { wait: 2.2, look: [8.6, -4.4, 2.4] }], [6.2, -3.1, EG], [5.4, -4.3, EG], [5.4, -5.0, EG], [5.6, -6.2, EG, { label: 'Wohnen' }],
      [6.6, -8.0, EG], [7.6, -10.2, EG, { label: 'Essen' }], [8.0, -11.0, EG, { label: 'Gartentür' }], [8.0, -12.45, 0.18, { label: 'Terrasse' }], [10.75, -12.6, 0.18], [10.75, -15.0, 0.18],
      [9.1, -15.4, 0.18, { wait: 1.6, look: [8.0, -30.0, 0.6] }], [8.4, -16.1, 0.09], [8.1, -17.0, 0.03, { label: 'Weg zum Pool' }], [8.0, -22.9, 0.03], [8.0, -24.3, 0.04, { label: 'Pool', wait: 1.2, look: [8.0, -34, -0.6] }],
      ...HOUSE.pool.stufen.map((z, i) => [8.0, -25.05 - HOUSE.pool.tritt * i, z, { v: 0.8 }]),
      [8.0, -26.9, -1.4, { eye: 0.15, label: 'Im Pool' }], [8.0, -28.2, -1.4, { eye: -0.55, label: 'Abtauchen' }], [8.0, -33.4, -1.4, { eye: -0.75, v: 1.2 }],
      [8.0, -35.6, -1.4, { eye: 0.12, label: 'Aufgetaucht', wait: 3.2, look: [8.0, 3.0, 4.5] }],
    ],
    // Start am Garteneingang an der Straße, über die Zufahrt die Rampe hinunter (Höhen nach dem Längsprofil) und durchs Tor
    garage: [
      [24.25, -53.0, 0, { label: 'Garteneingang', wait: 1.4, look: [22.0, -40.0, 0.6] }], [24.25, -50.6, 0.016], [22.6, -50.1, 0.016],
      [21.13, -49.4, 0.016, { label: 'Rampe zur Tiefgarage' }],
      ...rampWay(),
      [21.0, -23.3, UG, { label: 'Tiefgarage', wait: 1.8, look: [14.0, -19.5, UG + 0.8] }], [19.2, -19.0, UG, { label: 'Ferrari F8 · Cayenne Coupé · V-Klasse' }],
      // Vom Fahrgassenende nach Westen zum Eingangsbereich mittig vor dem Haus, durch die Doppeltür ins Foyer
      [18.6, -14.0, UG], [12.0, -13.9, UG], [9.6, -13.2, UG, { label: 'Eingang zum Haus', wait: 1.2, look: [8.0, -11.2, UG + 1.3] }], [8.0, -12.4, UG],
      [8.0, -10.4, UG, { label: 'Foyer' }], [8.0, -6.9, UG], [8.5, -5.7, UG], [11.18, -5.7, UG, { label: 'Untergeschoss' }], [11.18, TY, UG, { label: 'Treppe' }],
      // Drei gerade Läufe übereinander, alle nach Westen: oben am Westpodest an, durch Halle bzw. Flur zurück zum nächsten Antritt im Osten
      ...lauf('UG', UG, EG), [5.4, TY, EG], [6.0, -2.9, EG], [7.0, -2.6, EG, { label: 'Halle', wait: 1.4, look: [8.4, -4.3, 2.0] }], [11.15, -2.9, EG], [11.15, TY, EG],
      ...lauf('EG', EG, OG), [5.4, TY, OG], [5.4, -5.72, OG], [10.95, -5.72, OG], [11.0, TY, OG, { label: 'Galerie', wait: 1.8, look: [7.6, -1.4, 1.0] }],
      ...lauf('OG', OG, DG), [5.5, TY, DG], [5.5, -5.72, DG, { label: 'Dachgeschoss' }], [8.05, -5.72, DG], [8.05, -7.2, DG], [6.5, -7.8, DG, { label: 'Büro' }],
      [6.5, -10.5, DG], [7.6, -11.05, DG], [8.0, -11.4, DG], [8.0, -11.95, zBalk, { label: 'Balkon im DG' }], [7.2, -12.25, zBalk, { wait: 3.0, look: [8.0, -32.0, 0.5] }],
    ],
    eg: [
      // Halle mit Blick auf die Treppe, am Westpodest durch die Tür ins Wohnen, Essen, Küche, Backkitchen und über die Küchentür zurück
      [8.0, -0.9, EG, { label: 'Halle', wait: 1.5, look: [8.6, -4.3, 2.2] }], [7.0, -2.4, EG], [5.4, -3.6, EG], [5.4, -5.0, EG], [5.6, -6.2, EG, { label: 'Wohnen' }],
      [5.2, -7.4, EG, { wait: 1.6, look: [0.6, -7.6, 1.0] }], [6.6, -8.8, EG], [7.6, -10.5, EG, { label: 'Essen' }], [10.4, -10.3, EG],
      [11.4, -9.9, EG, { label: 'Küche' }], [12.15, -9.1, EG, { wait: 1.6, look: [13.6, -10.1, 0.8] }], [12.2, -6.3, EG], [12.75, -4.7, EG],
      [12.75, -3.3, EG, { label: 'Backkitchen', wait: 1.2, look: [14.0, -1.8, 1.0] }], [12.75, -4.5, EG], [11.8, -4.49, EG], [11.1, -4.4, EG, { label: 'Halle' }],
      [11.1, -2.9, EG], [8.0, -2.6, EG], [8.0, -1.4, EG, { wait: 2.0, look: [8.0, 0.5, 1.8] }],
    ],
    garten: [
      [2.0, -12.6, 0.18, { label: 'Terrasse', wait: 1.2, look: [16, -12.6, 1.4] }], [15.5, -12.6, 0.18], [17.5, -11.2, 0.18, { label: 'Freisitz' }],
      [17.5, -10.45, 0.18, { wait: 1.4, look: [17.5, -7.0, 1.0] }], [16.0, -12.6, 0.18], [10.75, -12.7, 0.18], [10.75, -15.0, 0.18], [9.1, -15.4, 0.18],
      [8.4, -16.1, 0.09], [8.2, -17.0, 0.03, { label: 'Garten' }], [8.0, -22.6, 0.03], [10.6, -23.6, 0.04, { label: 'Poolterrasse' }], [13.3, -24.5, 0.04], [13.9, -28.6, 0.04],
      [16.0, -29.0, 0.04], [18.0, -29.3, 0.04, { label: 'Poolhaus', wait: 1.6, look: [21.5, -30.6, 1.3] }], [19.0, -30.65, 0.04],
      [20.5, -30.65, 0.05, { label: 'Im Poolhaus', wait: 1.6, look: [22.4, -30.6, 1.2] }], [19.0, -30.65, 0.04], [16.0, -31.3, 0.04], [13.3, -34.2, 0.04],
      [13.3, -37.2, 0.04], [10.5, -37.6, 0.04], [8.0, -37.6, 0.04, { label: 'Blick aufs Haus', wait: 3.0, look: [8.0, 2.0, 5.0] }],
    ],
  };
  let tour = null;
  // Weg dicht abtasten (alle 5 cm); Ecken außer an Haltepunkten mit Bögen bis 0,7 m Radius
  function tourPath(pts) {
    const W3 = pts.map(([x, y, z, o = {}]) => ({ p: new THREE.Vector3(x, o.eye ?? z + EYE, -y), o })), S = [], marks = [];
    const add = (a, b, k, ctrl) => {
      const len = ctrl ? a.distanceTo(ctrl) + ctrl.distanceTo(b) : a.distanceTo(b), n = Math.max(1, Math.ceil(len / 0.05));
      for (let j = 1; j <= n; j++) {
        const t = j / n, p = ctrl ? a.clone().multiplyScalar((1 - t) * (1 - t)).addScaledVector(ctrl, 2 * t * (1 - t)).addScaledVector(b, t * t) : a.clone().lerp(b, t);
        S.push({ p, k });
      }
    };
    S.push({ p: W3[0].p.clone(), k: 0 });
    let cur = W3[0].p.clone();
    for (let i = 1; i < W3.length; i++) {
      const A = W3[i - 1].p, B = W3[i].p, C = W3[i + 1] && W3[i + 1].p, d1 = B.clone().sub(A), d2 = C ? C.clone().sub(B) : null;
      const r = C && !W3[i].o.wait ? Math.min(0.7, d1.length() / 2, d2.length() / 2) : 0;
      const end = r > 0.02 ? B.clone().addScaledVector(d1.clone().normalize(), -r) : B.clone();
      add(cur, end, i);
      marks[i] = S.length - 1;
      if (r > 0.02) { const P2 = B.clone().addScaledVector(d2.clone().normalize(), r); add(end, P2, i + 1, B); cur = P2; } else cur = B.clone();
    }
    marks[0] = 0;
    let s = 0;
    S.forEach((q, j) => { if (j) s += q.p.distanceTo(S[j - 1].p); q.s = s; });
    return { W3, S, marks, len: s };
  }
  function startTour(name, cb = {}) {
    stopTour(false);
    const path = tourPath(TOURS[name]);
    setOrtho(false); tween = null; st.rotate = false;
    tour = { name, path, j: 0, s: 0, v: 0, wait: 0, waited: -1, dir: null, cb, label: '' };
    camP.position.copy(path.S[0].p);
    invalidate();
  }
  function stopTour(notify = true) {
    if (!tour) return;
    const t = tour; tour = null;
    // Ziel knapp vor die Kamera; draußen nicht nach oben, sonst würde die Steuerung die Kamera versetzen
    const d = (t.dir || new THREE.Vector3(0, 0, -1)).clone();
    polar(); d.y = Math.min(d.y, st.inside ? 0.6 : -0.03); d.normalize();
    controls.target.copy(camP.position).addScaledVector(d, 1.6);
    controls.update();
    if (notify && t.cb.onEnd) t.cb.onEnd();
    invalidate();
  }
  function stepTour(dt) {
    const T = tour, { S, W3, marks } = T.path, at = s => { let j = T.j; while (j < S.length - 1 && S[j + 1].s <= s) j++; return j; };
    // nächster Haltepunkt und Beschriftung
    let k = W3.findIndex((w, i) => i > T.waited && (w.o.wait || i === W3.length - 1) && S[marks[i]].s >= T.s - 1e-6);
    if (k < 0) k = W3.length - 1;
    const stopS = S[marks[k]].s;
    for (let i = 0; i < W3.length; i++) if (S[marks[i]].s <= T.s + 1e-6 && W3[i].o.label && T.label !== W3[i].o.label && i > (T.li ?? -1)) { T.label = W3[i].o.label; T.li = i; if (T.cb.onLabel) T.cb.onLabel(T.label); }
    const seg = S[Math.min(S.length - 1, T.j + 1)].k, w = W3[Math.max(0, seg - 1)], next = W3[Math.min(W3.length - 1, seg)];
    const steep = Math.abs(next.p.y - w.p.y) > 0.3 * Math.hypot(next.p.x - w.p.x, next.p.z - w.p.z);
    let vt = steep ? 0.75 : (w.o.v || 1.45);
    if (T.wait > 0) { T.wait -= dt; vt = 0; if (T.wait <= 0) { T.waited = k; if (k === W3.length - 1) { stopTour(); return; } } }
    else if (T.s >= stopS - 1e-4) { T.s = stopS; T.v = 0; vt = 0; T.wait = W3[k].o.wait || 0.4; }
    else vt = Math.min(vt, Math.max(0.2, (stopS - T.s) * 1.6));
    T.v += (vt - T.v) * Math.min(1, dt * 2.5);
    if (T.wait <= 0) T.s = Math.min(stopS, T.s + T.v * dt);
    T.j = at(T.s);
    const a = S[T.j], b = S[Math.min(S.length - 1, T.j + 1)], f = b.s > a.s ? (T.s - a.s) / (b.s - a.s) : 0;
    const pos = a.p.clone().lerp(b.p, Math.min(1, Math.max(0, f)));
    // Blick: voraus auf dem Weg, an Haltepunkten zum Blickziel; weich nachgeführt
    let tgt;
    if (T.wait > 0 && W3[k].o.look) { const [x, y, z] = W3[k].o.look; tgt = new THREE.Vector3(x, z, -y); }
    else { const ah = S[at(T.s + 1.8)].p; tgt = new THREE.Vector3(ah.x, pos.y + (ah.y - pos.y) * 0.6 - 0.12, ah.z); if (tgt.distanceToSquared(pos) < 0.04) tgt = pos.clone().addScaledVector(T.dir || new THREE.Vector3(0, 0, -1), 1); }
    const want = tgt.sub(pos).normalize();
    T.dir = T.dir ? T.dir.lerp(want, 1 - Math.exp(-dt * 3.2)).normalize() : want;
    camP.position.copy(pos); camP.lookAt(pos.clone().add(T.dir));
    controls.target.copy(pos).addScaledVector(T.dir, 1.6);
  }
  // Zoom in Schritten (Knöpfe + / − im Bild): Kamera auf das Ziel zu; ganz nah geht es vorwärts weiter (durch Türen und Fenster)
  function zoomStep(k) {
    stopTour();
    if (cam !== camP) { camO.zoom = THREE.MathUtils.clamp(camO.zoom / k, 0.3, 8); camO.updateProjectionMatrix(); updateScale(); invalidate(); return; }
    const from = camP.position.clone(), ft = controls.target.clone(), off = from.clone().sub(ft), d = off.length();
    let tp = ft.clone().addScaledVector(off, Math.min(k, 260 / Math.max(d, 1e-3))), tt = ft.clone();
    if (k < 1 && d * k < 0.8) { const step = off.clone().normalize().multiplyScalar(-(d * (1 - k) + 0.6)); tp = from.clone().add(step); tt = ft.clone().add(step); }
    tween = { t0: performance.now(), dur: 380, fp: from, ft, tp, tt };
    invalidate();
  }
  // Doppeltippen bzw. Doppelklick: auf die Stelle zufliegen (Glas wird durchschaut)
  const ray = new THREE.Raycaster();
  function zoomAt(cx, cy) {
    stopTour();
    if (cam !== camP) { camO.zoom = Math.min(8, camO.zoom * 1.6); camO.updateProjectionMatrix(); updateScale(); invalidate(); return; }
    const r = canvas.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2((cx - r.left) / r.width * 2 - 1, -(cy - r.top) / r.height * 2 + 1), camP);
    const shown = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
    const hit = ray.intersectObjects(scene.children, true).find(h => h.distance < 800 && h.object !== sky && shown(h.object) &&
      !(h.object.material.transparent && h.object.material.opacity < 0.6) && (st.level === 'alle' || h.point.y <= levelPlane.constant + 0.01) && (!st.cut || h.point.x <= st.cutX + 0.01));
    const from = camP.position.clone(), to = hit ? hit.point.clone() : controls.target.clone();
    const tp = to.clone().add(from.clone().sub(to).multiplyScalar(0.42));
    if (tp.distanceTo(to) < 0.6) tp.copy(to).add(from.clone().sub(to).setLength(0.6));
    tween = { t0: performance.now(), dur: 700, fp: from, ft: controls.target.clone(), tp, tt: to };
    invalidate();
  }
  // Gehen mit der Tastatur: W/S bzw. Pfeil hoch/runter vor und zurück, A/D seitlich, Pfeil links/rechts drehen, Q/E runter und hoch, Umschalt schneller
  const KEYS = { KeyW: 'f', ArrowUp: 'f', KeyS: 'b', ArrowDown: 'b', KeyA: 'l', KeyD: 'r', ArrowLeft: 'tl', ArrowRight: 'tr', KeyQ: 'd', PageDown: 'd', KeyE: 'u', PageUp: 'u' };
  const keys = new Set(), held = new Map();
  let fast = false;
  function keyMove(dt) {
    if (!keys.size) return false;
    // + und − (auch Ziffernblock): stufenlos näher heran oder weiter weg; ganz nah geht es vorwärts weiter
    const zk = (keys.has('zo') ? 1 : 0) - (keys.has('zi') ? 1 : 0);
    if (zk && cam !== camP) { camO.zoom = THREE.MathUtils.clamp(camO.zoom * Math.exp(-zk * 1.4 * dt), 0.3, 8); camO.updateProjectionMatrix(); updateScale(); }
    else if (zk) {
      const off = camP.position.clone().sub(controls.target), d = off.length(), nd = THREE.MathUtils.clamp(d * Math.exp(zk * 1.4 * dt), 0.3, 260);
      if (zk < 0 && nd < 0.8) { const fw = off.normalize().multiplyScalar(-(fast ? 6 : 2.4) * dt); camP.position.add(fw); controls.target.add(fw); }
      else camP.position.copy(controls.target).addScaledVector(off.normalize(), nd);
    }
    if (cam !== camP) return zk !== 0;
    const fwd = new THREE.Vector3().subVectors(controls.target, camP.position); fwd.y = 0;
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
    fwd.normalize();
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x), mv = new THREE.Vector3();
    const sp = Math.max(2.2, camP.position.distanceTo(controls.target) * 0.7) * (fast ? 2.6 : 1) * dt;
    if (keys.has('f')) mv.add(fwd); if (keys.has('b')) mv.sub(fwd); if (keys.has('r')) mv.add(right); if (keys.has('l')) mv.sub(right);
    if (keys.has('u')) mv.y += 1; if (keys.has('d')) mv.y -= 1;
    if (mv.lengthSq()) { mv.normalize().multiplyScalar(sp); camP.position.add(mv); controls.target.add(mv); }
    const turn = (keys.has('tl') ? 1 : 0) - (keys.has('tr') ? 1 : 0);
    if (turn) controls.target.copy(camP.position).add(new THREE.Vector3().subVectors(controls.target, camP.position).applyAxisAngle(new THREE.Vector3(0, 1, 0), turn * 1.5 * dt));
    return true;
  }
  function goTo(name) {
    stopTour();
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
    invalidate();
  }
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    if (post) {
      const pr = renderer.getPixelRatio(), W = Math.round(w * pr), H = Math.round(h * pr);
      post.rt.setSize(W, H); post.out.setSize(W, H); post.ao.setSize(Math.max(1, W >> 1), Math.max(1, H >> 1));
    }
    invalidate();
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
      st.tgLayer = on; polar();
    }
    if (syncUi) { const el = document.getElementById(`ly-${name}`); if (el) el.checked = on; }
    invalidate();
  }
  // Schnitte: senkrechter Hausschnitt von Osten und waagrechter Geschossschnitt; im Kellerblick schneidet er alles über dem Keller
  function applyClip() {
    const planes = [];
    if (st.cut) planes.push(cutPlane);
    if (st.level !== 'alle') planes.push(levelPlane);
    for (const m of houseMats) { m.clippingPlanes = planes; m.needsUpdate = true; }
    for (const m of levelMats) { m.clippingPlanes = st.level !== 'alle' ? [levelPlane] : []; m.needsUpdate = true; }
    renderer.clippingPlanes = st.level === 'UG' ? [levelPlane] : [];
  }
  function setCut(on, x = st.cutX) {
    st.cut = on; st.cutX = x; cutPlane.constant = x;
    applyClip(); invalidate();
  }
  // Schnittflächen der Wände auf Schnitthöhe, damit Wände gefüllt wirken (Innenwände, Fassaden ohne Öffnungen, Zwerchhausfronten)
  function capsFor(lv, zc) {
    const geos = [];
    const add = ([a, b, c, e]) => {
      if (b - a < 0.01 || e - c < 0.01) return;
      const g = new THREE.BoxGeometry(b - a, 0.012, e - c); g.translate((a + b) / 2, zc - 0.008, -(c + e) / 2); geos.push(g);
    };
    for (const w of wallRects) if (w.fl === lv && w.top > zc) add(w.r);
    for (const side of ['S', 'N', 'E', 'W']) {
      const F = HOUSE.fas[side], f = HOUSE.frame[side], t = HOUSE.wall;
      const rect = (u0, u1, d) => {
        const ax = f.o[0] + f.r[0] * u0, ay = f.o[1] + f.r[1] * u0, bx = f.o[0] + f.r[0] * u1, by = f.o[1] + f.r[1] * u1, ix = -f.n[0] * d, iy = -f.n[1] * d;
        return [Math.min(ax, bx, ax + ix, bx + ix), Math.max(ax, bx, ax + ix, bx + ix), Math.min(ay, by, ay + iy, by + iy), Math.max(ay, by, ay + iy, by + iy)];
      };
      const segs = (len, holes) => {
        const out = []; let u = 0;
        for (const [a, b] of holes.sort((p, q) => p[0] - q[0])) { if (a > u) out.push([u, a]); u = Math.max(u, b); }
        if (u < len) out.push([u, len]);
        return out;
      };
      if (zc < Zh.gesimsU && zc > 0) for (const [a, b] of segs(F.len, F.open.filter(o => o.z0 < zc && o.z1 > zc).map(o => [o.u0, o.u1]))) add(rect(a, b, t));
      for (const d of F.dormers || []) if (d.zwerch && zc > Zh.gesimsU && zc < d.top) {
        for (const [a, b] of segs(d.u1 - d.u0, d.win.filter(w => w.z0 < zc && w.z1 > zc).map(w => [w.u0 - d.u0, w.u1 - d.u0]))) add(rect(d.u0 + a, d.u0 + b, 0.12));
      }
    }
    return geos.length ? new THREE.Mesh(mergeGeometries(geos, false), M.cap) : null;
  }
  const LEVEL_VIEW = {
    UG: { pos: [31, 23, 45], tgt: [12.5, -3.2, 14] }, EG: { pos: [23, 17.5, 27], tgt: [8, 0.4, 6.4] },
    OG: { pos: [23, 20.5, 27], tgt: [8, 3.7, 6.4] }, DG: { pos: [23, 23.5, 27], tgt: [8, 6.8, 6.4] },
  };
  let capMesh = null;
  const shadowCasters = [];
  function setLevel(lv) {
    stopTour();
    st.level = lv;
    const zc = LEVEL_CUT[lv];
    if (zc !== undefined) levelPlane.constant = zc;
    applyClip();
    if (capMesh) { scene.remove(capMesh); capMesh.geometry.dispose(); capMesh = null; }
    if (zc !== undefined) { capMesh = capsFor(lv, zc); if (capMesh) scene.add(capMesh); }
    // Kellerblick: Erdreich auf Schnitthöhe, oberirdische Dinge werfen keinen Schatten in den offenen Keller
    if (L.erde) L.erde.visible = lv === 'UG';
    for (const o of shadowCasters) o.castShadow = lv !== 'UG';
    const tgBox = document.getElementById('ly-tg');
    if (L.tg) L.tg.visible = lv !== 'UG' && !!(tgBox && tgBox.checked);
    if (LEVEL_VIEW[lv]) {
      setOrtho(false);
      const v = LEVEL_VIEW[lv];
      tween = { t0: performance.now(), dur: 1100, fp: camP.position.clone(), ft: controls.target.clone(), tp: new THREE.Vector3(...v.pos), tt: new THREE.Vector3(...v.tgt) };
    }
    invalidate();
  }

