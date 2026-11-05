// Teil 1 des 3D-Modells: tools/bauen.js setzt alle Dateien in src/view3d/ nach Namen sortiert zu einem Block zusammen (ein gemeinsamer
// Gültigkeitsbereich). Hier Zustand und Zufall; 01-material.js alle Materialien M, 02-formen.js die Geometrie-Hilfen (addGeo, boxPlan, extrude …).
// 3D-Modell (three.js): Haus aus HOUSE, Grundstück und Umgebung aus SITE, Sonnenstand mit Schatten.
// Weltkoordinaten: X = Plan-Ost, Y = Höhe, Z = -Plan-Nord. Das Haus liegt in X 0..16, Z 0..11,65.
const View3D = (() => {
  const Zh = HOUSE.Z;
  let renderer, scene, camP, camO, cam, controls, sun, moon, hemi, sky, skyScene, pmrem, envRT;
  let canvas, stage, raf = 0, last = 0, tween = null, envDue = 0, ready = false, active = false;
  const st = { y: 2026, m: 8, d: 5, h: 16.75, play: false, ortho: false, cut: false, cutX: 8, rotate: false, level: 'alle' };
  let carMats = {};
  const L = {}, M = {}, houseMats = new Set(), levelMats = new Set(), batches = new Map(), glowMats = [], wallRects = [], doors = [];
  const cutPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 8);
  const ui = {};
  const ORTHO_H = 15.5, EXPO = 1.0;
  // Geschossblick: alles über Fußboden + 1,40 m wird ausgeblendet, wie bei einem Grundriss in 3D
  // Im Kellerblick etwas höher, damit auch die V-Klasse (1,91 m) nicht angeschnitten wird
  const LEVEL_CUT = { UG: HOUSE.Z.ffbUG + 1.96, EG: HOUSE.Z.ffbEG + 1.4, OG: HOUSE.Z.ffbOG + 1.4, DG: HOUSE.Z.ffbDG + 1.4 };
  const levelPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  // Nur neu zeichnen, wenn sich etwas ändert (Kamera, Sonne, Ebenen, Größe): schont Akku und erlaubt aufwendigeres Licht
  let post = null, dirty = true;
  const invalidate = () => { dirty = true; };

  // ---------- Hilfsfunktionen ----------
  const P = (x, yPlan, z = 0) => new THREE.Vector3(x, z, -yPlan);
  const smooth = (v, a, b) => THREE.MathUtils.smoothstep(v, a, b);
  function canvasTex(w, h, draw, repeat = [1, 1]) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat);
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  }
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

