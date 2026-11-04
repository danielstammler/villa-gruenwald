  // Teil des 3D-Modells (src/view3d/, siehe 00-kern.js): Innenwände, Böden, Aufzug, Treppe und Möbel aus dem Grundriss; Liegen und Sonnenschirme
  // Innenräume nach dem Grundriss-Vorschlag: Böden, Wände, Treppe und Aufzugsschacht
  function buildInterior() {
    const lv = { UG: [Zh.ffbUG, -0.15], EG: [Zh.ffbEG, Zh.gurtU], OG: [Zh.ffbOG, Zh.deckeDG], DG: [Zh.ffbDG, Zh.ffbDG + 2.6] };
    // Fliesen in Bädern, Küche und Nebenräumen, Kalkstein in Halle und Garderobe, sonst Eichendielen
    const nass = /bad|wc|dusche|küche|backkitchen|speis|abstell|schleuse|lager|technik|waschen|vorraum/i, halle = /halle|garderobe|foyer/i, gym = /gym/i;
    const W = HOUSE.W, D = HOUSE.D, roofIn = HOUSE.roofIn, { LINE, HOLES, LIFT, VOID } = Plans.CORE;
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
    const openings = { UG: [LIFT], EG: [HOLES.EG, LIFT], OG: [HOLES.OG, LIFT, ...VOID], DG: [HOLES.DG, LIFT] };
    const doorRect = d => d.o === 'v' ? [d.x - 0.2, d.x + 0.2, d.y, d.y + d.w] : [d.x, d.x + d.w, d.y - 0.2, d.y + 0.2];
    // Außenwände des Untergeschosses (unter Gelände), mit der Tür zur Tiefgarage in der Südwand
    const t0 = HOUSE.wall, ug = [[0, W, -D, -D + t0, HOUSE.tg.schleuse.hausTuer], [0, W, -t0, 0], [W - t0, W, -D + t0, -t0]];
    for (const [a, b, c, e, gap] of ug) {
      const segs = gap ? [[a, gap[0]], [gap[1], b]] : [[a, b]];
      for (const [p, q] of segs) { boxPlan(M.inWall, p, q, c, e, Zh.ffbUG - 0.3, -0.15); wallRects.push({ fl: 'UG', r: [p, q, c, e], top: -0.15 }); }
    }
    // Westwand des UG mit den Fenstern zum Lichthof vor dem Gym: bis zum Boden, schwarze Rahmen mit Mittelsprosse, darüber ein Sturz
    {
      const LH = HOUSE.lichthof, wy = LH.win.map(([a, b]) => [-b, -a]).sort((p, q) => p[0] - q[0]), zt = -0.62;
      let y = -D + t0;
      for (const [a, b] of [...wy, [-t0, -t0]]) {
        if (a > y) { boxPlan(M.inWall, 0, t0, y, a, Zh.ffbUG - 0.3, -0.15); wallRects.push({ fl: 'UG', r: [0, t0, y, a], top: -0.15 }); }
        if (b > a) {
          boxPlan(M.inWall, 0, t0, a, b, zt, -0.15);
          for (const [p, q, z0, z1] of [[a, a + 0.07, Zh.ffbUG, zt], [b - 0.07, b, Zh.ffbUG, zt], [a, b, zt - 0.07, zt], [a, b, Zh.ffbUG, Zh.ffbUG + 0.07], [(a + b) / 2 - 0.035, (a + b) / 2 + 0.035, Zh.ffbUG, zt]])
            boxPlan(M.frame, 0.1, 0.18, p, q, z0, z1);
          boxPlan(M.glass, 0.13, 0.15, a + 0.05, b - 0.05, Zh.ffbUG + 0.05, zt - 0.05);
        }
        y = Math.max(y, b);
      }
    }
    // Sturz über der Tür von der Tiefgarage ins Foyer (die Flügel enden bei 2,28 m)
    { const [ta, tb] = HOUSE.tg.schleuse.hausTuer; boxPlan(M.inWall, ta, tb, -D, -D + t0, Zh.ffbUG + 2.3, -0.15); }
    // Bodenplatte des Untergeschosses, damit auch unter Türöffnungen Boden ist; im DG Boden bis an die Zwerchhausfronten
    boxPlan(M.slab, 0, W, -D, 0, Zh.ffbUG - 0.3, Zh.ffbUG - 0.025);
    for (const [y0, y1] of [[-D + 0.12, -D + 0.36], [-0.36, -0.12]]) boxPlan(M.floorOak, 4.45, 11.55, y0, y1, Zh.ffbDG - 0.11, Zh.ffbDG + 0.005);
    for (const fl of ['UG', 'EG', 'OG', 'DG']) {
      const F = Plans.FL[fl], [z0, z1] = lv[fl];
      for (const rm of F.rooms) for (const rr of [rm.r, ...(rm.ext || [])]) for (const q of minus(rr, openings[fl])) boxPlan(nass.test(rm.n) ? M.floorTile : halle.test(rm.n) ? M.floorHall : gym.test(rm.n) ? M.floorGym : M.floorOak, q[0], q[1], q[2], q[3], z0 - 0.02, z0 + 0.005);
      // frei bleiben Räume, Durchgänge, Türen und der Aufzugsschacht (seine Wände kommen eigens)
      const free = [...F.rooms.flatMap(r => [r.r, ...(r.ext || [])]), ...(F.open || []), ...F.doors.map(doorRect), LIFT];
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
    // Aufzug unauffällig im Wandblock am Treppenpodest: geschlossener Schacht, Türen nach Osten wandbündig in Wandfarbe mit feiner
    // Schattenfuge und kleinem Rufknopf, so dass sie kaum auffallen
    const [lx0, lx1, ly0, ly1] = LIFT, ld = -4.2;
    for (const r of [[lx0, lx0 + 0.2, ly0, ly1], [lx1 - 0.2, lx1, ly0, ly1], [lx0, lx1, ly0, ly0 + 0.2], [lx0, lx1, ly1 - 0.2, ly1]]) {
      boxPlan(M.inWall, r[0], r[1], r[2], r[3], Zh.ffbUG, 9.6);
      for (const fl of ['UG', 'EG', 'OG', 'DG']) wallRects.push({ fl, r, top: 9.6 });
    }
    for (const zf of [Zh.ffbUG, Zh.ffbEG, Zh.ffbOG, Zh.ffbDG]) {
      for (const [y0, y1, z0, z1] of [[ld - 0.47, ld - 0.462, zf, zf + 2.12], [ld + 0.462, ld + 0.47, zf, zf + 2.12], [ld - 0.47, ld + 0.47, zf + 2.112, zf + 2.12], [ld - 0.004, ld + 0.004, zf, zf + 2.12]])
        boxPlan(M.frame, lx1, lx1 + 0.004, y0, y1, z0, z1);
      boxPlan(M.metal, lx1, lx1 + 0.01, ld + 0.62, ld + 0.68, zf + 1.02, zf + 1.16);
    }
    // OG: schwarzes Geländer am Luftraum neben dem Antritt der Dachtreppe; DG: Geländer an der Öffnung über der Dachtreppe
    railing(M.metal, new THREE.Matrix4().makeTranslation(0, 0, -LINE[3] + 0.04), Plans.CORE.FLIGHTS.OG.x0 + 0.02, VOID[0][1] - 0.02, Zh.ffbOG, Zh.ffbOG + 1.0, 0);
    railing(M.metal, new THREE.Matrix4().makeRotationY(Math.PI / 2).premultiply(new THREE.Matrix4().makeTranslation(HOLES.DG[1] + 0.04, 0, 0)), LINE[2] + 0.02, LINE[3] - 0.02, Zh.ffbDG, Zh.ffbDG + 1.0, 0);
    // Kronleuchter im Luftraum über der Eingangsachse: Stange vom DG-Boden, zwei Ringe mit Lichtschirmen (leuchten abends)
    const cx = 8.0, cy = (VOID[0][2] + VOID[0][3]) / 2;
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
  // Treppen: drei gerade Läufe in der Treppenbahn an der Rückwand der Halle, je ein Geschoss, alle nach Westen steigend und genau
  // übereinander. Weiße Läufe mit Stufen aus hellem Naturstein; zur Halle hin eine geschlossene Brüstung mit Steinabdeckung, die im EG
  // bis zum Boden reicht (dahinter liegt die Kellertreppe), mit Pfosten am Antritt und im EG einer breiten, gerundeten Antrittsstufe.
  function buildStair() {
    const { LINE, FLIGHTS } = Plans.CORE, ly0 = LINE[2], ly1 = LINE[3], h = 0.92, t = 0.13;
    // Prisma aus einem Längsschnitt (Punkte [x, z]) über die Breite y0 … y1 der Bahn
    const prism = (mat, pts, y0, y1) => {
      const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, z]) => v2(x, z))), { depth: y1 - y0, bevelEnabled: false });
      addGeo(mat, g, new THREE.Matrix4().makeTranslation(0, 0, -y1));
    };
    for (const fl of ['UG', 'EG', 'OG']) {
      const { x0, x1, n, za, zb } = FLIGHTS[fl], rise = (zb - za) / n, g = (x0 - x1) / (n - 1), zt = i => za + (i + 1) * rise, xs = i => x0 - i * g;
      // Stufenprofil von unten (Osten) nach oben (Westen); die Kellertreppe ist massiv, die anderen tragen als Laufplatte frei darüber
      const steps = [[x0, za]];
      for (let i = 0; i < n - 1; i++) steps.push([xs(i), zt(i)], [xs(i + 1), zt(i)]);
      steps.push([x1, zb]);
      prism(M.putzHell, [...steps, ...(fl === 'UG' ? [[x1, za]] : [[x1, zb - 0.32], [x0 - 0.5, za]])], ly0, ly1);
      const yt = fl === 'UG' ? ly1 : ly1 - t;
      for (let i = 0; i < n - 1; i++) boxPlan(M.stairMat, xs(i + 1), xs(i) + 0.03, ly0, yt, zt(i) - 0.035, zt(i) + 0.005);
      if (fl === 'UG') continue;
      // Brüstung an der Nordseite mit Steinabdeckung: im EG bis zum Boden geschlossen, im OG unter dem Lauf offen zum Luftraum
      const top = [[x0, za + rise + h], [x1, zb + h]];
      prism(M.putzHell, [...top, ...(fl === 'EG' ? [[x1, za], [x0, za]] : [[x1, zb - 0.32], [x0 - 0.5, za], [x0, za]])], yt, ly1);
      prism(M.stairMat, [...top, [x1, zb + h + 0.06], [x0, za + rise + h + 0.06]], yt - 0.025, ly1 + 0.025);
      boxPlan(M.putzHell, x0 - 0.26, x0, yt - 0.065, ly1 + 0.065, za, za + rise + 1.02);
      boxPlan(M.stairMat, x0 - 0.285, x0 + 0.025, yt - 0.09, ly1 + 0.09, za + rise + 1.02, za + rise + 1.09);
      if (fl === 'EG') {
        // breite Antrittsstufe, zur Halle hin 40 cm vorgezogen und gerundet
        boxPlan(M.stairMat, x0 - g, x0 - 0.2, ly1, ly1 + 0.4, za, zt(0) + 0.005); boxPlan(M.stairMat, x0 - 0.2, x0, ly1, ly1 + 0.2, za, zt(0) + 0.005);
        addCyl(M.stairMat, x0 - 0.2, ly1 + 0.2, za, zt(0) + 0.005, 0.2, 0.2, 20);
      }
    }
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
            // Insel ohne Barhocker (Daniel, 4.11.2026), darüber zwei Pendelleuchten
            if (k === 'insel') for (const px of [x0 + 0.5, x1 - 0.5]) pendant(px, (y0 + y1) / 2, 1.75);
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
