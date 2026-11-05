  // Teil des 3D-Modells (src/view3d/, siehe 00-kern.js): Bildaufbau, Bildschleife, Türen, Start (init) und Schnittstelle nach außen
  // ---------- Bildaufbau ----------
  // Szene in ein Mehrfach-Abtastungs-Ziel mit Tiefe, daraus Umgebungsverdeckung (GTAO) in Ecken, unter Vorsprüngen und im Laub,
  // zuletzt Tonwertumsetzung auf den Bildschirm. Ohne passende Grafikfähigkeiten wird direkt gezeichnet.
  function setupPost(big) {
    const ext = renderer.extensions;
    if (!(ext.has('EXT_color_buffer_float') || ext.has('EXT_color_buffer_half_float'))) return;
    try {
      const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: Math.min(big ? 4 : 2, renderer.capabilities.maxSamples || 4) });
      rt.depthTexture = new THREE.DepthTexture(4, 4);
      const out = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
      const ao = new GTAOPass(scene, camP, 2, 2);
      ao.setGBuffer(rt.depthTexture);
      ao.updateGtaoMaterial({ radius: 1.1, distanceExponent: 1.4, thickness: 1.6, scale: 1.5, samples: big ? 16 : 10, distanceFallOff: 1.0, screenSpaceRadius: false });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, radiusExponent: 1, rings: 2, samples: big ? 16 : 10 });
      ao.setSceneClipBox(new THREE.Box3(new THREE.Vector3(-90, -6, -80), new THREE.Vector3(110, 45, 110)));
      ao.blendIntensity = 1;
      post = { rt, out, ao, op: new OutputPass() };
      post.op.renderToScreen = true;
    } catch (e) { console.warn('Bildaufbau ohne Umgebungsverdeckung:', e); post = null; }
  }
  let skipDraw = false;
  function renderFrame() {
    if (skipDraw) return;
    if (post && cam === camP) {
      renderer.setRenderTarget(post.rt); renderer.render(scene, cam);
      post.ao.render(renderer, post.out, post.rt);
      post.op.render(renderer, null, post.out);
    } else {
      renderer.setRenderTarget(null); renderer.render(scene, cam);
    }
  }

  // ---------- Schleife ----------
  function loop(t) {
    raf = active ? requestAnimationFrame(loop) : 0;
    const dt = Math.min(0.1, (t - last) / 1000 || 0); last = t;
    if (tween) {
      const k = Math.min(1, (t - tween.t0) / tween.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camP.position.lerpVectors(tween.fp, tween.tp, e); controls.target.lerpVectors(tween.ft, tween.tt, e);
      if (k >= 1) tween = null;
      dirty = true;
    }
    if (st.play) {
      st.h += dt * 0.9; if (st.h > 22.5) st.h = 4;
      updateSun(); if (ui.time) { ui.time.value = st.h; ui.timeOut.textContent = SUN.hhmm(st.h); }
    }
    if (envDue && t > envDue) { envDue = 0; updateEnv(); dirty = true; }
    controls.autoRotate = st.rotate && !st.ortho && !tour;
    if (tour) { stepTour(dt); dirty = true; }
    if (keyMove(dt)) dirty = true;
    if (updateDoors(dt)) dirty = true;
    const q = camP.position;
    if ((!tour && controls.update(dt)) || dirty) {
      dirty = false;
      // Nahe Kamera (im Haus): kleine Nahebene, damit Wände beim Hineinzoomen nicht abgeschnitten werden
      const nr = THREE.MathUtils.clamp(camP.position.distanceTo(controls.target) * 0.02, 0.03, 0.3);
      if (Math.abs(nr - camP.near) > 0.005) { camP.near = nr; camP.updateProjectionMatrix(); }
      const inHouse = q.x > 0.3 && q.x < 15.7 && q.z > 0.3 && q.z < 11.35 && q.y > Zh.ffbUG && q.y < 10.4;
      const inTG = q.x > 4.5 && q.x < 23.5 && q.z > 11.65 && q.z < 24.15 && q.y < HOUSE.tg.decke;
      const ins = cam === camP && st.level === 'alle' && (inHouse || inTG);
      if (ins !== !!st.inside) { st.inside = ins; applyLight(); polar(); }
      // Licht in der Tiefgarage nur, wenn man drin ist oder von oben hineinsieht
      const tgOn = st.level === 'UG' || (cam === camP && (inTG || (inHouse && q.y < -0.15)));
      if (tgOn !== !!st.tgOn) { st.tgOn = tgOn; for (const l of L.tgLights) l.intensity = tgOn ? 9 : 0; }
      // unter Wasser: blaugrüner, dichter Nebel
      const pw = SITE.concept.poolWasser, uw = cam === camP && q.x > pw[0][0] && q.x < pw[1][0] && -q.z < pw[0][1] && -q.z > pw[2][1] && q.y < HOUSE.pool.wasser;
      if (uw !== !!st.under) { st.under = uw; applyFog(); }
      renderFrame();
    }
  }
  // Türen und Tore öffnen sich, wenn die Kamera nahe kommt; Drehflügel um ihre Angel, Tore mit eigener Bewegung über d.set(t), t = 0 zu bis 1 offen
  // (d.v: Anteil je Sekunde, sonst 1,4)
  function updateDoors(dt) {
    const q = camP.position;
    let moved = false;
    for (const d of doors) {
      const want = cam === camP && Math.hypot(q.x - d.c.x, q.z - d.c.z) < 2.4 && Math.abs(q.y - d.c.y) < 2.2 ? 1 : 0, v = dt * (d.v || 1.4);
      if (d.open !== want) {
        d.open = want > d.open ? Math.min(1, d.open + v) : Math.max(0, d.open - v);
        const e = d.open * d.open * (3 - 2 * d.open);
        if (d.set) d.set(e); else d.grp.rotation[d.axis || 'y'] = d.sign * d.max * e;
        moved = true;
      }
    }
    return moved;
  }
  // Blick nach oben: draußen nicht unter den Horizont, im Haus darf man auch nach oben schauen
  function polar() {
    controls.maxPolarAngle = st.inside || tour ? Math.PI * 0.85 : st.tgLayer ? Math.PI * 0.9 : Math.PI * 0.495;
  }
  function applyFog() {
    if (st.under) { scene.fog.color.setRGB(0.04, 0.28, 0.36); scene.fog.density = 0.28; }
    else { scene.fog.color.copy(st.fogAir || scene.fog.color); scene.fog.density = 0.0021; }
    invalidate();
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
    renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = EXPO;
    renderer.localClippingEnabled = true;
    scene = new THREE.Scene();
    scene.environmentIntensity = 0.5;
    scene.fog = new THREE.FogExp2(0xc4cfda, 0.0021);
    camP = new THREE.PerspectiveCamera(38, 1.6, 0.3, 10000);
    camO = new THREE.OrthographicCamera(-12, 12, 7.75, -7.75, 0.1, 600);
    cam = camP;
    camP.position.set(...PRESETS.garten.pos);
    controls = new OrbitControls(camP, canvas);
    controls.target.set(...PRESETS.garten.tgt);
    controls.enableDamping = true; controls.dampingFactor = 0.08; controls.maxPolarAngle = Math.PI * 0.495;
    controls.minDistance = 0.3; controls.maxDistance = 260; controls.autoRotateSpeed = 1.8; controls.zoomToCursor = true;
    // dieselben Grenzen wie die +/−-Tasten in der maßstäblichen Ansicht, sonst zoomen die Tasten nach dem Mausrad in die Gegenrichtung
    controls.minZoom = 0.3; controls.maxZoom = 8;
    controls.addEventListener('change', () => { updateScale(); invalidate(); });
    controls.addEventListener('start', () => { tween = null; });
    // Am Handy ruhiger: mit dem Finger langsamer drehen und verschieben, sanfter zoomen, kürzer nachgleiten
    stage.addEventListener('pointerdown', e => {
      const touch = e.pointerType === 'touch';
      controls.rotateSpeed = touch ? 0.42 : 1; controls.panSpeed = touch ? 0.6 : 1; controls.zoomSpeed = touch ? 0.75 : 1; controls.dampingFactor = touch ? 0.16 : 0.08;
    }, true);
    // Antippen oder Ziehen beendet einen Rundgang; Doppeltippen (Finger) bzw. Doppelklick zoomt auf die Stelle
    canvas.tabIndex = 0;
    let tap = null, down = null, fingers = 0, lastZoom = 0;
    canvas.addEventListener('pointerdown', e => {
      fingers++; down = fingers === 1 ? { x: e.clientX, y: e.clientY, t: performance.now() } : null;
      canvas.focus({ preventScroll: true }); stopTour();
    });
    canvas.addEventListener('pointerup', e => {
      fingers = Math.max(0, fingers - 1);
      const now = performance.now(), isTap = e.pointerType === 'touch' && down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12 && now - down.t < 320;
      down = null;
      if (!isTap) return;
      if (tap && now - tap.t < 340 && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) < 40) { zoomAt(e.clientX, e.clientY); tap = null; lastZoom = now; }
      else tap = { t: now, x: e.clientX, y: e.clientY };
    });
    canvas.addEventListener('pointercancel', () => { fingers = 0; down = null; });
    canvas.addEventListener('dblclick', e => { if (performance.now() - lastZoom > 700) zoomAt(e.clientX, e.clientY); });
    // Tastatur: nur im 3D-Bereich, nicht in Eingabefeldern; Pfeiltasten nur, wenn das Bild den Fokus hat (sonst scrollen sie die Seite)
    const keyOf = e => KEYS[e.code] || (e.key === '+' || e.key === '=' || e.code === 'NumpadAdd' ? 'zi' : e.key === '-' || e.code === 'NumpadSubtract' ? 'zo' : null);
    window.addEventListener('keydown', e => {
      const el = document.activeElement, tag = el && el.tagName, k = keyOf(e);
      fast = e.shiftKey;
      if (!active || !k || e.metaKey || e.ctrlKey || e.altKey || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code.startsWith('Arrow') || e.code.startsWith('Page')) { if (el !== canvas) return; e.preventDefault(); }
      keys.add(k); held.set(e.code, k); stopTour(); tween = null; invalidate();
    });
    // Loslassen nach der physischen Taste: mit Umschalt liefert dieselbe Taste ein anderes Zeichen ('+' wird '*', '-' wird '_')
    window.addEventListener('keyup', e => { fast = e.shiftKey; const k = held.get(e.code) || keyOf(e); held.delete(e.code); if (k) keys.delete(k); });
    window.addEventListener('blur', () => { keys.clear(); held.clear(); });
    makeMaterials();
    setupLights(big);
    L.haus = buildHouse(); scene.add(L.haus);
    scene.add(buildSite());
    const unter = buildGarage(); scene.add(unter); L.unter = unter;
    // Tiefgarage nur vom Geschossschnitt erfasst, auch im Schattenbild (der Schnitt für den ganzen Bildaufbau gilt dort nicht)
    unter.traverse(o => { if (o.isMesh && !houseMats.has(o.material)) { levelMats.add(o.material); o.material.clipShadows = true; } });
    scene.traverse(o => { if (o.isMesh && o.castShadow && !isInside(o, unter) && !houseMats.has(o.material) && !levelMats.has(o.material)) shadowCasters.push(o); });
    setupPost(big);
    updateSun(); updateEnv();
    new ResizeObserver(() => { resize(); updateScale(); }).observe(stage);
    resize();
    ready = true;
  }
  function show(on) {
    active = on;
    if (on) invalidate();
    if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  }
  function setDate(y, m, d) { st.y = y; st.m = m; st.d = d; updateSun(); }
  function setTime(h) { st.h = h; updateSun(); }
  function snapshot() { renderFrame(); return renderer.domElement.toDataURL('image/png'); }
  // ---------- Prüfhaken (tools/browser.js), ändern am Bild nichts ----------
  // Netze für die Prüfstrahlen: nur Sichtbares, auch über die Gruppen (sonst zählen ausgeblendete Hilfen wie die roten Wurzelschutzkreise,
  // die auf der Rampe über dem Boden liegen), ohne Durchsichtiges (Glas, Wasser) und Himmel; Laub-Karten (alphaTest) nur auf Wunsch
  const shownAll = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  function rayObjs(laub) {
    const objs = [];
    scene.traverse(o => { const m = o.material; if (o.isMesh && o !== sky && !Array.isArray(m) && m.visible !== false && shownAll(o) && !(m.transparent && m.opacity < 0.6) && (laub || !(m.alphaTest > 0))) objs.push(o); });
    return objs;
  }
  const matNames = () => new Map([...Object.entries(carMats), ...Object.entries(M)].filter(([, v]) => v && v.isMaterial).map(([k, v]) => [v, k]));
  const setDoor = d => { const e = d.open * d.open * (3 - 2 * d.open); if (d.set) d.set(e); else d.grp.rotation[d.axis || 'y'] = d.sign * d.max * e; };
  // Schattenbild der Sonne für die Prüfbilder: die Sonne steht fest und ihr Schattenbild hängt nicht von der Kamera ab, nur davon, was Schatten
  // wirft (Türen, Geschossschnitt, Ebenen, Schnitt, Tageszeit). Bleibt das gleich, nimmt das nächste Bild das alte Schattenbild – gleiches Bild,
  // im Software-Rendering ein Viertel schneller. Die Seite selbst rechnet weiter jedes Bild neu.
  // Hat zwischendurch jemand anders gezeichnet (Zähler der Bilder), wird das Schattenbild auf jeden Fall neu gerechnet.
  let shadowKey = null, shadowFrame = -1;
  function testShot() {
    const key = JSON.stringify([st.level, st.cut, st.cutX, st.y, st.m, st.d, st.h, doors.map(d => d.open), Object.keys(L).map(k => [].concat(L[k]).map(o => o && o.visible))]);
    renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = key !== shadowKey || renderer.info.render.frame !== shadowFrame;
    try { renderFrame(); } finally { renderer.shadowMap.autoUpdate = true; }
    shadowKey = key; shadowFrame = renderer.info.render.frame;
    return renderer.domElement.toDataURL('image/png');
  }
  return {
    init, show, goTo, setLayer, setCut, setLevel, setDate, setTime, snapshot,
    get ready() { return ready; }, state: st,
    play(on) { st.play = on; }, rotate(on) { st.rotate = on; }, zoom: zoomStep,
    // Rundgang starten (name) oder beenden (null); cb.onLabel bekommt die Stationen, cb.onEnd meldet das Ende
    tour(name, cb) { if (name) { startTour(name, cb); polar(); } else stopTour(false); },
    // Für die Prüfung der Wege: Namen aller Rundgänge, Abtastpunkte eines Rundgangs in Weltkoordinaten
    _tours: () => Object.keys(TOURS),
    _tourPoints: name => tourPath(TOURS[name]).S.map(q => q.p.toArray()),
    // Prüfung der Wege wie beim Gehen: der Rundgang läuft in Schritten von 1/30 s ab, Türen und Tore öffnen sich dabei wie unterwegs.
    // Alle step × 5 cm Weg vier Strahlen auf Augenhöhe (nah: ein Bauteil näher als 0,2 m), einer zum Boden (boden: Augenhöhe weicht mehr
    // als 0,3 m ab) und einer entlang des letzten Wegstücks (durch: der Weg schneidet ein Bauteil). Je Treffer [art, x, y (Plan), Höhe,
    // Abstand, 'material @Trefferpunkt x,y,Höhe']. Danach stehen Türen und Kamera wieder wie vorher; ein Geschossschnitt ist dann aus.
    _probe(name, step = 10) {
      if (!TOURS[name]) throw new Error(`Rundgang ${name} fehlt (${Object.keys(TOURS).join(', ')})`);
      const vorher = { p: camP.position.clone(), t: controls.target.clone(), auf: doors.map(d => d.open) };
      if (st.level !== 'alle') setLevel('alle');
      // ohne laufende Bildschleife sind die Weltmatrizen sonst nicht aktuell
      scene.updateMatrixWorld(true);
      const out = [], rc = new THREE.Raycaster(), objs = rayObjs(false), names = matNames(), ds = step * 0.05;
      const P = v => [+v.x.toFixed(2), +(-v.z).toFixed(2), +v.y.toFixed(2)];
      const tag = h => `${names.get(h.object.material) || h.object.material.type} @${P(h.point).join(',')}`;
      const hit = (p, d, far) => { rc.set(p, d); rc.far = far; return rc.intersectObjects(objs, false)[0]; };
      const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([x, z]) => new THREE.Vector3(x, 0, z)), down = new THREE.Vector3(0, -1, 0);
      startTour(name);
      const T = tour, prev = camP.position.clone();
      let next = 0, done = -1;
      const probe = () => {
        const p = camP.position, [x, y, z] = P(p);
        for (const d of dirs) { const h = hit(p, d, 0.2); if (h) { out.push(['nah', x, y, z, +h.distance.toFixed(2), tag(h)]); break; } }
        const f = hit(p, down, 3);
        if (!f || Math.abs(f.distance - EYE) > 0.3) out.push(['boden', x, y, z, f ? +f.distance.toFixed(2) : null, f ? tag(f) : '-']);
        const w = p.clone().sub(prev), l = w.length();
        if (l > 1e-3) { const h = hit(prev, w.normalize(), l); if (h) out.push(['durch', x, y, z, +h.distance.toFixed(2), tag(h)]); }
        prev.copy(p); done = T.s;
      };
      probe(); next = ds;
      for (let k = 0; tour === T && k < 30 * 1200; k++) {
        const auf = doors.map(d => d.open);
        stepTour(1 / 30); updateDoors(1 / 30);
        // nur die bewegten Türen neu ausrichten; Tore mit eigener Bewegung (d.set) hängen nicht an einer Gruppe
        let alle = false;
        doors.forEach((d, i) => { if (d.open !== auf[i]) { if (d.grp) d.grp.updateMatrixWorld(true); else alle = true; } });
        if (alle) scene.updateMatrixWorld(true);
        if (T.s >= next) { probe(); next = (Math.floor(T.s / ds) + 1) * ds; }
      }
      if (T.s > done + 0.05) probe();
      stopTour(false);
      doors.forEach((d, i) => { d.open = vorher.auf[i]; setDoor(d); });
      scene.updateMatrixWorld(true);
      camP.position.copy(vorher.p); controls.target.copy(vorher.t); camP.lookAt(controls.target); invalidate();
      return out;
    },
    // Prüfung einer Ansicht, Kamera und Ziel wie gerade eingestellt (beide Seiten aller Flächen zählen, Laub auch; im Geschossblick nur unter
    // dem Schnitt): nah = ein Bauteil näher als 12 cm in einer der sechs Achsrichtungen oder die Kamera steckt in einem geschlossenen Körper
    // (in mindestens vier Richtungen trifft der Strahl zuerst eine Rückseite – von innen sieht man die nicht, das Bild wirkt dann unauffällig);
    // frei = Abstand bis zum ersten Bauteil auf der Sichtlinie zum Ziel, höchstens 4 m.
    _sicht() {
      scene.updateMatrixWorld(true);
      const objs = rayObjs(true), names = matNames(), rc = new THREE.Raycaster(), p = camP.position.clone(), seiten = new Map(), m4 = new THREE.Matrix4();
      const nm = h => names.get(h.object.material) || h.object.material.type;
      const vis = h => st.level === 'alle' || h.point.y <= levelPlane.constant + 0.01;
      // Rückseite: Flächennormale in Welt zeigt in Strahlrichtung, und das Material zeigt sonst nur die Vorderseite
      const rueck = (h, d) => {
        if (!h.face || seiten.get(h.object.material) !== THREE.FrontSide) return false;
        m4.copy(h.object.matrixWorld);
        if (h.object.isInstancedMesh && h.instanceId !== undefined) { const mi = new THREE.Matrix4(); h.object.getMatrixAt(h.instanceId, mi); m4.multiply(mi); }
        return h.face.normal.clone().transformDirection(m4).dot(d) > 0;
      };
      for (const o of objs) if (!seiten.has(o.material)) { seiten.set(o.material, o.material.side); o.material.side = THREE.DoubleSide; }
      try {
        let nah = null, innen = 0, wer = null;
        for (const a of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
          const d = new THREE.Vector3(...a); rc.set(p, d); rc.far = 3;
          const h = rc.intersectObjects(objs, false).find(vis);
          if (!h) continue;
          if (h.distance < 0.12 && (!nah || h.distance < nah.d)) nah = { d: +h.distance.toFixed(2), was: nm(h) };
          if (rueck(h, d)) { innen++; if (!wer || h.distance < wer.d) wer = { d: +h.distance.toFixed(2), was: nm(h) }; }
        }
        if (!nah && innen >= 4) nah = { ...wer, innen: true };
        const dir = controls.target.clone().sub(p), l = Math.min(4, dir.length());
        rc.set(p, dir.normalize()); rc.far = l;
        const h = rc.intersectObjects(objs, false).find(vis);
        return { nah, frei: +(h ? h.distance : l).toFixed(2), was: h ? nm(h) : null, rueck: !!(h && rueck(h, dir)) };
      } finally { for (const [m, s] of seiten) m.side = s; }
    },
    // Prüfsumme der Szene ohne Bild, für den Vergleich vorher/nachher (hat sich durch einen Umbau etwas verschoben?): je Material über Lage,
    // Geometrie und Instanzen aller Netze, dazu die Texturpixel; gesamt fasst alles zusammen. Gleich nach dem Laden aufrufen (Türen zu).
    _fingerprint() {
      scene.updateMatrixWorld(true);
      const names = new Map([...Object.entries(carMats), ...Object.entries(M)].filter(([, v]) => v && v.isMaterial).map(([k, v]) => [v, k]));
      const name = m => (m && (names.get(m) || m.type)) || '-', mats = new Set(), je = {};
      const mix = (h, v) => Math.imul(h ^ v, 16777619) >>> 0, zahlen = (h, a) => { for (let i = 0; i < a.length; i++) h = mix(h, Math.round(a[i] * 1e4)); return h; };
      scene.traverse(o => {
        if (!o.geometry || o === sky) return;
        const ms = [].concat(o.material), k = ms.map(name).join('+');
        ms.forEach(m => m && mats.add(m));
        let h = zahlen(je[k] || 2166136261, o.matrixWorld.elements);
        for (const a of Object.values(o.geometry.attributes)) h = zahlen(h, a.array);
        if (o.geometry.index) h = zahlen(h, o.geometry.index.array);
        if (o.isInstancedMesh) h = zahlen(h, o.instanceMatrix.array);
        je[k] = h;
      });
      for (const m of mats) for (const slot of ['map', 'normalMap', 'roughnessMap', 'bumpMap', 'alphaMap']) {
        const c = m[slot] && m[slot].image;
        if (!c || !c.getContext || !c.width) continue;
        const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, k = `textur ${name(m)}.${slot}`;
        let h = je[k] || 2166136261; for (let i = 0; i < d.length; i += 3) h = mix(h, d[i]); je[k] = h;
      }
      let gesamt = 2166136261; for (const k of Object.keys(je).sort()) gesamt = mix(mix(gesamt, je[k]), k.length);
      return { gesamt: gesamt.toString(16), je: Object.fromEntries(Object.keys(je).sort().map(k => [k, je[k].toString(16)])) };
    },
    // Rundgang ohne Bildschirm weiterlaufen lassen (für die Prüfung): sec Sekunden in Schritten von 1/30 s
    _step(sec) { for (let k = 0; k < sec * 30 && tour; k++) { stepTour(1 / 30); updateDoors(1 / 30); } renderFrame(); return tour ? tour.label : 'Ende'; },
    _view(p, t) { stopTour(false); setOrtho(false); tween = { t0: performance.now(), dur: 10, fp: camP.position.clone(), ft: controls.target.clone(), tp: new THREE.Vector3(...p), tt: new THREE.Vector3(...t) }; },
    // Bildschleife n Schritte von Hand weiterlaufen lassen (Headless-Browser ohne Bildwechsel, tools/browser.js)
    // nur rechnen, nicht zeichnen (das Bild entsteht danach mit snapshot) – im Software-Rendering sonst sehr langsam
    _frame(n = 1) { skipDraw = true; try { for (let i = 0; i < n; i++) { cancelAnimationFrame(raf); loop(Math.max(performance.now(), last) + 1000 / 30); } } finally { skipDraw = false; } return camP.position.toArray(); },
    // Bild wie snapshot(), aber mit dem Schattenbild des letzten Prüfbilds, solange sich nichts Schattenwerfendes bewegt hat (tools/browser.js)
    _shot: testShot,
    // Nahebene beim nächsten Schritt der Schleife neu setzen: die Schleife ändert sie erst ab 5 mm Unterschied, sonst hinge ein Prüfbild über
    // die Tiefengenauigkeit (Umgebungsverdeckung) von der Ansicht davor ab. Danach _frame(1).
    _nahNeu() { camP.near = -1; invalidate(); },
    // für Versuche in Prüfskripten (z. B. ein Teil verschieben und sehen, ob der Bildvergleich es findet): Szene, Türen, Materialnamen
    _szene: () => ({ scene, doors, M, THREE }),
  };
})();
