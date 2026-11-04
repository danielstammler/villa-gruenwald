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
  function renderFrame() {
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
  // Türen und Tore öffnen sich, wenn die Kamera nahe kommt
  function updateDoors(dt) {
    const q = camP.position;
    let moved = false;
    for (const d of doors) {
      const want = cam === camP && Math.hypot(q.x - d.c.x, q.z - d.c.z) < 2.4 && Math.abs(q.y - d.c.y) < 2.2 ? 1 : 0;
      if (d.open !== want) { d.open = want > d.open ? Math.min(1, d.open + dt * 1.4) : Math.max(0, d.open - dt * 1.4); d.grp.rotation.y = d.sign * d.max * d.open * d.open * (3 - 2 * d.open); moved = true; }
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
  return {
    init, show, goTo, setLayer, setCut, setLevel, setDate, setTime, snapshot,
    get ready() { return ready; }, state: st,
    play(on) { st.play = on; }, rotate(on) { st.rotate = on; }, zoom: zoomStep,
    // Rundgang starten (name) oder beenden (null); cb.onLabel bekommt die Stationen, cb.onEnd meldet das Ende
    tour(name, cb) { if (name) { startTour(name, cb); polar(); } else stopTour(false); },
    // Für die Prüfung der Wege: Abtastpunkte eines Rundgangs in Weltkoordinaten
    _tourPoints: name => tourPath(TOURS[name]).S.map(q => q.p.toArray()),
    // Prüfung der Wege: alle 0,5 m in vier Richtungen auf Augenhöhe und nach unten zum Boden; meldet zu nahe Teile und fehlenden Boden
    _probe(name, step = 10) {
      // ohne laufende Bildschleife (verdecktes Fenster) sind die Weltmatrizen sonst nicht aktuell
      scene.updateMatrixWorld(true);
      const pts = tourPath(TOURS[name]).S, out = [], rc = new THREE.Raycaster(), objs = [];
      const names = new Map([...Object.entries(carMats), ...Object.entries(M)].filter(([, v]) => v && v.isMaterial).map(([k, v]) => [v, k]));
      scene.traverse(o => { const m = o.material; if (o.isMesh && o.visible && !Array.isArray(m) && !(m.transparent && m.opacity < 0.6) && !(m.alphaTest > 0) && o !== sky) objs.push(o); });
      const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([x, z]) => new THREE.Vector3(x, 0, z)), down = new THREE.Vector3(0, -1, 0);
      for (let j = 0; j < pts.length; j += step) {
        const p = pts[j].p;
        const tag = o => { const bs = o.geometry.boundingSphere; return `${names.get(o.material) || o.material.type}${bs ? ` @${bs.center.x.toFixed(1)},${bs.center.y.toFixed(1)},${bs.center.z.toFixed(1)} r${bs.radius.toFixed(1)}` : ''}`; };
        for (const d of dirs) { rc.set(p, d); rc.far = 0.2; const h = rc.intersectObjects(objs, false)[0]; if (h) { out.push(['nah', +p.x.toFixed(2), +(-p.z).toFixed(2), +p.y.toFixed(2), +h.distance.toFixed(2), tag(h.object)]); break; } }
        rc.set(p, down); rc.far = 3; const f = rc.intersectObjects(objs, false)[0];
        if (!f || Math.abs(f.distance - EYE) > 0.3) out.push(['boden', +p.x.toFixed(2), +(-p.z).toFixed(2), +p.y.toFixed(2), f ? +f.distance.toFixed(2) : null, f ? tag(f.object) : '-']);
      }
      return out;
    },
    // Rundgang ohne Bildschirm weiterlaufen lassen (für die Prüfung): sec Sekunden in Schritten von 1/30 s
    _step(sec) { for (let k = 0; k < sec * 30 && tour; k++) { stepTour(1 / 30); updateDoors(1 / 30); } renderFrame(); return tour ? tour.label : 'Ende'; },
    _view(p, t) { stopTour(false); setOrtho(false); tween = { t0: performance.now(), dur: 10, fp: camP.position.clone(), ft: controls.target.clone(), tp: new THREE.Vector3(...p), tt: new THREE.Vector3(...t) }; },
    // Bildschleife n Schritte von Hand weiterlaufen lassen (Headless-Browser ohne Bildwechsel, tools/houseshot.sh)
    _frame(n = 1) { for (let i = 0; i < n; i++) { cancelAnimationFrame(raf); loop(Math.max(performance.now(), last) + 1000 / 30); } return camP.position.toArray(); },
  };
})();
