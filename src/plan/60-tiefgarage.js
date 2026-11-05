  // Teil der Grundrisse (src/plan/, siehe 00-kern.js): Tiefgarage im UG-Plan (Wände, Stellplätze, Fahrräder, Unterzug, Tor)
  function tiefgarage() {
    const tg = C.tg, ph = C.poolhaus, rp = HOUSE.rampe, PL = SITE.plot, wx0 = rp.x0 - rp.wand, wx1 = rp.x1 + rp.wand, rc = (rp.x0 + rp.x1) / 2;
    const kote = v => (Math.abs(v) < 0.005 ? '±' : v > 0 ? '+' : '−') + num(Math.abs(v), 2);
    const pct = v => num(v * 100, Math.round(v * 1000) % 10 ? 1 : 0), gr = rp.grenze;
    let s = `<polygon points="${pts(tg)}" class="g-tgfloor" data-tip="Tiefgarage · ${num(area2(tg))} m² · drei Stellplätze, mittig unter der Terrasse der Eingangsbereich zum Haus, östlich daneben die Fahrräder"/>`;
    // Vorplatz ab der Grenze bis zur Rinne, dann die Rampe: offen in der Zufahrt, unter dem Poolhaus bis in den Anschluss der Tiefgarage (GaStellV § 3)
    s += `<polygon points="${pts(rp.vorplatz)}" class="g-ramp" data-tip="Vorplatz · ${num(rp.vor.l, 2)} m ab der Grenze (Westkante, an der Ostkante ${num(rp.y0 - gr(rp.x1), 2)} m) mit ${pct(rp.vor.s)} % bis zur Rinne"/>`;
    s += R(rp.x0, rp.x1, rp.y0, rp.y1, 'g-ramp', `Rampe · offen in der Zufahrt, dann unter dem Poolhaus · ${num(rp.x1 - rp.x0, 2)} m breit · ${num(rp.lm, 2)} m mit ${pct(rp.s)} %, unten ${num(rp.unten.l, 2)} m mit ${pct(rp.unten.s)} %, dann ${num(rp.eben, 2)} m eben bis zum Tor`);
    for (let y = rp.y0 + 1; y < rp.y1 - 0.2; y += 1) s += L(rp.x0, y, rp.x1, y, 'g-furn-l');
    s += R(wx0, rp.x0, rp.y0, rp.yTor, 'g-wall') + R(rp.x1, wx1, rp.y0, rp.yTor, 'g-wall');
    for (const [a, b] of [[wx0, rp.x0], [rp.x1, wx1]]) s += R(a, b, Math.max(gr(a), gr(b)) + 0.02, rp.y0, 'g-furn', 'Randstein am Vorplatz, bündig mit Pflaster und Rasen');
    // Rinnen mit Rost: am Ende des Vorplatzes und vor dem Tor, dort am Westrand der Pumpensumpf
    for (const [y, xa, t] of [[rp.y0 - 0.09, rp.x0, 'Rinne am Ende des Vorplatzes · fängt das Wasser vor der Rampe ab'], [rp.y1 + 0.15, rp.x0 + 0.5, 'Rinne vor dem Tor · Wasser der Rampe zum Pumpensumpf']]) {
      s += R(xa, rp.x1, y - 0.08, y + 0.08, 'g-furn', t);
      for (let x = xa + 0.1; x < rp.x1 - 0.05; x += 0.12) s += L(x, y - 0.08, x, y + 0.08, 'g-thin');
    }
    s += R(rp.x0 + 0.04, rp.x0 + 0.46, rp.y1 - 0.06, rp.y1 + 0.36, 'g-furn', 'Pumpensumpf mit Deckel') + L(rp.x0 + 0.04, rp.y1 - 0.06, rp.x0 + 0.46, rp.y1 + 0.36, 'g-thin');
    // Wände der Tiefgarage wie im 3D-Modell (innen am Umriss, mit den Leibungen der Toröffnung), zur Rampe hin offen; darüber das Poolhaus
    for (const w of HOUSE.tg.waende) s += R(w[0], w[1], w[2], w[3], 'g-wall');
    s += `<polygon points="${pts(ph)}" class="g-above" data-tip="Poolhaus darüber · lichte Höhe der Durchfahrt ca. ${num(rp.lichte, 2)} m"/>`;
    // Sektionaltor hinter der Öffnung an der Innenseite der Wand; offen liegt es unter der Decke (Laufschienen und Antrieb gestrichelt)
    s += R(rp.x0 - 0.05, rp.x1 + 0.05, rp.yE, rp.yE + 0.05, 'g-gate', `Sektionaltor ${num(rp.tor.b, 2)} × ${num(rp.tor.h, 2)} m · hinter der Öffnung, läuft offen unter die Decke · Sturz ${num(rp.tor.sturz, 2)} m`) + T(rc, rp.yTor - 0.55, 'Tor', 'g-ftxt');
    for (const x of [rp.x0 - 0.085, rp.x1 + 0.085, rc]) s += L(x, rp.yE + 0.05, x, rp.yE + (x === rc ? 3.35 : 2.75), 'g-above');
    s += `<polyline points="${pts([[16, -50.123], PL[2], PL[3]])}" class="g-grenze"/>` + T(17.4, -50.75, 'Grenze · Ebertstraße', 'g-ftxt');
    s += T(rc, rp.yG + 0.45, 'Einfahrt', 'g-ftxt') + T(rc, rp.y0 - 0.75, `Vorplatz ${pct(rp.vor.s)} %`, 'g-ftxt') + T(rc, -30.75, 'unter dem Poolhaus', 'g-ftxt');
    s += `<text x="${f(rc)}" y="41.3" class="g-ftxt" transform="rotate(-90 ${f(rc)} 41.3)">offene Rampe · ${pct(rp.s)} %</text>`;
    for (const [y, d] of [[rp.y0, 0], [rp.yPortal, 0], [rp.y1, -0.45]]) s += T(wx0 - 0.75, y - 0.08 + d, kote(rp.z(y)), 'g-ftxt');
    for (const y of [-36.9, -20.3]) s += `<polygon points="${pts([[rc - 0.35, y], [rc + 0.35, y], [rc, y + 0.9]])}" class="g-walkhead"/>`;
    // Drei Stellplätze 2,85 × 5,20 m an der 6 m breiten Fahrgasse, die Autos mit der Front zur Holzwand; davor der offene Eingangsbereich (ohne Glas)
    const G = HOUSE.tg, U = G.unterzug;
    for (let i = 0; i <= G.autos.length; i++) s += L(G.x0, G.y0 + G.bucht * i, G.x1, G.y0 + G.bucht * i, 'g-park');
    // Unterzüge über der Schnittebene (gestrichelt): an der Kante Stellplätze/Fahrgasse und unter der Nordwand des Poolhauses
    s += R(U.x - U.b / 2, U.x + U.b / 2, -23.851, -11.95, 'g-above', `Unterzug ${num(U.b * 100, 0)} × ${num(U.h * 100, 0)} cm unter der Decke · halbiert deren Spannweite · lichte Höhe darunter ${num(U.lichte, 2)} m`);
    s += R(wx0, wx1, rp.yPH - rp.unterzug.b, rp.yPH, 'g-above', `Unterzug unter der Nordwand des Poolhauses · Unterkante wie die Decke der Tiefgarage · lichte Höhe darunter ${num(rp.unterzug.lichte, 2)} m`);
    const E = G.schleuse;
    s += R(E.x0, E.x1, E.y0, E.y1, 'g-room', `Eingangsbereich · ${num(E.x1 - E.x0, 2)} × ${num(E.y1 - E.y0, 2)} m · offen zur Tiefgarage, Steinboden, Garderobe mit Schuhbank, Spiegel, Tür ins Foyer`);
    s += T((E.x0 + E.x1) / 2, -13.15, 'Eingangsbereich', 'g-roomtxt');
    G.autos.forEach((c, i) => {
      const cy = G.mitte(i), x0 = G.x0 + 0.05;
      s += `<rect x="${f(x0)}" y="${f(-cy - c.W / 2)}" width="${f(c.L)}" height="${f(c.W)}" rx="0.35" class="g-car" data-tip="${c.name} · ${num(c.L, 2)} × ${num(c.W, 2)} m"/>` +
        L(x0 + c.L * 0.3, cy - c.W / 2 + 0.12, x0 + c.L * 0.3, cy + c.W / 2 - 0.12, 'g-furn-l') + L(x0 + c.L * 0.72, cy - c.W / 2 + 0.12, x0 + c.L * 0.72, cy + c.W / 2 - 0.12, 'g-furn-l') +
        T(x0 + c.L / 2, cy - 0.1, c.name.replace(/^(Ferrari|Porsche|Mercedes) /, ''), 'g-ftxt') + T(G.x1 + 0.55, cy - 0.1, `P${i + 1}`, 'g-ftxt');
    });
    // Fahrräder halb hochgestellt an der Hauswand östlich des Eingangsbereichs (Lenker als Querstrich), davor der Weg von den Stellplätzen zum Eingang
    const Rd = G.raeder;
    s += `<g data-tip="Fahrräder · ${Rd.x.length} Stück, halb hochgestellt (Vorderrad im Wandhalter) · ${num(Rd.tief, 2)} m tief, davor der Weg zum Eingang">` +
      Rd.x.map(x => { const w = Rd.wand(x); return L(x, w - 0.06, x, w - Rd.tief, 'g-furn-l') + L(x - 0.25, w - 1.04, x + 0.25, w - 1.04, 'g-furn-l'); }).join('') + '</g>';
    // Fahrgasse von der Buchtkante bis zur nächsten Wand im Osten, auf Höhe der Buchten (Beschriftung in ihrer Mitte)
    const yb = [G.y0, G.y0 + G.autos.length * G.bucht];
    const gasse = Math.min(...G.waende.filter(w => w[0] >= G.x1 - 1e-6 && w[2] < yb[1] && w[3] > yb[0]).map(w => w[0])) - G.x1;
    s += T(14.6, -13.6, 'Fahrräder', 'g-ftxt') + T(Math.round((G.x1 + gasse / 2) * 10) / 10, -18.2, `Fahrgasse ${num(gasse, 2)} m`, 'g-ftxt');
    s += T(20.2, -14.85, 'Tiefgarage', 'g-roomtxt') + T(20.2, -15.5, `${num(area2(tg))} m² · lichte Höhe ${num(G.lichte, 2)} m`, 'g-areatxt');
    return s;
  }
