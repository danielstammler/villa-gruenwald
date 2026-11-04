// Teil 1 des 3D-Modells: build.py setzt alle Dateien in src/view3d/ nach Namen sortiert zu einem Block zusammen (ein gemeinsamer
// Gültigkeitsbereich). Hier Zustand, Hilfsfunktionen (addGeo, boxPlan, extrude, wallWithHoles …) und alle Materialien M für die anderen Teile.
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

  function makeMaterials() {
    const std = (color, r = 0.9, m = 0, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: r, metalness: m, ...extra });
    // Eichendielen 20 cm breit, 1,2 bis 2,4 m lang, versetzt gestoßen; Kachel 2,4 × 2,4 m, Holzbild leicht wechselnd
    let so = 11; const ro = () => (so = (so * 16807) % 2147483647) / 2147483647;
    const tOak = canvasTex(512, 512, (g, w, h) => {
      const n = 12, ph = h / n;
      for (let i = 0; i < n; i++) {
        // Reihe genau eine Kachelbreite lang, jede Diele zusätzlich um eine Breite versetzt gezeichnet: nahtlos wiederholbar
        const xs = -ro() * w * 0.5; let x = xs;
        while (x < xs + w - 1) {
          const len = Math.min(w * (0.5 + ro() * 0.5), xs + w - x), k = 0.9 + ro() * 0.18, hue = ro() * 8 - 4;
          const fill = `hsl(${31 + hue}, ${34 + ro() * 8}%, ${Math.round(55 * k)}%)`;
          const grain = [...Array(9)].map(() => [i * ph + 2 + ro() * (ph - 4), `rgba(${90 + ro() * 30}, ${60 + ro() * 20}, 35, ${0.1 + ro() * 0.14})`, 0.6 + ro() * 1.2, (ro() - 0.5) * 5, (ro() - 0.5) * 5, (ro() - 0.5) * 3]);
          for (const ox of [x, x + w]) {
            g.fillStyle = fill; g.fillRect(ox, i * ph, len, ph);
            for (const [yy, col, lw, d1, d2, d3] of grain) {
              g.strokeStyle = col; g.lineWidth = lw;
              g.beginPath(); g.moveTo(ox, yy); g.bezierCurveTo(ox + len * 0.3, yy + d1, ox + len * 0.7, yy + d2, ox + len, yy + d3); g.stroke();
            }
            g.fillStyle = 'rgba(60, 40, 25, 0.55)'; g.fillRect(ox, i * ph, 1.2, ph);
          }
          x += len;
        }
        g.fillStyle = 'rgba(60, 40, 25, 0.5)'; g.fillRect(0, i * ph, w, 1);
      }
    });
    // Weißer Glattputz wie im Referenzbild; feines Korn, damit die Fläche nicht künstlich glatt wirkt (Kachel 2 × 2 m)
    const rust = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#f1efea'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 7000; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.028)' : 'rgba(255,255,255,0.05)'; g.fillRect(rnd() * w, rnd() * h, 1.2, 1.2); }
    }, [0.5, 0.5]);
    // Dachdeckung: anthrazitfarbene Rechteckschindeln
    const shingles = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#141618'; g.fillRect(0, 0, w, h);
      const rows = 5, rh = h / rows, cw = w / 2.5;
      for (let r = 0; r < rows; r++) {
        const y = h - (r + 1) * rh, off = (r % 2) * 0.5;
        for (let c = -1; c < 4; c++) {
          const x = (c + off) * cw, v = 36 + Math.floor(rnd() * 12);
          g.fillStyle = `rgb(${v},${v + 1},${v + 3})`; g.fillRect(x + 1.5, y + 1.5, cw - 3, rh - 3);
          g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(x + 1.5, y + 1.5, cw - 3, 3);
        }
      }
    });
    // Kachelbar zeichnen: Flecken am Rand erscheinen auch auf der Gegenseite, damit keine Nähte entstehen
    const wrapped = (w, h, x, y, r, fn) => { for (const dx of [-w, 0, w]) for (const dy of [-h, 0, h]) if (x + dx + r > 0 && x + dx - r < w && y + dy + r > 0 && y + dy - r < h) fn(x + dx, y + dy); };
    // Rasen: gemischtes, leicht gelbliches Grün mit feinen Halmen; Kachel 8 m, damit sich das Muster kaum wiederholt
    const grass = canvasTex(1024, 1024, (g, w, h) => {
      g.fillStyle = '#5a7a3b'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 160; i++) {
        const x = rnd() * w, y = rnd() * h, r = 50 + rnd() * 170, col = rnd() < 0.5 ? '128,140,72' : '48,76,34';
        wrapped(w, h, x, y, r, (px, py) => {
          const gr = g.createRadialGradient(px, py, 0, px, py, r);
          gr.addColorStop(0, `rgba(${col},0.16)`); gr.addColorStop(1, `rgba(${col},0)`);
          g.fillStyle = gr; g.fillRect(px - r, py - r, 2 * r, 2 * r);
        });
      }
      for (const [col, n] of [['rgba(36,58,24,0.34)', 70000], ['rgba(96,126,58,0.28)', 70000], ['rgba(150,162,92,0.26)', 24000], ['rgba(122,104,62,0.22)', 9000]]) {
        g.fillStyle = col;
        for (let i = 0; i < n; i++) g.fillRect(rnd() * w, rnd() * h, 1, 2 + rnd() * 3);
      }
    }, [0.125, 0.125]);
    const asphalt = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#5c5f63'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { const v = 70 + Math.floor(rnd() * 45); g.fillStyle = `rgba(${v},${v},${v + 3},0.5)`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
    }, [0.25, 0.25]);
    // Laub als Textur mit Alpha: einzelne spitzovale Blätter rund um die Mitte; der Hintergrund trägt die Blattfarbe (keine dunklen Ränder)
    const leafShape = (g, x, y, len, wid, ang, fill) => {
      g.save(); g.translate(x, y); g.rotate(ang); g.beginPath(); g.moveTo(0, -len / 2);
      g.quadraticCurveTo(wid, -len * 0.12, 0, len / 2); g.quadraticCurveTo(-wid, -len * 0.12, 0, -len / 2);
      g.fillStyle = fill; g.fill(); g.restore();
    };
    const shade = (c, k) => `rgb(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0})`;
    const leafTex = (n, len, pal, { spread = 0.9, wid = 0.42 } = {}) => canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = `rgba(${pal[0].join(',')},0.04)`; g.fillRect(0, 0, w, h);
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * spread * w / 2, l = len * w * (0.75 + rnd() * 0.5);
        leafShape(g, w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, l, l * wid, a + (rnd() - 0.5) * 1.4, shade(pal[i % pal.length], 0.78 + rnd() * 0.4));
      }
    });
    const tLeaf = leafTex(240, 0.09, [[70, 98, 42], [56, 84, 34], [86, 112, 50], [48, 72, 30], [96, 118, 56]], { spread: 0.94 });
    const tHedge = leafTex(330, 0.06, [[60, 86, 38], [48, 72, 32], [72, 96, 44], [42, 64, 30]], { spread: 0.96 });
    const tBox = leafTex(520, 0.04, [[50, 74, 34], [40, 62, 28], [60, 86, 40]], { spread: 0.96, wid: 0.55 });
    // Nadelzweige: dunkle, bläulich grüne Nadeln an feinen Zweigen (Fichte, Tanne, Eibe wie auf den Luftbildern)
    const tNeedle = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = 'rgba(36,56,40,0.04)'; g.fillRect(0, 0, w, h); g.lineCap = 'round';
      for (let i = 0; i < 46; i++) {
        const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * w * 0.36, x = w / 2 + Math.cos(a) * d, y = h / 2 + Math.sin(a) * d, ang = a + (rnd() - 0.5), len = 30 + rnd() * 40;
        const c = [[34, 56, 38], [28, 46, 34], [46, 70, 48], [38, 62, 52]][i % 4];
        g.strokeStyle = 'rgb(60,48,36)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); g.stroke();
        for (let k = 0; k < 26; k++) {
          const t = k / 26, px = x + Math.cos(ang) * len * t, py = y + Math.sin(ang) * len * t, sd = k % 2 ? 1 : -1, nl = 6 + rnd() * 5;
          g.strokeStyle = shade(c, 0.8 + rnd() * 0.4); g.lineWidth = 1.6; g.beginPath(); g.moveTo(px, py);
          g.lineTo(px + Math.cos(ang + sd * 1.1) * nl, py + Math.sin(ang + sd * 1.1) * nl); g.stroke();
        }
      }
    });
    // Ziegelmauer (Kachel 1,0 × 0,5 m)
    const tBrick = canvasTex(256, 128, (g, w, h) => {
      g.fillStyle = '#b9a89a'; g.fillRect(0, 0, w, h);
      const bh = h / 8, bw = w / 4;
      for (let r = 0; r < 8; r++) for (let c = -1; c <= 4; c++) {
        const v = 0.82 + rnd() * 0.3; g.fillStyle = shade([150, 78, 56], v);
        g.fillRect(c * bw + (r % 2) * bw / 2 + 1, r * bh + 1, bw - 2, bh - 2);
      }
    }, [1, 2]);
    // Hortensie: Blattwerk mit cremeweißen Blütenbällen aus vielen kleinen Einzelblüten
    const tHydr = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = 'rgba(70,96,44,0.04)'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { const a = rnd() * 6.283, d = Math.sqrt(rnd()) * 0.46 * w, l = 26 + rnd() * 14; leafShape(g, w / 2 + Math.cos(a) * d, h / 2 + Math.sin(a) * d, l, l * 0.5, a, shade([70, 96, 44], 0.75 + rnd() * 0.4)); }
      for (let b = 0; b < 4; b++) {
        const bx = w * (0.3 + rnd() * 0.4), by = h * (0.3 + rnd() * 0.4), br = w * (0.13 + rnd() * 0.06);
        for (let i = 0; i < 90; i++) {
          const a = rnd() * 6.283, d = Math.sqrt(rnd()) * br, fx = bx + Math.cos(a) * d, fy = by + Math.sin(a) * d, k = 0.8 + 0.2 * (by + br - fy) / (2 * br) + rnd() * 0.08;
          const c = [[246, 244, 234], [238, 238, 224], [250, 248, 242], [230, 234, 216]][i % 4];
          for (let p = 0; p < 4; p++) { const pa = p * Math.PI / 2 + a; g.beginPath(); g.ellipse(fx + Math.cos(pa) * 3, fy + Math.sin(pa) * 3, 3.2, 2.2, pa, 0, 6.283); g.fillStyle = shade(c, k); g.fill(); }
        }
      }
    });
    // Lavendel: graugrüne Stiele mit violetten Ähren
    const tLav = canvasTex(128, 256, (g, w, h) => {
      g.fillStyle = 'rgba(110,100,150,0.04)'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 30; i++) {
        const x0 = w * (0.3 + rnd() * 0.4), x1 = w * (0.05 + rnd() * 0.9), top = h * (0.12 + rnd() * 0.3);
        g.strokeStyle = 'rgb(112,128,96)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(x0, h); g.quadraticCurveTo(x0, (h + top) / 2, x1, top); g.stroke();
        for (let k = 0; k < 9; k++) {
          const t = k / 9, yy = top + t * (h - top) * 0.32, xx = x1 + (x0 - x1) * t * 0.2;
          g.beginPath(); g.ellipse(xx + (rnd() - 0.5) * 2, yy, 2.6, 4, 0, 0, 6.283); g.fillStyle = shade([[118, 96, 168], [132, 110, 184], [104, 86, 150]][k % 3], 0.85 + rnd() * 0.3); g.fill();
        }
      }
      for (let i = 0; i < 40; i++) { const x = w * (0.15 + rnd() * 0.7); g.strokeStyle = 'rgb(120,134,108)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(x, h); g.lineTo(x + (rnd() - 0.5) * 22, h * (0.7 + rnd() * 0.3)); g.stroke(); }
    });
    const tBark = canvasTex(128, 256, (g, w, h) => {
      g.fillStyle = '#6a5e50'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(40,34,28,0.35)' : 'rgba(150,140,124,0.25)'; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2.5, 10 + rnd() * 50); }
    }, [2, 3]);
    // Putz der Nachbarhäuser: Kachel 4 m breit und 12 m hoch, unten Sockel und leichte Verschmutzung
    const tPlaster = canvasTex(256, 512, (g, w, h) => {
      g.fillStyle = '#ecebe6'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 9000; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.05)'; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
      const m = h / 12, gr = g.createLinearGradient(0, h - 1.1 * m, 0, h - 0.35 * m);
      gr.addColorStop(0, 'rgba(110,100,84,0)'); gr.addColorStop(1, 'rgba(110,100,84,0.16)'); g.fillStyle = gr; g.fillRect(0, h - 1.1 * m, w, 0.75 * m);
      g.fillStyle = '#a8a49b'; g.fillRect(0, h - 0.35 * m, w, 0.35 * m);
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, h - 0.35 * m, w, 2);
    });
    tPlaster.wrapT = THREE.ClampToEdgeWrapping;
    // Dachziegel der Nachbarn, Kachel 1,20 × 1,20 m; die Farbe kommt aus dem Material
    const tTiles = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#7d7d7d'; g.fillRect(0, 0, w, h);
      const rows = 3, cols = 4, rh = h / rows, cw = w / cols;
      for (let r = 0; r < rows; r++) for (let c = -1; c <= cols; c++) {
        const x = (c + (r % 2) * 0.5) * cw, y = r * rh, v = 200 + rnd() * 40, gr = g.createLinearGradient(0, y, 0, y + rh), grey = k => `rgb(${v * k | 0},${v * k | 0},${v * k | 0})`;
        gr.addColorStop(0, grey(0.8)); gr.addColorStop(0.85, grey(1)); gr.addColorStop(1, grey(0.6));
        g.fillStyle = gr; g.fillRect(x + 1, y + 1, cw - 2, rh - 2);
      }
      for (let i = 0; i < 4000; i++) { g.fillStyle = rnd() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'; g.fillRect(rnd() * w, rnd() * h, 2, 2); }
    });
    const tGravel = canvasTex(128, 128, (g, w, h) => {
      g.fillStyle = '#8e8d88'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 3500; i++) { const v = 90 + rnd() * 90 | 0; g.fillStyle = `rgba(${v},${v},${v - 6},0.6)`; g.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
    }, [0.5, 0.5]);
    // Wasser: feine, kachelbare Wellen als Normalenkarte
    const tWaves = (() => {
      const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
      const g = c.getContext('2d'), img = g.createImageData(N, N), hgt = new Float32Array(N * N);
      const waves = Array.from({ length: 7 }, () => ({ k: 2 + Math.floor(rnd() * 6), a: rnd() * 6.283, p: rnd() * 6.283, s: 0.4 + rnd() * 0.6 }));
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        let v = 0;
        for (const wv of waves) v += wv.s * Math.sin(6.283 * (Math.round(Math.cos(wv.a) * wv.k) * x + Math.round(Math.sin(wv.a) * wv.k) * y) / N + wv.p);
        hgt[y * N + x] = v;
      }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const dx = hgt[y * N + (x + 1) % N] - hgt[y * N + (x + N - 1) % N], dy = hgt[((y + 1) % N) * N + x] - hgt[((y + N - 1) % N) * N + x];
        const nx = -dx * 0.6, ny = -dy * 0.6, l = Math.hypot(nx, ny, 1), o = (y * N + x) * 4;
        img.data[o] = (nx / l * 0.5 + 0.5) * 255; img.data[o + 1] = (ny / l * 0.5 + 0.5) * 255; img.data[o + 2] = (0.5 / l + 0.5) * 255; img.data[o + 3] = 255;
      }
      g.putImageData(img, 0, 0);
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(0.5, 0.5); t.colorSpace = THREE.NoColorSpace; return t;
    })();
    // Laubmaterial: Alpha-Kante mit Kantenglättung, Schatten mit derselben Blattform.
    // In kleineren Mip-Stufen wird Alpha angehoben, sonst löst sich Laub in der Ferne auf und der Himmel scheint durch.
    const keepCoverage = sh => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        #ifdef USE_MAP
        { vec2 tc = vMapUv * 256.0; vec2 ddx = dFdx(tc), ddy = dFdy(tc); diffuseColor.a *= 1.0 + max(0.0, 0.5 * log2(max(dot(ddx, ddx), dot(ddy, ddy)))) * 0.3; }
        #endif`);
    };
    const leafMat = (map, alphaTest = 0.42) => {
      const m = new THREE.MeshStandardMaterial({ map, vertexColors: true, alphaTest, alphaToCoverage: true, roughness: 1, metalness: 0, envMapIntensity: 0.7 });
      m.onBeforeCompile = keepCoverage;
      m.userData.depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 });
      m.userData.depth.onBeforeCompile = keepCoverage;
      return m;
    };
    const pave = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#d2ccbf'; g.fillRect(0, 0, w, h);
      const sx = w / 2, sy = h / 4;
      g.strokeStyle = '#b2ab9e'; g.lineWidth = 2;
      for (let r = 0; r < 4; r++) for (let c = -1; c < 3; c++) g.strokeRect(c * sx + (r % 2) * sx / 2, r * sy, sx, sy);
    }, [1 / 1.2, 1 / 1.2]);
    // Durchsichtiges Glas mit leichter Spiegelung; dahinter sieht man die Räume
    const glass = () => new THREE.MeshStandardMaterial({ color: 0x31424c, roughness: 0.04, metalness: 0.2, transparent: true, opacity: 0.38, depthWrite: false, envMapIntensity: 2.4, side: THREE.DoubleSide });
    // Fliesen in Bädern und Küche: 60 × 60 cm, hell, mit feiner Fuge (Kachel 2,40 m = 4 × 4 Fliesen)
    let sq = 23; const rq = () => (sq = (sq * 16807) % 2147483647) / 2147483647;
    const tTile = canvasTex(512, 512, (g, w) => {
      const n = 4, c = w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        g.fillStyle = `hsl(36, ${6 + rq() * 3}%, ${82 + rq() * 4}%)`; g.fillRect(i * c, j * c, c, c);
        for (let k = 0; k < 260; k++) { g.fillStyle = rq() < 0.5 ? 'rgba(90,80,70,0.07)' : 'rgba(255,255,255,0.12)'; g.fillRect(i * c + rq() * c, j * c + rq() * c, 1.5, 1.5); }
      }
      g.fillStyle = 'rgba(120,112,100,0.75)';
      for (let i = 0; i <= n; i++) { g.fillRect(i * c - 1, 0, 2, w); g.fillRect(0, i * c - 1, w, 2); }
    });
    // Halle: heller Kalkstein 80 × 80 cm mit kleinen dunklen Cabochons an den Ecken (Kachel 3,20 m)
    const tHall = canvasTex(512, 512, (g, w) => {
      const n = 4, c = w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        g.fillStyle = `hsl(${38 + rq() * 4}, ${20 + rq() * 6}%, ${85 + rq() * 4}%)`; g.fillRect(i * c, j * c, c, c);
        g.strokeStyle = 'rgba(150,135,110,0.12)'; g.lineWidth = 0.8;
        for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(i * c + rq() * c, j * c); g.bezierCurveTo(i * c + rq() * c, j * c + c * 0.4, i * c + rq() * c, j * c + c * 0.6, i * c + rq() * c, j * c + c); g.stroke(); }
      }
      g.fillStyle = 'rgba(140,128,110,0.6)';
      for (let i = 0; i <= n; i++) { g.fillRect(i * c - 0.75, 0, 1.5, w); g.fillRect(0, i * c - 0.75, w, 1.5); }
      g.fillStyle = '#3d4643';
      for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) { g.save(); g.translate(i * c, j * c); g.rotate(Math.PI / 4); g.fillRect(-9, -9, 18, 18); g.restore(); }
    });
    // Naturstein draußen (Terrasse, Poolterrasse, Balkone): Travertin 90 × 60 cm im Verband, Kachel 3,60 m
    const slab = (g, w) => {
      const cw = w / 4, ch = w / 6;
      for (let r = 0; r < 6; r++) for (let c = -1; c < 5; c++) {
        const x = c * cw + (r % 2) * cw / 2, y = r * ch;
        g.fillStyle = `hsl(${36 + rq() * 5}, ${22 + rq() * 8}%, ${78 + rq() * 6}%)`; g.fillRect(x, y, cw, ch);
        for (let k = 0; k < 40; k++) { g.fillStyle = 'rgba(120,100,70,0.16)'; g.fillRect(x + rq() * cw, y + rq() * ch, 1 + rq() * 3, 1); }
      }
      g.fillStyle = 'rgba(150,140,122,0.8)';
      for (let r = 0; r <= 6; r++) g.fillRect(0, r * ch - 1, w, 2);
      for (let r = 0; r < 6; r++) for (let c = -1; c < 6; c++) g.fillRect(c * cw + (r % 2) * cw / 2 - 1, r * ch, 2, ch);
    };
    const tSlab = canvasTex(512, 512, slab), tDeck = canvasTex(512, 512, slab, [1 / 3.6, 1 / 3.6]);
    // Tiefgarage: heller, seidenmatter Beschichtungsboden mit feinen Einstreuungen (Kachel 2 m)
    const tEpoxy = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#c3c3bf'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) { const v = 150 + rq() * 90 | 0; g.fillStyle = `rgba(${v},${v},${v - 4},0.35)`; g.fillRect(rq() * w, rq() * h, 1.2, 1.2); }
    }, [0.5, 0.5]);
    const paint = (color, m, r) => new THREE.MeshPhysicalMaterial({ color, metalness: m, roughness: r, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.3 });
    Object.assign(M, {
      putz: std(0xf1efea, 0.9), putzRust: std(0xffffff, 0.92, 0, { map: rust }), putzHell: std(0xf6f5f1, 0.85), putzDS: std(0xf1efea, 0.92, 0, { side: THREE.DoubleSide }),
      sockel: std(0xd9d6cf, 0.85), roof: std(0xffffff, 0.5, 0.3, { map: shingles, side: THREE.DoubleSide }),
      zink: std(0x26292d, 0.45, 0.35), zinkDS: std(0x26292d, 0.45, 0.35, { side: THREE.DoubleSide }), frame: std(0x141618, 0.4, 0.3), metal: std(0x111316, 0.38, 0.6),
      glass: glass(), lamp: std(0x1c1c1c, 0.4, 0.2, { emissive: 0xffd49c, emissiveIntensity: 0 }),
      slab: std(0xb9b2a4, 0.9), beton: std(0xb7b3ab, 0.92),
      inWall: std(0xebe7df, 0.95, 0, { emissive: 0xffd6a6, emissiveIntensity: 0 }), floorOak: std(0xffffff, 0.55, 0, { map: tOak, emissive: 0xffc98a, emissiveIntensity: 0 }),
      floorTile: std(0xffffff, 0.32, 0, { map: tTile }), floorHall: std(0xffffff, 0.26, 0, { map: tHall }), stairMat: std(0xe9e3d7, 0.4),
      tor: std(0x3b3e42, 0.5, 0.4), door: std(0x1e2226, 0.35, 0.25),
      rampe: std(0xa5a198, 0.92, 0, { side: THREE.DoubleSide }), phInnen: std(0x655d52, 0.9),
      stone: std(0xffffff, 0.75, 0, { map: tSlab }), deck: std(0xffffff, 0.75, 0, { map: tDeck }), kuebel: std(0x3a3d41, 0.6, 0.05), pave: std(0xffffff, 0.9, 0, { map: pave }), lawn: std(0xffffff, 1, 0, { map: grass }),
      ground: std(0xeef0e6, 1, 0, { map: grass }), street: std(0xffffff, 0.95, 0, { map: asphalt }), coping: std(0xdcd9d2, 0.7),
      tile: std(0x86c6d8, 0.35, 0, { side: THREE.BackSide }), poolStep: std(0x9fd0dc, 0.35),
      water: std(0x1d6f8c, 0.03, 0, { transparent: true, opacity: 0.86, normalMap: tWaves, normalScale: new THREE.Vector2(0.28, 0.28), envMapIntensity: 1.5, side: THREE.DoubleSide }),
      site: std(0xf1efea, 0.9), siteHell: std(0xf6f5f1, 0.85), siteGlass: glass(), siteFrame: std(0x141618, 0.4, 0.3), siteLamp: std(0xd9d4c8, 0.3, 0, { emissive: 0xffd49c, emissiveIntensity: 0 }), siteRoof: std(0xffffff, 0.5, 0.3, { map: shingles, side: THREE.DoubleSide }),
      siteZink: std(0x26292d, 0.45, 0.35),
      nb: std(0xd3cdc2, 0.95), nbWall: std(0xffffff, 0.95, 0, { side: THREE.DoubleSide, vertexColors: true, map: tPlaster }), nbRoof: std(0x8b7d72, 0.9, 0, { side: THREE.DoubleSide }), nb2: std(0xbfbaaf, 0.95),
      nbFlat: std(0xffffff, 0.95, 0, { map: tGravel, side: THREE.DoubleSide }), nbGlass: std(0x1f2a31, 0.08, 0.3, { envMapIntensity: 1.8 }),
      nbFrame: std(0xf1efe9, 0.6), nbSill: std(0xc9c5bc, 0.7), tiles: tTiles,
      bark: std(0xffffff, 0.95, 0, { map: tBark }), hedgeCore: std(0x24361d, 1), shrubCore: std(0x2a3f22, 1),
      leafTree: leafMat(tLeaf), leafHedge: leafMat(tHedge), leafBox: leafMat(tBox), leafHydr: leafMat(tHydr), leafLav: leafMat(tLav, 0.36), leafNeedle: leafMat(tNeedle, 0.4),
      brick: std(0xffffff, 0.9, 0, { map: tBrick }), brickCap: std(0xcfc8bc, 0.8),
      curtain: std(0xf3eee4, 0.95, 0, { emissive: 0xffe2b8, emissiveIntensity: 0.1, transparent: true, opacity: 0.9 }),
      tg: new THREE.MeshStandardMaterial({ color: 0xe0892c, transparent: true, opacity: 0.3, depthWrite: false, roughness: 1 }),
      ug: new THREE.MeshStandardMaterial({ color: 0x5c80a0, transparent: true, opacity: 0.25, depthWrite: false, roughness: 1 }),
    });
    // Möbel: Stoff, Eiche, Lack, Stein, Keramik, Spiegel, Bücher; abends leuchten Lampenschirme und das Kaminfeuer
    const tBooks = canvasTex(256, 256, (g, w, h) => {
      g.fillStyle = '#f1eee8'; g.fillRect(0, 0, w, h);
      const rows = 5, rh = h / rows, pal = [[120, 54, 44], [44, 70, 96], [190, 172, 140], [70, 90, 64], [160, 120, 70], [60, 60, 66], [210, 200, 180], [130, 96, 80]];
      for (let r = 0; r < rows; r++) {
        let x = 4; const y1 = (r + 1) * rh - 6;
        while (x < w - 6) { const bw = 5 + rnd() * 9, bh = rh * (0.6 + rnd() * 0.32); g.fillStyle = shade(pal[Math.floor(rnd() * pal.length)], 0.8 + rnd() * 0.35); g.fillRect(x, y1 - bh, bw, bh); x += bw + (rnd() < 0.08 ? 10 : 0.6); }
        g.fillStyle = '#e4e0d8'; g.fillRect(0, y1, w, 6);
      }
    });
    const furn = {
      fFabric: std(0xcdc6b8, 0.95), fFabric2: std(0x8a857c, 0.95), fCushion: std(0x5d6a72, 0.95), fOak: std(0x9b7652, 0.55),
      fWhite: std(0xf0ede6, 0.42), fStone: std(0xe7e3dc, 0.3), fLime: std(0xd9d1c2, 0.85), fDark: std(0x2a2b2d, 0.45, 0.3),
      fLinen: std(0xf4f2ee, 0.9), fDuvet: std(0xdcd4c6, 0.95), fRug: std(0xb8ad9a, 1), fCeramic: std(0xf8f8f6, 0.15), fBasin: std(0xe3eaec, 0.1),
      fMirror: std(0xdfe5ea, 0.03, 1), fBooks: std(0xffffff, 0.85, 0, { map: tBooks }),
      fShade: std(0xf3e8d2, 0.8, 0, { emissive: 0xffd49a }), fFire: std(0x3a1a08, 0.9, 0, { emissive: 0xff7a2a }),
      fGym: std(0x3d4a57, 0.85), fSauna: std(0xc9a77c, 0.75),
    };
    Object.assign(M, {
      // Tiefgarage: heller Beschichtungsboden, weiße Wände mit dunklem Sockel, Holzlamellen an der Stirnwand, Lichtlinien an der Decke
      tgFloor: std(0xffffff, 0.42, 0, { map: tEpoxy }), tgWall: std(0xf0eee9, 0.85), tgCeil: std(0xf4f3f0, 0.92), tgSockel: std(0x45484c, 0.6),
      tgLine: std(0x3c3f43, 0.55), tgHolz: std(0x9a7452, 0.62), tgBox: std(0xe9e9e6, 0.4, 0.1), tgStone: std(0xffffff, 0.3, 0, { map: tHall }),
      paint: std(0xf0efe9, 0.6), led: std(0xffffff, 0.5, 0, { emissive: 0xfff6e6, emissiveIntensity: 1.2 }), ledGreen: std(0x1a4d2a, 0.4, 0, { emissive: 0x3cff7a, emissiveIntensity: 0.9 }),
      // Autos (einfache Ersatzform): Ferrari F8 Tributo rot, Cayenne Coupé anthrazit, V-Klasse schwarz (Lack mit Klarlack)
      lackFerrari: paint(0xa10e16, 0.25, 0.3), lackCayenne: paint(0x383b3f, 0.65, 0.32), lackV: paint(0x0c0d0f, 0.5, 0.28),
      carGlass: std(0x0d1114, 0.05, 0.4, { side: THREE.DoubleSide, envMapIntensity: 1.6 }), tire: std(0x151515, 0.85), rim: std(0xbfc3c7, 0.25, 0.95), rimDark: std(0x2d3034, 0.32, 0.8),
      chrome: std(0xdadde0, 0.12, 1), trim: std(0x0b0c0d, 0.5, 0.2), grille: std(0x101112, 0.55, 0.35), archLiner: std(0x0a0a0a, 0.9, 0, { side: THREE.DoubleSide }),
      calYellow: std(0xe6b000, 0.4, 0.1), calRed: std(0xb4141a, 0.4, 0.1),
      headlight: std(0xf4f6f8, 0.2, 0, { emissive: 0xe8f0ff, emissiveIntensity: 0.35 }), taillight: std(0x6b0e0e, 0.3, 0, { emissive: 0xa01212, emissiveIntensity: 0.55 }),
      bikeFrame: std(0x34424f, 0.4, 0.5), earth: std(0x8a7058, 1, 0, { map: tGravel }), cap: std(0x3c3a37, 0.9),
    });
    // Außenmöbel im Stil der schwarzen Fensterrahmen und Geländer: schwarzes Metall, helle Polster, Tischplatten aus Stein.
    // Leuchten abends nicht und werden vom Hausschnitt nicht erfasst.
    Object.assign(M, { fOut: std(0xe4e0d7, 0.95), fOutMetal: std(0x1c1d1f, 0.42, 0.55), fCushionOut: std(0x8b9086, 0.95), fOutTop: std(0xe6e1d8, 0.3),
      canopy: std(0xece8df, 0.9, 0, { side: THREE.DoubleSide }) });
    Object.assign(M, furn);
    const warm = new THREE.Color(1, 0.86, 0.68);
    for (const [k, m] of Object.entries(furn)) {
      if (k === 'fMirror' || k === 'fDark') continue;
      if (k === 'fShade') m.userData.glow = 6; else if (k === 'fFire') m.userData.glow = 9; else m.emissive.copy(m.color).multiply(warm);
      glowMats.push(m);
    }
    for (const k of ['putz', 'putzRust', 'putzHell', 'putzDS', 'sockel', 'roof', 'zink', 'zinkDS', 'door', 'frame', 'metal', 'glass', 'lamp', 'slab', 'inWall', 'floorOak', 'floorTile', 'floorHall', 'stairMat', 'curtain', ...Object.keys(furn)]) {
      houseMats.add(M[k]); M[k].clipShadows = true;
    }
    M.floorOak.userData.worldUV = 2.4; M.floorTile.userData.worldUV = 2.4; M.floorHall.userData.worldUV = 3.2; M.stone.userData.worldUV = 3.6; M.tgStone.userData.worldUV = 3.2;
    if (typeof CarKit !== 'undefined') carMats = CarKit.materials(THREE);
    for (const m of [M.inWall, M.floorOak, M.floorTile, M.floorHall, M.stairMat, M.curtain, ...Object.values(furn)]) if (m !== M.fMirror) m.envMapIntensity = 0.55;
    // Stein und Außenmöbel: nur der Geschossschnitt erfasst sie (Balkone und Dachterrasse über der Schnitthöhe)
    for (const k of ['stone', 'fOut', 'fOutMetal', 'fCushionOut', 'fOutTop']) { levelMats.add(M[k]); M[k].clipShadows = true; }  }

  // Geometrien sammeln und je Material zusammenführen (wenige Draw-Calls).
  function addGeo(mat, geo, matrix) {
    if (matrix) geo.applyMatrix4(matrix);
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (!batches.has(mat)) batches.set(mat, []);
    batches.get(mat).push(g);
  }
  function addBox(mat, mx, x0, x1, y0, y1, z0, z1) {
    const g = new THREE.BoxGeometry(Math.max(x1 - x0, 0.004), Math.max(y1 - y0, 0.004), Math.max(z1 - z0, 0.004));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    addGeo(mat, g, mx);
  }
  function addCyl(mat, x, yPlan, z0, z1, rTop, rBot, seg = 20) {
    const g = new THREE.CylinderGeometry(rTop, rBot, z1 - z0, seg);
    g.translate(x, (z0 + z1) / 2, -yPlan);
    addGeo(mat, g, null);
  }
  // Quadratischer Pfeiler mit schlichtem Sockel und Kapitell vom Boden z0 bis zur Balkonplatte z1 (Seitenlänge w)
  function column(x, y, z0, z1, w, mat = M.putzHell) {
    const h = w / 2;
    boxPlan(mat, x - h - 0.05, x + h + 0.05, y - h - 0.05, y + h + 0.05, z0, z0 + 0.14);
    boxPlan(mat, x - h, x + h, y - h, y + h, z0 + 0.14, z1 - 0.16);
    boxPlan(mat, x - h - 0.04, x + h + 0.04, y - h - 0.04, y + h + 0.04, z1 - 0.16, z1 - 0.06);
    boxPlan(mat, x - h - 0.07, x + h + 0.07, y - h - 0.07, y + h + 0.07, z1 - 0.06, z1);
  }
  // Quader in Plan-Koordinaten (x, yPlan) und Höhe z
  const boxPlan = (mat, x0, x1, y0, y1, z0, z1) => addBox(mat, null, x0, x1, z0, z1, -Math.max(y0, y1), -Math.min(y0, y1));
  function flushBatches(parent) {
    for (const [mat, geos] of batches) {
      const geo = mergeGeometries(geos, false), s = mat.userData.worldUV;
      if (s) { const pos = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / s, -pos.getZ(i) / s); }
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = mat !== M.glass && mat !== M.siteGlass && mat !== M.water;
      mesh.receiveShadow = true;
      parent.add(mesh);
    }
    batches.clear();
  }
  // Lokales System einer Wand { o, r, n } im Plan: u entlang r, z nach oben, Tiefe entlang der Außennormalen n
  function frameMx(f) {
    const m = new THREE.Matrix4();
    m.makeBasis(new THREE.Vector3(f.r[0], 0, -f.r[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(f.n[0], 0, -f.n[1]));
    return m.setPosition(f.o[0], 0, -f.o[1]);
  }
  const facadeMatrix = side => frameMx(HOUSE.frame[side]);
  const v2 = (x, y) => new THREE.Vector2(x, y);
  const isInside = (o, root) => { for (let q = o; q; q = q.parent) if (q === root) return true; return false; };
  const rectPts = (x0, y0, x1, y1) => [v2(x0, y0), v2(x1, y0), v2(x1, y1), v2(x0, y1)];
  function shapeFrom(pts, holes = []) {
    const s = new THREE.Shape(pts.map(p => v2(p[0], p[1])));
    for (const h of holes) s.holes.push(new THREE.Path(h.map(p => v2(p[0], p[1]))));
    return s;
  }
  // Zweiter UV-Satz für die Bodenverschattung: Plan-Ausschnitt AO (Meter), nicht wiederholt
  const AO = { x0: -70, y0: -90, s: 160 };
  function addUV1(g) {
    const uv = g.attributes.uv, a = new Float32Array(uv.count * 2);
    for (let i = 0; i < uv.count; i++) { a[2 * i] = (uv.getX(i) - AO.x0) / AO.s; a[2 * i + 1] = (uv.getY(i) - AO.y0) / AO.s; }
    g.setAttribute('uv1', new THREE.BufferAttribute(a, 2));
    return g;
  }
  function flat(pts, mat, y, holes) {
    const g = addUV1(new THREE.ShapeGeometry(shapeFrom(pts, holes))); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mat); m.position.y = y; m.receiveShadow = true; return m;
  }
  function extrude(pts, mat, y0, h, holes) {
    const g = new THREE.ExtrudeGeometry(shapeFrom(pts, holes), { depth: h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
  }
  function wallWithHoles(len, z0, z1, holes, depth, mats, mx) {
    const sh = new THREE.Shape(rectPts(0, z0, len, z1));
    for (const o of holes) sh.holes.push(new THREE.Path(rectPts(o.u0, o.z0, o.u1, o.z1)));
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false });
    g.translate(0, 0, -depth); g.applyMatrix4(mx);
    const m = new THREE.Mesh(g, mats); m.castShadow = m.receiveShadow = true; return m;
  }

