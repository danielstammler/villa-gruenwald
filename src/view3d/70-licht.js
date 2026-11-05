  // Teil des 3D-Modells (src/view3d/, siehe 00-kern.js): Licht, Himmel und Sonnenstand
  // ---------- Licht, Himmel, Sonne ----------
  function setupLights(big) {
    hemi = new THREE.HemisphereLight(0xdde8f4, 0x6d6551, 0.4); scene.add(hemi);
    sun = new THREE.DirectionalLight(0xfff0d8, 3); sun.castShadow = true;
    sun.shadow.mapSize.set(big ? 4096 : 2048, big ? 4096 : 2048);
    Object.assign(sun.shadow.camera, { left: -58, right: 58, top: 58, bottom: -58, near: 1, far: 420 }); sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
    sun.target.position.set(10, 0, 20); scene.add(sun, sun.target);
    moon = new THREE.DirectionalLight(0x9db2ff, 0); moon.position.set(-60, 80, -30); scene.add(moon);
    sky = new Sky(); sky.scale.setScalar(4000);
    const u = sky.material.uniforms;
    u.turbidity.value = 5.5; u.rayleigh.value = 1.3; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.86;
    scene.add(sky);
    skyScene = new THREE.Scene(); const sky2 = new Sky(); sky2.material = sky.material; sky2.scale.setScalar(4000); skyScene.add(sky2);
    pmrem = new THREE.PMREMGenerator(renderer);
    // Wolkenschicht: kachelbares Rauschen als Alpha, hoch über dem Grundstück
    const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'), img = g.createImageData(N, N), rnd = zufall('textur wolken');
    const oct = [[4, 0.5], [8, 0.25], [16, 0.13], [32, 0.07], [64, 0.04]].map(([f, a]) => ({ f, a, L: Float32Array.from({ length: f * f }, rnd) }));
    const sm = t => t * t * (3 - 2 * t);
    const noise = (o, x, y) => {
      const fx = x * o.f / N, fy = y * o.f / N, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = sm(fx - x0), ty = sm(fy - y0);
      const at = (i, j) => o.L[(j % o.f) * o.f + (i % o.f)];
      const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx, b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
      return a + (b - a) * ty;
    };
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let v = 0; for (const o of oct) v += o.a * noise(o, x, y);
      const al = Math.max(0, Math.min(1, (v - 0.53) * 3.2)), o4 = (y * N + x) * 4, sh = 255 - 60 * Math.max(0, v - 0.66);
      img.data[o4] = sh; img.data[o4 + 1] = sh; img.data[o4 + 2] = sh + 5; img.data[o4 + 3] = Math.pow(al, 1.3) * 230;
    }
    g.putImageData(img, 0, 0);
    const ct = new THREE.CanvasTexture(c); ct.wrapS = ct.wrapT = THREE.RepeatWrapping; ct.repeat.set(3, 3); ct.colorSpace = THREE.SRGBColorSpace;
    M.clouds = new THREE.MeshBasicMaterial({ map: ct, transparent: true, depthWrite: false, fog: false });
    const clouds = new THREE.Mesh(new THREE.PlaneGeometry(12000, 12000), M.clouds);
    clouds.rotation.x = Math.PI / 2; clouds.position.y = 1400; scene.add(clouds);
  }
  function updateSun() {
    const p = SUN.position(st.y, st.m, st.d, st.h, SITE.geo.lat, SITE.geo.lon);
    const v = SUN.planDir(p.az, p.el, SITE.north.true);
    const dir = new THREE.Vector3(v.x, v.z, -v.y).normalize();
    sky.material.uniforms.sunPosition.value.copy(dir);
    const day = smooth(p.el, -5, 8);
    sun.position.copy(sun.target.position).addScaledVector(dir, 180);
    sun.intensity = 3.8 * smooth(p.el, -0.5, 10);
    sun.color.setHSL(0.085, 0.85, 0.6 + 0.28 * smooth(p.el, 4, 45));
    moon.intensity = 0.35 * (1 - day);
    const night = 1 - smooth(p.el, -3, 6);
    const dusk = 1 - smooth(p.el, 8, 30);
    M.inWall.emissiveIntensity = 0.05 + 0.22 * dusk + 0.42 * night; M.floorOak.emissiveIntensity = 0.03 + 0.12 * dusk + 0.25 * night;
    M.curtain.emissiveIntensity = 0.12 + 0.35 * dusk + 0.6 * night;
    st.fogAir = new THREE.Color(0.1 + 0.68 * day, 0.12 + 0.7 * day, 0.17 + 0.71 * day);
    if (scene.fog && !st.under) scene.fog.color.copy(st.fogAir);
    M.lamp.emissiveIntensity = M.siteLamp.emissiveIntensity = 2.4 * night;
    // Wolken: tagsüber weiß, in der Dämmerung warm angestrahlt, nachts dunkel
    const warm = dusk * day;
    M.clouds.color.setRGB(0.16 + 0.82 * day, 0.17 + 0.78 * day - 0.2 * warm, 0.2 + 0.78 * day - 0.38 * warm);
    M.clouds.opacity = 0.35 + 0.6 * day;
    for (const m of glowMats) m.emissiveIntensity = (0.04 + 0.12 * dusk + 0.3 * night) * (m.userData.glow || 1) * (m.userData.glow ? night : 1);
    st.day = day; applyLight();
    envDue = performance.now() + 120; invalidate();
    const rs = SUN.riseSet(st.y, st.m, st.d, SITE.geo.lat, SITE.geo.lon);
    if (ui.info) ui.info.innerHTML =
      `<div><dt>Azimut</dt><dd>${Math.round(p.az)}°</dd></div><div><dt>Höhe</dt><dd>${p.el.toFixed(1).replace('.', ',')}°</dd></div>` +
      `<div><dt>Aufgang</dt><dd>${SUN.hhmm(rs.rise)}</dd></div><div><dt>Untergang</dt><dd>${SUN.hhmm(rs.set)}</dd></div>`;
    if (ui.hudSun) ui.hudSun.textContent = `${String(st.d).padStart(2, '0')}.${String(st.m + 1).padStart(2, '0')}.${st.y} · ${SUN.hhmm(st.h)} Uhr · Sonne ${p.el > 0 ? `${Math.round(p.az)}° / ${Math.round(p.el)}° hoch` : 'unter dem Horizont'}`;
  }
  // Im Haus und in der Tiefgarage sieht man den Himmel kaum: weniger und wärmeres Streulicht, die Augen öffnen sich etwas
  function applyLight() {
    const d = st.day ?? 1, i = st.inside;
    hemi.intensity = (0.1 + 0.19 * d) * (i ? 0.7 : 1);
    hemi.color.set(i ? 0xf3e7d9 : 0xdde8f4);
    scene.environmentIntensity = i ? 0.16 : 0.5;
    renderer.toneMappingExposure = (EXPO + 0.25 * (1 - d)) * (i ? 1.2 : 1);
    invalidate();
  }
  function updateEnv() {
    const old = envRT; envRT = pmrem.fromScene(skyScene, 0, 0.1, 6000);
    scene.environment = envRT.texture; if (old) old.dispose();
  }

