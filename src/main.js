// Bedienung: Tabs, 3D-Steuerung, Ansichten, Lageplan-Ebenen, Kennzahlen.
(() => {
  const noop = () => {};
  const View3D = window.View3D || { ready: false, init() { throw new Error("three.js konnte nicht geladen werden"); }, show: noop, goTo: noop, rotate: noop, setDate: noop, setTime: noop, play: noop, setLayer: noop, setCut: noop, snapshot: () => "" };
  const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const VIEWS = ['modell', 'ansichten', 'lageplan', 'daten'];
  const ELEV = { sued: 'S', nord: 'N', ost: 'E', west: 'W', schnitt: 'A' };
  const elevOpt = { mass: true, koten: true, recht: true };
  let elevView = 'S', elevHome = [0, 0, 10, 10], elevPZ = null, siteReady = false;
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
    if (name === 'lageplan' && !siteReady) {
      Site.init($('#stageSite'), $('#siteSvg'), $('#siteTip'));
      siteReady = true;
      for (const cb of $$('[data-site-layer]')) Site.setLayer(cb.dataset.siteLayer, cb.checked);
    }
    if (push) try { history.replaceState(null, '', `#${name === 'ansichten' ? Object.keys(ELEV).find(k => ELEV[k] === elevView) : name}`); } catch (e) { /* eingebettete Ansicht */ }
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

  // ---- 3D ----
  $('#camChips').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    press($('#camChips'), b); View3D.goTo(b.dataset.cam);
    $('#stage3d .hud-view').textContent = b.dataset.label || b.textContent;
  });
  $('#optRotate').addEventListener('change', e => View3D.rotate(e.target.checked));
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
    View3D.setCut(e.target.checked, +cutX.value);
    if (e.target.checked) { View3D.goTo('schnitt'); press($('#camChips'), null); $('#stage3d .hud-view').textContent = 'Schnitt'; }
  });
  cutX.addEventListener('input', () => {
    cutOut.textContent = `${num(+cutX.value)} m`;
    if ($('#optCut').checked) View3D.setCut(true, +cutX.value);
  });
  const snap = $('#snap3d');
  if (BUILD.downloads) snap.addEventListener('click', () => download(View3D.snapshot(), 'forever-home-3d.png'));
  else snap.hidden = true;

  // ---- Ansichten ----
  const elevSvg = $('#elevSvg');
  elevPZ = PanZoom(elevSvg, () => elevHome);
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
  const svgDl = (svg, name) => download(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgFile(svg))}`, name);
  if (BUILD.downloads) $('#elevDl').addEventListener('click', () => svgDl(elevSvg, `ansicht-${elevView}.svg`));
  else $('#elevDl').hidden = true;

  // ---- Lageplan ----
  for (const cb of $$('[data-site-layer]')) cb.addEventListener('change', () => { if (siteReady) Site.setLayer(cb.dataset.siteLayer, cb.checked); });
  $('#siteZoomIn').addEventListener('click', () => Site.zoom(0.7));
  $('#siteZoomOut').addEventListener('click', () => Site.zoom(1.4));
  $('#siteHome').addEventListener('click', () => Site.home());
  if (BUILD.downloads) $('#siteDl').addEventListener('click', () => svgDl($('#siteSvg'), 'lageplan.svg'));
  else $('#siteDl').hidden = true;

  // ---- Kennzahlen ----
  const S = Site.STATS, pct = v => `${num(100 * v / 1661, 1)} %`;
  $('#flaechen').innerHTML = S.FL.map(([n, a]) => `<tr><th scope="row">${n}</th><td>${num(a, 1)} m²</td></tr>`).join('') +
    `<tr class="sum"><th scope="row">Überbaut und befestigt</th><td>${num(S.befestigt, 1)} m² · ${pct(S.befestigt)}</td></tr>` +
    `<tr><th scope="row">Tiefgarage unter dem Garten</th><td>${num(S.tgGarten, 1)} m²</td></tr>` +
    `<tr class="sum"><th scope="row">Garten ohne Unterbauung</th><td>${num(S.gruenOhneTG, 1)} m² · ${pct(S.gruenOhneTG)}</td></tr>`;
  for (const el of $$('[data-stat]')) {
    const v = { west0: S.west[0], west1: S.west[1], north0: S.north[0], north1: S.north[1], east: S.east, ew: S.AB.ew, ns: S.AB.ns, H: S.AB.H,
      grz: 186.4 / 1661, versiegelt: 100 * S.befestigt / 1661, tg: S.tg, tgGarten: S.tgGarten, plot: S.plotArea, gruen: S.gruenOhneTG }[el.dataset.stat];
    el.textContent = num(v, { grz: 3, versiegelt: 1, tg: 1, plot: 1 }[el.dataset.stat] ?? 2);
  }

  function svgFile(svg) {
    const css = $('style').textContent;
    const c = svg.cloneNode(true);
    c.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    c.insertAdjacentHTML('afterbegin', `<style>${css}</style>`);
    return c.outerHTML;
  }
  function download(href, name) { const a = document.createElement('a'); a.href = href; a.download = name; document.body.append(a); a.click(); a.remove(); }

  function fromHash() {
    const k = (location.hash || '').slice(1);
    if (ELEV[k]) { elevView = ELEV[k]; press($('#elevChips'), $(`#elevChips [data-elev="${elevView}"]`)); show('ansichten', false); }
    else if (VIEWS.includes(k)) show(k, false);
  }
  window.addEventListener('hashchange', fromHash);
  const h = (location.hash || '').slice(1);
  if (ELEV[h]) {
    elevView = ELEV[h];
    press($('#elevChips'), $(`#elevChips [data-elev="${elevView}"]`));
    show('ansichten', false);
  } else show(h || 'modell', false);
})();
