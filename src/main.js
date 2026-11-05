// Bedienung: Tabs, 3D-Steuerung, Ansichten, Grundrisse, Lageplan-Ebenen, Kennzahlen.
(() => {
  const noop = () => {};
  const View3D = window.View3D || { ready: false, init() { throw new Error("three.js konnte nicht geladen werden"); }, show: noop, goTo: noop, rotate: noop, setDate: noop, setTime: noop, play: noop, setLayer: noop, setCut: noop, setLevel: noop, tour: noop, zoom: noop, snapshot: () => "" };
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const VIEWS = ['modell', 'ansichten', 'grundrisse', 'lageplan', 'daten'];
  const ELEV = { sued: 'S', nord: 'N', ost: 'E', west: 'W', schnitt: 'A', rampe: 'B' };
  const PLAN = { ug: 'UG', eg: 'EG', og: 'OG', dg: 'DG' };
  const elevOpt = { mass: true, koten: true }, planOpt = { moebel: true, flaechen: true };
  let elevView = 'S', elevHome = [0, 0, 10, 10], planFloor = 'EG', planHome = [0, 0, 10, 10], siteReady = false;
  const num = Site.num;

  function show(name, push = true) {
    if (!VIEWS.includes(name)) name = 'modell';
    for (const v of VIEWS) {
      const on = v === name, tab = $(`#tab-${v}`);
      $(`#view-${v}`).hidden = !on;
      tab.setAttribute('aria-selected', String(on)); tab.tabIndex = on ? 0 : -1;
    }
    if (name === 'modell') {
      if (!View3D.ready) {
        try { View3D.init($('#stage3d')); } catch (err) { $('#stage3d .fallback').hidden = false; console.error(err); }
      }
      if (View3D.ready) View3D.show(true);
    } else if (View3D.ready) View3D.show(false);
    if (name === 'ansichten') renderElev();
    if (name === 'grundrisse') renderPlan();
    if (name === 'lageplan' && !siteReady) {
      Site.init($('#stageSite'), $('#siteSvg'), $('#siteTip'));
      siteReady = true;
      for (const cb of $$('[data-site-layer]')) Site.setLayer(cb.dataset.siteLayer, cb.checked);
    }
    const token = name === 'ansichten' ? Object.keys(ELEV).find(k => ELEV[k] === elevView) : name === 'grundrisse' ? planFloor.toLowerCase() : name;
    if (push) try { history.replaceState(null, '', `#${token}`); } catch (e) { /* eingebettete Ansicht */ }
  }
  $$('[role="tab"]').forEach((t, i, all) => {
    t.addEventListener('click', () => show(t.dataset.view));
    t.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      const n = all[(i + d + all.length) % all.length]; n.focus(); show(n.dataset.view);
    });
  });
  const press = (group, btn) => { for (const b of $$('button', group)) b.setAttribute('aria-pressed', String(b === btn)); };

  // Vollbild für jede Zeichenfläche (wichtig am Handy)
  for (const b of $$('[data-max]')) b.addEventListener('click', () => {
    const stage = $(b.dataset.max), on = !stage.classList.contains('max');
    stage.classList.toggle('max', on); document.body.classList.toggle('noscroll', on);
    b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Schließen' : 'Vollbild';
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const m = $('.stage.max'); if (m) $(`[data-max="#${m.id}"]`).click();
  });

  // Hinweisfeld beim Darüberfahren oder Antippen
  function attachTips(stage, svg, tip) {
    let downAt = null;
    const showTip = e => {
      const el = e.target.closest && e.target.closest('[data-tip]');
      if (!el) { tip.hidden = true; return; }
      const r = stage.getBoundingClientRect();
      tip.textContent = el.dataset.tip; tip.hidden = false;
      tip.style.left = `${Math.max(8, Math.min(e.clientX - r.left + 14, r.width - tip.offsetWidth - 8))}px`;
      tip.style.top = `${Math.max(8, e.clientY - r.top - tip.offsetHeight - 12)}px`;
    };
    svg.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
    svg.addEventListener('pointermove', e => { if (e.buttons) tip.hidden = true; else showTip(e); });
    svg.addEventListener('pointerup', e => { if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 6) showTip(e); });
    svg.addEventListener('pointerleave', () => { tip.hidden = true; });
  }

  // ---- 3D ----
  // Geschossblick und Hausschnitt schließen sich aus; ein Blick von außen zeigt wieder das ganze Haus
  const wholeHouse = () => {
    const a = $('#levelChips [data-level="alle"]');
    if (a.getAttribute('aria-pressed') !== 'true') { press($('#levelChips'), a); View3D.setLevel('alle'); }
  };
  // Rundgang: Knopf startet, nochmal drücken beendet; die Stationen erscheinen unten im Bild
  const tourOff = () => press($('#tourChips'), null);
  $('#tourChips').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.getAttribute('aria-pressed') === 'true') { View3D.tour(null); tourOff(); return; }
    wholeHouse();
    if ($('#optCut').checked) { $('#optCut').checked = false; View3D.setCut(false); }
    $('#optRotate').checked = false; View3D.rotate(false);
    press($('#camChips'), null); press($('#tourChips'), b);
    $('#stage3d .hud-view').textContent = b.textContent;
    View3D.tour(b.dataset.tour, { onLabel: t => { $('#stage3d .hud-view').textContent = t; }, onEnd: tourOff });
    if (window.innerWidth < 900) $('#stage3d').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#camChips').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    tourOff();
    wholeHouse();
    press($('#camChips'), b); View3D.goTo(b.dataset.cam);
    $('#stage3d .hud-view').textContent = b.dataset.label || b.textContent;
  });
  $('#optRotate').addEventListener('change', e => View3D.rotate(e.target.checked));
  $('#zoom3dIn').addEventListener('click', () => { tourOff(); View3D.zoom(0.7); });
  $('#zoom3dOut').addEventListener('click', () => { tourOff(); View3D.zoom(1.45); });
  $('#levelChips').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.level !== 'alle' && $('#optCut').checked) { $('#optCut').checked = false; View3D.setCut(false); }
    tourOff(); press($('#levelChips'), b); View3D.setLevel(b.dataset.level);
    press($('#camChips'), null);
    $('#stage3d .hud-view').textContent = b.dataset.level === 'alle' ? 'Ganzes Haus' : `Geschoss ${b.dataset.label || b.textContent} von oben`;
  });
  const dateIn = $('#sunDate'), timeIn = $('#sunTime'), timeOut = $('#sunTimeOut');
  function applyDate() {
    const [y, m, d] = dateIn.value.split('-').map(Number);
    if (y && m && d) View3D.setDate(y, m - 1, d);
  }
  dateIn.addEventListener('change', () => { applyDate(); press($('#dateChips'), null); });
  $('#dateChips').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const now = new Date();
    dateIn.value = b.dataset.date === 'heute' ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` : `2026-${b.dataset.date}`;
    press($('#dateChips'), b); applyDate();
  });
  timeIn.addEventListener('input', () => { View3D.setTime(+timeIn.value); timeOut.textContent = SUN.hhmm(+timeIn.value); });
  $('#sunPlay').addEventListener('click', e => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    e.currentTarget.setAttribute('aria-pressed', String(on));
    e.currentTarget.textContent = on ? 'Tagesverlauf anhalten' : 'Tagesverlauf abspielen';
    View3D.play(on);
  });
  for (const cb of $$('[data-layer3d]')) cb.addEventListener('change', () => View3D.setLayer(cb.dataset.layer3d, cb.checked));
  const cutX = $('#cutX'), cutOut = $('#cutOut');
  $('#optCut').addEventListener('change', e => {
    if (e.target.checked) wholeHouse();
    View3D.setCut(e.target.checked, +cutX.value);
    if (e.target.checked) { View3D.goTo('schnitt'); press($('#camChips'), null); $('#stage3d .hud-view').textContent = 'Schnitt'; }
  });
  cutX.addEventListener('input', () => {
    cutOut.textContent = `${num(+cutX.value)} m`;
    if ($('#optCut').checked) View3D.setCut(true, +cutX.value);
  });
  speicherKnopf($('#snap3d'), () => ({ name: 'forever-home-3d.png', png: View3D.snapshot() }));

  // ---- Ansichten ----
  const elevSvg = $('#elevSvg'), elevPZ = PanZoom(elevSvg, () => elevHome);
  function renderElev() {
    const res = Elev.render(elevView, elevOpt);
    elevSvg.innerHTML = res.svg; elevHome = res.vb; elevPZ.home();
    const [t, note] = Elev.TITLES[elevView];
    $('#elevTitle').textContent = t; $('#elevNote').textContent = note;
  }
  $('#elevChips').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    press($('#elevChips'), b); elevView = b.dataset.elev; show('ansichten');
  });
  for (const cb of $$('[data-elev-opt]')) cb.addEventListener('change', () => { elevOpt[cb.dataset.elevOpt] = cb.checked; renderElev(); });
  $('#elevZoomIn').addEventListener('click', () => elevPZ.zoom(0.7));
  $('#elevZoomOut').addEventListener('click', () => elevPZ.zoom(1.4));
  $('#elevHome').addEventListener('click', () => elevPZ.home());
  const svgDatei = (svg, name) => ({ name, svg: svgFile(svg) });
  speicherKnopf($('#elevDl'), () => svgDatei(elevSvg, `ansicht-${elevView}.svg`));

  // ---- Grundrisse ----
  const planSvg = $('#planSvg'), planPZ = PanZoom(planSvg, () => planHome);
  attachTips($('#stagePlan'), planSvg, $('#planTip'));
  const kote = v => (Math.abs(v) < 0.005 ? '±' : v > 0 ? '+' : '−') + num(Math.abs(v));
  function renderPlan() {
    const res = Plans.render(planFloor, planOpt);
    planSvg.innerHTML = res.svg; planHome = res.vb; planPZ.home();
    $('#planTitle').textContent = `${Plans.FL[planFloor].titel} · Fußboden ${kote(Plans.FL[planFloor].ffb)} m`;
    const t = Plans.table(planFloor), dg = planFloor === 'DG';
    $('#planRooms').innerHTML = t.rows.map(r => `<tr><th scope="row">${r.n}</th><td>${num(r.a)} m²${dg && Math.abs(r.wf - r.a) > 0.2 ? ` · WoFl. ${num(r.wf)}` : ''}</td></tr>`).join('') +
      `<tr class="sum"><th scope="row">Summe Nutzfläche</th><td>${num(t.sum)} m²</td></tr>`;
  }
  const wf = Plans.wohnflaeche();
  $('#planWfl').innerHTML = [['Erdgeschoss', wf.eg], ['Obergeschoss', wf.og], ['Dachgeschoss (WoFlV)', wf.dg], ['Balkon und Dachterrasse (¼)', wf.aussen]]
    .map(([n, a]) => `<tr><th scope="row">${n}</th><td>${num(a)} m²</td></tr>`).join('') + `<tr class="sum"><th scope="row">Wohnfläche gesamt</th><td>${num(wf.sum)} m²</td></tr>`;
  $('#planChips').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    press($('#planChips'), b); planFloor = b.dataset.plan; show('grundrisse');
  });
  for (const cb of $$('[data-plan-opt]')) cb.addEventListener('change', () => { planOpt[cb.dataset.planOpt] = cb.checked; renderPlan(); });
  $('#planZoomIn').addEventListener('click', () => planPZ.zoom(0.7));
  $('#planZoomOut').addEventListener('click', () => planPZ.zoom(1.4));
  $('#planHome').addEventListener('click', () => planPZ.home());
  speicherKnopf($('#planDl'), () => svgDatei(planSvg, `grundriss-${planFloor}.svg`));

  // ---- Lageplan ----
  for (const cb of $$('[data-site-layer]')) cb.addEventListener('change', () => { if (siteReady) Site.setLayer(cb.dataset.siteLayer, cb.checked); });
  $('#siteZoomIn').addEventListener('click', () => Site.zoom(0.7));
  $('#siteZoomOut').addEventListener('click', () => Site.zoom(1.4));
  $('#siteHome').addEventListener('click', () => Site.home());
  speicherKnopf($('#siteDl'), () => svgDatei($('#siteSvg'), 'lageplan.svg'));

  // ---- Kennzahlen ----
  const S = Site.STATS, pct = v => `${num(100 * v / 1661, 1)} %`;
  $('#flaechen').innerHTML = S.FL.map(([n, a]) => `<tr><th scope="row">${n}</th><td>${num(a, 1)} m²</td></tr>`).join('') +
    `<tr class="sum"><th scope="row">Überbaut und befestigt</th><td>${num(S.befestigt, 1)} m² · ${pct(S.befestigt)}</td></tr>` +
    `<tr><th scope="row">Tiefgarage unter dem Garten</th><td>${num(S.tgGarten, 1)} m²</td></tr>` +
    `<tr class="sum"><th scope="row">Garten ohne Unterbauung</th><td>${num(S.gruenOhneTG, 1)} m² · ${pct(S.gruenOhneTG)}</td></tr>`;
  for (const el of $$('[data-stat]')) {
    const v = { grz: HOUSE.W * HOUSE.D / 1661, versiegelt: 100 * S.befestigt / 1661, tg: S.tg, tgGarten: S.tgGarten, plot: S.plotArea, gruen: S.gruenOhneTG, wohnfl: wf.sum }[el.dataset.stat];
    el.textContent = num(v, { grz: 3, versiegelt: 1, tg: 1, plot: 1, wohnfl: 0 }[el.dataset.stat] ?? 2);
  }

  function svgFile(svg) {
    const css = $('style').textContent;
    const c = svg.cloneNode(true);
    c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    c.insertAdjacentHTML('afterbegin', `<style>${css}</style>`);
    return c.outerHTML;
  }
  function download(href, name) { const a = document.createElement('a'); a.href = href; a.download = name; document.body.append(a); a.click(); a.remove(); }
  // Speichern: auf der Pages-Seite (BUILD.downloads) als Download-Link. Die Claude-Ansicht lädt nichts direkt herunter, dort geht es über die
  // Fähigkeit downloads der Laufzeit (beim Veröffentlichen capabilities {downloads: true}); ihre Knöpfe bleiben verborgen, bis claude.use
  // sie bereitstellt, und der Betrachter bestätigt jede Datei
  function speicherKnopf(btn, datei) {
    btn.dataset.speichern = '';
    if (BUILD.downloads) {
      btn.addEventListener('click', () => { const d = datei(); download(d.png ?? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(d.svg)}`, d.name); });
      return;
    }
    btn.hidden = true;
    if (window.claude?.use) window.claude.use('downloads').then(dl => {
      if (!dl) return;
      btn.hidden = false;
      btn.addEventListener('click', () => sichern(dl, btn, datei()));
    }, noop);
  }
  // PNG als Bytes (ein String ginge als Text hinaus), SVG als Text. Abgelehnt: nichts; geht Speichern in dieser Ansicht nicht, verschwinden
  // die Knöpfe; sonst steht kurz am Knopf, warum nicht (ein SVG, das die Ansicht gar nicht annimmt, bleibt dabei)
  async function sichern(dl, btn, d) {
    try { await dl.save({ filename: d.name, data: d.svg ?? Uint8Array.from(atob(d.png.slice(d.png.indexOf(',') + 1)), c => c.charCodeAt(0)) }); }
    catch (e) {
      const code = e?.code;
      if (code === 'declined') return;
      console.warn('Speichern nicht möglich:', code, e?.message);
      const kurz = { rate_limited: 'Gleich noch einmal', too_large: 'Datei zu groß', extension_not_enabled: 'SVG hier nicht möglich',
        bad_request: 'Speichern fehlgeschlagen', transform_error: 'Speichern fehlgeschlagen', rejected_extension: 'Speichern fehlgeschlagen' }[code];
      if (!kurz) { for (const b of $$('[data-speichern]')) b.hidden = true; return; }
      const text = btn.textContent;
      btn.textContent = kurz; btn.disabled = true;
      if (code !== 'extension_not_enabled') setTimeout(() => { btn.textContent = text; btn.disabled = false; }, 2500);
    }
  }

  function fromHash(push) {
    const k = (location.hash || '').slice(1);
    if (ELEV[k]) { elevView = ELEV[k]; press($('#elevChips'), $(`#elevChips [data-elev="${elevView}"]`)); show('ansichten', push); }
    else if (PLAN[k]) { planFloor = PLAN[k]; press($('#planChips'), $(`#planChips [data-plan="${planFloor}"]`)); show('grundrisse', push); }
    else show(VIEWS.includes(k) ? k : 'modell', push);
  }
  window.addEventListener('hashchange', () => fromHash(false));
  fromHash(false);
})();
