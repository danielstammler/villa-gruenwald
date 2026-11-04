// 3D-Modell (three.js): Haus aus HOUSE, Grundstück und Umgebung aus SITE, Sonnenstand mit Schatten.
// Weltkoordinaten: X = Plan-Ost, Y = Höhe, Z = -Plan-Nord. Das Haus liegt in X 0..16, Z 0..11,65.
const View3D = (() => {
  const Zh = HOUSE.Z;
  let renderer, scene, camP, camO, cam, controls, sun, moon, hemi, sky, skyScene, pmrem, envRT;
  let canvas, stage, raf = 0, last = 0, tween = null, envDue = 0, ready = false, active = false;
  const st = { y: 2026, m: 8, d: 5, h: 16.75, play: false, ortho: false, cut: false, cutX: 8, rotate: false, level: 'alle' };
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
      tgLine: std(0x3c3f43, 0.55), tgHolz: std(0x9a7452, 0.62), tgBox: std(0xe9e9e6, 0.4, 0.1),
      paint: std(0xf0efe9, 0.6), led: std(0xffffff, 0.5, 0, { emissive: 0xfff6e6, emissiveIntensity: 1.2 }), ledGreen: std(0x1a4d2a, 0.4, 0, { emissive: 0x3cff7a, emissiveIntensity: 0.9 }),
      // Autos: Ferrari F8 Tributo rot, Cayenne Coupé und T-Roc R anthrazit, V-Klasse schwarz (Lack mit Klarlack)
      lackFerrari: paint(0xa10e16, 0.25, 0.3), lackCayenne: paint(0x383b3f, 0.65, 0.32), lackTroc: paint(0x4a4e53, 0.62, 0.32), lackV: paint(0x0c0d0f, 0.5, 0.28),
      carGlass: std(0x0d1114, 0.05, 0.4, { side: THREE.DoubleSide, envMapIntensity: 1.6 }), tire: std(0x151515, 0.85), rim: std(0xbfc3c7, 0.25, 0.95), rimDark: std(0x2d3034, 0.32, 0.8),
      chrome: std(0xdadde0, 0.12, 1), trim: std(0x0b0c0d, 0.5, 0.2), grille: std(0x101112, 0.55, 0.35), archLiner: std(0x0a0a0a, 0.9, 0, { side: THREE.DoubleSide }),
      calYellow: std(0xe6b000, 0.4, 0.1), calBlue: std(0x1c4cb0, 0.4, 0.1), calRed: std(0xb4141a, 0.4, 0.1),
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
    M.floorOak.userData.worldUV = 2.4; M.floorTile.userData.worldUV = 2.4; M.floorHall.userData.worldUV = 3.2; M.stone.userData.worldUV = 3.6;
    for (const m of [M.inWall, M.floorOak, M.floorTile, M.floorHall, M.stairMat, M.curtain, ...Object.values(furn)]) if (m !== M.fMirror) m.envMapIntensity = 0.55;
    // Stein und Außenmöbel: nur der Geschossschnitt erfasst sie (Balkone und Dachterrasse über der Schnitthöhe)
    for (const k of ['stone', 'fOut', 'fOutMetal', 'fCushionOut', 'fOutTop']) { levelMats.add(M[k]); M[k].clipShadows = true; }
  }

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
      // Zweiflügelige Haustür in dunklem Lack mit hohen Glasfeldern und Stoßgriffen, verglaste Seitenteile, darüber ein Oberlicht
      const zt = o.z1 - 0.32, d0 = face - gl - 0.06, d1 = face - gl, sd = o.side || 0, a0 = o.u0 + sd, a1 = o.u1 - sd, lw = (a1 - a0) / 2;
      addBox(M.stairMat, mx, o.u0, o.u1, o.z0 - 0.06, o.z0 + 0.008, face - depth - 0.01, face + 0.03);
      for (const [b0, b1] of sd ? [[o.u0, a0], [a1, o.u1]] : []) {
        addBox(M.door, mx, b0, b1, o.z0, o.z0 + 0.5, d0, d1);
        addBox(M.glass, mx, b0 + 0.05, b1 - 0.05, o.z0 + 0.55, zt, d0 + 0.02, d0 + 0.03);
        for (const [c0, c1] of [[b0, b0 + 0.05], [b1 - 0.05, b1]]) addBox(M.frame, mx, c0, c1, o.z0 + 0.5, zt, d0, d1);
        addBox(M.frame, mx, b0, b1, o.z0 + 0.5, o.z0 + 0.55, d0, d1);
      }
      addBox(M.frame, mx, o.u0, o.u1, zt, zt + 0.06, d0, d1 + 0.012);
      addBox(M.glass, mx, o.u0 + 0.05, o.u1 - 0.05, zt + 0.06, o.z1 - 0.05, d0 + 0.02, d0 + 0.03);
      for (const [a, b] of [[o.u0, o.u0 + 0.05], [o.u1 - 0.05, o.u1], [a0 + lw - 0.02, a0 + lw + 0.02], ...(sd ? [[a0 - 0.025, a0 + 0.025], [a1 - 0.025, a1 + 0.025]] : [])]) addBox(M.frame, mx, a, b, zt, o.z1, d0, d1);
      addBox(M.frame, mx, o.u0, o.u1, o.z1 - 0.05, o.z1, d0, d1);
      const center = at((a0 + a1) / 2, o.z0 + 1.1, face);
      for (let i = 0; i < 2; i++) {
        const a = a0 + i * lw, hinge = at(i ? a1 : a0, 0, (d0 + d1) / 2);
        leaf(parent, hinge, i ? -1 : 1, center, () => {
          addBox(M.door, mx, a + (i ? 0.004 : 0), a + lw - (i ? 0 : 0.004), o.z0 + 0.01, zt, d0, d1);
          addBox(M.glass, mx, a + 0.18, a + lw - 0.18, o.z0 + 0.7, zt - 0.18, d1 + 0.002, d1 + 0.008);
          for (const [c0, c1, e0, e1] of [[a + 0.15, a + lw - 0.15, o.z0 + 0.67, o.z0 + 0.7], [a + 0.15, a + lw - 0.15, zt - 0.18, zt - 0.15], [a + 0.15, a + 0.18, o.z0 + 0.67, zt - 0.15], [a + lw - 0.18, a + lw - 0.15, o.z0 + 0.67, zt - 0.15]]) addBox(M.metal, mx, c0, c1, e0, e1, d1, d1 + 0.012);
          const gx = i ? a + 0.08 : a + lw - 0.08;
          addBox(M.metal, mx, gx - 0.015, gx + 0.015, o.z0 + 0.75, o.z0 + 1.65, d1 + 0.04, d1 + 0.07);
          for (const gz of [o.z0 + 0.8, o.z0 + 1.6]) addBox(M.metal, mx, gx - 0.012, gx + 0.012, gz - 0.012, gz + 0.012, d1, d1 + 0.05);
          if (!i) addBox(M.frame, mx, a + lw - 0.016, a + lw - 0.004, o.z0, zt, d1, d1 + 0.014);
        });
      }
      return;
    }
    const f0 = face - gl - 0.04, f1 = face - gl + 0.03;
    if (o.kind === 'tuer' || o.kind === 'franz') addBox(M.stairMat, mx, o.u0, o.u1, o.z0 - 0.06, o.z0 + 0.008, face - depth - 0.01, face + 0.03);
    if (o.move && parent) {
      // Gartentür bzw. Balkontür mit zwei beweglichen Flügeln: feste Zarge, Flügel mit Glas, Rahmen und Griff
      for (const [p, q, r0, r1] of [[o.u0, o.u0 + fw, o.z0, o.z1], [o.u1 - fw, o.u1, o.z0, o.z1], [o.u0, o.u1, o.z1 - fw, o.z1], [o.u0, o.u1, o.z0, o.z0 + 0.03]]) addBox(M.frame, mx, p, q, r0, r1, f0, f1);
      const c = (o.u0 + o.u1) / 2, za = o.z0 + 0.03, zb = o.z1 - fw, center = at(c, o.z0 + 1.1, face);
      for (const [a, b, h, sg] of [[o.u0 + fw, c, o.u0 + fw, 1], [c, o.u1 - fw, o.u1 - fw, -1]]) {
        leaf(parent, at(h, 0, (f0 + f1) / 2), sg, center, () => {
          addBox(M.glass, mx, a + 0.05, b - 0.05, za + 0.05, zb - 0.05, face - gl - 0.012, face - gl);
          for (const [p, q, r0, r1] of [[a, a + 0.055, za, zb], [b - 0.055, b, za, zb], [a, b, za, za + 0.09], [a, b, zb - 0.055, zb]]) addBox(M.frame, mx, p + (sg < 0 && p === a ? 0.003 : 0), q, r0, r1, f0 + 0.005, f1 - 0.005);
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
    // Decken mit Öffnungen für Treppe und Aufzug; im OG zusätzlich der Luftraum über der Halle (alles zu einer Öffnung zusammengefasst)
    const { STAIR, LIFT, VOID } = Plans.CORE, rp = ([a, b, c, e]) => [[a, c], [b, c], [b, e], [a, e]];
    const hallHole = [[LIFT[0], LIFT[2]], [VOID[0][1], LIFT[2]], [VOID[0][1], STAIR[2]], [STAIR[1], STAIR[2]], [STAIR[1], STAIR[3]], [LIFT[0], STAIR[3]]];
    for (const [z0, z1, holes] of [[-0.15, Zh.ffbEG, [rp(STAIR), rp(LIFT)]], [Zh.gurtU, Zh.ffbOG, [hallHole]], [Zh.deckeDG, Zh.ffbDG, [rp(STAIR), rp(LIFT)]]]) {
      const sl = extrude([[0.3, -11.35], [15.7, -11.35], [15.7, -0.3], [0.3, -0.3]], M.slab, z0, z1 - z0, holes); sl.castShadow = false; g.add(sl);
    }
    buildInterior();
    // Balkon im DG vor dem Zwerchhaus: Platte mit Kante und Belag auf zwei quadratischen Pfeilern über dem OG-Balkon, Geländer an drei Seiten
    const bd = HOUSE.balkonDG;
    boxPlan(M.putzHell, bd.x0, bd.x1, bd.y0, bd.y1, bd.slab[0], bd.slab[1] - 0.1);
    boxPlan(M.putzHell, bd.x0 - 0.06, bd.x1 + 0.06, bd.y0 - 0.06, bd.y1, bd.slab[1] - 0.1, bd.slab[1]);
    boxPlan(M.stone, bd.x0, bd.x1, bd.y0, bd.y1, bd.slab[1], bd.slab[1] + 0.02);
    for (const x of bd.cols) column(x, bd.colY, HOUSE.balkon.slab[1], bd.slab[0], bd.colW);
    const zr = bd.slab[1] + 0.02;
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
    }
    // Flache Decke im DG unter dem oberen Dach (dort, wo die steile Dachfläche sie nicht schneidet)
    const sD = (Zh.ffbDG + 2.6 - HOUSE.roofIn(0)) / HOUSE.tan1;
    boxPlan(M.slab, sD, HOUSE.W - sD, -HOUSE.D + sD, -sD, Zh.ffbDG + 2.6, Zh.ffbDG + 2.72);
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
  // Innenräume nach dem Grundriss-Vorschlag: Böden, Wände, Treppe und Aufzugsschacht
  function buildInterior() {
    const lv = { UG: [Zh.ffbUG, -0.15], EG: [Zh.ffbEG, Zh.gurtU], OG: [Zh.ffbOG, Zh.deckeDG], DG: [Zh.ffbDG, Zh.ffbDG + 2.6] };
    // Fliesen in Bädern, Küche und Nebenräumen, Kalkstein in Halle und Garderobe, sonst Eichendielen
    const nass = /bad|wc|dusche|küche|backkitchen|speis|abstell|schleuse|lager|technik|waschen|vorraum/i, halle = /halle|garderobe/i;
    const W = HOUSE.W, D = HOUSE.D, roofIn = HOUSE.roofIn, { STAIR, LIFT, VOID } = Plans.CORE;
    const uniq = a => [...new Set(a.map(v => +v.toFixed(3)))].sort((p, q) => p - q);
    // Rechteck ohne Öffnungen (Treppe, Aufzug, Luftraum) als Liste von Teilrechtecken
    const minus = (r, hs) => {
      const xs = uniq([r[0], r[1], ...hs.flatMap(h => [h[0], h[1]])]).filter(v => v >= r[0] && v <= r[1]);
      const ys = uniq([r[2], r[3], ...hs.flatMap(h => [h[2], h[3]])]).filter(v => v >= r[2] && v <= r[3]), out = [];
      for (let j = 0; j < ys.length - 1; j++) for (let i = 0; i < xs.length - 1; i++) {
        const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
        if (!hs.some(h => cx > h[0] && cx < h[1] && cy > h[2] && cy < h[3])) out.push([xs[i], xs[i + 1], ys[j], ys[j + 1]]);
      }
      return out;
    };
    const openings = { UG: [LIFT], EG: [STAIR, LIFT], OG: [STAIR, LIFT, ...VOID], DG: [STAIR, LIFT] };
    const doorRect = d => d.o === 'v' ? [d.x - 0.2, d.x + 0.2, d.y, d.y + d.w] : [d.x, d.x + d.w, d.y - 0.2, d.y + 0.2];
    // Außenwände des Untergeschosses (unter Gelände), mit der Tür zur Tiefgarage in der Südwand
    const t0 = HOUSE.wall, ug = [[0, W, -D, -D + t0, [12.1, 13.0]], [0, W, -t0, 0], [0, t0, -D + t0, -t0], [W - t0, W, -D + t0, -t0]];
    for (const [a, b, c, e, gap] of ug) {
      const segs = gap ? [[a, gap[0]], [gap[1], b]] : [[a, b]];
      for (const [p, q] of segs) { boxPlan(M.inWall, p, q, c, e, Zh.ffbUG - 0.3, -0.15); wallRects.push({ fl: 'UG', r: [p, q, c, e], top: -0.15 }); }
    }
    // Bodenplatte des Untergeschosses, damit auch unter Türöffnungen Boden ist; im DG Boden bis an die Zwerchhausfronten
    boxPlan(M.slab, 0, W, -D, 0, Zh.ffbUG - 0.3, Zh.ffbUG - 0.025);
    for (const [y0, y1] of [[-D + 0.12, -D + 0.36], [-0.36, -0.12]]) boxPlan(M.floorOak, 4.45, 11.55, y0, y1, Zh.ffbDG - 0.11, Zh.ffbDG + 0.005);
    for (const fl of ['UG', 'EG', 'OG', 'DG']) {
      const F = Plans.FL[fl], [z0, z1] = lv[fl];
      for (const rm of F.rooms) for (const q of minus(rm.r, openings[fl])) boxPlan(nass.test(rm.n) ? M.floorTile : halle.test(rm.n) ? M.floorHall : M.floorOak, q[0], q[1], q[2], q[3], z0 - 0.02, z0 + 0.005);
      const free = [...F.rooms.map(r => r.r), ...(F.open || []), ...F.doors.map(doorRect)];
      const xs = uniq([0.36, 15.64, ...free.flatMap(r => [r[0], r[1]])]).filter(v => v >= 0.36 && v <= 15.64);
      const ys = uniq([-11.29, -0.36, ...free.flatMap(r => [r[2], r[3]])]).filter(v => v >= -11.29 && v <= -0.36);
      for (let j = 0; j < ys.length - 1; j++) {
        let start = null;
        for (let i = 0; i < xs.length - 1; i++) {
          const cx = (xs[i] + xs[i + 1]) / 2, cy = (ys[j] + ys[j + 1]) / 2;
          const wall = !free.some(r => cx > r[0] && cx < r[1] && cy > r[2] && cy < r[3]);
          if (wall && start === null) start = i;
          const last = i === xs.length - 2;
          if (start !== null && (!wall || last)) {
            const a = xs[start], b = wall && last ? xs[i + 1] : xs[i], y0 = ys[j], y1 = ys[j + 1];
            if (b - a > 0.02 && y1 - y0 > 0.02) {
              const sv = Math.min(a, W - b, -y1, y0 + D);
              const top = fl === 'DG' ? Math.max(z0 + 0.3, Math.min(z1, roofIn(sv))) : z1;
              boxPlan(M.inWall, a, b, y0, y1, z0, top);
              wallRects.push({ fl, r: [a, b, y0, y1], top });
            }
            start = null;
          }
        }
      }
    }
    buildStair();
    // Aufzug als gläserner Turm in der Halle: schwarzer Stahlrahmen, Glas nach Norden, Osten und Süden, gläserne Schiebetüren nach Süden,
    // Rückwand zur Garderobe massiv. Die Kabine steht im EG: Eichenboden, Spiegel an der Rückwand, Handlauf, Licht in der Decke.
    const [lx0, lx1, ly0, ly1] = LIFT, lc = (lx0 + lx1) / 2, zTop = Zh.ffbDG + 2.6, wx = lx0 + 0.2;
    boxPlan(M.inWall, lx0, wx, ly0, ly1, Zh.ffbUG, 9.6); boxPlan(M.inWall, lx0, lx1, ly0, ly1, zTop, 9.6);
    for (const fl of ['UG', 'EG', 'OG', 'DG']) wallRects.push({ fl, r: [lx0, wx, ly0, ly1], top: 9.6 });
    for (const [x, y] of [[lx1 - 0.04, ly0 + 0.04], [lx1 - 0.04, ly1 - 0.04], [wx + 0.04, ly1 - 0.04], [wx + 0.04, ly0 + 0.04]]) boxPlan(M.frame, x - 0.04, x + 0.04, y - 0.04, y + 0.04, Zh.ffbUG, zTop);
    boxPlan(M.glass, wx + 0.08, lx1 - 0.08, ly1 - 0.03, ly1 - 0.018, Zh.ffbUG, zTop); boxPlan(M.glass, lx1 - 0.03, lx1 - 0.018, ly0 + 0.08, ly1 - 0.08, Zh.ffbUG, zTop);
    const zs = [Zh.ffbUG, Zh.ffbEG, Zh.ffbOG, Zh.ffbDG], next = [Zh.ffbEG - 0.35, Zh.ffbOG - 0.35, Zh.ffbDG - 0.35, zTop];
    zs.forEach((zf, i) => {
      // Riegel in Deckenhöhe und über den Türen rundum, Glas neben und über der Tür, zwei geschlossene Schiebeflügel
      for (const [za, zb] of [[zf - 0.35, zf + 0.03], [zf + 2.15, zf + 2.23]]) {
        boxPlan(M.frame, wx, lx1, ly1 - 0.06, ly1, za, zb); boxPlan(M.frame, lx1 - 0.06, lx1, ly0, ly1, za, zb); boxPlan(M.frame, wx, lx1, ly0, ly0 + 0.06, za, zb);
      }
      for (const [a, b] of [[wx + 0.08, lc - 0.5], [lc + 0.5, lx1 - 0.08]]) boxPlan(M.glass, a, b, ly0 + 0.018, ly0 + 0.03, zf + 0.03, next[i]);
      boxPlan(M.glass, lc - 0.5, lc + 0.5, ly0 + 0.018, ly0 + 0.03, zf + 2.23, next[i]);
      for (const x of [lc - 0.5, lc + 0.5]) boxPlan(M.frame, x - 0.03, x + 0.03, ly0, ly0 + 0.06, zf, zf + 2.15);
      for (const [a, b, d] of [[lc - 0.46, lc + 0.01, 0.07], [lc - 0.01, lc + 0.46, 0.1]]) {
        boxPlan(M.glass, a + 0.04, b - 0.04, ly0 + d - 0.006, ly0 + d + 0.006, zf + 0.06, zf + 2.09);
        for (const [p, q, r0, r1] of [[a, a + 0.04, zf + 0.02, zf + 2.13], [b - 0.04, b, zf + 0.02, zf + 2.13], [a, b, zf + 0.02, zf + 0.06], [a, b, zf + 2.09, zf + 2.13]]) boxPlan(M.metal, p, q, ly0 + d - 0.012, ly0 + d + 0.012, r0, r1);
      }
      boxPlan(M.metal, lc + 0.56, lc + 0.62, ly0 - 0.012, ly0, zf + 1.0, zf + 1.18);
    });
    // Führungsschienen an der Rückwand und die Kabine im EG
    for (const y of [ly0 + 0.55, ly1 - 0.55]) boxPlan(M.metal, wx, wx + 0.05, y - 0.03, y + 0.03, Zh.ffbUG, zTop);
    const ka = [wx + 0.12, lx1 - 0.12, ly0 + 0.16, ly1 - 0.12], zk = Zh.ffbEG;
    boxPlan(M.fDark, ka[0], ka[1], ka[2], ka[3], zk - 0.12, zk + 0.01); boxPlan(M.fOak, ka[0] + 0.03, ka[1] - 0.03, ka[2] + 0.03, ka[3] - 0.03, zk + 0.01, zk + 0.025);
    boxPlan(M.fDark, ka[0], ka[1], ka[2], ka[3], zk + 2.22, zk + 2.3); boxPlan(M.fShade, ka[0] + 0.25, ka[1] - 0.25, ka[2] + 0.25, ka[3] - 0.25, zk + 2.205, zk + 2.22);
    for (const [x, y] of [[ka[0], ka[2]], [ka[1], ka[2]], [ka[0], ka[3]], [ka[1], ka[3]]]) boxPlan(M.fDark, x - 0.02, x + 0.02, y - 0.02, y + 0.02, zk, zk + 2.22);
    boxPlan(M.fMirror, ka[0], ka[0] + 0.01, ka[2] + 0.1, ka[3] - 0.1, zk + 0.9, zk + 2.1);
    boxPlan(M.metal, ka[0] + 0.04, ka[0] + 0.07, ka[2] + 0.15, ka[3] - 0.15, zk + 0.88, zk + 0.92);
    boxPlan(M.glass, ka[1] - 0.01, ka[1], ka[2] + 0.02, ka[3] - 0.02, zk + 0.03, zk + 2.2); boxPlan(M.glass, ka[0] + 0.02, ka[1] - 0.02, ka[3] - 0.01, ka[3], zk + 0.03, zk + 2.2);
    // Galerie im OG: schwarzes Geländer an der Kante des Luftraums
    railing(M.metal, new THREE.Matrix4().makeTranslation(0, 0, -VOID[0][2] + 0.04), VOID[0][0] + 0.02, VOID[0][1] - 0.02, Zh.ffbOG, Zh.ffbOG + 1.0, 0);
    // Kronleuchter im Luftraum: Stange vom DG-Boden, zwei Ringe mit Lichtschirmen (leuchten abends)
    const cx = (VOID[0][0] + VOID[0][1]) / 2, cy = -1.9;
    addCyl(M.metal, cx, cy, Zh.deckeDG - 0.06, Zh.deckeDG, 0.11, 0.11, 18); addCyl(M.metal, cx, cy, 5.0, Zh.deckeDG - 0.06, 0.012, 0.012, 8);
    addCyl(M.metal, cx, cy, 4.42, 5.0, 0.035, 0.035, 12); addCyl(M.metal, cx, cy, 4.34, 4.42, 0.07, 0.02, 12);
    for (const [zr, rr, nn] of [[4.62, 0.62, 10], [4.95, 0.4, 6]]) {
      const tor = new THREE.TorusGeometry(rr, 0.016, 6, 40); tor.rotateX(Math.PI / 2); tor.translate(cx, zr, -cy); addGeo(M.metal, tor, null);
      for (let k = 0; k < nn; k++) {
        const a = (k + (zr > 4.8 ? 0.5 : 0)) / nn * Math.PI * 2, px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
        addCyl(M.metal, px, py, zr, zr + 0.07, 0.022, 0.022, 8); addCyl(M.fShade, px, py, zr + 0.07, zr + 0.2, 0.045, 0.07, 12);
      }
    }
    buildFurniture();
  }
  // Treppe: zweiläufig mit Halbpodest. Massive weiße Läufe mit glatter Untersicht und Stufen aus hellem Naturstein, durchgehende
  // Mittelwand, geschlossene Brüstung mit Steinabdeckung und Pfosten zur Halle hin; im EG eine breite, gerundete Antrittsstufe.
  function buildStair() {
    const prism = (mat, pts, xa, xb) => {
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([y, z]) => v2(y, z))), { depth: xb - xa, bevelEnabled: false });
      addGeo(mat, g, new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)).setPosition(xa, 0, 0));
    };
    let top = null;
    for (const fl of ['UG', 'EG', 'OG']) {
      const F = Plans.stairFlights(fl), { x0, x1, y0, y1, yl, fw, za, zb, zm, rise, n, a, b } = F, solid = fl === 'UG', zt = i => za + (i + 1) * rise;
      // Lauf 1 nach Norden
      const p1 = [[a[0], za]];
      for (let i = 0; i < n - 1; i++) p1.push([a[i], zt(i)], [a[i + 1], zt(i)]);
      p1.push(...(solid ? [[yl, za]] : [[yl, zm - 0.28], [a[0] + 0.45, za]]));
      prism(M.putzHell, p1, x0, x0 + fw);
      for (let i = 0; i < n - 1; i++) boxPlan(M.stairMat, x0 + 0.13, x0 + fw, a[i] - 0.03, a[i + 1], zt(i) - 0.035, zt(i) + 0.005);
      if (F.flare) {
        boxPlan(M.stairMat, x0 - 0.3, x0 + 0.14, a[0] - 0.03, a[1], za, zt(0) + 0.005);
        addCyl(M.stairMat, x0 - 0.3, (a[0] - 0.03 + a[1]) / 2, za, zt(0) + 0.005, (a[1] - a[0] + 0.03) / 2, (a[1] - a[0] + 0.03) / 2, 28);
      }
      // Podest und Lauf 2 nach Süden
      boxPlan(M.putzHell, x0, x1, yl, y1, zm - 0.28, zm - 0.035); boxPlan(M.stairMat, x0 + 0.13, x1, yl - 0.03, y1, zm - 0.035, zm + 0.005);
      const zu = j => zm + (j + 1) * rise, p2 = [[yl, zm - 0.28], [yl, zm]];
      for (let j = 0; j < n - 1; j++) p2.push([b[j], zu(j)], [b[j + 1], zu(j)]);
      p2.push([y0, zb - 0.32]);
      prism(M.putzHell, p2, x1 - fw, x1);
      for (let j = 0; j < n - 1; j++) boxPlan(M.stairMat, x1 - fw, x1, b[j + 1], b[j] + 0.03, zu(j) - 0.035, zu(j) + 0.005);
      // Brüstung zur Halle mit Pfosten am Antritt
      const ys = a[0] + 0.07, zs = zt(0), h = 0.92;
      prism(M.putzHell, [[ys, za], [ys, zs + h], [yl, zm + h], [y1 - 0.02, zm + h], [y1 - 0.02, zm - 0.3], [yl, zm - 0.3], solid ? [yl, za] : [a[0] + 0.5, za]], x0, x0 + 0.13);
      prism(M.stairMat, [[ys, zs + h], [yl, zm + h], [y1 - 0.02, zm + h], [y1 - 0.02, zm + h + 0.06], [yl, zm + h + 0.06], [ys, zs + h + 0.06]], x0 - 0.025, x0 + 0.155);
      boxPlan(M.putzHell, x0 - 0.065, x0 + 0.195, ys, ys + 0.26, za, zs + 1.02); boxPlan(M.stairMat, x0 - 0.09, x0 + 0.22, ys - 0.025, ys + 0.285, zs + 1.02, zs + 1.09);
      top = F;
    }
    // Mittelwand durch alle Geschosse, oben mit der Brüstungslinie des obersten Laufs; im DG eine Brüstung um die Öffnung
    const { x0, y0, y1, yl, fw, spine, zm, zb } = top, h = 0.92;
    prism(M.putzHell, [[y0, Zh.ffbUG], [yl, Zh.ffbUG], [yl, zm + h], [y0, zb + h - 0.1]], x0 + fw, x0 + fw + spine);
    prism(M.stairMat, [[yl, zm + h], [y0, zb + h - 0.1], [y0, zb + h - 0.04], [yl, zm + h + 0.06]], x0 + fw - 0.02, x0 + fw + spine + 0.02);
    const zd = Zh.ffbDG;
    boxPlan(M.putzHell, x0, x0 + fw, y0 - 0.13, y0, zd - 0.35, zd + h); boxPlan(M.putzHell, x0 - 0.13, x0, y0 - 0.13, y1, zd - 0.35, zd + h);
    boxPlan(M.stairMat, x0 - 0.155, x0 + fw, y0 - 0.155, y0 + 0.025, zd + h, zd + h + 0.06); boxPlan(M.stairMat, x0 - 0.155, x0 + 0.025, y0 - 0.155, y1, zd + h, zd + h + 0.06);
  }
  // Möbel nach dem Grundriss-Vorschlag: dieselben Positionen wie im 2D-Plan, Höhen nach üblichen Maßen, im DG unter der Schräge gekappt
  function buildFurniture() {
    const W = HOUSE.W, D = HOUSE.D, roofIn = HOUSE.roofIn;
    const levels = { UG: [Zh.ffbUG, -0.15], EG: [Zh.ffbEG, Zh.gurtU], OG: [Zh.ffbOG, Zh.deckeDG], DG: [Zh.ffbDG, Zh.ffbDG + 2.6] };
    const dirs = { N: [0, -1], S: [0, 1], E: [-1, 0], W: [1, 0] };
    // Draußen (Terrasse, Freisitz, Balkone): schwarzes Metall, helle wetterfeste Polster, Tischplatten aus Stein
    const OUT = { fFabric: M.fOut, fFabric2: M.fOut, fOak: M.fOutMetal, fDark: M.fOutMetal, fCushion: M.fCushionOut };
    const IN = Object.fromEntries(Object.keys(OUT).map(k => [k, M[k]]));
    for (const fl of ['UG', 'EG', 'OG', 'DG']) {
      const [zf, zTop] = levels[fl], rooms = Plans.FL[fl].rooms;
      let z = zf, ceil = zTop - zf, out = false;
      const roomAt = (x, y) => rooms.find(r => x >= r.r[0] - 0.05 && x <= r.r[1] + 0.05 && y >= r.r[2] - 0.05 && y <= r.r[3] + 0.05);
      const cap = (x0, x1, y0, y1, h) => fl !== 'DG' || out ? h : Math.max(0.3, Math.min(h, roofIn(Math.min(x0, W - x1, -y1, y0 + D)) - z - 0.06));
      const B = (mat, x0, x1, y0, y1, a, b) => { if (b > a) boxPlan(mat, Math.min(x0, x1), Math.max(x0, x1), Math.min(y0, y1), Math.max(y0, y1), z + a, z + b); };
      const C = (mat, x, y, a, b, r0, r1 = r0) => addCyl(mat, x, y, z + a, z + b, r1, r0, 14);
      // Vorderseite: die Seite, die zur Raummitte zeigt
      const front = (x0, x1, y0, y1) => {
        const rm = roomAt((x0 + x1) / 2, (y0 + y1) / 2), cx = rm ? (rm.r[0] + rm.r[1]) / 2 : 8, cy = rm ? (rm.r[2] + rm.r[3]) / 2 : -5.8;
        return x1 - x0 >= y1 - y0 ? ((y0 + y1) / 2 > cy ? 'S' : 'N') : ((x0 + x1) / 2 > cx ? 'W' : 'E');
      };
      const chair = (cx, cy, fx, fy) => {   // fx, fy: Blickrichtung zum Tisch
        if (out) {
          // Bistrostuhl aus schwarzem Metall mit hellem Sitzkissen und Lehne aus Stäben
          B(M.fOutMetal, cx - 0.21, cx + 0.21, cy - 0.21, cy + 0.21, 0.42, 0.44); B(M.fOut, cx - 0.19, cx + 0.19, cy - 0.19, cy + 0.19, 0.44, 0.49);
          for (const [p, q] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) C(M.fOutMetal, cx + p, cy + q, 0, 0.42, 0.012);
          const bx = cx - fx * 0.2, by = cy - fy * 0.2;
          for (const t of [-0.17, -0.06, 0.06, 0.17]) C(M.fOutMetal, bx + fy * t, by + fx * t, 0.44, 0.88, 0.008);
          B(M.fOutMetal, bx - (fy ? 0.2 : 0.012), bx + (fy ? 0.2 : 0.012), by - (fx ? 0.2 : 0.012), by + (fx ? 0.2 : 0.012), 0.86, 0.9);
          return;
        }
        B(M.fOak, cx - 0.21, cx + 0.21, cy - 0.21, cy + 0.21, 0.43, 0.47);
        for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) B(M.fDark, cx + a - 0.015, cx + a + 0.015, cy + b - 0.015, cy + b + 0.015, 0, 0.43);
        const bx = cx - fx * 0.19, by = cy - fy * 0.19;
        B(M.fOak, bx - (fy ? 0.21 : 0.02), bx + (fy ? 0.21 : 0.02), by - (fx ? 0.21 : 0.02), by + (fx ? 0.21 : 0.02), 0.47, 0.9);
      };
      const pendant = (x, y, h) => { if (out) return; C(M.fDark, x, y, h + 0.18, ceil, 0.006); C(M.fShade, x, y, h, h + 0.18, 0.2, 0.1); };
      const lounger = (x0, x1, y0, y1) => loungerAt(x0, x1, y0, y1, z);
      for (const { t, a } of Plans.items(fl)) {
        // Lage bestimmen: außerhalb des Hauses gilt die Höhe von Terrasse, Freisitz oder Balkon
        const cx0 = ['wc', 'basin', 'hob'].includes(t) ? a[0] : (a[0] + a[1]) / 2, cy0 = ['wc', 'basin', 'hob'].includes(t) ? a[1] : (a[2] + a[3]) / 2;
        out = cx0 < 0 || cx0 > W || cy0 < -D || cy0 > 0;
        z = !out ? zf : fl === 'EG' ? (cx0 > W ? HOUSE.freisitz.z : HOUSE.terrasse.z) : fl === 'OG' ? HOUSE.balkon.slab[1] + 0.02 : HOUSE.balkonDG.slab[1] + 0.02;
        Object.assign(M, out ? OUT : IN);
        if (t === 'box') {
          const [x0, x1, y0, y1, label, kind] = a, k = (kind || label || '').toLowerCase(), f = front(x0, x1, y0, y1), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
          if (k === 'zeile' || k === 'spuelzeile') {
            B(M.fDark, x0, x1, y0, y1, 0, 0.1); B(M.fWhite, x0, x1, y0, y1, 0.1, 0.86); B(M.fStone, x0 - 0.01, x1 + 0.01, y0 - 0.01, y1 + 0.01, 0.86, 0.9);
            if (k === 'spuelzeile') { B(M.fDark, x0 + 0.15, x1 - 0.15, y0 + 0.08, y1 - 0.1, 0.86, 0.905); C(M.metal, cx, f === 'S' ? y1 - 0.06 : y0 + 0.06, 0.9, 1.2, 0.015); }
          }
          else if (k === 'laufband') {
            B(M.fDark, x0, x1, y0, y1, 0, 0.2); B(M.fGym, x0 + 0.08, x1 - 0.08, y0 + 0.1, y1 - 0.3, 0.2, 0.22);
            for (const px of [x0 + 0.04, x1 - 0.07]) B(M.fDark, px, px + 0.03, y1 - 0.12, y1 - 0.06, 0.2, 1.25);
            B(M.fDark, x0, x1, y1 - 0.2, y1, 1.1, 1.28);
          } else if (k === 'rad') {
            B(M.fDark, cx - 0.2, cx + 0.2, y0 + 0.05, y1 - 0.05, 0, 0.06); B(M.fDark, cx - 0.06, cx + 0.06, cy - 0.35, cy + 0.15, 0.06, 0.85);
            B(M.fDark, cx - 0.12, cx + 0.12, cy + 0.05, cy + 0.32, 0.85, 0.93); B(M.fDark, cx - 0.22, cx + 0.22, cy - 0.45, cy - 0.38, 1.0, 1.05);
            C(M.fGym, cx, cy - 0.15, 0.25, 0.27, 0.22);
          } else if (k === 'matte') B(M.fGym, x0, x1, y0, y1, 0, 0.02);
          else if (k === 'kraftstation') {
            for (const [px, py] of [[x0, y0], [x1 - 0.07, y0], [x0, y1 - 0.07], [x1 - 0.07, y1 - 0.07]]) B(M.fDark, px, px + 0.07, py, py + 0.07, 0, 2.1);
            B(M.fDark, x0, x1, y0, y0 + 0.07, 2.03, 2.1); B(M.fDark, x0, x1, y1 - 0.07, y1, 2.03, 2.1);
            B(M.fGym, cx - 0.2, cx + 0.2, y0 + 0.2, y1 - 0.2, 0.35, 0.47); B(M.fDark, cx - 0.05, cx + 0.05, y0 + 0.3, y1 - 0.3, 0, 0.35);
          } else if (k === 'saunabank') {
            // zweistufig: unten die ganze Tiefe, oben die hintere Hälfte (zur Wand hin)
            const half = { N: [x0, x1, y0, cy], S: [x0, x1, cy, y1], W: [cx, x1, y0, y1], E: [x0, cx, y0, y1] }[f];
            B(M.fSauna, x0, x1, y0, y1, 0, 0.45); B(M.fSauna, ...half, 0.45, 0.9);
          }
          else if (k === 'ofen') { B(M.fDark, x0, x1, y0, y1, 0, 0.75); B(M.fLime, x0 + 0.05, x1 - 0.05, y0 + 0.05, y1 - 0.05, 0.75, 0.84); }
          else if (k === 'liege') { lounger(x0, x1, y0, y1); }
          else if (k === 'konsole') {
            // Konsolentisch mit Steinplatte an der Wand, darüber ein großer Spiegel und zwei Lampen (Rückseite gegenüber der Vorderseite f)
            const along = x1 - x0 >= y1 - y0, back = { S: [x0, x1, y1 - 0.03, y1], N: [x0, x1, y0, y0 + 0.03], W: [x1 - 0.03, x1, y0, y1], E: [x0, x0 + 0.03, y0, y1] }[f];
            const leg = along ? [[x0 + 0.06, cy], [x1 - 0.06, cy]] : [[cx, y0 + 0.06], [cx, y1 - 0.06]];
            for (const [px, py] of leg) B(M.fDark, px - 0.02, px + 0.02, py - 0.02, py + 0.02, 0, 0.8);
            B(M.fDark, x0, x1, y0, y1, 0.78, 0.8); B(M.fStone, x0 - 0.01, x1 + 0.01, y0 - 0.01, y1 + 0.01, 0.8, 0.84);
            const ia = along ? 0.15 : 0, ib = along ? 0 : 0.15;
            B(M.fDark, back[0] + ia, back[1] - ia, back[2] + ib, back[3] - ib, 1.05, 2.25);
            const mi = ia + (along ? 0.05 : 0), mj = ib + (along ? 0 : 0.05);
            const mir = { S: [x0 + mi, x1 - mi, y1 - 0.04, y1 - 0.03], N: [x0 + mi, x1 - mi, y0 + 0.03, y0 + 0.04], W: [x1 - 0.04, x1 - 0.03, y0 + mj, y1 - mj], E: [x0 + 0.03, x0 + 0.04, y0 + mj, y1 - mj] }[f];
            B(M.fMirror, ...mir, 1.1, 2.2);
            for (const t of [0.25, 0.75]) { const lx = along ? x0 + (x1 - x0) * t : cx, ly = along ? cy : y0 + (y1 - y0) * t; C(M.fDark, lx, ly, 0.84, 1.25, 0.012); C(M.fShade, lx, ly, 1.25, 1.5, 0.16, 0.11); }
          }
          else if (k === 'wärmepumpe') { B(M.fWhite, x0, x1, y0, y1, 0, 1.3); B(M.fDark, x0 + 0.15, x1 - 0.15, f === 'S' ? y0 - 0.005 : y1, f === 'S' ? y0 : y1 + 0.005, 0.5, 1.15); }
          else if (k === 'anschluss') B(M.fWhite, x0, x1, y0, y1, 0.5, 1.9);
          else if (k === 'wm' || k === 'tr') { B(M.fWhite, x0, x1, y0, y1, 0, 0.85); B(M.fDark, cx - 0.17, cx + 0.17, y0 - 0.005, y0, 0.3, 0.64); }
          else if (k === 'insel' || k === 'arbeitsfläche') {
            B(M.fOak, x0 + 0.05, x1 - 0.05, y0 + 0.05, y1 - 0.05, 0, 0.88); B(M.fStone, x0, x1, y0, y1, 0.88, 0.92);
            if (k === 'insel') {
              for (let i = 0; i < 3; i++) { const sx = x0 + (i + 0.5) * (x1 - x0) / 3; C(M.fDark, sx, y0 - 0.38, 0, 0.62, 0.025); C(M.fOak, sx, y0 - 0.38, 0.62, 0.67, 0.19); }
              for (const px of [x0 + 0.5, x1 - 0.5]) pendant(px, (y0 + y1) / 2, 1.75);
            }
          } else if (k === 'spüle') { B(M.fDark, x0 + 0.05, x1 - 0.05, y0 + 0.05, y1 - 0.05, 0.86, 0.905); C(M.metal, (x0 + x1) / 2, f === 'S' ? y1 - 0.06 : y0 + 0.06, 0.9, 1.2, 0.015); }
          else if (k === 'hochschrank') B(M.fWhite, x0, x1, y0, y1, 0, cap(x0, x1, y0, y1, 2.2));
          else if (k === 'kamin') {
            B(M.fLime, x0, x1, y0, y1, 0, 1.12); B(M.fStone, x0, x1 + 0.08, y0 - 0.08, y1 + 0.08, 1.12, 1.18); B(M.fLime, x0, x1 - 0.12, y0 + 0.12, y1 - 0.12, 1.18, ceil);
            B(M.fStone, x0, x1 + 0.4, y0 - 0.12, y1 + 0.12, 0, 0.05); B(M.fDark, x1 - 0.06, x1 + 0.004, y0 + 0.2, y1 - 0.2, 0.2, 0.78); B(M.fFire, x1 - 0.04, x1 + 0.006, y0 + 0.32, y1 - 0.32, 0.22, 0.42);
          } else if (k === 'bank') B(M.fOak, x0, x1, y0, y1, 0, 0.45);
          else if (k === 'couchtisch') { B(M.fDark, x0 + 0.12, x1 - 0.12, y0 + 0.12, y1 - 0.12, 0, 0.32); B(out ? M.fOutTop : M.fOak, x0, x1, y0, y1, 0.32, 0.4); }
          else if (k.startsWith('sessel')) {
            // Lehne auf der Seite S, N, W oder E, Armlehnen quer dazu
            const s = k.slice(-1).toUpperCase(), ns = s === 'S' || s === 'N';
            B(M.fFabric2, x0, x1, y0, y1, 0.04, 0.42); B(M.fDark, x0 + 0.06, x1 - 0.06, y0 + 0.06, y1 - 0.06, 0, 0.04);
            const bk = { S: [x0, x1, y0, y0 + 0.18], N: [x0, x1, y1 - 0.18, y1], W: [x0, x0 + 0.18, y0, y1], E: [x1 - 0.18, x1, y0, y1] }[s];
            B(M.fFabric2, ...bk, 0.42, 0.84);
            for (const e of ns ? [[x0, x0 + 0.12, y0, y1], [x1 - 0.12, x1, y0, y1]] : [[x0, x1, y0, y0 + 0.12], [x0, x1, y1 - 0.12, y1]]) B(M.fFabric2, ...e, 0.42, 0.6);
          } else if (k === 'nacht') { B(M.fOak, x0, x1, y0, y1, 0, 0.5); C(M.fDark, cx, cy, 0.5, 0.8, 0.02); C(M.fShade, cx, cy, 0.8, 0.98, 0.15, 0.11); }
          else if (k === 'kommode') B(M.fWhite, x0, x1, y0, y1, 0, cap(x0, x1, y0, y1, 0.85));
          else if (fl !== 'UG') B(M.fWhite, x0, x1, y0, y1, 0, cap(x0, x1, y0, y1, 0.75));
        } else if (t === 'shelf') {
          const [x0, x1, y0, y1] = a, f = front(x0, x1, y0, y1), rm = roomAt((x0 + x1) / 2, (y0 + y1) / 2), h = cap(x0, x1, y0, y1, 2.15);
          const along = f === 'N' || f === 'S', len = along ? x1 - x0 : y1 - y0, n = Math.max(1, Math.round(len / 0.8));
          B(M.fWhite, x0, x1, y0, y1, 0, h);
          for (let i = 0; i < n; i++) {
            const a0 = (along ? x0 : y0) + len * i / n, a1 = a0 + len / n;
            const fr = { S: [y0 - 0.01, y0], N: [y1, y1 + 0.01], W: [x0 - 0.01, x0], E: [x1, x1 + 0.01] }[f];
            const r4 = along ? [a0 + 0.03, a1 - 0.03, fr[0], fr[1]] : [fr[0], fr[1], a0 + 0.03, a1 - 0.03];
            if (rm && rm.n === 'Bibliothek') B(M.fBooks, r4[0], r4[1], r4[2], r4[3], 0.08, h - 0.08);
            else if (i > 0) B(M.fDark, ...(along ? [a0 - 0.004, a0 + 0.004, fr[0] - 0.002, fr[1]] : [fr[0] - 0.002, fr[1], a0 - 0.004, a0 + 0.004]), 0.05, h - 0.05);
          }
        } else if (t === 'bed') {
          const [x0, x1, y0, y1, head = 'N'] = a, hb = 0.08, pl = 0.38;
          B(M.fFabric2, x0, x1, y0, y1, 0.08, 0.32); B(M.fDark, x0 + 0.1, x1 - 0.1, y0 + 0.1, y1 - 0.1, 0, 0.08);
          B(M.fLinen, x0 + 0.04, x1 - 0.04, y0 + 0.04, y1 - 0.04, 0.32, 0.52);
          const vert = head === 'N' || head === 'S', span = vert ? x1 - x0 : y1 - y0, np = span > 1.4 ? 2 : 1, pw = (span - 0.2) / np;
          const dv = { N: [x0, x1, y0, y0 + (y1 - y0) * 0.7], S: [x0, x1, y1 - (y1 - y0) * 0.7, y1], E: [x0, x0 + (x1 - x0) * 0.7, y0, y1], W: [x1 - (x1 - x0) * 0.7, x1, y0, y1] }[head];
          B(M.fDuvet, dv[0] + 0.01, dv[1] - 0.01, dv[2] + 0.01, dv[3] - 0.01, 0.52, 0.6);
          for (let i = 0; i < np; i++) {
            const c0 = (vert ? x0 : y0) + 0.1 + i * pw, c1 = c0 + pw - 0.08;
            const r4 = { N: [c0, c1, y1 - hb - pl, y1 - hb - 0.04], S: [c0, c1, y0 + hb + 0.04, y0 + hb + pl], E: [x1 - hb - pl, x1 - hb - 0.04, c0, c1], W: [x0 + hb + 0.04, x0 + hb + pl, c0, c1] }[head];
            B(M.fLinen, ...r4, 0.52, 0.66);
          }
          const r4 = { N: [x0 - 0.04, x1 + 0.04, y1 - hb, y1], S: [x0 - 0.04, x1 + 0.04, y0, y0 + hb], E: [x1 - hb, x1, y0 - 0.04, y1 + 0.04], W: [x0, x0 + hb, y0 - 0.04, y1 + 0.04] }[head];
          B(M.fFabric2, ...r4, 0.08, cap(...r4, 1.15));
        } else if (t === 'sofa') {
          const [x0, x1, y0, y1, back] = a, th = 0.24, ar = 0.2;
          B(M.fDark, x0 + 0.05, x1 - 0.05, y0 + 0.05, y1 - 0.05, 0, 0.06); B(M.fFabric, x0, x1, y0, y1, 0.06, 0.44);
          const bk = { N: [x0, x1, y1 - th, y1], S: [x0, x1, y0, y0 + th], E: [x1 - th, x1, y0, y1], W: [x0, x0 + th, y0, y1] }[back];
          B(M.fFabric, ...bk, 0.44, cap(...bk, 0.86));
          const ends = back === 'N' || back === 'S' ? [[x0, x0 + ar, y0, y1], [x1 - ar, x1, y0, y1]] : [[x0, x1, y0, y0 + ar], [x0, x1, y1 - ar, y1]];
          for (const e of ends) B(M.fFabric, ...e, 0.44, 0.64);
          const vert = back === 'E' || back === 'W', len = vert ? y1 - y0 : x1 - x0;
          for (const t0 of [0.25, 0.72]) {
            const m = (vert ? y0 : x0) + len * t0, d = back === 'N' || back === 'E' ? -1 : 1, base = { N: y1 - th, S: y0 + th, E: x1 - th, W: x0 + th }[back];
            if (vert) B(M.fCushion, base + d * 0.02, base + d * 0.16, m - 0.2, m + 0.2, 0.44, 0.78); else B(M.fCushion, m - 0.2, m + 0.2, base + d * 0.02, base + d * 0.16, 0.44, 0.78);
          }
        } else if (t === 'table') {
          const [x0, x1, y0, y1, n = 3, ends = true] = a, horiz = x1 - x0 >= y1 - y0, g = 0.32, tx = (x0 + x1) / 2, ty = (y0 + y1) / 2;
          if (out && Math.max(x1 - x0, y1 - y0) < 0.8) {
            // kleiner runder Bistrotisch: Marmorplatte auf schwarzem Fuß
            C(M.fOutTop, tx, ty, 0.72, 0.75, 0.36); C(M.fOutMetal, tx, ty, 0.02, 0.72, 0.03); C(M.fOutMetal, tx, ty, 0, 0.03, 0.22);
          } else {
            B(out ? M.fOutTop : M.fOak, x0, x1, y0, y1, 0.72, 0.76);
            for (const [px, py] of [[x0 + 0.08, y0 + 0.08], [x1 - 0.08, y0 + 0.08], [x0 + 0.08, y1 - 0.08], [x1 - 0.08, y1 - 0.08]]) B(M.fOak, px - 0.03, px + 0.03, py - 0.03, py + 0.03, 0, 0.72);
          }
          for (let i = 0; i < n; i++) {
            if (horiz) { const m = x0 + (i + 0.5) * (x1 - x0) / n; chair(m, y1 + g, 0, -1); chair(m, y0 - g, 0, 1); }
            else { const m = y0 + (i + 0.5) * (y1 - y0) / n; chair(x1 + g, m, -1, 0); chair(x0 - g, m, 1, 0); }
          }
          if (ends) { if (horiz) { const m = (y0 + y1) / 2; chair(x0 - g, m, 1, 0); chair(x1 + g, m, -1, 0); } else { const m = (x0 + x1) / 2; chair(m, y1 + g, 0, -1); chair(m, y0 - g, 0, 1); } }
          if (fl === 'EG') for (const t0 of [0.3, 0.7]) pendant((x0 + x1) / 2, y0 + (y1 - y0) * t0, 1.65);
        } else if (t === 'tub') {
          const [x0, x1, y0, y1] = a;
          B(M.fCeramic, x0, x1, y0, y1, 0, 0.56); B(M.fBasin, x0 + 0.08, x1 - 0.08, y0 + 0.08, y1 - 0.08, 0.5, 0.565);
        } else if (t === 'shower') {
          const [x0, x1, y0, y1] = a, rm = roomAt((x0 + x1) / 2, (y0 + y1) / 2) || { r: [x0, x1, y0, y1] }, hh = cap(x0, x1, y0, y1, 2.0);
          B(M.fCeramic, x0, x1, y0, y1, 0, 0.04);
          if (Math.abs(x1 - rm.r[1]) > 0.05) B(M.glass, x1 - 0.01, x1, y0, y1, 0.04, hh);
          if (Math.abs(x0 - rm.r[0]) > 0.05) B(M.glass, x0, x0 + 0.01, y0, y1, 0.04, hh);
          if (Math.abs(y1 - rm.r[3]) > 0.05) B(M.glass, x0, x1, y1 - 0.01, y1, 0.04, hh);
          if (Math.abs(y0 - rm.r[2]) > 0.05) B(M.glass, x0, x1, y0, y0 + 0.01, 0.04, hh);
        } else if (t === 'wc') {
          const [x, y, dir] = a, d = dirs[dir], v = dir === 'N' || dir === 'S';
          const pw = v ? [x - 0.3, x + 0.3, y, y + d[1] * 0.14] : [x, x + d[0] * 0.14, y - 0.3, y + 0.3];
          B(M.fCeramic, ...pw, 0, cap(Math.min(pw[0], pw[1]), Math.max(pw[0], pw[1]), Math.min(pw[2], pw[3]), Math.max(pw[2], pw[3]), 1.1));
          const bx = x + d[0] * 0.42, by = y + d[1] * 0.42;
          C(M.fCeramic, bx, by, 0.3, 0.42, 0.18, 0.2);
          B(M.fCeramic, v ? x - 0.16 : x + d[0] * 0.14, v ? x + 0.16 : bx, v ? y + d[1] * 0.14 : y - 0.16, v ? by : y + 0.16, 0.3, 0.42);
        } else if (t === 'basin') {
          const [x, y, w, dir] = a, d = dirs[dir], v = dir === 'N' || dir === 'S';
          const r = (o0, o1) => v ? [x - w / 2, x + w / 2, y + d[1] * o0, y + d[1] * o1] : [x + d[0] * o0, x + d[0] * o1, y - w / 2, y + w / 2];
          B(M.fOak, ...r(0, 0.5), 0.45, 0.82); B(M.fCeramic, ...r(0, 0.52), 0.82, 0.86); B(M.fBasin, ...r(0.12, 0.44).map((q, i) => q + (v ? (i < 2 ? (i ? -0.08 : 0.08) : 0) : (i >= 2 ? (i === 2 ? 0.08 : -0.08) : 0))), 0.855, 0.87);
          const fx = x + d[0] * 0.07, fy = y + d[1] * 0.07; C(M.metal, fx, fy, 0.86, 1.04, 0.014);
          const mr = r(0, 0.02); B(M.fMirror, ...mr, 1.2, cap(Math.min(mr[0], mr[1]), Math.max(mr[0], mr[1]), Math.min(mr[2], mr[3]), Math.max(mr[2], mr[3]), 2.0));
        } else if (t === 'desk') {
          const [x0, x1, y0, y1, side] = a, d = { N: [0, 1], S: [0, -1], E: [1, 0], W: [-1, 0] }[side];
          B(M.fOak, x0, x1, y0, y1, 0.72, 0.75);
          for (const [px, py] of [[x0 + 0.05, y0 + 0.05], [x1 - 0.05, y0 + 0.05], [x0 + 0.05, y1 - 0.05], [x1 - 0.05, y1 - 0.05]]) B(M.fDark, px - 0.02, px + 0.02, py - 0.02, py + 0.02, 0, 0.72);
          const cx = (x0 + x1) / 2 + d[0] * ((x1 - x0) / 2 + 0.35), cy = (y0 + y1) / 2 + d[1] * ((y1 - y0) / 2 + 0.35);
          chair(cx, cy, -d[0], -d[1]);
        } else if (t === 'hob') { const [cx, cy] = a; B(M.fDark, cx - 0.3, cx + 0.3, cy - 0.26, cy + 0.26, 0.9, 0.906); }
      }
    }
    Object.assign(M, IN);
    // Teppiche im Wohnzimmer, im Familienraum und im Elternschlafzimmer; Warmwasserspeicher im Technikraum
    boxPlan(M.fRug, 1.0, 4.1, -9.9, -5.3, Zh.ffbEG + 0.006, Zh.ffbEG + 0.02);
    boxPlan(M.fRug, 6.3, 9.7, -9.8, -6.6, Zh.ffbOG + 0.006, Zh.ffbOG + 0.02);
    boxPlan(M.fRug, 12.2, 14.8, -9.4, -6.9, Zh.ffbDG + 0.006, Zh.ffbDG + 0.02);
    addCyl(M.fWhite, 14.8, -1.25, Zh.ffbUG, Zh.ffbUG + 1.9, 0.48, 0.48, 24);
  }
  // Sonnenliege: schwarzes Metallgestell, dickes helles Polster, Rückenteil am Kopfende (Osten bzw. Norden) angehoben
  function loungerAt(x0, x1, y0, y1, z) {
    const along = x1 - x0 >= y1 - y0, L0 = along ? x1 - x0 : y1 - y0, Wd = along ? y1 - y0 : x1 - x0;
    const P = (s0, s1, t0, t1) => along ? [x0 + s0, x0 + s1, y0 + t0, y0 + t1] : [x0 + t0, x0 + t1, y0 + s0, y0 + s1];
    const put = (mat, r, a, b) => boxPlan(mat, r[0], r[1], r[2], r[3], z + a, z + b);
    for (const s of [0.12, L0 - 0.12]) for (const t of [0.05, Wd - 0.05]) put(M.fOutMetal, P(s - 0.02, s + 0.02, t - 0.02, t + 0.02), 0, 0.28);
    put(M.fOutMetal, P(0, L0, 0, 0.03), 0.26, 0.3); put(M.fOutMetal, P(0, L0, Wd - 0.03, Wd), 0.26, 0.3);
    put(M.fOut, P(0.02, L0 - 0.7, 0.03, Wd - 0.03), 0.28, 0.4);
    const g = new THREE.BoxGeometry(0.74, 0.1, Wd - 0.06); g.translate(0.37, 0.05, 0); g.rotateZ(0.65);
    const pv = along ? new THREE.Vector3(x0 + L0 - 0.72, z + 0.3, -(y0 + Wd / 2)) : new THREE.Vector3(x0 + Wd / 2, z + 0.3, -(y0 + L0 - 0.72));
    addGeo(M.fOut, g, new THREE.Matrix4().makeTranslation(pv.x, pv.y, pv.z).multiply(along ? new THREE.Matrix4() : new THREE.Matrix4().makeRotationY(Math.PI / 2)));
  }
  // Sonnenschirm: Mast aus schwarzem Metall auf Steinplatte, heller Schirm
  function parasolAt(x, y, z, r = 1.5) {
    boxPlan(M.fOutTop, x - 0.25, x + 0.25, y - 0.25, y + 0.25, z, z + 0.06);
    addCyl(M.fOutMetal, x, y, z + 0.06, z + 2.55, 0.022, 0.022, 8);
    const g = new THREE.ConeGeometry(r, 0.42, 10, 1, true); g.translate(x, z + 2.42, -y); addGeo(M.canopy, g, null);
    addCyl(M.fOutMetal, x, y, z + 2.6, z + 2.68, 0.03, 0.03, 8);
  }
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
  // Gleichverteilte Zufallsdrehung bzw. Ausrichtung auf eine Normale mit etwas Streuung
  const randQ = () => { const u1 = rnd(), u2 = rnd() * 6.2832, u3 = rnd() * 6.2832, a = Math.sqrt(1 - u1), b = Math.sqrt(u1); return new THREE.Quaternion(a * Math.sin(u2), a * Math.cos(u2), b * Math.sin(u3), b * Math.cos(u3)); };
  const AXZ = new THREE.Vector3(0, 0, 1);
  const faceQ = (n, tilt) => new THREE.Quaternion().setFromUnitVectors(AXZ, n).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler((rnd() - 0.5) * tilt, (rnd() - 0.5) * tilt, rnd() * 6.2832)));
  // Dunkler Kern unter dem Laub, damit man nicht durch Büsche hindurchsieht
  function cores(list, mat, seg = 10) {
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75)), mat, list.length), m = new THREE.Matrix4();
    list.forEach(([x, y, z, rx, ry], i) => { m.makeScale(rx, ry, rx).setPosition(x, y, z); im.setMatrixAt(i, m); });
    im.castShadow = im.receiveShadow = true;
    return im;
  }
  // Hecken an West-, Nord- und Ostgrenze, 0,45 m innerhalb der Grenze: dunkler Kern, außen dicht mit Blattkarten besetzt
  function hedges() {
    const P0 = SITE.plot, chain = [[25.059, -44.0], P0[4], P0[5], P0[6], P0[0]], grp = new THREE.Group();
    const boxes = [];
    for (let i = 0; i < chain.length - 1; i++) {
      const [ax, ay] = chain[i], [bx, by] = chain[i + 1], L0 = Math.hypot(bx - ax, by - ay), ux = (bx - ax) / L0, uy = (by - ay) / L0;
      const nx = -uy, ny = ux, w = i === 0 ? 0.5 : 0.6, off = i === 0 ? 0.45 : 0.5, n = Math.max(1, Math.round(L0 / 1.8));
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n, cx = ax + ux * L0 * (t0 + t1) / 2 + nx * off, cy = ay + uy * L0 * (t0 + t1) / 2 + ny * off;
        boxes.push({ cx, cy, len: L0 / n + 0.08, w: w + (rnd() - 0.5) * 0.08, h: 1.2 + rnd() * 0.18, ux, uy });
      }
    }
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), M.hedgeCore, boxes.length), m = new THREE.Matrix4(), q = new THREE.Quaternion();
    const cards = [], up = new THREE.Vector3(0, 1, 0);
    boxes.forEach((b, i) => {
      q.setFromAxisAngle(up, Math.atan2(b.uy, b.ux));
      m.compose(new THREE.Vector3(b.cx, (b.h - 0.08) / 2, -b.cy), q, new THREE.Vector3(b.len, b.h - 0.08, b.w - 0.14)); im.setMatrixAt(i, m);
      // Plan: s entlang der Hecke, t quer dazu; Welt: x = Plan-x, z = −Plan-y
      const at = (s, t, z) => [b.cx + b.ux * s - b.uy * t, z, -(b.cy + b.uy * s + b.ux * t)];
      const side = sg => new THREE.Vector3(-b.uy * sg, 0, -b.ux * sg);
      const add = (p, n, sz) => { const k = (0.72 + 0.32 * rnd()) * (p[1] < 0.45 ? 0.8 : 1); cards.push({ p, n: [n.x, n.y, n.z], q: faceQ(n, 1.3), w: sz, h: sz, c: [k, k * 1.02, k * 0.96], flip: rnd() < 0.5 }); };
      const nTop = Math.round(b.len * b.w * 16), nSide = Math.round(b.len * b.h * 14);
      for (let k = 0; k < nTop; k++) {
        const t = (rnd() - 0.5) * b.w, n = up.clone().add(side(Math.sign(t)).multiplyScalar(Math.max(0, Math.abs(t) / (b.w / 2) - 0.5) * 1.6)).normalize();
        add(at((rnd() - 0.5) * b.len, t, b.h - 0.05 + rnd() * 0.07), n, 0.34 + rnd() * 0.16);
      }
      for (const sg of [-1, 1]) for (let k = 0; k < nSide; k++) {
        const z = 0.08 + rnd() * (b.h - 0.12), n = side(sg).add(up.clone().multiplyScalar(Math.max(0, z / b.h - 0.75) * 3)).normalize();
        add(at((rnd() - 0.5) * b.len, sg * (b.w / 2 - 0.02 + rnd() * 0.05), z), n, 0.32 + rnd() * 0.16);
      }
    });
    im.castShadow = im.receiveShadow = true;
    grp.add(im, cardMesh(cards, M.leafHedge));
    return grp;
  }
  // Offene Rampe zur Tiefgarage: Fahrbahn nach dem Längsprofil, Betonwände mit Geländer, Durchfahrt unter dem Poolhaus bis zum Tor
  function buildRamp(g) {
    const R0 = HOUSE.rampe, wx0 = R0.x0 - R0.wand, wx1 = R0.x1 + R0.wand, n = 90, pos = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const y = R0.y0 + (R0.yTor - R0.y0) * i / n, z = R0.z(y);
      pos.push(R0.x0, z, -y, R0.x1, z, -y);
      if (i) { const a = 2 * i - 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const road = new THREE.Mesh(geo, M.rampe); road.receiveShadow = true; g.add(road);
    // Wände: im offenen Teil 15 cm über Gelände, unter dem Poolhaus und im Anschluss der Tiefgarage unter der Decke
    for (const [a, b] of [[wx0, R0.x0], [R0.x1, wx1]]) {
      boxPlan(M.beton, a, b, R0.y0, R0.yPortal + 0.02, R0.zTG - 0.3, 0.15);
      boxPlan(M.beton, a, b, R0.yPortal + 0.02, R0.yTor, R0.zTG - 0.3, R0.decke);
    }
    // Decke unter dem Poolhaus (Sturz der Durchfahrt), dahinter die Decke der Tiefgarage; am Ende das Tor
    boxPlan(M.beton, wx0 + 0.01, wx1 - 0.01, R0.yPortal, R0.yPH, R0.decke, 0);
    const G = HOUSE.tg;
    boxPlan(M.beton, wx0 + 0.01, wx1 - 0.01, R0.yPH, R0.yTor, G.decke, G.decke + G.platte);
    // Sektionaltor in Anthrazit mit waagrechten Fugen
    boxPlan(M.tor, R0.x0, R0.x1, R0.yTor - 0.06, R0.yTor, R0.zTG, G.decke);
    for (let z = R0.zTG + 0.5; z < G.decke - 0.1; z += 0.5) boxPlan(M.tgSockel, R0.x0 + 0.02, R0.x1 - 0.02, R0.yTor - 0.07, R0.yTor - 0.055, z - 0.012, z + 0.012);
    for (const xr of [R0.x0 - R0.wand / 2, R0.x1 + R0.wand / 2]) {
      railing(M.metal, new THREE.Matrix4().makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(xr, 0, 0)), R0.y0 + 0.3, R0.yPortal - 0.06, 0.15, 1.05, 0);
    }
  }
  // Stab zwischen zwei Punkten (Welt), z. B. für Fahrradrahmen
  function rod(mat, a, b, r) {
    const d = new THREE.Vector3().subVectors(b, a), len = d.length(), g = new THREE.CylinderGeometry(r, r, len, 6);
    g.translate(0, len / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(a.x, a.y, a.z);
    addGeo(mat, g, null);
  }
  // Die vier Autos nach den echten Modellen, vereinfacht. Seitenprofil (u ab Front, v Höhe) mit Radläufen über die Breite gezogen,
  // zum Dach hin eingezogen und an Bug und Heck schmaler; Scheiben, Leuchten, Felgen mit Bremssätteln und typische Details.
  const CARS = {
    // Ferrari F8 Tributo: Mittelmotor, flacher Keil, Kabine weit vorn, Lufteinlässe in der Flanke, vier runde Rückleuchten
    ferrari: { L: 4.61, W: 1.98, H: 1.21, wf: 1.03, wr: 3.68, r: 0.34, tw: 0.28, sill: 0.13, belt: 0.84, cab: 0.72, paint: 'lackFerrari', rim: 'rim', cal: 'calYellow',
      top: [[0.04, 0.17], [0.0, 0.33], [0.04, 0.45], [0.28, 0.57], [0.85, 0.69], [1.45, 0.8], [1.95, 1.11], [2.28, 1.2], [2.62, 1.2], [3.05, 1.07], [3.7, 0.99], [4.3, 0.97], [4.56, 1.0], [4.61, 0.92], [4.6, 0.55], [4.52, 0.22]],
      win: [[1.62, 0.87], [2.02, 1.11], [2.55, 1.13], [2.98, 0.99], [2.92, 0.87]], ws: [1.5, 2.08], rw: [2.68, 3.28] },
    // Porsche Cayenne Coupé: SUV mit abfallendem Dach, durchgehendes Leuchtenband am Heck, vier Endrohre
    cayenne: { L: 4.93, W: 1.98, H: 1.68, wf: 0.99, wr: 3.89, r: 0.375, tw: 0.29, sill: 0.22, belt: 1.09, cab: 0.8, paint: 'lackCayenne', rim: 'rimDark', cal: 'calRed',
      top: [[0.04, 0.3], [0.0, 0.55], [0.03, 0.76], [0.2, 0.89], [0.9, 0.99], [1.5, 1.07], [1.66, 1.09], [2.32, 1.58], [2.86, 1.67], [3.38, 1.64], [4.12, 1.42], [4.58, 1.24], [4.8, 1.16], [4.91, 1.08], [4.93, 0.92], [4.92, 0.55], [4.85, 0.3]],
      win: [[1.78, 1.13], [2.34, 1.55], [3.33, 1.58], [4.05, 1.36], [4.07, 1.13]], ws: [1.7, 2.3], rw: [3.45, 4.1], pillars: [[2.74, 2.84]] },
    // VW T-Roc R: kompakter SUV, silberne Spiegelkappen, blaue Bremssättel, vier Endrohre
    troc: { L: 4.23, W: 1.82, H: 1.57, wf: 0.87, wr: 3.46, r: 0.34, tw: 0.235, sill: 0.18, belt: 1.05, cab: 0.82, paint: 'lackTroc', rim: 'rimDark', cal: 'calBlue',
      top: [[0.04, 0.3], [0.0, 0.52], [0.04, 0.8], [0.2, 0.93], [0.82, 0.99], [1.22, 1.04], [1.34, 1.05], [1.96, 1.49], [2.46, 1.57], [3.42, 1.55], [3.84, 1.5], [3.99, 1.4], [4.12, 1.13], [4.22, 1.01], [4.23, 0.5], [4.15, 0.3]],
      win: [[1.45, 1.09], [1.98, 1.46], [3.5, 1.48], [3.92, 1.24], [3.92, 1.09]], ws: [1.38, 1.94], rw: [3.88, 4.1], pillars: [[2.42, 2.5]] },
    // Mercedes V-Klasse: Großraumlimousine, kurze Haube, langer Glasbereich mit Chromleiste, senkrechtes Heck
    vklasse: { L: 5.14, W: 1.93, H: 1.9, wf: 0.98, wr: 4.18, r: 0.35, tw: 0.245, sill: 0.2, belt: 1.15, cab: 0.93, paint: 'lackV', rim: 'rim', cal: 'rimDark',
      top: [[0.04, 0.3], [0.0, 0.6], [0.06, 0.88], [0.32, 1.0], [0.76, 1.1], [0.93, 1.15], [1.75, 1.84], [2.06, 1.9], [4.96, 1.9], [5.1, 1.85], [5.14, 1.62], [5.14, 0.55], [5.08, 0.3]],
      win: [[1.08, 1.2], [1.76, 1.79], [4.94, 1.8], [5.06, 1.62], [5.06, 1.2]], ws: [0.98, 1.76], rw: null, pillars: [[1.98, 2.08], [3.57, 3.67]] },
  };
  function carModel(key, X0, CY, zf) {
    const s = CARS[key], { L, W, H, r, tw, sill, belt, cab } = s, hw = W / 2, ra = r + 0.075, paint = M[s.paint], bs = 0.035;
    const kU = u => 1 - 0.1 * Math.pow(Math.max(0, 1 - u / 0.55), 2) - 0.08 * Math.pow(Math.max(0, 1 - (L - u) / 0.45), 2);
    const kV = v => v <= belt ? 1 : 1 - (1 - cab) * Math.min(1, (v - belt) / (H - belt));
    const half = (u, v) => hw * kU(u) * kV(v);
    // Kontur als weiche Kurve durch die Stützpunkte (Haube, Scheibe, Dach und Heck gehen ineinander über)
    const top = new THREE.CatmullRomCurve3(s.top.map(([u, v]) => new THREE.Vector3(u, v, 0)), false, 'centripetal').getPoints(s.top.length * 5).map(p => [p.x, p.y]);
    // Höhe der Oberkante bei u (größter Wert der Kontur dort)
    const vTop = u => { let v = 0; for (let i = 0; i < top.length - 1; i++) { const [a, b] = top[i], [c, d] = top[i + 1]; if ((u - a) * (u - c) <= 0 && a !== c) v = Math.max(v, b + (d - b) * (u - a) / (c - a)); } return v; };
    const arcPts = c => Array.from({ length: 13 }, (_, k) => [c + ra * Math.cos(Math.PI * k / 12), r + ra * Math.sin(Math.PI * k / 12)]);
    const bot = [[L - 0.08, sill], [s.wr + ra, sill], ...arcPts(s.wr), [s.wr - ra, sill], [s.wf + ra, sill], ...arcPts(s.wf), [s.wf - ra, sill], [0.08, sill]];
    // Karosserie: extrudieren, einziehen, glatt schattieren
    const bt = 0.07;
    let body = new THREE.ExtrudeGeometry(new THREE.Shape([...top, ...bot].map(([u, v]) => v2(u, v))), { depth: W - 2 * bt, bevelEnabled: true, bevelThickness: bt, bevelSize: bs, bevelSegments: 3, curveSegments: 1 });
    body.translate(0, 0, -(W - 2 * bt) / 2);
    const bp = body.attributes.position;
    for (let i = 0; i < bp.count; i++) bp.setZ(i, bp.getZ(i) * kU(bp.getX(i)) * kV(bp.getY(i)));
    // Normalen nur bis 35° glätten: runde Fasen, aber klare Kanten an Schulter, Dach und Front
    body = toCreasedNormals(body, 0.6);
    body.translate(X0, zf, -CY); addGeo(paint, body, null);
    // Flächen auf der Flanke (Scheiben, Säulen, Einlässe), dem Dach bzw. der Haube und auf Front oder Heck
    const sideShape = (mat, pts, off = 0.006) => {
      for (const sg of [-1, 1]) {
        const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([u, v]) => v2(u, v)))), p = g.attributes.position;
        for (let i = 0; i < p.count; i++) p.setZ(i, sg * (half(p.getX(i), p.getY(i)) + off));
        if (sg < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i]; ix[i] = ix[i + 2]; ix[i + 2] = t; } }
        g.computeVertexNormals(); g.translate(X0, zf, -CY); addGeo(mat, g, null);
      }
    };
    const topQuad = (mat, u0, u1, t0, t1, off = 0.008 + bs) => {
      const v0 = vTop(u0), v1 = vTop(u1), du = u1 - u0, dv = v1 - v0, l = Math.hypot(du, dv), nu = -dv / l * off, nv = du / l * off;
      const c0 = Math.min(Math.abs(t0), half(u0, v0) - 0.03) * Math.sign(t0 || 1), c1 = Math.min(Math.abs(t1), half(u0, v0) - 0.03) * Math.sign(t1 || 1);
      const d0 = Math.min(Math.abs(t0), half(u1, v1) - 0.03) * Math.sign(t0 || 1), d1 = Math.min(Math.abs(t1), half(u1, v1) - 0.03) * Math.sign(t1 || 1);
      const A = [X0 + u0 + nu, zf + v0 + nv], B = [X0 + u1 + nu, zf + v1 + nv], g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([A[0], A[1], -CY + c0, B[0], B[1], -CY + d1, B[0], B[1], -CY + d0, A[0], A[1], -CY + c0, A[0], A[1], -CY + c1, B[0], B[1], -CY + d1], 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(12), 2)); g.computeVertexNormals(); addGeo(mat, g, null);
    };
    // Front und Heck liegen wegen der Fase 3,5 cm weiter außen als die Kontur
    const end = (mat, u, v0, v1, t0, t1, d = 0.024) => { const uu = u + (u > L / 2 ? bs : -bs); addBox(mat, null, X0 + uu - d / 2, X0 + uu + d / 2, zf + v0, zf + v1, -CY + t0, -CY + t1); };
    const both = (fn, a, b) => { fn(a, b); fn(-b, -a); };
    const disc = (mat, u, v, t, rr, len = 0.03) => { const g = new THREE.CylinderGeometry(rr, rr, len, 18); g.rotateZ(Math.PI / 2); g.translate(X0 + u, zf + v, -CY + t); addGeo(mat, g, null); };
    sideShape(M.carGlass, s.win, 0.004);
    for (const [a, b] of s.pillars || []) sideShape(M.trim, [[a, belt + 0.02], [b, belt + 0.02], [b + 0.01, H - 0.08], [a + 0.01, H - 0.08]], 0.009);
    topQuad(M.carGlass, s.ws[0], s.ws[1], -hw, hw);
    if (s.rw) topQuad(M.carGlass, s.rw[0], s.rw[1], -hw, hw);
    // Räder: Reifen, Felge mit fünf Speichen, Bremssattel, Radhausschale
    for (const uc of [s.wf, s.wr]) {
      const liner = new THREE.CylinderGeometry(ra, ra, W - 0.22, 18, 1, true); liner.rotateX(Math.PI / 2); liner.translate(X0 + uc, zf + r, -CY); addGeo(M.archLiner, liner, null);
      for (const sg of [-1, 1]) {
        const tc = sg * (hw * kU(uc) - tw / 2 - 0.02), to = tc + sg * tw / 2, cxw = X0 + uc, cyw = zf + r;
        const tire = new THREE.CylinderGeometry(r, r, tw, 30); tire.rotateX(Math.PI / 2); tire.translate(cxw, cyw, -CY + tc); addGeo(M.tire, tire, null);
        const rimG = new THREE.CylinderGeometry(r * 0.72, r * 0.72, 0.03, 30); rimG.rotateX(Math.PI / 2); rimG.translate(cxw, cyw, -CY + to - sg * 0.12); addGeo(M.rimDark, rimG, null);
        const lip = new THREE.TorusGeometry(r * 0.71, 0.018, 6, 30); lip.translate(cxw, cyw, -CY + to - sg * 0.02); addGeo(M[s.rim], lip, null);
        for (let k = 0; k < 5; k++) {
          const sp = new THREE.BoxGeometry(r * 0.66, 0.055, 0.028); sp.translate(r * 0.33, 0, 0); sp.rotateZ(k * Math.PI * 2 / 5 + 0.3); sp.translate(cxw, cyw, -CY + to - sg * 0.025); addGeo(M[s.rim], sp, null);
        }
        const hub = new THREE.CylinderGeometry(0.06, 0.06, 0.03, 14); hub.rotateX(Math.PI / 2); hub.translate(cxw, cyw, -CY + to - sg * 0.02); addGeo(M[s.rim], hub, null);
        const cal = new THREE.BoxGeometry(0.15, 0.1, 0.05); cal.rotateZ(0.9); cal.translate(cxw - r * 0.42, cyw + r * 0.38, -CY + to - sg * 0.075); addGeo(M[s.cal], cal, null);
      }
    }
    // Spiegel und Kennzeichen (ohne Schrift)
    const mu = s.win[0][0] + 0.05, mv = belt + 0.06, mirrorMat = key === 'troc' ? M.chrome : paint;
    for (const sg of [-1, 1]) addBox(mirrorMat, null, X0 + mu, X0 + mu + 0.16, zf + mv, zf + mv + 0.11, -CY + sg * (half(mu, mv) + 0.02), -CY + sg * (half(mu, mv) + 0.2));
    end(M.paint, L - 0.005, 0.5, 0.62, -0.26, 0.26, 0.012);
    // Modelltypische Details
    if (key === 'ferrari') {
      topQuad(M.headlight, 0.06, 0.26, 0.5, 0.86); topQuad(M.headlight, 0.06, 0.26, -0.86, -0.5);
      end(M.grille, 0.02, 0.18, 0.33, -0.72, 0.72); topQuad(M.grille, 0.4, 0.85, -0.3, 0.3);
      sideShape(M.grille, [[3.02, 0.48], [3.48, 0.57], [3.5, 0.83], [3.1, 0.8]], 0.008);
      topQuad(M.grille, 3.35, 4.25, -0.5, 0.5);
      for (const t of [0.55, 0.78]) for (const sg of [-1, 1]) { disc(M.taillight, L + bs + 0.004, 0.85, sg * t, 0.068); disc(M.trim, L + bs - 0.002, 0.85, sg * t, 0.085, 0.02); }
      end(M.grille, L - 0.05, 0.14, 0.34, -0.8, 0.8, 0.1);
      for (const sg of [-1, 1]) disc(M.chrome, L + bs - 0.01, 0.42, sg * 0.2, 0.05, 0.08);
    } else if (key === 'cayenne') {
      topQuad(M.headlight, 0.05, 0.3, 0.52, 0.88); topQuad(M.headlight, 0.05, 0.3, -0.88, -0.52);
      end(M.grille, 0.015, 0.33, 0.6, -0.32, 0.32); both((a, b) => end(M.grille, 0.02, 0.32, 0.58, a, b), 0.4, 0.86);
      end(M.taillight, L - 0.005, 0.98, 1.03, -0.86, 0.86); both((a, b) => end(M.taillight, L - 0.01, 0.92, 1.06, a, b), 0.62, 0.9);
      end(M.grille, L - 0.03, 0.28, 0.46, -0.9, 0.9, 0.06);
      for (const t of [0.5, 0.66]) for (const sg of [-1, 1]) disc(M.chrome, L + bs, 0.4, sg * t, 0.045, 0.08);
    } else if (key === 'troc') {
      topQuad(M.headlight, 0.04, 0.24, 0.38, 0.82); topQuad(M.headlight, 0.04, 0.24, -0.82, -0.38);
      end(M.grille, 0.03, 0.74, 0.9, -0.38, 0.38); end(M.chrome, 0.02, 0.81, 0.83, -0.4, 0.4); end(M.grille, 0.02, 0.32, 0.52, -0.7, 0.7);
      both((a, b) => end(M.taillight, L - 0.004, 0.95, 1.05, a, b), 0.45, 0.85); end(M.trim, L - 0.004, 0.97, 1.03, -0.45, 0.45);
      for (const t of [0.36, 0.5]) for (const sg of [-1, 1]) disc(M.chrome, L + bs, 0.36, sg * t, 0.04, 0.08);
    } else if (key === 'vklasse') {
      topQuad(M.headlight, 0.08, 0.32, 0.55, 0.9); topQuad(M.headlight, 0.08, 0.32, -0.9, -0.55);
      end(M.grille, 0.035, 0.6, 0.86, -0.52, 0.52);
      for (const v of [0.66, 0.73, 0.8]) end(M.chrome, 0.02, v - 0.012, v + 0.012, -0.5, 0.5);
      end(M.grille, 0.025, 0.32, 0.5, -0.75, 0.75);
      sideShape(M.chrome, [[1.12, 1.165], [5.02, 1.165], [5.02, 1.19], [1.12, 1.19]], 0.009);
      for (const u of [2.08, 3.62]) sideShape(M.trim, [[u, 0.4], [u + 0.012, 0.4], [u + 0.012, 1.15], [u, 1.15]], 0.008);
      end(M.carGlass, L + 0.003, 1.16, 1.74, -0.78, 0.78, 0.012);
      both((a, b) => end(M.taillight, L + 0.002, 0.9, 1.45, a, b, 0.016), 0.8, 0.93);
    }
  }
  // Tiefgarage und Erdreich für den Blick in den Keller: 2,70 m lichte Höhe, heller Beschichtungsboden, weiße Wände mit dunklem Sockel,
  // Holzlamellen an der Stirnwand hinter den Autos, Lichtlinien an der Decke, Wallboxen, Schrankwand, Fahrräder
  function buildGarage() {
    const g = new THREE.Group(), R0 = HOUSE.rampe, G = HOUSE.tg, zf = R0.zTG, zc = G.decke;
    const TGF = [[4.5, -11.65], [23.499, -11.65], [23.499, -24.151], [11.498, -24.151], [11.498, -14.652], [4.5, -14.652]];
    g.add(extrude(TGF, M.tgFloor, zf - 0.3, 0.3), extrude(TGF, M.tgCeil, zc, G.platte));
    const walls = [[16, 23.499, -11.95, -11.65], [23.199, 23.499, -24.151, -11.65], [22.885, 23.499, -24.151, -23.851], [11.498, 19.38, -24.151, -23.851],
      [11.498, 11.798, -24.151, -14.652], [4.5, 11.798, -14.652, -14.352], [4.5, 4.8, -14.652, -11.65]];
    for (const r of walls) { boxPlan(M.tgWall, r[0], r[1], r[2], r[3], zf, zc); wallRects.push({ fl: 'UG', r, top: zc }); }
    // dunkler Sockel an den Innenseiten der Wände
    for (const [x0, x1, y0, y1] of [[16, 23.199, -11.97, -11.95], [23.179, 23.199, -23.851, -11.95], [11.798, 19.38, -23.871, -23.851], [11.798, 11.818, -23.851, -14.652], [4.8, 11.798, -14.372, -14.352]])
      boxPlan(M.tgSockel, x0, x1, y0, y1, zf, zf + 0.12);
    // Rampenwände unterhalb des Kellerschnitts ebenfalls mit Schnittfläche
    for (const [a, b] of [[R0.x0 - R0.wand, R0.x0], [R0.x1, R0.x1 + R0.wand]]) wallRects.push({ fl: 'UG', r: [a, b, cutRampY(), R0.yTor], top: 0 });
    // Stellplätze 2,70 m breit, dunkle Linien auf hellem Boden; Gehweg zur Schleuse markiert
    for (let i = 0; i <= 4; i++) boxPlan(M.tgLine, G.x0, G.x1, G.y0 + G.bucht * i - 0.05, G.y0 + G.bucht * i + 0.05, zf, zf + 0.004);
    boxPlan(M.tgLine, 11.8, 23.2, G.y0 + 4 * G.bucht + 0.25, G.y0 + 4 * G.bucht + 0.3, zf, zf + 0.004);
    // Stirnwand hinter den Autos: senkrechte Eichenlamellen, oben eine indirekte Lichtleiste
    for (let y = G.y0 + 0.05; y < G.y0 + 4 * G.bucht - 0.05; y += 0.075) boxPlan(M.tgHolz, 11.8, 11.84, y, y + 0.045, zf + 0.12, zc - 0.12);
    boxPlan(M.led, 11.86, 11.9, G.y0, G.y0 + 4 * G.bucht, zc - 0.11, zc - 0.07);
    // Wallboxen zwischen den Stellplätzen
    for (let i = 0; i < 4; i++) {
      const y = G.mitte(i) - 0.95;
      boxPlan(M.tgBox, 11.84, 11.97, y - 0.17, y + 0.17, zf + 1.05, zf + 1.5); boxPlan(M.ledGreen, 11.97, 11.975, y - 0.05, y + 0.05, zf + 1.38, zf + 1.42);
      boxPlan(M.trim, 11.84, 11.95, y - 0.1, y + 0.1, zf + 0.92, zf + 1.02);
    }
    // Schrankwand an der Nordwand neben der Fahrgasse
    for (let x = 17.4; x < 23.1; x += 0.95) { boxPlan(M.tgBox, x, x + 0.93, -12.55, -11.95, zf + 0.1, zf + 2.25); boxPlan(M.trim, x + 0.86, x + 0.88, -12.565, -12.55, zf + 0.9, zf + 1.4); }
    boxPlan(M.tgSockel, 17.4, 23.05, -12.5, -11.95, zf, zf + 0.1);
    // Lichtlinien an der Decke: über den Autos, über der Fahrgasse, quer am Gehweg und unter der Terrasse
    for (const [x0, x1, y0, y1] of [[13.5, 13.56, G.y0 + 0.3, G.y0 + 4 * G.bucht - 0.3], [15.9, 15.96, G.y0 + 0.3, G.y0 + 4 * G.bucht - 0.3], [20.2, 20.26, -23.4, -12.4],
      [12.2, 22.8, -12.86, -12.8], [5.2, 11.2, -13.05, -12.99]]) boxPlan(M.led, x0, x1, y0, y1, zc - 0.025, zc);
    // Autos in P1 bis P4 mit der Front zur Holzwand
    G.autos.forEach((c, i) => carModel(c.k, G.x0 + 0.05, G.mitte(i), zf));
    // Echtes Licht unter den Lichtlinien (ohne Schatten); brennt nur, wenn man in der Tiefgarage ist oder von oben hineinsieht
    L.tgLights = [[14.7, -21.0], [14.7, -15.8], [20.2, -20.5], [20.2, -14.5], [8.0, -13.0]].map(([x, y]) => {
      const l = new THREE.PointLight(0xfff0dc, 0, 10, 2); l.position.set(x, zc - 0.35, -y); g.add(l); return l;
    });
    // Fahrräder im Bereich unter der Terrasse
    for (let i = 0; i < 5; i++) {
      const x = 5.4 + i * 1.1, yR = -13.4, yF = -12.3, hz = zf + 0.35, P3 = (yy, zz) => new THREE.Vector3(x, zz, -yy);
      for (const yy of [yR, yF]) { const t = new THREE.TorusGeometry(0.33, 0.022, 6, 28); t.rotateY(Math.PI / 2); t.translate(x, hz, -yy); addGeo(M.tire, t, null); }
      const seat = P3(-13.05, zf + 0.95), bar = P3(-12.45, zf + 1.02), bb = P3(-12.9, zf + 0.32);
      rod(M.bikeFrame, P3(yR, hz), seat, 0.018); rod(M.bikeFrame, P3(yR, hz), bb, 0.018); rod(M.bikeFrame, bb, seat, 0.02);
      rod(M.bikeFrame, bb, P3(-12.45, zf + 0.85), 0.02); rod(M.bikeFrame, seat, P3(-12.45, zf + 0.85), 0.018); rod(M.bikeFrame, P3(yF, hz), bar, 0.018);
      rod(M.tire, P3(-12.45, zf + 1.02).add(new THREE.Vector3(-0.25, 0, 0)), P3(-12.45, zf + 1.02).add(new THREE.Vector3(0.25, 0, 0)), 0.014);
    }
    flushBatches(g);
    // Erdreich auf Höhe des Kellerschnitts mit einer Öffnung für Keller, Tiefgarage und Rampe (nur im Kellerblick sichtbar)
    const yc = cutRampY(), hole = [[0, 0], [16, 0], [16, -11.65], [23.499, -11.65], [23.499, -24.151], [22.885, -24.151], [22.885, yc], [19.38, yc],
      [19.38, -24.151], [11.498, -24.151], [11.498, -14.652], [4.5, -14.652], [4.5, -11.65], [0, -11.65]];
    // In Stücken, damit keine langen, spitzen Dreiecke von der Öffnung bis zum Rand entstehen (helle Nähte im Bild)
    const erde = new THREE.Group(), ze = LEVEL_CUT.UG - 0.004, bx0 = -2, bx1 = 25.5, by0 = yc - 2, by1 = 2;
    for (const [a, b, c, e] of [[-120, bx0, -140, 120], [bx1, 150, -140, 120], [bx0, bx1, -140, by0], [bx0, bx1, by1, 120]]) erde.add(flat([[a, c], [b, c], [b, e], [a, e]], M.earth, ze));
    erde.add(flat([[bx0, by0], [bx1, by0], [bx1, by1], [bx0, by1]], M.earth, ze, [hole]));
    erde.visible = false; g.add(erde); L.erde = erde;
    return g;
  }
  // Wo die Rampe die Schnitthöhe des Kellerblicks unterschreitet
  function cutRampY() {
    const R0 = HOUSE.rampe, zc = LEVEL_CUT.UG;
    let a = R0.y0, b = R0.y1;
    for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (R0.z(m) > zc) a = m; else b = m; }
    return b;
  }
  // Bäume in den Nachbargärten nach den Luftbildern: dichter Bestand aus Laub- und Nadelbäumen, einzelne Blutbuchen.
  // Nicht auf Häusern, Straßen und dem eigenen Grundstück und nicht in den Sichtachsen der Kamerablicke.
  function neighborGreen() {
    const grp = new THREE.Group(), leaf = [], needle = [], barkParts = [], Yax = new THREE.Vector3(0, 1, 0);
    const inPoly = (x, y, P) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
    const segDist = (x, y, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy); };
    const polyDist = (x, y, P) => { let d = 1e9; for (let i = 0; i < P.length; i++) d = Math.min(d, segDist(x, y, P[i], P[(i + 1) % P.length])); return d; };
    const blocks = [...SITE.neighbors, ...SITE.secondary].map(b => b.pts);
    const sights = ['garten', 'eingang', 'ost', 'west', 'zufahrt', 'schnitt'].map(k => [[PRESETS[k].pos[0], -PRESETS[k].pos[2]], [PRESETS[k].tgt[0], -PRESETS[k].tgt[2]]]);
    const limb = (a, b, r0, r1) => {
      const d = new THREE.Vector3().subVectors(b, a), len = d.length(), cg = new THREE.CylinderGeometry(r1, r0, len, 7, 1, true);
      cg.translate(0, len / 2, 0); cg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Yax, d.normalize())); cg.translate(a.x, a.y, a.z); barkParts.push(cg);
    };
    let n = 0;
    for (let gx = -56; gx <= 86; gx += 7.5) for (let gy = -86; gy <= 62; gy += 7.5) {
      const x = gx + (rnd() - 0.5) * 5, y = gy + (rnd() - 0.5) * 5, kind = rnd(), r = 2.6 + rnd() * 3.4;
      if (rnd() > 0.62) continue;
      const conifer = kind < 0.38, beech = kind > 0.9, rr = conifer ? 1.6 + rnd() * 1.4 : r;
      if (inPoly(x, y, SITE.plot) || polyDist(x, y, SITE.plot) < rr * 0.6) continue;
      if (SITE.streets.some(st => inPoly(x, y, st) || polyDist(x, y, st) < rr * 0.7)) continue;
      if (blocks.some(B => inPoly(x, y, B) || polyDist(x, y, B) < rr * 0.8)) continue;
      if (sights.some(([a, b]) => segDist(x, y, a, b) < rr + 1.5)) continue;
      const far = Math.hypot(x - 10, y + 15) > 55 ? 0.6 : 1, cx = x, cz = -y;
      if (conifer) {
        // Nadelbaum: kurzer Stamm, kegelförmige Krone aus Nadelzweigen
        const H = 11 + rnd() * 10, base = 1.2 + rnd() * 1.5, R = rr;
        limb(new THREE.Vector3(cx, -0.1, cz), new THREE.Vector3(cx, H * 0.85, cz), 0.16 + 0.04 * R, 0.05);
        const cnt = Math.round(far * 3.2 * Math.PI * R * (H - base) / 0.8);
        for (let k = 0; k < cnt; k++) {
          const t = Math.pow(rnd(), 0.8), hgt = base + t * (H - base), rad = R * Math.pow(1 - t, 0.9) * (0.55 + 0.45 * Math.sqrt(rnd())), a = rnd() * Math.PI * 2;
          const nrm = new THREE.Vector3(Math.cos(a), 0.35, Math.sin(a)).normalize(), k0 = (0.55 + 0.45 * rad / Math.max(0.3, R)) * (0.85 + 0.25 * rnd()), sz = 0.75 + 0.4 * rnd();
          needle.push({ p: [cx + Math.cos(a) * rad, hgt, cz + Math.sin(a) * rad], n: [nrm.x, nrm.y, nrm.z], q: faceQ(nrm, 1.6), w: sz, h: sz, c: [k0 * 0.95, k0, k0 * 1.02], flip: rnd() < 0.5 });
        }
      } else {
        // Laubbaum oder Blutbuche: Stamm, ein paar Äste, kugelige Krone aus Blattbüscheln
        const H = 7 + 1.7 * r, zc = H - r * 0.9, ry = r * 0.82;
        limb(new THREE.Vector3(cx, -0.1, cz), new THREE.Vector3(cx, zc - ry * 0.2, cz), 0.14 + 0.035 * r, 0.07 + 0.015 * r);
        for (let k = 0; k < 4; k++) { const a = rnd() * Math.PI * 2; limb(new THREE.Vector3(cx, zc - ry * 0.5, cz), new THREE.Vector3(cx + Math.cos(a) * r * 0.6, zc + ry * 0.2, cz + Math.sin(a) * r * 0.6), 0.06 + 0.015 * r, 0.02); }
        const tint = beech ? [1.3, 0.52, 0.6] : [[1, 1, 0.92], [0.9, 0.98, 0.88], [1.05, 1.03, 0.84]][n % 3], cs = 1.1 + 0.05 * r, cnt = Math.round(far * 34 * r * r / (cs * cs) / 9);
        for (let c = 0; c < cnt; c++) {
          const u1 = rnd() * 2 - 1, phi = rnd() * Math.PI * 2, sq = Math.sqrt(1 - u1 * u1), rr2 = r * (0.62 + 0.38 * Math.cbrt(rnd()));
          const px = cx + sq * Math.cos(phi) * rr2, py = zc + u1 * rr2 * 0.85, pz = cz + sq * Math.sin(phi) * rr2;
          if (py < Math.max(2.2, zc - ry)) continue;
          const out = new THREE.Vector3((px - cx) / r, (py - zc) / ry, (pz - cz) / r), dep = Math.min(1, out.length()), nO = out.normalize(), k0 = (0.55 + 0.45 * dep) * (0.88 + 0.24 * rnd());
          for (let j = 0; j < 9; j++) {
            const off = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(cs * 1.5), nn = nO.clone().multiplyScalar(0.85).addScaledVector(off.clone().normalize(), 0.3).normalize();
            leaf.push({ p: [px + off.x, py + off.y, pz + off.z], n: [nn.x, nn.y, nn.z], q: randQ(), w: cs, h: cs, c: [tint[0] * k0, tint[1] * k0, tint[2] * k0], flip: rnd() < 0.5 });
          }
        }
      }
      n++;
    }
    grp.add(cardMesh(leaf, M.leafTree), cardMesh(needle, M.leafNeedle));
    const bark = new THREE.Mesh(mergeGeometries(barkParts, false), M.bark); bark.castShadow = bark.receiveShadow = true; grp.add(bark);
    return grp;
  }
  // Geschwungene Ziegelmauer an der Straßenecke im Südosten (Luftbild), 1,60 m hoch mit heller Abdeckung
  function brickWall() {
    const wallPts = [[38, -54.4], [43.8, -55.7], [46.8, -55.85], [50.1, -54.95], [52.7, -53.15], [54.45, -50.85], [55.25, -48.4], [55.3, -44.5]];
    for (let i = 0; i < wallPts.length - 1; i++) {
      const [ax, ay] = wallPts[i], [bx, by] = wallPts[i + 1], len = Math.hypot(bx - ax, by - ay), ang = Math.atan2(by - ay, bx - ax);
      const m = new THREE.Matrix4().makeRotationY(ang).setPosition((ax + bx) / 2, 0, -(ay + by) / 2);
      addBox(M.brick, m, -len / 2 - 0.15, len / 2 + 0.15, 0, 1.6, -0.15, 0.15);
      addBox(M.brickCap, m, -len / 2 - 0.18, len / 2 + 0.18, 1.6, 1.68, -0.19, 0.19);
    }
  }
  // Kontaktschatten am Boden: Grundrisse von Häusern, Hecken und Stämmen, weich gezeichnet. Wirkt als aoMap nur auf das Himmelslicht.
  function groundAO() {
    const N = 640, k = N / AO.s, X = x => (x - AO.x0) * k, Y = y => (AO.y0 + AO.s - y) * k, C = SITE.concept;
    const mask = document.createElement('canvas'); mask.width = mask.height = N;
    const s = mask.getContext('2d'); s.fillStyle = s.strokeStyle = '#000'; s.lineCap = s.lineJoin = 'round';
    const poly = P => { s.beginPath(); P.forEach(([x, y], i) => (i ? s.lineTo(X(x), Y(y)) : s.moveTo(X(x), Y(y)))); s.closePath(); s.fill(); };
    for (const b of [...SITE.neighbors, ...SITE.secondary]) poly(b.pts);
    for (const P0 of [C.haus, C.freisitz, C.poolhaus]) poly(P0);
    const P0 = SITE.plot, chain = [[25.059, -44.0], P0[4], P0[5], P0[6], P0[0]];
    s.lineWidth = 0.9 * k; s.beginPath(); chain.forEach(([x, y], i) => (i ? s.lineTo(X(x), Y(y)) : s.moveTo(X(x), Y(y)))); s.stroke();
    for (const t of SITE.trees) { s.beginPath(); s.arc(X(t.c[0]), Y(t.c[1]), (0.5 + 0.05 * t.r) * k, 0, 6.2832); s.fill(); }
    const c = document.createElement('canvas'); c.width = c.height = N;
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, N, N); g.imageSmoothingEnabled = true;
    for (const [div, a] of [[16, 0.35], [6, 0.4], [3, 0.35]]) {
      const sm = document.createElement('canvas'); sm.width = sm.height = N / div;
      sm.getContext('2d').drawImage(mask, 0, 0, N / div, N / div);
      g.globalAlpha = a; g.drawImage(sm, 0, 0, N, N);
    }
    const t = new THREE.CanvasTexture(c); t.channel = 1; t.colorSpace = THREE.NoColorSpace;
    for (const m of [M.lawn, M.ground, M.pave, M.street]) { m.aoMap = t; m.aoMapIntensity = 1; m.needsUpdate = true; }
  }
  // Walmdach über einem Rechteck im Plan, Traufe ze, Neigung tn; First in der längeren Richtung. UV in Metern wie beim Hausdach.
  function hipRoof(X0, X1, Y0, Y1, ze, tn) {
    const alongY = Y1 - Y0 >= X1 - X0, h = (alongY ? X1 - X0 : Y1 - Y0) / 2, zr = ze + tn * h, xm = (X0 + X1) / 2, ym = (Y0 + Y1) / 2;
    const c = [[X0, Y0], [X1, Y0], [X1, Y1], [X0, Y1]].map(([x, y]) => P(x, y, ze));
    const r0 = alongY ? P(xm, Y0 + h, zr) : P(X0 + h, ym, zr), r1 = alongY ? P(xm, Y1 - h, zr) : P(X1 - h, ym, zr);
    const faces = alongY ? [[c[0], c[1], r0], [c[1], c[2], r1, r0], [c[2], c[3], r1], [c[3], c[0], r0, r1]] : [[c[0], c[1], r1, r0], [c[1], c[2], r1], [c[2], c[3], r0, r1], [c[3], c[0], r0]];
    const pos = [], uv = [];
    for (const f of faces) {
      const a = f[0], e1 = f[1].clone().sub(a).normalize(), n = f[1].clone().sub(a).cross(f[f.length - 1].clone().sub(a)).normalize(), e2 = new THREE.Vector3().crossVectors(n, e1);
      for (let i = 1; i < f.length - 1; i++) for (const p of [a, f[i], f[i + 1]]) { pos.push(p.x, p.y, p.z); const d = p.clone().sub(a); uv.push(d.dot(e1), d.dot(e2)); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    return { g, c, r0, r1, near: k => (alongY ? k < 2 : k === 0 || k === 3) ? r0 : r1 };
  }
  // Poolhaus im Stil des Hauses: weiße Wände mit Sockel, Pilastern und Gesims, drei Sprossentüren zum Pool (die mittlere öffnet sich),
  // Veranda auf zwei quadratischen Pfeilern, flaches Walmdach mit Schiefer über Haus und Veranda. Innen Bar, Liege und Handtücher.
  function buildPoolhaus(g) {
    const H = HOUSE.poolhaus, { x0, x1, y0, y1, z, wand: t, gesims, traufe } = H, xv = x0 - H.veranda, ov = 0.25, len = y1 - y0;
    boxPlan(M.stone, x0, x1, y0, y1, 0, z);
    boxPlan(M.site, x0, x1, y1 - t, y1, 0, gesims); boxPlan(M.site, x0, x1, y0, y0 + t, 0, gesims); boxPlan(M.site, x1 - t, x1, y0 + t, y1 - t, 0, gesims);
    const mx = frameMx({ o: [x0, y1], r: [0, -1], n: [-1, 0] });
    g.add(wallWithHoles(len, 0, gesims, H.tueren.map(([a, b]) => ({ u0: a, u1: b, z0: z, z1: 2.45 })), t, [M.site, M.site], mx));
    addBox(M.coping, mx, -0.04, len + 0.04, 0, 0.18, 0, 0.03);
    for (const [a, b] of [[0, 0.3], [1.8, 2.25], [3.75, 4.2], [len - 0.3, len]]) addBox(M.siteHell, mx, a, b, 0.18, gesims, 0, 0.05);
    for (const c of [2.025, 3.975]) { addBox(M.siteFrame, mx, c - 0.08, c + 0.08, 1.95, 2.3, 0.05, 0.08); addBox(M.siteLamp, mx, c - 0.06, c + 0.06, 1.98, 2.27, 0.08, 0.19); }
    // Sprossentüren in schwarzen Rahmen
    const f0 = -0.12, f1 = -0.06, za = z + 0.04, zb = 2.39;
    const pane = (pa, pb) => {
      addBox(M.siteGlass, mx, pa + 0.05, pb - 0.05, za + 0.12, zb - 0.05, -0.095, -0.087);
      for (const [p, q, r0, r1] of [[pa, pa + 0.05, za, zb], [pb - 0.05, pb, za, zb], [pa, pb, za, za + 0.12], [pa, pb, zb - 0.05, zb]]) addBox(M.siteFrame, mx, p, q, r0, r1, f0 + 0.005, f1 - 0.005);
      for (let zz = za + 0.62; zz < zb - 0.25; zz += 0.55) addBox(M.siteFrame, mx, pa + 0.05, pb - 0.05, zz - 0.012, zz + 0.012, -0.099, -0.083);
      addBox(M.siteFrame, mx, (pa + pb) / 2 - 0.012, (pa + pb) / 2 + 0.012, za + 0.12, zb - 0.05, -0.099, -0.083);
    };
    H.tueren.forEach(([a, b], i) => {
      for (const [p, q, r0, r1] of [[a, a + 0.06, z, 2.45], [b - 0.06, b, z, 2.45], [a, b, 2.39, 2.45], [a, b, z, za]]) addBox(M.siteFrame, mx, p, q, r0, r1, f0, f1);
      const c = (a + b) / 2, center = new THREE.Vector3(c, 1.1, -0.1).applyMatrix4(mx);
      if (i === 1) for (const [pa, pb, h, sg] of [[a + 0.06, c, a + 0.06, 1], [c, b - 0.06, b - 0.06, -1]]) leaf(g, new THREE.Vector3(h, 0, -0.09).applyMatrix4(mx), sg, center, () => pane(pa, pb));
      else { pane(a + 0.06, c); pane(c, b - 0.06); }
    });
    // innen: Bar mit Steinplatte und Hockern an der Ostwand, Liege an der Südwand, offenes Regal mit Handtüchern, zwei Pendelleuchten
    const ix0 = x0 + t, ix1 = x1 - t, iy0 = y0 + t, iy1 = y1 - t;
    boxPlan(M.siteHell, ix1 - 0.6, ix1, -32.4, -29.2, z, z + 1.0); boxPlan(M.fOutTop, ix1 - 0.66, ix1, -32.46, -29.14, z + 1.0, z + 1.05);
    for (const y of [-31.8, -30.8, -29.8]) { addCyl(M.fOutMetal, ix1 - 0.98, y, z, z + 0.74, 0.02, 0.02, 8); addCyl(M.fOut, ix1 - 0.98, y, z + 0.74, z + 0.8, 0.19, 0.19, 16); }
    loungerAt(ix0 + 0.15, ix0 + 2.15, iy0 + 0.1, iy0 + 0.85, z);
    for (const xx of [ix0 + 0.35, ix0 + 1.95]) boxPlan(M.siteHell, xx, xx + 0.03, iy1 - 0.36, iy1, z, z + 1.9);
    for (let k = 0; k < 4; k++) {
      const zz = z + 0.3 + k * 0.45; boxPlan(M.siteHell, ix0 + 0.38, ix0 + 1.95, iy1 - 0.36, iy1, zz, zz + 0.025);
      for (const xx of [ix0 + 0.5, ix0 + 1.15]) boxPlan(M.fOut, xx, xx + 0.55, iy1 - 0.33, iy1 - 0.03, zz + 0.025, zz + 0.2);
    }
    for (const y of [-31.6, -30.0]) { addCyl(M.fOutMetal, ix1 - 0.33, y, z + 1.85, gesims - 0.1, 0.006, 0.006, 6); addCyl(M.siteLamp, ix1 - 0.33, y, z + 1.7, z + 1.85, 0.16, 0.09, 14); }
    // Veranda und Dach
    for (const y of [y0 + 0.22, y1 - 0.22]) column(xv + 0.22, y, HOUSE.poolDeck.z, gesims, H.pfeiler, M.siteHell);
    boxPlan(M.siteHell, xv - 0.1, x1 + 0.1, y0 - 0.1, y1 + 0.1, gesims, traufe - 0.06);
    boxPlan(M.siteHell, xv - 0.16, x1 + 0.16, y0 - 0.16, y1 + 0.16, traufe - 0.06, traufe);
    const roof = hipRoof(xv - ov, x1 + ov, y0 - ov, y1 + ov, traufe, Math.tan(H.neigung * Math.PI / 180));
    const rm = new THREE.Mesh(roof.g, M.siteRoof); rm.castShadow = rm.receiveShadow = true; g.add(rm);
    rod(M.siteZink, roof.r0, roof.r1, 0.04);
    for (let k = 0; k < 4; k++) rod(M.siteZink, roof.c[k], roof.near(k), 0.03);
    // Außendusche an der Nordwand: Steinwanne, schwarze Säule mit Brausekopf
    boxPlan(M.fOutTop, 20.5, 21.4, y1, y1 + 0.9, 0, 0.06);
    addCyl(M.fOutMetal, 20.95, y1 + 0.08, 0.06, 2.25, 0.022, 0.022, 8);
    boxPlan(M.fOutMetal, 20.93, 20.97, y1 + 0.08, y1 + 0.42, 2.21, 2.25); addCyl(M.fOutMetal, 20.95, y1 + 0.42, 2.17, 2.21, 0.11, 0.11, 18);
  }
  // Möbel am Pool: vier Liegen mit zwei Sonnenschirmen auf der Ostseite, unter der Veranda eine Liege mit Beistelltisch
  function gardenFurniture() {
    const z = HOUSE.poolDeck.z, H = HOUSE.poolhaus, xv = H.x0 - H.veranda;
    for (const y of [-25.9, -27.0, -34.6, -35.7]) loungerAt(10.65, 12.65, y - 0.37, y + 0.37, z);
    for (const y of [-26.45, -35.15]) parasolAt(13.05, y, z);
    loungerAt(xv + 0.62, xv + 1.37, -33.15, -31.15, z);
    addCyl(M.fOutTop, xv + 0.37, -31.75, z + 0.45, z + 0.48, 0.24, 0.24, 18); addCyl(M.fOutMetal, xv + 0.37, -31.75, z, z + 0.45, 0.02, 0.02, 8);
  }
  // Zaun an der Straße: weißer Sockel mit Steinabdeckung, schwarze Stäbe mit Spitzen, Pfeiler mit Abdeckplatten (an Bäumen ausgespart);
  // zweiflügeliges Einfahrtstor mit Bogen und Gartentür, beide öffnen sich nach innen, wenn man herankommt; Laternen auf den Torpfeilern.
  function buildFence(g) {
    const Zn = HOUSE.zaun, P0 = SITE.plot, pw2 = Zn.pfeiler / 2, hb = Zn.hoehe, trunks = SITE.trees.map(t => t.c);
    const segDist = (p, a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy))); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); };
    const spike = (mx, s, zz) => { const c = new THREE.ConeGeometry(0.022, 0.07, 4); c.rotateY(Math.PI / 4); c.translate(s, zz + 0.035, 0); addGeo(M.fOutMetal, c, mx); };
    const bars = (mx, s0, s1, zb0, top) => {
      const n = Math.max(1, Math.round((s1 - s0) / 0.12));
      addBox(M.fOutMetal, mx, s0, s1, zb0 + 0.06, zb0 + 0.1, -0.015, 0.015);
      for (let j = 0; j <= n; j++) { const s = s0 + (s1 - s0) * j / n, zt = top(s); addBox(M.fOutMetal, mx, s - 0.01, s + 0.01, zb0, zt, -0.01, 0.01); spike(mx, s, zt); }
      // Handlauf knapp unter den Spitzen, folgt bei den Toren dem Bogen
      for (let j = 0; j < n; j++) { const sa = s0 + (s1 - s0) * j / n, sb = s0 + (s1 - s0) * (j + 1) / n, zm = (top(sa) + top(sb)) / 2 - 0.1; addBox(M.fOutMetal, mx, sa, sb, zm - 0.02, zm + 0.02, -0.018, 0.018); }
    };
    const pillar = (mx, s, h, lamp) => {
      addBox(M.siteHell, mx, s - pw2, s + pw2, 0, h, -pw2, pw2);
      addBox(M.brickCap, mx, s - pw2 - 0.04, s + pw2 + 0.04, h, h + 0.06, -pw2 - 0.04, pw2 + 0.04);
      if (lamp) { addBox(M.siteFrame, mx, s - 0.12, s + 0.12, h + 0.06, h + 0.1, -0.12, 0.12); addBox(M.siteLamp, mx, s - 0.09, s + 0.09, h + 0.1, h + 0.36, -0.09, 0.09); addBox(M.siteFrame, mx, s - 0.11, s + 0.11, h + 0.36, h + 0.41, -0.11, 0.11); }
      else addBox(M.brickCap, mx, s - pw2 + 0.06, s + pw2 - 0.06, h + 0.06, h + 0.1, -pw2 + 0.06, pw2 - 0.06);
    };
    // Lauf von a nach b, um 15 cm nach innen versetzt; links der Laufrichtung liegt das Grundstück
    const frameOf = (a, b) => {
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / l, uy = (b[1] - a[1]) / l, o = [a[0] - uy * 0.15, a[1] + ux * 0.15];
      return { l, ux, uy, o, mx: frameMx({ o, r: [ux, uy], n: [uy, -ux] }), at: s => [o[0] + ux * s, o[1] + uy * s], on: s => [a[0] + ux * s, a[1] + uy * s] };
    };
    const run = (a, b, noStart, noEnd) => {
      const F = frameOf(a, b), k = Math.max(1, Math.round(F.l / 2.6)), step = F.l / k;
      for (let i = 0; i <= k; i++) if (!(i === 0 && noStart) && !(i === k && noEnd)) pillar(F.mx, i * step, hb + 0.1);
      for (let i = 0; i < k; i++) {
        const s0 = i * step + pw2, s1 = (i + 1) * step - pw2;
        if (trunks.some(c => segDist(c, F.at(s0), F.at(s1)) < 0.55)) continue;
        addBox(M.siteHell, F.mx, s0, s1, 0, Zn.sockel, -0.14, 0.14); addBox(M.brickCap, F.mx, s0 - 0.01, s1 + 0.01, Zn.sockel, Zn.sockel + 0.04, -0.17, 0.17);
        bars(F.mx, s0, s1, Zn.sockel + 0.04, () => hb - 0.02);
      }
      return F;
    };
    run(P0[0], P0[1]); run(P0[1], P0[2], true);
    // an der Zufahrt: Pfeiler A, zweiflügeliges Tor, Pfeiler B mit Briefkasten und Klingel, Gartentür, Eckpfeiler C
    const F = frameOf(P0[2], P0[3]), sx = x => (x - F.o[0]) / F.ux, sA = sx(Zn.tor[0]) - pw2, sB = sx(Zn.tor[1]) + pw2, sC = sx(Zn.tuer[1]) + pw2;
    run(P0[2], F.on(sA), true, true);
    pillar(F.mx, sA, hb + 0.3, true); pillar(F.mx, sB, hb + 0.3, true); pillar(F.mx, sC, hb + 0.1);
    addBox(M.trim, F.mx, sB - 0.14, sB + 0.14, 0.95, 1.3, pw2, pw2 + 0.05); addBox(M.siteFrame, F.mx, sB - 0.06, sB + 0.06, 1.4, 1.58, pw2, pw2 + 0.02); addBox(M.siteLamp, F.mx, sB - 0.02, sB + 0.02, 1.53, 1.56, pw2 + 0.02, pw2 + 0.025);
    const wid = sB - pw2 - (sA + pw2), arch = s => hb - 0.12 + 0.3 * Math.sin(Math.PI * Math.min(1, Math.max(0, (s - sA - pw2) / wid)));
    const gateLeaf = (s0, s1, hinge, sg, top, center) => leaf(g, new THREE.Vector3(hinge, 0, 0).applyMatrix4(F.mx), sg, center, () => {
      for (const s of [s0 + 0.03, s1 - 0.03]) addBox(M.fOutMetal, F.mx, s - 0.03, s + 0.03, 0.06, top(s) - 0.02, -0.02, 0.02);
      addBox(M.fOutMetal, F.mx, s0, s1, 0.06, 0.12, -0.02, 0.02);
      bars(F.mx, s0 + 0.06, s1 - 0.06, 0.12, top);
    }, 1.35);
    const gc = new THREE.Vector3((sA + sB) / 2, 1.0, 0).applyMatrix4(F.mx), sm = (sA + sB) / 2;
    gateLeaf(sA + pw2 + 0.02, sm - 0.01, sA + pw2 + 0.02, 1, arch, gc);
    gateLeaf(sm + 0.01, sB - pw2 - 0.02, sB - pw2 - 0.02, -1, arch, gc);
    const tc = new THREE.Vector3((sB + sC) / 2, 1.0, 0).applyMatrix4(F.mx);
    gateLeaf(sB + pw2 + 0.02, sC - pw2 - 0.02, sC - pw2 - 0.02, -1, () => hb - 0.08, tc);
    run(P0[3], [25.059, -44.0], true);
  }
  function buildSite() {
    const g = new THREE.Group(), C = SITE.concept, R0 = HOUSE.rampe;
    groundAO();
    const poolOuter = C.pool, trench = [[R0.x0, R0.y0], [R0.x1, R0.y0], [R0.x1, R0.yPortal], [R0.x0, R0.yPortal]];
    const ground = new THREE.Shape(rectPts(-260, -260, 280, 260));
    for (const h of [poolOuter, trench, C.haus]) ground.holes.push(new THREE.Path(h.map(q => v2(q[0], q[1]))));
    const gg = addUV1(new THREE.ShapeGeometry(ground)); gg.rotateX(-Math.PI / 2);
    const gm = new THREE.Mesh(gg, M.ground); gm.position.y = -0.03; gm.receiveShadow = true; g.add(gm);
    L.grund = [gm];
    for (const s of SITE.streets) { const m = flat(s, M.street, -0.01); g.add(m); L.grund.push(m); }
    const lawn = flat(SITE.plot, M.lawn, 0.004, [poolOuter, trench, C.haus]); g.add(lawn); L.grund.push(lawn);
    // Zufahrt: vorne eben, dahinter die offene Rampe in die Tiefgarage
    const zufahrtEben = [[19.732, -50.499], [24.731, -51.342], [24.731, -44.471], [R0.x1 + R0.wand, -44.471], [R0.x1 + R0.wand, R0.y0], [19.732, R0.y0]];
    for (const P0 of [C.zuwegung, zufahrtEben]) { const m = flat(P0, M.pave, 0.016); g.add(m); L.grund.push(m); }
    buildRamp(g);
    // Pool: Rand, Becken 1,40 m tief, Wasser 12 cm unter dem Rand, Stufen über die ganze Breite an der Nordseite
    const PO = HOUSE.pool, pw = C.poolWasser, w = pw[1][0] - pw[0][0], d = pw[0][1] - pw[2][1];
    g.add(extrude(poolOuter, M.coping, 0, 0.06, [pw]));
    const basin = new THREE.Mesh(new THREE.BoxGeometry(w, -PO.boden, d), M.tile);
    basin.position.set(pw[0][0] + w / 2, PO.boden / 2, -(pw[0][1] - d / 2)); basin.receiveShadow = true; g.add(basin);
    PO.stufen.forEach((z, i) => boxPlan(M.poolStep, pw[0][0], pw[1][0], pw[0][1] - PO.tritt * (i + 1), pw[0][1] - PO.tritt * i, PO.boden, z));
    g.add(flat(pw, M.water, PO.wasser));
    // Poolterrasse aus Travertin rund um den Pool bis an die Veranda des Poolhauses, Weg von der Terrasse herüber
    g.add(extrude(HOUSE.poolDeck.poly, M.deck, 0, HOUSE.poolDeck.z, [poolOuter]));
    const PW = HOUSE.poolWeg;
    boxPlan(M.stone, PW.x0, PW.x1, PW.y0 - 0.02, PW.y1 - 0.36, 0, 0.03);
    buildPoolhaus(g);
    gardenFurniture();
    buildFence(g);
    g.add(hedges());
    // Grenze
    const pts = [...SITE.plot, SITE.plot[0]].map(q => P(q[0], q[1], 0.05));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x24292e, dashSize: 0.9, gapSize: 0.45 }));
    line.computeLineDistances();
    const grenze = new THREE.Group(); grenze.add(line);
    for (const s of SITE.stones) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.22), M.coping); m.position.copy(P(s[0], s[1], 0.06)); grenze.add(m); }
    const seg = []; for (const [a, b, c, e] of SITE.parcelLines) seg.push(P(a, b, 0.03), P(c, e, 0.03));
    grenze.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({ color: 0x5b6168 })));
    grenze.visible = false; g.add(grenze); L.grenze = grenze;
    // Bäume: Stamm mit Hauptästen, Krone aus mehreren Teilkronen, die dicht mit Blattbüscheln besetzt sind
    const baeume = new THREE.Group(), barkParts = [], leafCards = [], Yax = new THREE.Vector3(0, 1, 0);
    const limb = (a, b, r0, r1) => {
      const d = new THREE.Vector3().subVectors(b, a), len = d.length(), cg = new THREE.CylinderGeometry(r1, r0, len, 9, 1, true);
      cg.translate(0, len / 2, 0); cg.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Yax, d.normalize())); cg.translate(a.x, a.y, a.z);
      barkParts.push(cg);
    };
    const tints = [[1, 1, 0.92], [0.92, 0.98, 0.9], [1.04, 1.02, 0.84]];
    SITE.trees.forEach((t, i) => {
      const r = t.r, H = Math.min(24, 4 + 2.0 * r), zc = H - r * 0.95, ry = r * 0.82, cx = t.c[0], cz = -t.c[1];
      const hs = k => { const v = Math.sin((k + 1) * 127.1 + i * 311.7) * 43758.5453; return v - Math.floor(v); };
      const r0 = 0.16 + 0.035 * r, top = new THREE.Vector3(cx + (hs(1) - 0.5) * 0.5, zc - ry * 0.2, cz + (hs(2) - 0.5) * 0.5);
      limb(new THREE.Vector3(cx, -0.1, cz), top, r0, r0 * 0.5);
      const nb = 5 + Math.floor(hs(3) * 3);
      for (let k = 0; k < nb; k++) {
        const a = (k / nb + hs(10 + k) * 0.15) * Math.PI * 2, f = 0.45 + 0.4 * hs(20 + k), z0 = top.y * f;
        const start = new THREE.Vector3(cx + (top.x - cx) * f, z0, cz + (top.z - cz) * f);
        limb(start, new THREE.Vector3(cx + Math.cos(a) * r * 0.7, zc + ry * (0.05 + 0.45 * hs(30 + k)), cz + Math.sin(a) * r * 0.7), r0 * 0.42, r0 * 0.1);
      }
      // Teilkronen: eine große in der Mitte, ringsum kleinere, leicht nach oben versetzt
      const lumps = [], nl = 6 + Math.floor(hs(4) * 4);
      for (let k = 0; k <= nl; k++) {
        const a = hs(40 + k) * Math.PI * 2, el = (hs(50 + k) - 0.3) * 1.1, off = k === nl ? 0 : 0.42 + 0.18 * hs(60 + k);
        lumps.push({ c: new THREE.Vector3(cx + Math.cos(a) * Math.cos(el) * r * off, zc + Math.sin(el) * ry * off, cz + Math.sin(a) * Math.cos(el) * r * off), r: r * (k === nl ? 0.62 : 0.42 + 0.16 * hs(70 + k)) });
      }
      const cs0 = 0.7 + 0.05 * r, total = 62 * r * r / (cs0 * cs0), sum = lumps.reduce((s, l) => s + l.r * l.r, 0), tint = tints[i % tints.length];
      for (const lp of lumps) {
        const clumps = Math.max(2, Math.round(total * lp.r * lp.r / sum / 10));
        for (let c = 0; c < clumps; c++) {
          const u1 = rnd() * 2 - 1, phi = rnd() * Math.PI * 2, s = Math.sqrt(1 - u1 * u1), rr = lp.r * (0.7 + 0.3 * Math.cbrt(rnd()));
          const p = new THREE.Vector3(lp.c.x + s * Math.cos(phi) * rr, lp.c.y + u1 * rr * 0.9, lp.c.z + s * Math.sin(phi) * rr);
          if (p.y < Math.max(2.4, zc - ry * 0.95)) continue;
          const out = new THREE.Vector3((p.x - cx) / r, (p.y - zc) / ry, (p.z - cz) / r), depth = Math.min(1, out.length()), nOut = out.normalize();
          const k = (0.55 + 0.45 * Math.pow(depth, 0.8)) * (0.88 + 0.24 * rnd());
          for (let j = 0; j < 10; j++) {
            const cs = cs0 * (0.8 + 0.4 * rnd()), off = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(cs0 * 1.5);
            const n = nOut.clone().multiplyScalar(0.85).addScaledVector(off.clone().normalize(), 0.3).normalize();
            leafCards.push({ p: [p.x + off.x, p.y + off.y, p.z + off.z], n: [n.x, n.y, n.z], q: randQ(), w: cs, h: cs, c: [tint[0] * k, tint[1] * k, tint[2] * k], flip: rnd() < 0.5 });
          }
        }
      }
    });
    const bark = new THREE.Mesh(mergeGeometries(barkParts, false), M.bark); bark.castShadow = bark.receiveShadow = true;
    baeume.add(bark, cardMesh(leafCards, M.leafTree), plantBeds());
    g.add(baeume); L.baeume = baeume;
    // Wurzelschutzbereiche als rote Kreise (nur zur Information, standardmäßig aus)
    const schutz = new THREE.Group();
    const red = new THREE.MeshBasicMaterial({ color: 0xc23a2b, transparent: true, opacity: 0.85 });
    const redFill = new THREE.MeshBasicMaterial({ color: 0xc23a2b, transparent: true, opacity: 0.08, depthWrite: false });
    for (const z of SITE.schutz) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(z.r - 0.07, z.r + 0.07, 128), red);
      ring.rotation.x = -Math.PI / 2; ring.position.copy(P(z.c[0], z.c[1], 0.04)); schutz.add(ring);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(z.r, 96), redFill);
      disc.rotation.x = -Math.PI / 2; disc.position.copy(P(z.c[0], z.c[1], 0.035)); schutz.add(disc);
    }
    schutz.visible = false; g.add(schutz); L.schutz = schutz;
    flushBatches(g);
    baeume.add(neighborGreen());
    brickWall();
    // Nachbarschaft
    const nb = new THREE.Group();
    if (typeof LOD2 !== 'undefined') {
      // Nachbarhäuser aus dem amtlichen 3D-Gebäudemodell (LoD2) mit echten Dachformen und Höhen; Dachfarbe nach Luftbild.
      // Wände mit Putz und Sockel, Dächer mit Ziegeln in Fallrichtung, Fenster mit Rahmen und Fensterbank.
      const walls = { pos: [], uv: [], col: [] }, roofs = new Map(), flatRoof = { pos: [], uv: [] };
      const tones = [0xdcd5c6, 0xd2c9b8, 0xe4dfd3, 0xcdc3b0, 0xd8d1c3].map(c => new THREE.Color(c));
      LOD2.b.forEach((b, bi) => {
        const rm = nbRoofMat((NB_STYLE[b.nr] || {}).color || 0x707379), tc = tones[bi % tones.length];
        if (!roofs.has(rm)) roofs.set(rm, { pos: [], uv: [] });
        const bot = b.s.filter(([k]) => k === 'W').flatMap(([, ring]) => ring.filter(p => p[2] < 0.3));
        const mx = bot.reduce((s, p) => s + p[0], 0) / Math.max(1, bot.length), my = bot.reduce((s, p) => s + p[1], 0) / Math.max(1, bot.length);
        b.s.forEach(([k, ring], si) => {
          const n = ringNormal(ring), tri = triangulate3D(ring);
          if (k === 'R') {
            if (n.z < 0) n.multiplyScalar(-1);
            const dst = n.z > 0.97 ? flatRoof : roofs.get(rm), hl = Math.hypot(n.x, n.y) || 1, dx = n.x / hl, dy = n.y / hl;
            for (let v = 0; v < tri.length; v += 3) {
              const x = tri[v], y = -tri[v + 2];
              dst.pos.push(tri[v], tri[v + 1], tri[v + 2]);
              if (n.z > 0.97) dst.uv.push(x, y); else dst.uv.push((x * -dy + y * dx) / 1.2, (x * dx + y * dy) / n.z / 1.2);
            }
          } else {
            const hl = Math.hypot(n.x, n.y) || 1, ex = -n.y / hl, ey = n.x / hl;
            for (let v = 0; v < tri.length; v += 3) {
              walls.pos.push(tri[v], tri[v + 1], tri[v + 2]); walls.uv.push((tri[v] * ex - tri[v + 2] * ey) / 4, tri[v + 1] / 12); walls.col.push(tc.r, tc.g, tc.b);
            }
            if (b.h > 5.5) nbWindows(ring, b, si, mx, my);
          }
        });
      });
      const geo = (d, col) => {
        const gm = new THREE.BufferGeometry(); gm.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3)); gm.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
        if (col) gm.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        gm.computeVertexNormals(); return gm;
      };
      const mesh = (gm, mat) => { const m = new THREE.Mesh(gm, mat); m.castShadow = m.receiveShadow = true; return m; };
      nb.add(mesh(geo(walls, walls.col), M.nbWall));
      for (const [m, d] of roofs) if (d.pos.length) nb.add(mesh(geo(d), m));
      if (flatRoof.pos.length) nb.add(mesh(geo(flatRoof), M.nbFlat));
    } else {
      // Ersatz ohne LoD2: Grundriss aus der Flurkarte, Dachform nach Luftbild
      for (const b of SITE.neighbors) {
        const st = neighborStyle(b.pts), rm = nbRoofMat(st.color);
        if (st.roof === 'walm') { nb.add(extrudeMulti(b.pts, [M.nb, M.nb], st.wall)); nb.add(roofOver(b.pts, st.wall, rm)); }
        else {
          nb.add(extrudeMulti(b.pts, [rm, M.nb], st.wall));
          if (st.roof === 'staffel') { const top = extrudeMulti(scalePts(b.pts, 0.7), [rm, M.nb], st.top - st.wall); top.position.y = st.wall; nb.add(top); }
        }
      }
      for (const b of SITE.secondary) nb.add(extrudeMulti(b.pts, [M.nbRoof, M.nb2], b.h));
    }
    g.add(nb); L.nachbarn = nb;
    // Tiefgarage und Untergeschoss (unterirdisch, nur als Hülle)
    const tg = new THREE.Group();
    const tgm = extrude(C.tg, M.tg, -3.4, 2.8); tgm.castShadow = false; tg.add(tgm);
    tg.add(new THREE.LineSegments(new THREE.EdgesGeometry(tgm.geometry), new THREE.LineBasicMaterial({ color: 0xc8711c })));
    const ugm = extrude(C.haus, M.ug, -3.4, 3.4); ugm.castShadow = false; tg.add(ugm);
    tg.add(new THREE.LineSegments(new THREE.EdgesGeometry(ugm.geometry), new THREE.LineBasicMaterial({ color: 0x4f6f8c })));
    // Durchfahrt unter dem Poolhaus
    const dfm = extrude(C.poolhaus, M.tg, -3.4, 3.4 + R0.decke); dfm.castShadow = false; tg.add(dfm);
    tg.add(new THREE.LineSegments(new THREE.EdgesGeometry(dfm.geometry), new THREE.LineBasicMaterial({ color: 0xc8711c })));
    tg.visible = false; g.add(tg); L.tg = tg;
    flushBatches(g);
    return g;
  }
  // Beete wie im Rendering: Lavendel, weiße Hortensien und Buchskugeln vor der Fassade
  function plantBeds() {
    const grp = new THREE.Group();
    const items = { lavendel: [], hortensie: [], buchs: [], gruen: [] };
    const bed = (x0, x1, y0, y1, kinds, dens) => {
      const n = Math.round((x1 - x0) * (y1 - y0) * dens);
      for (let i = 0; i < n; i++) {
        const k = kinds[Math.floor(rnd() * kinds.length)];
        const r = k === 'lavendel' ? 0.16 + rnd() * 0.07 : k === 'hortensie' ? 0.3 + rnd() * 0.12 : 0.28 + rnd() * 0.1;
        const px = x0 + rnd() * (x1 - x0), py = y0 + rnd() * (y1 - y0);
        items[k].push([px, py, r]);
        if (k === 'hortensie' || k === 'gruen') for (let q = 0; q < 3; q++) items[k].push([px + (rnd() - 0.5) * r * 1.2, py + (rnd() - 0.5) * r * 1.2, r * (0.55 + rnd() * 0.25)]);
      }
    };
    // Lavendel und Hortensien am Rand der durchgehenden Terrasse, die Mitte bleibt frei für die Stufe zum Pool
    bed(0.1, 6.2, -16.45, -15.8, ['lavendel', 'lavendel', 'hortensie', 'gruen'], 9);
    bed(9.8, 18.9, -16.45, -15.8, ['lavendel', 'lavendel', 'hortensie', 'gruen'], 9);
    bed(-0.95, -0.15, -11.4, -0.6, ['hortensie', 'gruen', 'lavendel'], 4);
    bed(19.1, 19.8, -10.8, -5.9, ['hortensie', 'lavendel'], 5);
    bed(0.3, 5.3, 0.15, 0.85, ['gruen', 'hortensie'], 4);
    bed(10.7, 15.7, 0.15, 0.85, ['gruen', 'hortensie'], 4);
    for (const [x, y] of [[6.35, -16.1], [9.65, -16.1], [-0.55, -16.0], [19.5, -15.95], [19.35, -11.15], [5.2, 0.55], [10.8, 0.55], [-0.6, -12.2]]) items.buchs.push([x, y, 0.42]);
    // kleine Buchskugeln als Allee am Weg zum Pool
    for (let y = -17.2; y > -22.6; y -= 1.35) for (const x of [7.12, 8.88]) items.buchs.push([x, y, 0.26]);
    // Zwei Pflanzkübel mit Buchskugeln unter dem Vordach links und rechts der Haustür
    const zk = HOUSE.podest.z + 0.55;
    for (const x of [6.15, 9.85]) { boxPlan(M.kuebel, x - 0.2, x + 0.2, 0.12, 0.52, HOUSE.podest.z, zk); items.buchs.push([x, 0.32, 0.23, zk]); }
    // Jede Pflanze: dunkler Kern und darauf Blatt- bzw. Blütenkarten; Lavendel als gekreuzte, senkrechte Karten
    const core = [], cards = { blatt: [], hortensie: [], buchs: [], lavendel: [] };
    const shell = (list, x, y, cy, r, ry, n, sz, k0) => {
      for (let j = 0; j < n; j++) {
        const u1 = rnd() * 1.6 - 0.6, phi = rnd() * 6.2832, s = Math.sqrt(1 - u1 * u1), nrm = new THREE.Vector3(s * Math.cos(phi), u1, s * Math.sin(phi));
        const k = k0 * (0.8 + 0.3 * rnd()) * (0.75 + 0.25 * (u1 + 0.6) / 1.6);
        list.push({ p: [x + nrm.x * r, cy + nrm.y * ry, -y + nrm.z * r], n: [nrm.x, nrm.y, nrm.z], q: faceQ(nrm, 1.4), w: sz * (0.8 + 0.4 * rnd()), h: sz * (0.8 + 0.4 * rnd()), c: [k, k, k], flip: rnd() < 0.5 });
      }
    };
    for (const [x, y, r, z0 = 0] of items.buchs) { core.push([x, z0 + r * 0.92, -y, r * 0.88, r * 0.82]); shell(cards.buchs, x, y, z0 + r * 0.92, r * 0.95, r * 0.9, r < 0.3 ? 46 : 70, 0.2, 1); }
    for (const [x, y, r] of items.gruen) { core.push([x, r * 0.7, -y, r * 0.8, r * 0.62]); shell(cards.blatt, x, y, r * 0.7, r, r * 0.8, 16, r * 0.9, 0.95); }
    for (const [x, y, r] of items.hortensie) {
      core.push([x, r * 0.7, -y, r * 0.8, r * 0.62]);
      shell(cards.blatt, x, y, r * 0.7, r, r * 0.78, 9, r * 0.85, 0.9); shell(cards.hortensie, x, y, r * 0.78, r * 0.98, r * 0.8, 9, r * 0.95, 1);
    }
    for (const [x, y, r] of items.lavendel) for (let j = 0; j < 3; j++) {
      const a = j * Math.PI / 3 + rnd(), w = r * 2.4, h = r * 2.8, n = new THREE.Vector3(Math.cos(a), 0.25, Math.sin(a)).normalize(), k = 0.85 + 0.25 * rnd();
      cards.lavendel.push({ p: [x, h / 2, -y], n: [n.x, n.y, n.z], q: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a), w, h, c: [k, k, k], flip: rnd() < 0.5 });
    }
    grp.add(cores(core, M.shrubCore), cardMesh(cards.buchs, M.leafBox), cardMesh(cards.blatt, M.leafTree), cardMesh(cards.hortensie, M.leafHydr), cardMesh(cards.lavendel, M.leafLav));
    return grp;
  }
  // Dachform und Farbe der Nachbarhäuser nach dem Luftbild (Google Earth, Foto vom 3.11.2026); Schlüssel = Hausnummer der Flurkarte
  const NB_STYLE = {
    '8a': { roof: 'walm', color: 0x5f6369, wall: 3.9 }, '8': { roof: 'walm', color: 0x9a5c48, wall: 3.6 },
    '9': { roof: 'flach', color: 0x8b9375, wall: 6.4 }, '53': { roof: 'walm', color: 0x6c717b, wall: 4.2 },
    '12a': { roof: 'walm', color: 0x666a72, wall: 4.0 }, '55a': { roof: 'walm', color: 0x7e828a, wall: 4.0 },
    '55b': { roof: 'walm', color: 0x76717d, wall: 4.0 }, '10': { roof: 'walm', color: 0x72767f, wall: 4.0 },
  };
  function outline(pts) {
    let A = 0, Pm = 0, cx = 0, cy = 0;
    pts.forEach((p, i) => { const q = pts[(i + 1) % pts.length], c = p[0] * q[1] - q[0] * p[1]; A += c / 2; cx += (p[0] + q[0]) * c; cy += (p[1] + q[1]) * c; Pm += Math.hypot(q[0] - p[0], q[1] - p[1]); });
    return { A, Pm, cx: cx / (6 * A), cy: cy / (6 * A) };
  }
  const scalePts = (pts, k) => { const { cx, cy } = outline(pts); return pts.map(p => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]); };
  function neighborStyle(pts) {
    const { cx, cy } = outline(pts);
    let best = null, dBest = 1e9;
    for (const l of SITE.labels) { const d = Math.hypot(l.p[0] - cx, l.p[1] - cy); if (d < dBest) { dBest = d; best = l.t; } }
    return NB_STYLE[best] || { roof: 'walm', color: 0x777b83, wall: 3.9 };
  }
  // Ebenes 3D-Polygon (Plan-Koordinaten x, y, z) in Dreiecke zerlegen; Rückgabe als Weltkoordinaten
  function triangulate3D(ring) {
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < ring.length; i++) {
      const [x1, y1, z1] = ring[i], [x2, y2, z2] = ring[(i + 1) % ring.length];
      nx += (y1 - y2) * (z1 + z2); ny += (z1 - z2) * (x1 + x2); nz += (x1 - x2) * (y1 + y2);
    }
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    const pr = az >= ax && az >= ay ? p => v2(p[0], p[1]) : ax >= ay ? p => v2(p[1], p[2]) : p => v2(p[0], p[2]);
    const out = [];
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(ring.map(pr), [])) for (const k of [a, b, c]) { const p = ring[k]; out.push(p[0], p[2], -p[1]); }
    return out;
  }
  function meshFrom(pos, mat) {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
  }
  const nbRoofMats = new Map();
  function nbRoofMat(c) {
    // Ziegel-Textur ist hell; die Luftbild-Farbe wird dafür etwas angehoben
    if (!nbRoofMats.has(c)) nbRoofMats.set(c, new THREE.MeshStandardMaterial({ color: new THREE.Color(c).multiplyScalar(1.25), map: M.tiles, roughness: 0.8, metalness: 0.02, side: THREE.DoubleSide }));
    return nbRoofMats.get(c);
  }
  // Flächennormale eines ebenen Polygons (Newell), in Plan-Koordinaten x, y und Höhe z
  function ringNormal(ring) {
    const n = new THREE.Vector3();
    for (let i = 0; i < ring.length; i++) {
      const [x1, y1, z1] = ring[i], [x2, y2, z2] = ring[(i + 1) % ring.length];
      n.x += (y1 - y2) * (z1 + z2); n.y += (z1 - z2) * (x1 + x2); n.z += (x1 - x2) * (y1 + y2);
    }
    return n.normalize();
  }
  const hash01 = (...a) => { let h = 2166136261; for (const ch of a.join('|')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return (h >>> 0) / 4294967296; };
  // Fenster an einer LoD2-Wand: Raster von etwa 2,8 m, Erdgeschoss immer, darüber nur dort, wo die Wand hoch genug ist (Giebel)
  function nbWindows(ring, b, si, cxB, cyB) {
    const bot = ring.filter(p => p[2] < 0.3);
    if (bot.length < 2) return;
    let A = null, B = null, best = 0;
    for (const p of bot) for (const q of bot) { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d > best) { best = d; A = p; B = q; } }
    if (best < 2.4) return;
    let ux = (B[0] - A[0]) / best, uy = (B[1] - A[1]) / best;
    // Außenseite: weg von der Gebäudemitte; Richtung so wählen, dass die Basis rechtshändig bleibt
    if (((A[0] + B[0]) / 2 - cxB) * uy - ((A[1] + B[1]) / 2 - cyB) * ux < 0) { [A, B] = [B, A]; ux = -ux; uy = -uy; }
    const P2 = ring.map(p => [(p[0] - A[0]) * ux + (p[1] - A[1]) * uy, p[2]]);
    const topAt = s => { let t = 0; for (let i = 0; i < P2.length; i++) { const [a0, z0] = P2[i], [a1, z1] = P2[(i + 1) % P2.length]; if ((a0 - s) * (a1 - s) <= 0 && a0 !== a1) t = Math.max(t, z0 + (z1 - z0) * (s - a0) / (a1 - a0)); } return t; };
    const mx = new THREE.Matrix4().makeBasis(new THREE.Vector3(ux, 0, -uy), new THREE.Vector3(0, 1, 0), new THREE.Vector3(uy, 0, ux)).setPosition(A[0], 0, -A[1]);
    const n = Math.max(1, Math.floor((best - 1.6) / 2.8) + 1), s0 = (best - (n - 1) * 2.8) / 2;
    for (let k = 0; k < n; k++) {
      const s = s0 + k * 2.8, h0 = hash01(b.id, si, k);
      if (h0 < 0.12) continue;
      for (const [z0, z1, w] of [[0.95, 2.25, h0 > 0.8 ? 1.5 : 1.15], [3.75, 4.95, 1.0], [6.45, 7.35, 0.8]]) {
        if (Math.min(topAt(s - w / 2), topAt(s + w / 2)) < z1 + 0.35) continue;
        const u0 = s - w / 2, u1 = s + w / 2;
        addBox(M.nbFrame, mx, u0 - 0.06, u1 + 0.06, z0 - 0.06, z1 + 0.06, 0, 0.04);
        addBox(M.nbGlass, mx, u0, u1, z0, z1, 0.04, 0.05);
        if (w > 1.3) addBox(M.nbFrame, mx, s - 0.04, s + 0.04, z0, z1, 0.05, 0.06);
        addBox(M.nbSill, mx, u0 - 0.1, u1 + 0.1, z0 - 0.1, z0 - 0.04, 0, 0.1);
      }
    }
  }
  // Steildach über einem beliebigen Grundriss: Traufe auf zEave, Dachfläche zur verkleinerten Firstfigur (wirkt wie ein Walmdach)
  function roofOver(pts, zEave, mat = M.nbRoof) {
    const { A, Pm, cx, cy } = outline(pts);
    const rise = Math.min(5.2, 1.6 * Math.abs(A) / Pm), k = 0.22, zt = zEave + rise;
    const top = pts.map(p => [cx + (p[0] - cx) * k, cy + (p[1] - cy) * k]);
    const pos = [], E = (p, z) => [p[0], z, -p[1]];
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length;
      pos.push(...E(pts[i], zEave), ...E(pts[j], zEave), ...E(top[j], zt), ...E(pts[i], zEave), ...E(top[j], zt), ...E(top[i], zt));
    }
    for (const [a, b, c] of THREE.ShapeUtils.triangulateShape(top.map(p => v2(p[0], p[1])), [])) pos.push(...E(top[a], zt), ...E(top[b], zt), ...E(top[c], zt));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.castShadow = m.receiveShadow = true; return m;
  }
  function extrudeMulti(pts, mats, h) {
    const g = new THREE.ExtrudeGeometry(shapeFrom(pts), { depth: h, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, mats); m.castShadow = m.receiveShadow = true; return m;
  }

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
    const g = c.getContext('2d'), img = g.createImageData(N, N);
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
  const stairUp = (za, zm, zb, y0 = -3.9) => [[9.545, y0, za], [9.545, -1.56, zm], [9.545, -0.96, zm], [11.035, -0.96, zm], [11.035, -1.56, zm], [11.035, -3.9, zb]];
  const TOURS = {
    ankommen: [
      [24.25, -54.2, 0, { label: 'Ebertstraße', wait: 1.2, look: [24.0, -46, 1.4] }], [24.25, -52.4, 0, { label: 'Gartentür' }], [24.25, -50.4, 0.016],
      [23.64, -48.4, 0.016, { label: 'Weg zum Haus', v: 2.5 }], [23.64, -30.6, 0.016, { label: 'Am Poolhaus vorbei', v: 2.5 }], [23.64, 1.75, 0.016, { label: 'Nordseite', v: 2.1 }],
      [12.5, 1.75, 0.016], [8.0, 2.05, 0.016, { label: 'Eingang', wait: 1.4, look: [8.0, -0.2, 2.2] }], [8.0, 0.6, 0.18], [8.0, -0.6, EG, { label: 'Halle' }],
      [8.0, -2.3, EG, { wait: 2.2, look: [9.4, -2.6, 4.4] }], [8.0, -5.0, EG, { label: 'Essen' }], [7.55, -6.6, EG], [7.6, -10.2, EG],
      [8.0, -11.0, EG, { label: 'Gartentür' }], [8.0, -12.4, 0.18, { label: 'Terrasse' }], [8.0, -15.2, 0.18, { wait: 1.6, look: [8.0, -30.0, 0.6] }],
      [8.0, -16.1, 0.09], [8.0, -17.0, 0.03, { label: 'Weg zum Pool' }], [8.0, -22.9, 0.03], [8.0, -24.3, 0.04, { label: 'Pool', wait: 1.2, look: [8.0, -34, -0.6] }],
      [8.0, -25.05, -0.36, { v: 0.8 }], [8.0, -25.4, -0.62, { v: 0.8 }], [8.0, -25.75, -0.88, { v: 0.8 }], [8.0, -26.1, -1.14, { v: 0.8 }],
      [8.0, -26.9, -1.4, { eye: 0.15, label: 'Im Pool' }], [8.0, -28.2, -1.4, { eye: -0.55, label: 'Abtauchen' }], [8.0, -33.4, -1.4, { eye: -0.75, v: 1.2 }],
      [8.0, -35.6, -1.4, { eye: 0.12, label: 'Aufgetaucht', wait: 3.2, look: [8.0, 3.0, 4.5] }],
    ],
    garage: [
      [20.8, -23.3, UG, { label: 'Tiefgarage', wait: 1.8, look: [14.0, -19.0, UG + 0.8] }], [19.2, -18.5, UG, { label: 'Ferrari F8 · Cayenne Coupé · T-Roc R · V-Klasse' }],
      [18.6, -13.0, UG], [12.55, -12.6, UG, { label: 'Schleuse' }], [12.55, -11.0, UG], [12.45, -5.57, UG], [11.0, -5.57, UG, { label: 'Untergeschoss' }],
      [8.6, -5.45, UG], [8.6, -4.6, UG], [9.545, -4.4, UG, { label: 'Treppe' }], ...stairUp(UG, -1.6, EG),
      [11.035, -4.45, EG, { label: 'Halle', wait: 1.4, look: [7.5, -1.0, 2.5] }], [9.545, -4.6, EG], ...stairUp(EG, 1.875, OG, -4.3),
      [11.035, -4.45, OG, { label: 'Galerie' }], [8.0, -4.45, OG, { wait: 1.8, look: [7.8, -1.0, 0.8] }], [9.545, -4.4, OG], ...stairUp(OG, 5.1, DG),
      [11.035, -4.5, DG, { label: 'Dachgeschoss' }], [8.0, -6.0, DG], [6.6, -7.2, DG], [6.6, -7.68, DG, { label: 'Büro' }], [6.5, -8.6, DG], [6.5, -10.5, DG],
      [7.6, -11.05, DG], [8.0, -11.4, DG], [8.0, -11.95, 6.77, { label: 'Balkon im DG' }], [7.2, -12.25, 6.77, { wait: 3.0, look: [8.0, -32.0, 0.5] }],
    ],
    eg: [
      [8.0, -0.9, EG, { label: 'Halle', wait: 1.5, look: [9.8, -2.2, 3.6] }], [8.0, -3.2, EG], [8.0, -5.0, EG, { label: 'Essen' }], [7.4, -6.2, EG],
      [6.6, -7.2, EG, { label: 'Wohnen' }], [5.2, -7.4, EG, { wait: 1.6, look: [0.6, -7.6, 1.0] }], [6.6, -8.8, EG], [7.6, -10.5, EG], [10.4, -10.3, EG],
      [11.4, -9.9, EG, { label: 'Küche' }], [12.15, -9.1, EG, { wait: 1.6, look: [13.6, -10.1, 0.8] }], [12.2, -6.3, EG], [12.75, -5.6, EG],
      [12.8, -4.2, EG, { label: 'Backkitchen', wait: 1.2, look: [14.0, -2.2, 1.0] }], [12.1, -4.35, EG], [10.9, -4.55, EG, { label: 'Halle' }], [8.4, -4.6, EG],
      [8.0, -3.5, EG], [8.0, -1.4, EG, { wait: 2.0, look: [8.0, 0.5, 1.8] }],
    ],
    garten: [
      [2.0, -12.6, 0.18, { label: 'Terrasse', wait: 1.2, look: [16, -12.6, 1.4] }], [15.5, -12.6, 0.18], [17.5, -11.2, 0.18, { label: 'Freisitz' }],
      [17.5, -10.45, 0.18, { wait: 1.4, look: [17.5, -7.0, 1.0] }], [16.0, -12.6, 0.18], [10.0, -12.9, 0.18], [9.2, -15.2, 0.18], [8.6, -16.1, 0.09],
      [8.3, -17.0, 0.03, { label: 'Garten' }], [8.0, -22.6, 0.03], [10.6, -23.6, 0.04, { label: 'Poolterrasse' }], [13.3, -24.5, 0.04], [13.9, -28.6, 0.04],
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
  const keys = new Set();
  let fast = false;
  function keyMove(dt) {
    if (!keys.size || cam !== camP) return false;
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
    window.addEventListener('keydown', e => {
      const el = document.activeElement, tag = el && el.tagName, k = KEYS[e.code];
      fast = e.shiftKey;
      if (!active || !k || e.metaKey || e.ctrlKey || e.altKey || tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.code.startsWith('Arrow') || e.code.startsWith('Page')) { if (el !== canvas) return; e.preventDefault(); }
      keys.add(k); stopTour(); tween = null; invalidate();
    });
    window.addEventListener('keyup', e => { fast = e.shiftKey; const k = KEYS[e.code]; if (k) keys.delete(k); });
    window.addEventListener('blur', () => keys.clear());
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
    play(on) { st.play = on; }, rotate(on) { st.rotate = on; },
    // Rundgang starten (name) oder beenden (null); cb.onLabel bekommt die Stationen, cb.onEnd meldet das Ende
    tour(name, cb) { if (name) { startTour(name, cb); polar(); } else stopTour(false); },
    // Für die Prüfung der Wege: Abtastpunkte eines Rundgangs in Weltkoordinaten
    _tourPoints: name => tourPath(TOURS[name]).S.map(q => q.p.toArray()),
    // Prüfung der Wege: alle 0,5 m in vier Richtungen auf Augenhöhe und nach unten zum Boden; meldet zu nahe Teile und fehlenden Boden
    _probe(name, step = 10) {
      const pts = tourPath(TOURS[name]).S, out = [], rc = new THREE.Raycaster(), names = new Map(Object.entries(M).map(([k, v]) => [v, k])), objs = [];
      scene.traverse(o => { const m = o.material; if (o.isMesh && o.visible && !Array.isArray(m) && !(m.transparent && m.opacity < 0.6) && !(m.alphaTest > 0) && o !== sky) objs.push(o); });
      const dirs = [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([x, z]) => new THREE.Vector3(x, 0, z)), down = new THREE.Vector3(0, -1, 0);
      for (let j = 0; j < pts.length; j += step) {
        const p = pts[j].p;
        for (const d of dirs) { rc.set(p, d); rc.far = 0.2; const h = rc.intersectObjects(objs, false)[0]; if (h) { out.push(['nah', +p.x.toFixed(2), +(-p.z).toFixed(2), +p.y.toFixed(2), +h.distance.toFixed(2), names.get(h.object.material) || '?']); break; } }
        rc.set(p, down); rc.far = 3; const f = rc.intersectObjects(objs, false)[0];
        if (!f || Math.abs(f.distance - EYE) > 0.3) out.push(['boden', +p.x.toFixed(2), +(-p.z).toFixed(2), +p.y.toFixed(2), f ? +f.distance.toFixed(2) : null, f ? names.get(f.object.material) || '?' : '-']);
      }
      return out;
    },
    // Rundgang ohne Bildschirm weiterlaufen lassen (für die Prüfung): sec Sekunden in Schritten von 1/30 s
    _step(sec) { for (let k = 0; k < sec * 30 && tour; k++) { stepTour(1 / 30); updateDoors(1 / 30); } renderFrame(); return tour ? tour.label : 'Ende'; },
    _view(p, t) { stopTour(false); setOrtho(false); tween = { t0: performance.now(), dur: 10, fp: camP.position.clone(), ft: controls.target.clone(), tp: new THREE.Vector3(...p), tt: new THREE.Vector3(...t) }; },
  };
})();
