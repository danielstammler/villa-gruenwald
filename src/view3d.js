// 3D-Modell (three.js): Haus aus HOUSE, Grundstück und Umgebung aus SITE, Sonnenstand mit Schatten.
// Weltkoordinaten: X = Plan-Ost, Y = Höhe, Z = -Plan-Nord. Das Haus liegt in X 0..16, Z 0..11,65.
const View3D = (() => {
  const Zh = HOUSE.Z;
  let renderer, scene, camP, camO, cam, controls, sun, moon, hemi, sky, skyScene, pmrem, envRT;
  let canvas, stage, raf = 0, last = 0, tween = null, envDue = 0, ready = false, active = false;
  const st = { y: 2026, m: 8, d: 5, h: 16.75, play: false, ortho: false, cut: false, cutX: 8, rotate: false, level: 'alle' };
  const L = {}, M = {}, houseMats = new Set(), levelMats = new Set(), batches = new Map(), glowMats = [], wallRects = [];
  const cutPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 8);
  const ui = {};
  const ORTHO_H = 15.5, EXPO = 1.0;
  // Geschossblick: alles über Fußboden + 1,40 m wird ausgeblendet, wie bei einem Grundriss in 3D
  const LEVEL_CUT = { UG: HOUSE.Z.ffbUG + 1.65, EG: HOUSE.Z.ffbEG + 1.4, OG: HOUSE.Z.ffbOG + 1.4, DG: HOUSE.Z.ffbDG + 1.4 };
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
    Object.assign(M, {
      putz: std(0xf1efea, 0.9), putzRust: std(0xffffff, 0.92, 0, { map: rust }), putzHell: std(0xf6f5f1, 0.85), putzDS: std(0xf1efea, 0.92, 0, { side: THREE.DoubleSide }),
      sockel: std(0xd9d6cf, 0.85), roof: std(0xffffff, 0.5, 0.3, { map: shingles, side: THREE.DoubleSide }),
      zink: std(0x26292d, 0.45, 0.35), zinkDS: std(0x26292d, 0.45, 0.35, { side: THREE.DoubleSide }), frame: std(0x141618, 0.4, 0.3), metal: std(0x111316, 0.38, 0.6),
      glass: glass(), lamp: std(0x1c1c1c, 0.4, 0.2, { emissive: 0xffd49c, emissiveIntensity: 0 }),
      slab: std(0xb9b2a4, 0.9), beton: std(0xb7b3ab, 0.92),
      inWall: std(0xebe7df, 0.95, 0, { emissive: 0xffd6a6, emissiveIntensity: 0 }), floorOak: std(0xffffff, 0.55, 0, { map: tOak, emissive: 0xffc98a, emissiveIntensity: 0 }),
      floorTile: std(0xd6d2ca, 0.5), stairMat: std(0xcfc6b6, 0.8), tor: std(0x3b3e42, 0.5, 0.4), door: std(0x1e2226, 0.35, 0.25),
      rampe: std(0xa5a198, 0.92, 0, { side: THREE.DoubleSide }), phInnen: std(0x655d52, 0.9),
      stone: std(0xdfd4c0, 0.8), kuebel: std(0x3a3d41, 0.6, 0.05), pave: std(0xffffff, 0.9, 0, { map: pave }), lawn: std(0xffffff, 1, 0, { map: grass }),
      ground: std(0xeef0e6, 1, 0, { map: grass }), street: std(0xffffff, 0.95, 0, { map: asphalt }), coping: std(0xdcd9d2, 0.7),
      tile: std(0x86c6d8, 0.35, 0, { side: THREE.BackSide }),
      water: std(0x1d6f8c, 0.03, 0, { transparent: true, opacity: 0.86, normalMap: tWaves, normalScale: new THREE.Vector2(0.28, 0.28), envMapIntensity: 1.5 }),
      site: std(0xf1efea, 0.9), siteHell: std(0xf6f5f1, 0.85), siteGlass: glass(),
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
      tgFloor: std(0x9a9893, 0.85), paint: std(0xf0efe9, 0.6), led: std(0xffffff, 0.5, 0, { emissive: 0xfff6e6, emissiveIntensity: 1.2 }),
      car0: std(0x2c3034, 0.28, 0.65), car1: std(0xe9e9e5, 0.3, 0.4), car2: std(0x1d2b42, 0.28, 0.65), car3: std(0xa8abae, 0.3, 0.7),
      carGlass: std(0x101417, 0.05, 0.4, { side: THREE.DoubleSide, envMapIntensity: 1.6 }), tire: std(0x151515, 0.85), rim: std(0xb9bdc1, 0.3, 0.9),
      headlight: std(0xf4f6f8, 0.2, 0, { emissive: 0xe8f0ff, emissiveIntensity: 0.3 }), taillight: std(0x6b0e0e, 0.3, 0, { emissive: 0x8a1010, emissiveIntensity: 0.4 }),
      bikeFrame: std(0x34424f, 0.4, 0.5), earth: std(0x8a7058, 1, 0, { map: tGravel }), cap: std(0x3c3a37, 0.9),
    });
    // Außenmöbel: wetterfester heller Stoff, Teak; leuchten abends nicht und werden vom Hausschnitt nicht erfasst
    Object.assign(M, { fOut: std(0xdedad1, 0.95), fTeak: std(0x8d6b4b, 0.7), fTeakDark: std(0x6e5640, 0.7), fCushionOut: std(0x76807a, 0.95) });
    Object.assign(M, furn);
    const warm = new THREE.Color(1, 0.86, 0.68);
    for (const [k, m] of Object.entries(furn)) {
      if (k === 'fMirror' || k === 'fDark') continue;
      if (k === 'fShade') m.userData.glow = 6; else if (k === 'fFire') m.userData.glow = 9; else m.emissive.copy(m.color).multiply(warm);
      glowMats.push(m);
    }
    for (const k of ['putz', 'putzRust', 'putzHell', 'putzDS', 'sockel', 'roof', 'zink', 'zinkDS', 'door', 'frame', 'metal', 'glass', 'lamp', 'slab', 'inWall', 'floorOak', 'floorTile', 'stairMat', 'curtain', ...Object.keys(furn)]) {
      houseMats.add(M[k]); M[k].clipShadows = true;
    }
    M.floorOak.userData.worldUV = 2.4;
    for (const m of [M.inWall, M.floorOak, M.floorTile, M.stairMat, M.curtain, ...Object.values(furn)]) if (m !== M.fMirror) m.envMapIntensity = 0.55;
    // Stein und Außenmöbel: nur der Geschossschnitt erfasst sie (Balkone und Dachterrasse über der Schnitthöhe)
    for (const k of ['stone', 'fOut', 'fTeak', 'fTeakDark', 'fCushionOut']) { levelMats.add(M[k]); M[k].clipShadows = true; }
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
  function column(x, y, z0, z1, w) {
    const h = w / 2;
    boxPlan(M.putzHell, x - h - 0.05, x + h + 0.05, y - h - 0.05, y + h + 0.05, z0, z0 + 0.14);
    boxPlan(M.putzHell, x - h, x + h, y - h, y + h, z0 + 0.14, z1 - 0.16);
    boxPlan(M.putzHell, x - h - 0.04, x + h + 0.04, y - h - 0.04, y + h + 0.04, z1 - 0.16, z1 - 0.06);
    boxPlan(M.putzHell, x - h - 0.07, x + h + 0.07, y - h - 0.07, y + h + 0.07, z1 - 0.06, z1);
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
  function facadeMatrix(side) {
    const f = HOUSE.frame[side], m = new THREE.Matrix4();
    m.makeBasis(new THREE.Vector3(f.r[0], 0, -f.r[1]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(f.n[0], 0, -f.n[1]));
    m.setPosition(f.o[0], 0, -f.o[1]);
    return m;
  }
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
  function windowUnit(mx, o, face, depth) {
    const w = o.u1 - o.u0, fw = 0.07, gl = Math.min(0.15, depth * 0.55);
    if (o.kind === 'eingang') {
      // Zweiflügelige Haustür in dunklem Lack mit hohen Glasfeldern und Stoßgriffen, verglaste Seitenteile, darüber ein Oberlicht
      const zt = o.z1 - 0.32, d0 = face - gl - 0.06, d1 = face - gl, sd = o.side || 0, a0 = o.u0 + sd, a1 = o.u1 - sd, lw = (a1 - a0) / 2;
      addBox(M.door, mx, a0, a1, o.z0, zt, d0, d1);
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
      for (let i = 0; i < 2; i++) {
        const a = a0 + i * lw;
        addBox(M.glass, mx, a + 0.18, a + lw - 0.18, o.z0 + 0.7, zt - 0.18, d1 + 0.002, d1 + 0.008);
        for (const [c0, c1, e0, e1] of [[a + 0.15, a + lw - 0.15, o.z0 + 0.67, o.z0 + 0.7], [a + 0.15, a + lw - 0.15, zt - 0.18, zt - 0.15], [a + 0.15, a + 0.18, o.z0 + 0.67, zt - 0.15], [a + lw - 0.18, a + lw - 0.15, o.z0 + 0.67, zt - 0.15]]) addBox(M.metal, mx, c0, c1, e0, e1, d1, d1 + 0.012);
        const gx = i ? a + 0.08 : a + lw - 0.08;
        addBox(M.metal, mx, gx - 0.015, gx + 0.015, o.z0 + 0.75, o.z0 + 1.65, d1 + 0.04, d1 + 0.07);
        for (const gz of [o.z0 + 0.8, o.z0 + 1.6]) addBox(M.metal, mx, gx - 0.012, gx + 0.012, gz - 0.012, gz + 0.012, d1, d1 + 0.05);
      }
      addBox(M.frame, mx, a0 + lw - 0.012, a0 + lw + 0.012, o.z0, zt, d1, d1 + 0.014);
      return;
    }
    addBox(M.glass, mx, o.u0 + 0.02, o.u1 - 0.02, o.z0 + 0.02, o.z1 - 0.02, face - gl - 0.012, face - gl);
    const f0 = face - gl - 0.04, f1 = face - gl + 0.03;
    addBox(M.frame, mx, o.u0, o.u0 + fw, o.z0, o.z1, f0, f1);
    addBox(M.frame, mx, o.u1 - fw, o.u1, o.z0, o.z1, f0, f1);
    addBox(M.frame, mx, o.u0, o.u1, o.z1 - fw, o.z1, f0, f1);
    addBox(M.frame, mx, o.u0, o.u1, o.z0, o.z0 + fw, f0, f1);
    if (o.leaves === 2) { const c = (o.u0 + o.u1) / 2; addBox(M.frame, mx, c - 0.045, c + 0.045, o.z0, o.z1, f0, f1); }
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
    for (const o of F.open) windowUnit(mx, o, 0, HOUSE.wall);
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
      for (const w of d.win) windowUnit(mx, w, face, 0.12);
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
    const holes = [[[9.0, -3.9], [11.28, -3.9], [11.28, -0.36], [9.0, -0.36]], [[4.72, -4.88], [6.72, -4.88], [6.72, -2.88], [4.72, -2.88]]];
    for (const [z0, z1] of [[-0.15, Zh.ffbEG], [Zh.gurtU, Zh.ffbOG], [Zh.deckeDG, Zh.ffbDG]]) {
      const sl = extrude([[0.36, -11.29], [15.64, -11.29], [15.64, -0.36], [0.36, -0.36]], M.slab, z0, z1 - z0, holes); sl.castShadow = false; g.add(sl);
    }
    buildInterior();
    // Balkon im DG vor dem Zwerchhaus: Platte mit Kante und Belag, gestufte Konsolen, Geländer an drei Seiten
    const bd = HOUSE.balkonDG;
    boxPlan(M.putzHell, bd.x0, bd.x1, bd.y0, bd.y1, bd.slab[0], bd.slab[1] - 0.1);
    boxPlan(M.putzHell, bd.x0 - 0.06, bd.x1 + 0.06, bd.y0 - 0.06, bd.y1, bd.slab[1] - 0.1, bd.slab[1]);
    boxPlan(M.stone, bd.x0, bd.x1, bd.y0, bd.y1, bd.slab[1], bd.slab[1] + 0.02);
    for (const x of bd.consoles) {
      boxPlan(M.putzHell, x - 0.11, x + 0.11, bd.y1 - 0.7, bd.y1, bd.slab[0] - 0.3, bd.slab[0]);
      boxPlan(M.putzHell, x - 0.11, x + 0.11, bd.y1 - 0.38, bd.y1, bd.slab[0] - 0.62, bd.slab[0] - 0.3);
    }
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
    boxPlan(M.putzHell, bk.x0 - 0.06, bk.x1 + 0.06, bk.y0 - 0.06, bk.y1, bk.slab[1] - 0.12, bk.slab[1]);
    for (const x of bk.cols) column(x, bk.colY, HOUSE.terrasse.z, bk.slab[0], bk.colW);
    railing(M.metal, new THREE.Matrix4().makeTranslation(0, 0, -bk.y0 - 0.07), bk.x0 + 0.07, bk.x1 - 0.07, bk.slab[1], bk.rail, 0);
    for (const xr of [bk.x0 + 0.07, bk.x1 - 0.07]) {
      railing(M.metal, new THREE.Matrix4().makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(xr, 0, 0)), bk.y0 + 0.07, bk.y1 - 0.02, bk.slab[1], bk.rail, 0);
    }
    const t = HOUSE.terrasse, p = HOUSE.podest;
    flushBatches(g);
    boxPlan(M.stone, t.x0, t.x1, t.y0, t.y1, 0, t.z);
    boxPlan(M.stone, p.x0, p.x1, p.y0, p.y1, 0, p.z);
    return g;
  }
  // Innenräume nach dem Grundriss-Vorschlag: Böden, Wände, Treppe und Aufzugsschacht
  function buildInterior() {
    const lv = { UG: [Zh.ffbUG, -0.15], EG: [Zh.ffbEG, Zh.gurtU], OG: [Zh.ffbOG, Zh.deckeDG], DG: [Zh.ffbDG, Zh.ffbDG + 2.6] };
    const nass = /Bad|WC|Dusche|Küche|Backkitchen|Speis|Abstell|Schleuse|Lager|Technik|Waschen|Vorraum/;
    const W = HOUSE.W, D = HOUSE.D, roofIn = HOUSE.roofIn;
    const uniq = a => [...new Set(a.map(v => +v.toFixed(3)))].sort((p, q) => p - q);
    const doorRect = d => d.o === 'v' ? [d.x - 0.2, d.x + 0.2, d.y, d.y + d.w] : [d.x, d.x + d.w, d.y - 0.2, d.y + 0.2];
    // Außenwände des Untergeschosses (unter Gelände), mit der Tür zur Tiefgarage in der Südwand
    const t0 = HOUSE.wall, ug = [[0, W, -D, -D + t0, [12.1, 13.0]], [0, W, -t0, 0], [0, t0, -D + t0, -t0], [W - t0, W, -D + t0, -t0]];
    for (const [a, b, c, e, gap] of ug) {
      const segs = gap ? [[a, gap[0]], [gap[1], b]] : [[a, b]];
      for (const [p, q] of segs) { boxPlan(M.inWall, p, q, c, e, Zh.ffbUG - 0.3, -0.15); wallRects.push({ fl: 'UG', r: [p, q, c, e], top: -0.15 }); }
    }
    for (const fl of ['UG', 'EG', 'OG', 'DG']) {
      const F = Plans.FL[fl], [z0, z1] = lv[fl];
      for (const rm of F.rooms) boxPlan(nass.test(rm.n) ? M.floorTile : M.floorOak, rm.r[0], rm.r[1], rm.r[2], rm.r[3], z0 - 0.02, z0 + 0.005);
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
    // Treppe (zweiläufig mit Podest) und Aufzugsschacht
    const [x0, x1, y0, y1] = [9.0, 11.28, -3.9, -0.36], fw = (x1 - x0 - 0.12) / 2, land = 1.2, run = y1 - land - y0, n = 9;
    for (const [za, zb] of [[Zh.ffbUG, Zh.ffbEG], [Zh.ffbEG, Zh.ffbOG], [Zh.ffbOG, Zh.ffbDG]]) {
      const zm = (za + zb) / 2;
      for (let i = 0; i < n; i++) boxPlan(M.stairMat, x0, x0 + fw, y0 + run * i / n, y0 + run * (i + 1) / n, za, za + (zm - za) * (i + 1) / (n + 1));
      boxPlan(M.stairMat, x0, x1, y1 - land, y1, zm - 0.2, zm);
      for (let i = 0; i < n; i++) boxPlan(M.stairMat, x1 - fw, x1, y1 - land - run * (i + 1) / n, y1 - land - run * i / n, zm - 0.25, zm + (zb - zm) * (i + 1) / (n + 1));
    }
    const [lx0, lx1, ly0, ly1] = [4.72, 6.72, -4.88, -2.88];
    for (const r of [[lx0, lx0 + 0.2, ly0, ly1], [lx1 - 0.2, lx1, ly0, ly1], [lx0, lx1, ly0, ly0 + 0.2], [lx0, lx1, ly1 - 0.2, ly1]]) {
      boxPlan(M.inWall, r[0], r[1], r[2], r[3], Zh.ffbUG, 9.6);
      for (const fl of ['UG', 'EG', 'OG', 'DG']) wallRects.push({ fl, r, top: 9.6 });
    }
    buildFurniture();
  }
  // Möbel nach dem Grundriss-Vorschlag: dieselben Positionen wie im 2D-Plan, Höhen nach üblichen Maßen, im DG unter der Schräge gekappt
  function buildFurniture() {
    const W = HOUSE.W, D = HOUSE.D, roofIn = HOUSE.roofIn;
    const levels = { UG: [Zh.ffbUG, -0.15], EG: [Zh.ffbEG, Zh.gurtU], OG: [Zh.ffbOG, Zh.deckeDG], DG: [Zh.ffbDG, Zh.ffbDG + 2.6] };
    const dirs = { N: [0, -1], S: [0, 1], E: [-1, 0], W: [1, 0] };
    // Draußen (Terrasse, Freisitz, Balkone): wetterfeste Stoffe und Teak statt der Innenmaterialien
    const OUT = { fFabric: M.fOut, fFabric2: M.fOut, fOak: M.fTeak, fDark: M.fTeakDark, fCushion: M.fCushionOut };
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
        B(M.fOak, cx - 0.21, cx + 0.21, cy - 0.21, cy + 0.21, 0.43, 0.47);
        for (const [a, b] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) B(M.fDark, cx + a - 0.015, cx + a + 0.015, cy + b - 0.015, cy + b + 0.015, 0, 0.43);
        const bx = cx - fx * 0.19, by = cy - fy * 0.19;
        B(M.fOak, bx - (fy ? 0.21 : 0.02), bx + (fy ? 0.21 : 0.02), by - (fx ? 0.21 : 0.02), by + (fx ? 0.21 : 0.02), 0.47, 0.9);
      };
      const pendant = (x, y, h) => { if (out) return; C(M.fDark, x, y, h + 0.18, ceil, 0.006); C(M.fShade, x, y, h, h + 0.18, 0.2, 0.1); };
      for (const { t, a } of Plans.items(fl)) {
        // Lage bestimmen: außerhalb des Hauses gilt die Höhe von Terrasse, Freisitz oder Balkon
        const cx0 = ['wc', 'basin', 'hob'].includes(t) ? a[0] : (a[0] + a[1]) / 2, cy0 = ['wc', 'basin', 'hob'].includes(t) ? a[1] : (a[2] + a[3]) / 2;
        out = cx0 < 0 || cx0 > W || cy0 < -D || cy0 > 0;
        z = !out ? zf : fl === 'EG' ? (cx0 > W ? HOUSE.freisitz.z : HOUSE.terrasse.z) : fl === 'OG' ? HOUSE.balkon.slab[1] : HOUSE.balkonDG.slab[1] + 0.02;
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
          else if (k === 'liege') { B(M.fWhite, x0, x1, y0, y1, 0, 0.3); B(M.fFabric, x0 + 0.03, x1 - 0.03, y0 + 0.03, y1 - 0.03, 0.3, 0.38); B(M.fFabric, x1 - 0.55, x1 - 0.03, y0 + 0.03, y1 - 0.03, 0.38, 0.6); }
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
          else if (k === 'couchtisch') { B(M.fDark, x0 + 0.12, x1 - 0.12, y0 + 0.12, y1 - 0.12, 0, 0.32); B(M.fOak, x0, x1, y0, y1, 0.32, 0.4); }
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
          const [x0, x1, y0, y1, n = 3, ends = true] = a, horiz = x1 - x0 >= y1 - y0, g = 0.32;
          B(M.fOak, x0, x1, y0, y1, 0.72, 0.76);
          for (const [px, py] of [[x0 + 0.08, y0 + 0.08], [x1 - 0.08, y0 + 0.08], [x0 + 0.08, y1 - 0.08], [x1 - 0.08, y1 - 0.08]]) B(M.fOak, px - 0.03, px + 0.03, py - 0.03, py + 0.03, 0, 0.72);
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
    addCyl(M.fWhite, 14.7, -1.25, Zh.ffbUG, Zh.ffbUG + 1.9, 0.48, 0.48, 24);
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
    boxPlan(M.beton, wx0 + 0.01, wx1 - 0.01, R0.yPH, R0.yTor, -0.9, -0.06);
    boxPlan(M.tor, R0.x0, R0.x1, R0.yTor - 0.06, R0.yTor, R0.zTG, -0.9);
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
  // Auto als Seitenprofil über die Breite extrudiert, mit Scheiben, Rädern und Leuchten; Front bei x0 (Plan), Mitte bei Plan-y cy
  function car(x0, cy, zf, paint) {
    const prof = [[0, 0.32], [0, 0.62], [0.1, 0.78], [1.25, 0.95], [2.05, 1.42], [3.45, 1.46], [4.15, 1.07], [4.56, 1.0], [4.6, 0.62], [4.58, 0.32]];
    const body = new THREE.ExtrudeGeometry(new THREE.Shape(prof.map(([u, v]) => v2(u, v))), { depth: 1.72, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2, curveSegments: 4 });
    body.translate(x0, zf, -cy - 0.86); addGeo(paint, body, null);
    const side = new THREE.ShapeGeometry(new THREE.Shape([[1.32, 0.99], [2.05, 1.37], [3.42, 1.4], [4.06, 1.08]].map(([u, v]) => v2(u, v))));
    for (const zz of [-cy - 0.92, -cy + 0.92]) { const sg = side.clone(); sg.translate(x0, zf, zz); addGeo(M.carGlass, sg, null); }
    const quad = (p) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2)); g.computeVertexNormals(); return g; };
    for (const [u0, v0, u1, v1] of [[1.26, 0.97, 2.04, 1.43], [3.46, 1.47, 4.14, 1.08]]) {
      const zA = -cy - 0.8, zB = -cy + 0.8, o = 0.012;
      addGeo(M.carGlass, quad([x0 + u0, zf + v0 + o, zA, x0 + u1, zf + v1 + o, zA, x0 + u1, zf + v1 + o, zB, x0 + u0, zf + v0 + o, zA, x0 + u1, zf + v1 + o, zB, x0 + u0, zf + v0 + o, zB]), null);
    }
    for (const u of [0.85, 3.75]) for (const s of [-1, 1]) {
      const t = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 20); t.rotateX(Math.PI / 2); t.translate(x0 + u, zf + 0.33, -cy + s * 0.8); addGeo(M.tire, t, null);
      const h = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 16); h.rotateX(Math.PI / 2); h.translate(x0 + u, zf + 0.33, -cy + s * 0.8); addGeo(M.rim, h, null);
    }
    for (const s of [-1, 1]) {
      boxPlan(M.headlight, x0 - 0.01, x0 + 0.04, cy + s * 0.55, cy + s * 0.8, zf + 0.62, zf + 0.72);
      boxPlan(M.taillight, x0 + 4.56, x0 + 4.62, cy + s * 0.55, cy + s * 0.8, zf + 0.8, zf + 0.9);
    }
  }
  // Tiefgarage und Erdreich für den Blick in den Keller: Boden mit Markierung, Wände, Decke, Licht, vier Autos und Fahrräder
  function buildGarage() {
    const g = new THREE.Group(), R0 = HOUSE.rampe, zf = R0.zTG;
    const TGF = [[4.5, -11.65], [23.499, -11.65], [23.499, -24.151], [11.498, -24.151], [11.498, -14.652], [4.5, -14.652]];
    g.add(extrude(TGF, M.tgFloor, zf - 0.3, 0.3), extrude(TGF, M.beton, -0.9, 0.3));
    const walls = [[16, 23.499, -11.95, -11.65], [23.199, 23.499, -24.151, -11.65], [22.885, 23.499, -24.151, -23.851], [11.498, 19.38, -24.151, -23.851],
      [11.498, 11.798, -24.151, -14.652], [4.5, 11.798, -14.652, -14.352], [4.5, 4.8, -14.652, -11.65]];
    for (const r of walls) { boxPlan(M.beton, r[0], r[1], r[2], r[3], zf, -0.9); wallRects.push({ fl: 'UG', r, top: -0.9 }); }
    // Rampenwände unterhalb des Kellerschnitts ebenfalls mit Schnittfläche
    for (const [a, b] of [[R0.x0 - R0.wand, R0.x0], [R0.x1, R0.x1 + R0.wand]]) wallRects.push({ fl: 'UG', r: [a, b, cutRampY(), R0.yTor], top: 0 });
    // Markierung der Stellplätze
    for (let i = 0; i <= 4; i++) boxPlan(M.paint, 12.2, 17.2, -23.85 + 2.5 * i - 0.06, -23.85 + 2.5 * i + 0.06, zf, zf + 0.004);
    // LED-Leisten an der Decke
    for (const [x0, x1, y0, y1] of [[20.1, 20.3, -23.2, -12.6], [14.6, 14.8, -23.2, -12.6], [6.0, 10.5, -13.25, -13.05]]) boxPlan(M.led, x0, x1, y0, y1, -0.93, -0.9);
    // Autos in P1 bis P4, mit der Front zur Wand
    [M.car0, M.car1, M.car2, M.car3].forEach((m, i) => car(12.4, -22.6 + 2.5 * i, zf, m));
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
  function buildSite() {
    const g = new THREE.Group(), C = SITE.concept, R0 = HOUSE.rampe;
    groundAO();
    const poolOuter = C.pool, trench = [[R0.x0, R0.y0], [R0.x1, R0.y0], [R0.x1, R0.yPortal], [R0.x0, R0.yPortal]];
    const ground = new THREE.Shape(rectPts(-260, -260, 280, 260));
    for (const h of [poolOuter, trench]) ground.holes.push(new THREE.Path(h.map(q => v2(q[0], q[1]))));
    const gg = addUV1(new THREE.ShapeGeometry(ground)); gg.rotateX(-Math.PI / 2);
    const gm = new THREE.Mesh(gg, M.ground); gm.position.y = -0.03; gm.receiveShadow = true; g.add(gm);
    L.grund = [gm];
    for (const s of SITE.streets) { const m = flat(s, M.street, -0.01); g.add(m); L.grund.push(m); }
    const lawn = flat(SITE.plot, M.lawn, 0.004, [poolOuter, trench]); g.add(lawn); L.grund.push(lawn);
    // Zufahrt: vorne eben, dahinter die offene Rampe in die Tiefgarage
    const zufahrtEben = [[19.732, -50.499], [24.731, -51.342], [24.731, -44.471], [R0.x1 + R0.wand, -44.471], [R0.x1 + R0.wand, R0.y0], [19.732, R0.y0]];
    for (const P0 of [C.zuwegung, zufahrtEben]) { const m = flat(P0, M.pave, 0.016); g.add(m); L.grund.push(m); }
    buildRamp(g);
    // Pool
    g.add(extrude(poolOuter, M.coping, 0, 0.06, [C.poolWasser]));
    const pw = C.poolWasser, w = pw[1][0] - pw[0][0], d = pw[0][1] - pw[2][1];
    const basin = new THREE.Mesh(new THREE.BoxGeometry(w, 1.4, d), M.tile);
    basin.position.set(pw[0][0] + w / 2, -0.7, -(pw[0][1] - d / 2)); basin.receiveShadow = true; g.add(basin);
    g.add(flat(pw, M.water, -0.12));
    // Poolhaus mit Glasfront zum Pool; darunter führt die Rampe in die Tiefgarage
    const ph = C.poolhaus;
    g.add(extrude(ph, M.site, 0, 3.0));
    const [px0, py1] = ph[0], [px1, py0] = ph[2];
    const roofPH = extrude([[px0 - 0.15, py1 + 0.15], [px1 + 0.15, py1 + 0.15], [px1 + 0.15, py0 - 0.15], [px0 - 0.15, py0 - 0.15]], M.siteHell, 3.0, 0.22);
    g.add(roofPH);
    const ga = py0 + 0.5, gb = py1 - 0.5;
    boxPlan(M.phInnen, px0 - 0.012, px0 - 0.002, ga, gb, 0.25, 2.7);
    boxPlan(M.siteGlass, px0 - 0.034, px0 - 0.026, ga, gb, 0.25, 2.7);
    for (const y of [ga, ga + 1.25, (ga + gb) / 2, gb - 1.25, gb]) boxPlan(M.frame, px0 - 0.06, px0, y - 0.03, y + 0.03, 0.25, 2.7);
    boxPlan(M.frame, px0 - 0.06, px0, ga - 0.03, gb + 0.03, 2.7, 2.76);
    boxPlan(M.frame, px0 - 0.06, px0, ga - 0.03, gb + 0.03, 0.2, 0.25);
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
    bed(0.25, 4.3, -12.55, -11.78, ['lavendel', 'lavendel', 'hortensie', 'gruen'], 9);
    bed(11.7, 15.75, -12.55, -11.78, ['lavendel', 'lavendel', 'hortensie', 'gruen'], 9);
    bed(-0.95, -0.15, -11.4, -0.6, ['hortensie', 'gruen', 'lavendel'], 4);
    bed(19.1, 19.8, -10.8, -5.9, ['hortensie', 'lavendel'], 5);
    bed(0.3, 5.3, 0.15, 0.85, ['gruen', 'hortensie'], 4);
    bed(10.7, 15.7, 0.15, 0.85, ['gruen', 'hortensie'], 4);
    for (const [x, y] of [[4.15, -14.95], [11.85, -14.95], [19.35, -11.15], [5.2, 0.55], [10.8, 0.55], [-0.6, -12.2], [16.6, -12.2]]) items.buchs.push([x, y, 0.42]);
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
    if (scene.fog) scene.fog.color.setRGB(0.1 + 0.68 * day, 0.12 + 0.7 * day, 0.17 + 0.71 * day);
    M.lamp.emissiveIntensity = 2.4 * night;
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
  function goTo(name) {
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
      controls.maxPolarAngle = on ? Math.PI * 0.9 : Math.PI * 0.495;
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
    controls.autoRotate = st.rotate && !st.ortho;
    if (controls.update() || dirty) {
      dirty = false;
      // Nahe Kamera (im Haus): kleine Nahebene, damit Wände beim Hineinzoomen nicht abgeschnitten werden
      const nr = THREE.MathUtils.clamp(camP.position.distanceTo(controls.target) * 0.02, 0.03, 0.3);
      if (Math.abs(nr - camP.near) > 0.005) { camP.near = nr; camP.updateProjectionMatrix(); }
      const q = camP.position, ins = cam === camP && st.level === 'alle' && ((q.x > 0.3 && q.x < 15.7 && q.z > 0.3 && q.z < 11.35 && q.y > -3.1 && q.y < 10.4) ||
        (q.x > 4.5 && q.x < 23.5 && q.z > 11.65 && q.z < 24.15 && q.y < -0.9));
      if (ins !== !!st.inside) { st.inside = ins; applyLight(); }
      renderFrame();
    }
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
    controls.minDistance = 0.3; controls.maxDistance = 260; controls.autoRotateSpeed = 0.6; controls.zoomToCursor = true;
    controls.addEventListener('change', () => { updateScale(); invalidate(); });
    controls.addEventListener('start', () => { tween = null; });
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
  };
})();
