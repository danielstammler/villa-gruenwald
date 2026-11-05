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
  // Zufall je Bereich: zufall(name) gibt eine eigene Folge (Park-Miller wie früher die eine gemeinsame Folge rnd für alles). So ändert ein
  // Aufruf mehr oder weniger nur seinen Bereich, nicht Bäume, Hecken und Texturen anderswo – Bildvergleiche vorher/nachher bleiben sauber.
  // Ein Bereich holt sich seine Folge als lokales rnd: const rnd = zufall('beet ostseite'). Was mehrfach gebaut wird, braucht je Stück einen
  // festen Namen (Hecken nach dem ersten Punkt, Bäume nach ihrer Lage, Beete mit Namen). Gewürfelt wird nur beim Aufbau, nie zur Laufzeit.
  // Startwerte: wo die gemeinsame Folge beim Bau des Bereichs stand (aufgezeichnet 5.11.2026), so liegt jedes Blatt und Texturpixel wie
  // vorher. Namen ohne Eintrag starten mit einem Wert aus dem Namen (FNV-Hash); wer einen Bereich umbenennt, würfelt ihn also neu.
  const ZUFALL = {
    // Texturen (01-material.js, Hackschnitzel am Spielplatz, Wolken)
    'textur eiche': 11, 'textur putz': 7, 'textur schindeln': 1844176919, 'textur rasen': 210261137, 'textur asphalt': 1544144833,
    'textur laub': 499646036, 'textur hecke': 773421836, 'textur buchs': 1744996906, 'textur nadeln': 251854730, 'textur ziegel': 2070213871,
    'textur hortensie': 750278318, 'textur lavendel': 2114149590, 'textur rinde': 650010740, 'textur nachbarputz': 22372460,
    'textur dachziegel': 1020375153, 'textur kies': 349304424, 'textur wellen': 766840877, 'textur fliesen': 23, 'textur gym': 1193164060,
    'textur halle': 1073546536, 'textur stein': 2021149765, 'textur terrasse': 1760016611, 'textur epoxid': 1270327993, 'textur bücher': 1151445676,
    'textur wolken': 1981880190, 'textur hackschnitzel': 2076743740,
    // Hecken (30-laub.js) je Lauf nach seinem ersten Punkt, Maße und Laub: West, Ost, Tröge, Nord, Straße, Rampe
    'hecke -3.15,0.347': 1387804526, 'hecke -3.15,0.347 laub': 907641806, 'hecke 25.059,-44': 432552365, 'hecke 25.059,-44 laub': 1668117009,
    'hecke 25.058,-49.95': 707050149, 'hecke 25.058,-49.95 laub': 60701654, 'hecke 25.061,5.893': 683318653, 'hecke 25.061,5.893 laub': 649678669,
    'hecke -4.36,-49.318': 806166379, 'hecke -4.36,-49.318 laub': 303234424, 'hecke 18.98,-49.75': 1812865010, 'hecke 18.98,-49.75 laub': 251982052,
    // Bäume auf dem Grundstück nach ihrer Lage (SITE.trees, 60-gelaende.js) und die der Nachbarn (50-garten.js)
    'baum 26.92,7.03': 334129586, 'baum 1.4,-40.02': 1040921948, 'baum -1.02,-49.32': 221320182, 'baum 3.52,5.02': 47366169,
    'baum 6.71,-47.1': 1589301152, 'baum 12.53,-43.39': 1186639509, 'baum 26.1,-47.94': 1225299827, 'baum 12.93,-49.63': 1009443156,
    'baum 2.38,9.95': 811262096, 'nachbarbäume': 523963437,
    // Beete (60-gelaende.js): Lage der Pflanzen und je Art das Laub; Buchskugeln je Gruppe
    'beet terrasse west': 733290027, 'beet terrasse west gruen': 248955399, 'beet terrasse west hortensie': 1344418327, 'beet terrasse west lavendel': 1033480716,
    'beet terrasse ost': 1119045194, 'beet terrasse ost gruen': 1836919893, 'beet terrasse ost hortensie': 574316023, 'beet terrasse ost lavendel': 1137919858,
    'beet westseite': 959920916, 'beet westseite gruen': 262785037, 'beet westseite hortensie': 1187742386, 'beet westseite lavendel': 1454766709,
    'beet ostseite': 1681467938, 'beet ostseite hortensie': 231872598, 'beet ostseite lavendel': 1168981832,
    'beet eingang west': 1359613064, 'beet eingang west gruen': 500824819, 'beet eingang west hortensie': 1871656212,
    'beet eingang ost': 2065656842, 'beet eingang ost gruen': 721963258, 'beet eingang ost hortensie': 1203539600,
    'buchs fassade': 535372181, 'buchs allee': 1511474051, 'buchs kübel': 1019113812,
  };
  const zufall = name => {
    let s = ZUFALL[name];
    if (!s) { s = 2166136261; for (const ch of name) s = Math.imul(s ^ ch.charCodeAt(0), 16777619); s = (s >>> 0) % 2147483646 + 1; }
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  };

