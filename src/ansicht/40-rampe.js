  // Teil der Ansichten (src/ansicht/, siehe 00-kern.js)
  // Schnitt B–B in der Achse der Rampe, Blick nach Westen: links Straße und Zufahrt, rechts die Tiefgarage.
  function rampSection(opt) {
    const R0 = HOUSE.rampe, G = HOUSE.tg, yS = -53.2, u = y => y - yS, yEnd = -17.4, uE = u(yEnd), zPH = HOUSE.poolhaus.z, T = R0.tor, uz = R0.unterzug;
    const xc = (R0.x0 + R0.x1) / 2, yG = R0.grenze(xc), pct = v => `${+(v * 100).toFixed(1)}`.replace('.', ',') + ' %';
    // Fahrbahn ab der Grenze (in der Achse, bis zur Westkante noch eben): an jedem Knick und dazwischen alle 40 cm
    const ys = [yG, R0.yG, R0.y0, R0.y0 + R0.lm, R0.y1, R0.yTor];
    for (let y = yG; y < R0.yTor; y += 0.4) ys.push(y);
    const prof = ys.sort((a, b) => a - b).map(y => [u(y), R0.z(y)]);
    prof.push([uE, R0.zTG]);
    const back = prof.slice().reverse(), u0 = u(R0.y0), uP = u(R0.yPortal), uH = u(R0.yPH), uT = u(R0.yTor), uTE = u(R0.yE), uG = u(yG), zP = R0.z(R0.yPortal);
    const x0 = -0.6, x1 = uE + 0.6;
    let s = r(x0 + 0.3, -4.1, x1 - 0.3, 0, 'e-earth');
    // Luftraum: Vorplatz, offener Graben, Durchfahrt unter dem Poolhaus, Anschluss und Tiefgarage
    s += poly([[uG, 0], [uP, 0], [uP, R0.decke], [uH, R0.decke], [uH, G.decke], [uE, G.decke], ...back], 'e-room');
    // Rampenwand mit Geländer jenseits der Schnittebene, am Vorplatz der bündige Randstein
    s += poly([[u0, 0.15], [uP, 0.15], [uP, zP], ...prof.filter(p => p[0] > u0 && p[0] < uP).reverse(), [u0, R0.zR]], 'e-beyond');
    const uK = u(Math.max(R0.grenze(R0.x0 - R0.wand), R0.yG) + 0.02);
    s += poly([[uK, 0.02], [u0, 0.02], [u0, R0.zR], ...prof.filter(p => p[0] > uK && p[0] < u0).reverse(), [uK, R0.z(uK + yS)]], 'e-beyond');
    s += rail(u0 + 0.3, uP - 0.06, 0.15, 1.05).replace(/class="e-bar"/g, 'class="e-bar e-railx"');
    // Fahrbahnplatte mit den Rinnen (am Ende des Vorplatzes, vor dem Tor), Unterzug unter der Nordwand des Poolhauses, Decke der Tiefgarage
    s += poly([...prof, ...back.map(([a, b]) => [a, b - 0.3])], 'e-cut') + r(uH - uz.b, G.decke, uH, R0.decke, 'e-cut') + r(uH, G.decke, uE, G.decke + G.platte, 'e-cut');
    for (const y of [R0.y0 - 0.09, R0.y1 + 0.15]) s += r(u(y) - 0.08, R0.z(y) - 0.15, u(y) + 0.08, R0.z(y), 'e-room');
    // Unterzug an der Kante Stellplätze/Fahrgasse (x 17,20) jenseits der Schnittebene
    const U = G.unterzug;
    s += r(uTE, G.decke - U.h, uE, G.decke, 'e-beyond');
    // Sektionaltor: Sturz geschnitten, Torblatt an der Innenseite der Wand, offen (gestrichelt) über einen Bogen waagrecht unter der Decke
    const hb = T.h + 0.05, zb = R0.zTG + hb, zh = zb + 0.25;
    s += r(uT, R0.zTG + T.h, uTE, G.decke, 'e-cut') + r(uTE + 0.01, R0.zTG, uTE + 0.05, zb, 'e-bar');
    s += pline([...[0, 1, 2, 3, 4, 5, 6].map(k => [uTE + 0.28 - 0.25 * Math.cos(k * Math.PI / 12), zb + 0.25 * Math.sin(k * Math.PI / 12)]), [uTE + 0.28 + hb, zh]], 'e-dim e-dash');
    s += tx(uT - 1.75, R0.zTG + 1.3, `Tor ${num(T.h)} m`, 'e-mark') + tx(uTE + 0.4, G.decke - U.h - 0.22, 'Tor offen unter der Decke', 'e-mark');
    // Poolhaus: Boden zugleich Decke der Durchfahrt, Wände geschnitten (Nordwand mit Fenster, wenn es in der Schnittachse liegt), dahinter die Glas-Schiebewand zum Pool; flaches Walmdach im Schnitt
    const PH = HOUSE.poolhaus, tn = Math.tan(PH.neigung * Math.PI / 180), ov = 0.25, ex = Math.min(xc - (PH.x0 - PH.veranda - ov), PH.x1 + ov - xc);
    const rY0 = u(PH.y0 - ov), rY1 = u(PH.y1 + ov), rz = PH.traufe + tn * ex, uDoor = v => u(PH.y1 - v);
    s += r(uP, R0.decke, uH, zPH, 'e-cut') + r(uP + PH.wand, zPH, uH - PH.wand, PH.gesims, 'e-room');
    { const [a, b] = PH.front; s += r(uDoor(b), zPH, uDoor(a), 2.45, 'e-beyond'); for (let q = 0; q <= 3; q++) { const uu = uDoor(a + (b - a) * q / 3); s += ln(uu, zPH, uu, 2.45, 'e-glassline'); } }
    const fenster = PH.fenster[0] < xc && xc < PH.fenster[1];
    s += r(uP, zPH, uP + PH.wand, PH.gesims, 'e-cut') + r(uP - 0.1, PH.gesims, uH + 0.1, PH.traufe, 'e-cut');
    s += fenster ? r(uH - PH.wand, zPH, uH, 0.9, 'e-cut') + r(uH - PH.wand, 2.45, uH, PH.gesims, 'e-cut') + ln(uH - PH.wand / 2, 0.9, uH - PH.wand / 2, 2.45, 'e-glassline')
      : r(uH - PH.wand, zPH, uH, PH.gesims, 'e-cut');
    s += poly([[rY0, PH.traufe], [rY0 + ex, rz], [rY1 - ex, rz], [rY1, PH.traufe], [rY1, PH.traufe - 0.18], [rY1 - ex, rz - 0.2], [rY0 + ex, rz - 0.2], [rY0, PH.traufe - 0.18]], 'e-cutroof');
    s += ln(x0 + 0.3, 0, uG, 0, 'e-ground') + ln(uH, 0, x1 - 0.3, 0, 'e-ground');
    s += ln(uG, -0.7, uG, 1.7, 'e-dim e-dash') + tx(uG, 1.9, 'Grenze', 'e-label');
    s += tx(uG / 2, 0.45, 'Straße', 'e-label') + tx((uG + u0) / 2, 0.45, 'Vorplatz', 'e-label') + tx((u0 + uP) / 2, 1.6, 'offene Rampe · 2,80 m breit', 'e-label');
    const uL = (uTE + uE) / 2 + 0.6, txm = (uu, z, t) => tx(uu, z, t, 'e-mark').replace('<text ', '<text text-anchor="middle" ');
    s += tx((uP + uH) / 2, 1.55, 'Poolhaus', 'e-label') + tx(uL, -2.05, 'Tiefgarage', 'e-label');
    s += txm(uL, -2.5, `lichte Höhe ${num(G.lichte)} m`) + txm(uL, -2.85, `unter dem Unterzug (dahinter) ${num(U.lichte)} m`);
    // Neigungen; lichte Höhen am Portal unter dem Poolhaus und unter dem Unterzug an dessen Nordwand
    const sl = (ya, yb, t) => tx((u(ya) + u(yb)) / 2, R0.z((ya + yb) / 2) - 0.62, t, 'e-dimtxt');
    s += sl(R0.yG, R0.y0, pct(R0.vor.s)) + sl(R0.y0, R0.y0 + R0.lm, pct(R0.s)) + sl(R0.y0 + R0.lm, R0.y1, pct(R0.unten.s));
    const hoehe = (uh, zr, zt, t) => ln(uh, zr, uh, zt, 'e-dim') + ln(uh - 0.11, zr, uh + 0.11, zr, 'e-dim') + ln(uh - 0.11, zt, uh + 0.11, zt, 'e-dim') + tx(uh + 0.2, (zr + zt) / 2, t, 'e-mark');
    s += hoehe(uP + 0.03, R0.z(R0.yPortal + 0.03), R0.decke, `lichte Höhe ${num(R0.lichte)} m`);
    s += hoehe(uH - uz.b - 0.03, R0.z(R0.yPH - uz.b - 0.03), G.decke, `${num(uz.lichte)} m`);
    if (opt.mass) s += chain([uG, u0, u(R0.y0 + R0.lm), u(R0.y1), uTE], -4.55) + chain([uP, uH], 3.7);
    if (opt.koten) {
      const mark = (uu, z, t) => poly([[uu - 0.16, z + 0.27], [uu + 0.16, z + 0.27], [uu, z]], 'e-kmark') + tx(uu + 0.24, z + 0.07, `${kote(z)} ${t}`, 'e-mark');
      s += mark(uG - 1.0, 0, '') + mark(u0, R0.zR, 'Rinne') + mark(uP + 1.0, zPH, 'Boden Poolhaus') + mark(uTE + 1.9, R0.zTG, 'Boden Tiefgarage');
      s += poly([[uP - 0.31, zP + 0.32], [uP - 0.05, zP + 0.32], [uP - 0.18, zP + 0.05]], 'e-kmark') + tx(uP - 0.18, zP + 0.5, kote(zP), 'e-dimtxt');
    }
    return { svg: s, vb: [x0, -4.3, x1 - x0, 9.5] };
  }
