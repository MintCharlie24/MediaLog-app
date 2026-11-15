'use strict';
// MediaLog móvil — pantallas: inicio, biblioteca, detalle y ajustes.
let DATA = null;
const S = { tab: 'home', cat: null, q: '', estado: '', year: '', sort: 'recent', grid: false, shown: 60, statsCat: null };
const records = (cat) => (DATA ? DATA.log.filter((r) => !cat || r.categoria === cat) : []);
const stLabel = (s) => t(s) || s;
const thumb = (name, cls = 'thumb', ph = '🎞️') => `<div class="${cls}" ${name ? `data-cover="${esc(name)}"` : ''}>${ph}</div>`;

function setBanner(msg, kind) { const b = $('#banner'); if (!msg) { b.hidden = true; return; } b.hidden = false; b.className = 'banner' + (kind === 'error' ? ' error' : ''); b.textContent = msg; }
function noData(msg) { return `<div class="empty">${esc(msg || t('noToken'))}<br><br><button class="btn" id="goSettings">${esc(t('settings'))}</button></div>`; }

// ---------------- Navegación ----------------
function go(tab) {
  S.tab = tab;
  $$('#tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  $('#topTitle').textContent = { home: 'MediaLog', library: t('library'), stats: t('stats'), settings: t('settings') }[tab];
  const v = $('#view'); v.scrollTop = 0; window.scrollTo(0, 0);
  if (!DATA && tab !== 'settings') { v.innerHTML = noData(); const g = $('#goSettings'); if (g) g.onclick = () => go('settings'); return; }
  ({ home: renderHome, library: renderLibrary, stats: renderStats, settings: renderSettings })[tab]();
}

// ---------------- Inicio ----------------
function summaryCards(list) {
  const rated = list.filter((r) => r.valoracion != null);
  const hours = list.reduce((a, r) => a + (r.horas || 0), 0);
  const done = list.filter((r) => r.estado === 'Completado' || r.estado === 'Platinado').length;
  return `<div class="cards">
    <div class="card"><div class="lbl">${t('records')}</div><div class="val">${list.length}</div></div>
    <div class="card"><div class="lbl">${t('hours')}</div><div class="val">${fmtH(hours)}</div></div>
    <div class="card"><div class="lbl">${t('avg')}</div><div class="val">${rated.length ? fmt1(rated.reduce((a, r) => a + r.valoracion, 0) / rated.length) : '—'}</div><div class="sub">${rated.length} ${t('rated')}</div></div>
    <div class="card"><div class="lbl">${t('completed')}</div><div class="val">${done}</div></div></div>`;
}
function itemHtml(r) {
  const sub = [r.anio, secondaryOf(r), genresOf(r).slice(0, 2).join(', ')].filter(Boolean).join(' · ');
  return `<button class="item" data-id="${esc(r.id)}">${thumb(r.portada)}<div class="meta"><div class="t">${esc(r.titulo)}</div><div class="s">${esc(sub)}</div><div class="s ${stClass(r.estado)}">${esc(stLabel(r.estado))}${r.vez > 1 ? ' · ' + t('times') + ' ' + r.vez : ''}</div></div>${r.valoracion != null ? `<div class="rate ${rateClass(r.valoracion)}">${fmt1(r.valoracion)}</div>` : ''}</button>`;
}
function bindItems(root) { $$('[data-id]', root).forEach((b) => { b.onclick = () => openDetail(b.dataset.id); }); observeCovers(root); }
function renderHome() {
  const all = records();
  const recent = all.slice().sort((a, b) => (b.creadoEn || dateKey(b)).localeCompare(a.creadoEn || dateKey(a))).slice(0, 8);
  const now = new Date(), md = String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  const today = all.filter((r) => r.fechaFin && r.fechaFin.slice(5) === md && +r.fechaFin.slice(0, 4) < now.getFullYear());
  const wish = (DATA.wishlist || []).filter((w) => !w.comprado).sort((a, b) => (a.orden || 0) - (b.orden || 0)).slice(0, 5);
  $('#view').innerHTML = summaryCards(all)
    + (today.length ? `<h2>📆 ${t('today')}</h2><div class="list">${today.slice(0, 5).map(itemHtml).join('')}</div>` : '')
    + `<h2>🕓 ${t('recent')}</h2><div class="list">${recent.map(itemHtml).join('')}</div>`
    + (wish.length ? `<h2>⭐ ${t('wishlist')}</h2><div class="list">${wish.map((w) => `<div class="item">${thumb(w.portada)}<div class="meta"><div class="t">${esc(w.titulo)}</div><div class="s">${esc(w.categoria || '')}${w.horasEstimadas ? ' · ~' + w.horasEstimadas + 'h' : ''}</div></div></div>`).join('')}</div>` : '');
  bindItems($('#view'));
}

// ---------------- Biblioteca ----------------
function catChips(active, withAll) {
  return `<div class="chips">${withAll ? `<button class="chip ${!active ? 'active' : ''}" data-cat="">${t('all')}</button>` : ''}${DATA.categorias.map((c) => `<button class="chip ${c === active ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>`;
}
function filteredLibrary() {
  const q = S.q.trim().toLowerCase();
  let list = records(S.cat).filter((r) => (!S.estado || r.estado === S.estado) && (!S.year || String(r.anio) === S.year || (r.fechaFin || '').startsWith(S.year)));
  if (q) list = list.filter((r) => [r.titulo, r.genero, r.saga, r.plataforma, r.formato, (r.etiquetas || []).join(' ')].join(' ').toLowerCase().includes(q));
  const by = {
    recent: (a, b) => dateKey(b).localeCompare(dateKey(a)),
    rating: (a, b) => (b.valoracion == null) - (a.valoracion == null) || (b.valoracion || 0) - (a.valoracion || 0),
    hours: (a, b) => (b.horas || 0) - (a.horas || 0),
    title: (a, b) => (a.titulo || '').localeCompare(b.titulo || '', LANG),
  }[S.sort];
  return list.sort(by);
}
function renderLibrary() {
  if (!S.cat || !DATA.categorias.includes(S.cat)) S.cat = DATA.categorias[0];
  const years = [...new Set(records(S.cat).map((r) => r.anio).filter(Boolean))].sort((a, b) => b - a);
  $('#view').innerHTML = catChips(S.cat) + `<input id="q" class="search" type="text" placeholder="${esc(t('search'))}" value="${esc(S.q)}" />
    <div class="row-tools"><select id="fSort"><option value="recent">${t('sortRecent')}</option><option value="rating">${t('sortRating')}</option><option value="hours">${t('sortHours')}</option><option value="title">${t('sortTitle')}</option></select>
    <select id="fEstado"><option value="">${t('allStatus')}</option>${['Completado', 'Platinado', 'Abandonado', 'Sin Fin / En Progreso'].map((s) => `<option value="${esc(s)}">${esc(stLabel(s))}</option>`).join('')}</select>
    <select id="fYear"><option value="">${t('allYears')}</option>${years.map((y) => `<option>${y}</option>`).join('')}</select>
    <button id="gridBtn" class="chip">${S.grid ? '☰' : '▦'}</button></div><div id="libList"></div>`;
  $('#fSort').value = S.sort; $('#fEstado').value = S.estado; $('#fYear').value = S.year;
  $$('.chip[data-cat]').forEach((b) => { b.onclick = () => { S.cat = b.dataset.cat; S.shown = 60; S.year = ''; renderLibrary(); }; });
  $('#q').oninput = (e) => { S.q = e.target.value; S.shown = 60; renderLibList(); };
  $('#fSort').onchange = (e) => { S.sort = e.target.value; S.shown = 60; renderLibList(); };
  $('#fEstado').onchange = (e) => { S.estado = e.target.value; S.shown = 60; renderLibList(); };
  $('#fYear').onchange = (e) => { S.year = e.target.value; S.shown = 60; renderLibList(); };
  $('#gridBtn').onclick = () => { S.grid = !S.grid; renderLibrary(); };
  renderLibList();
}
function renderLibList() {
  const list = filteredLibrary(), box = $('#libList');
  if (!list.length) { box.innerHTML = `<div class="empty">${t('none')}</div>`; return; }
  const part = list.slice(0, S.shown);
  const body = S.grid
    ? `<div class="grid">${part.map((r) => `<button class="gitem" data-id="${esc(r.id)}">${thumb(r.portada, 'cover', '🎞️')}<div class="gt">${esc(r.titulo)}</div></button>`).join('')}</div>`
    : `<div class="list">${part.map(itemHtml).join('')}</div>`;
  box.innerHTML = `<div class="muted small" style="margin:0 2px 8px">${t('loadedN', list.length)}</div>` + body + (list.length > S.shown ? `<button class="more" id="moreBtn">${t('more')} (${list.length - S.shown})</button>` : '');
  const more = $('#moreBtn'); if (more) more.onclick = () => { S.shown += 60; renderLibList(); };
  bindItems(box);
}

// ---------------- Detalle ----------------
function kv(k, v) { return v == null || v === '' ? '' : `<div><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`; }
function openDetail(id) {
  const r = DATA.log.find((x) => x.id === id); if (!r) return;
  const names = criteriaNames(DATA, r.categoria);
  const crit = (r.criterios || []).map((v, i) => (v == null || !names[i] ? '' : `<div class="crit"><span>${esc(names[i])}</span><div class="bar"><i style="width:${Math.min(100, v * 10)}%"></i></div><b>${fmt1(v)}</b></div>`)).join('');
  const chars = (r.personajesLista || []);
  $('#sheetBody').innerHTML = `<div class="hero">${thumb(r.portada, 'cover')}<div><h3>${esc(r.titulo)}</h3>
      <div class="${stClass(r.estado)}">${esc(stLabel(r.estado))}</div>
      ${r.valoracion != null ? `<div class="rate ${rateClass(r.valoracion)}" style="text-align:left;font-size:30px">${fmt1(r.valoracion)}</div>` : ''}
      ${r.volveria ? '<div class="muted small">♻</div>' : ''}</div></div>
    <div class="kv">${kv(t(r.plataforma ? 'platform' : 'format'), secondaryOf(r))}${kv(t('year'), r.anio)}${kv(t('hours'), r.horas ? fmtH(r.horas) : '')}${kv(t('start'), r.fechaInicio || r.fechaInicioTexto)}${kv(t('end'), r.fechaFin || r.fechaFinTexto)}${kv(t('saga'), r.saga)}${kv(t('seasons'), r.temporadas)}${kv(t('achievements'), r.logros)}${kv(t('where'), r.donde)}${kv(t('times'), r.vez > 1 ? r.vez : '')}${kv(t('price'), r.precio != null ? r.precio + ' €' : '')}${kv(t('regular'), r.precioOriginal != null ? r.precioOriginal + ' €' : '')}</div>
    ${genresOf(r).length ? `<div class="tags">${genresOf(r).map((g) => `<span class="tag">${esc(g)}</span>`).join('')}</div>` : ''}
    ${(r.etiquetas || []).length ? `<div class="tags">${r.etiquetas.map((g) => `<span class="tag">#${esc(g)}</span>`).join('')}</div>` : ''}
    ${crit ? `<h2>${t('criteria')}</h2>${crit}` : ''}
    ${chars.length ? `<h2>${t('characters')}</h2><div class="chars">${chars.map((c) => `<div class="char"><div class="cv" ${c.imagen ? `data-cover="${esc(c.imagen)}"` : ''}>👤</div><b>${esc(c.nombre)}</b>${c.nota != null ? `<div class="rate ${rateClass(c.nota)}" style="text-align:center;font-size:14px">${fmt1(c.nota)}</div>` : ''}</div>`).join('')}</div>` : ''}
    ${r.notas ? `<h2>${t('notes')}</h2><div style="white-space:pre-wrap">${esc(r.notas)}</div>` : ''}`;
  $('#sheet').hidden = false; $('#sheet .sheet-card').scrollTop = 0;
  observeCovers($('#sheetBody'));
}
function closeSheet() { $('#sheet').hidden = true; }

// ---------------- Ajustes ----------------
async function renderSettings() {
  const c = getCfg(), meta = (await idb.get('meta')) || {}, n = await coverCount();
  $('#view').innerHTML = `<div class="form">
    <label>${t('user')}</label><input id="sUser" type="text" value="${esc(c.user)}" autocapitalize="off" />
    <label>${t('repo')}</label><input id="sRepo" type="text" value="${esc(c.repo)}" autocapitalize="off" />
    <label>${t('token')}</label><input id="sToken" type="password" value="${esc(c.token)}" placeholder="github_pat_..." autocomplete="off" />
    <div class="status">${esc(t('helpToken'))}</div>
    <button class="btn" id="sSave">${t('save')}</button>
    <label>${t('language')}</label><select id="sLang"><option value="es">Español</option><option value="en">English</option></select>
    <label>${t('theme')}</label><select id="sTheme"><option value="dark">${t('dark')}</option><option value="light">${t('light')}</option></select>
    <div class="status">${t('lastSync')}: ${meta.at ? new Date(meta.at).toLocaleString(LANG === 'en' ? 'en-GB' : 'es-ES') : '—'}<br>${DATA ? t('loadedN', DATA.log.length) + ' · ' : ''}${n} ${t('cached')}<br>${t('version')} ${VERSION}</div>
    <button class="btn ghost" id="sClear">${t('clearCache')}</button></div>`;
  $('#sLang').value = c.lang; $('#sTheme').value = c.theme;
  $('#sSave').onclick = () => { setCfg({ user: $('#sUser').value.trim(), repo: $('#sRepo').value.trim(), token: $('#sToken').value.trim() }); refresh(true, true); };
  $('#sLang').onchange = (e) => { setCfg({ lang: e.target.value }); LANG = e.target.value; applyStaticText(); go('settings'); };
  $('#sTheme').onchange = (e) => { setCfg({ theme: e.target.value }); applyTheme(); };
  $('#sClear').onclick = async () => { await clearCovers(); renderSettings(); };
}

// ---------------- Descarga de datos ----------------
let refreshing = false;
async function refresh(force, goHome) {
  if (refreshing) return; refreshing = true;
  $('#refreshBtn').classList.add('spin');
  try {
    setBanner(DATA ? '' : t('loading'));
    const res = await fetchData(force);
    if (res.changed) { DATA = res.data; }
    setBanner('');
    if (goHome || res.changed) go(goHome ? 'home' : S.tab);
  } catch (e) {
    const offline = !navigator.onLine || /Failed to fetch|NetworkError|Load failed/i.test(String(e.message));
    if (e instanceof GhError && e.status === 0) setBanner('');
    else if (offline && DATA) setBanner(t('offline'));
    else setBanner(explain(e), 'error');
    if (!DATA) go('settings');
  } finally { refreshing = false; $('#refreshBtn').classList.remove('spin'); }
}

// ---------------- Arranque ----------------
async function boot() {
  const c = getCfg(); LANG = c.lang; applyTheme(); applyStaticText();
  $$('#tabbar button').forEach((b) => { b.onclick = () => go(b.dataset.tab); });
  $('#refreshBtn').onclick = () => refresh(true);
  $('#sheetClose').onclick = closeSheet;
  $('#sheet').onclick = (e) => { if (e.target.id === 'sheet') closeSheet(); };
  window.addEventListener('popstate', closeSheet);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(false); });
  DATA = (await idb.get('data')) || null;
  go(DATA ? 'home' : 'settings');
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
  if (getCfg().token) refresh(false);
}
document.addEventListener('DOMContentLoaded', boot);
