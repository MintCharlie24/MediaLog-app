'use strict';
// MediaLog móvil — estadísticas (solo lectura).
const PALETTE = ['#7c5cff', '#22d3ee', '#4caf7d', '#f0a45d', '#ef5f5f', '#e8c14d', '#c084fc', '#60a5fa', '#f472b6', '#94a3b8'];
function chartCard(id, title, tall) { return `<div class="chart-card"><h3>${esc(title)}</h3><div class="chart-box ${tall ? 'tall' : ''}"><canvas id="${id}"></canvas></div></div>`; }
function mkChart(id, config) {
  const cv = document.getElementById(id); if (!cv) return;
  const old = Chart.getChart(cv); if (old) old.destroy();
  const css = getComputedStyle(document.documentElement);
  Chart.defaults.color = css.getPropertyValue('--muted').trim(); Chart.defaults.borderColor = css.getPropertyValue('--border').trim();
  config.options = Object.assign({ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: config.type === 'doughnut', position: 'bottom' } } }, config.options || {});
  return new Chart(cv, config);
}
const yearOf = (r) => r.anio || (r.fechaFin ? +r.fechaFin.slice(0, 4) : (r.fechaInicio ? +r.fechaInicio.slice(0, 4) : null));
function countBy(list, fn) { const m = {}; list.forEach((r) => { const k = fn(r); if (k != null && k !== '') m[k] = (m[k] || 0) + 1; }); return m; }
function topEntries(m, n) { return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n); }
function rankedList(title, rows) {
  return `<div class="chart-card"><h3>${esc(title)}</h3><ol class="ranked">${rows.map((x) => `<li>${x.cover !== undefined ? `<div class="th" ${x.cover ? `data-cover="${esc(x.cover)}"` : ''}>${x.ph || '🎞️'}</div>` : ''}<span class="nm">${esc(x.name)}${x.sub ? `<span class="muted small"> · ${esc(x.sub)}</span>` : ''}</span><b>${esc(x.value)}</b></li>`).join('') || '<li class="muted">—</li>'}</ol></div>`;
}

function renderStats() {
  const cat = S.statsCat && DATA.categorias.includes(S.statsCat) ? S.statsCat : null;
  const list = records(cat);
  const rated = list.filter((r) => r.valoracion != null);
  const withHours = list.filter((r) => r.horas);
  const charts = [];
  let html = catChips(cat, true) + summaryCards(list);
  const years = countBy(list, yearOf), yKeys = Object.keys(years).sort();

  if (yKeys.length) { html += chartCard('cYear', t('recPerYear')); charts.push(() => mkChart('cYear', { type: 'bar', data: { labels: yKeys, datasets: [{ data: yKeys.map((y) => years[y]), backgroundColor: PALETTE[0], borderRadius: 4 }] }, options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } })); }
  if (withHours.length) {
    const hy = {}; withHours.forEach((r) => { const y = yearOf(r); if (y) hy[y] = (hy[y] || 0) + r.horas; }); const hk = Object.keys(hy).sort();
    html += chartCard('cHours', t('hoursPerYear')); charts.push(() => mkChart('cHours', { type: 'bar', data: { labels: hk, datasets: [{ data: hk.map((y) => Math.round(hy[y] * 10) / 10), backgroundColor: PALETTE[1], borderRadius: 4 }] }, options: { scales: { y: { beginAtZero: true } } } }));
  }
  const est = countBy(list, (r) => r.estado);
  if (Object.keys(est).length) { html += chartCard('cEstado', t('statusChart')); charts.push(() => mkChart('cEstado', { type: 'doughnut', data: { labels: Object.keys(est).map(stLabel), datasets: [{ data: Object.values(est), backgroundColor: ['#4caf7d', '#e8c14d', '#ef5f5f', '#f0a45d', '#94a3b8'], borderWidth: 0 }] } })); }
  if (rated.length) {
    const dist = Array.from({ length: 11 }, (_, i) => rated.filter((r) => Math.round(r.valoracion) === i).length);
    html += chartCard('cDist', t('ratingDist')); charts.push(() => mkChart('cDist', { type: 'bar', data: { labels: dist.map((_, i) => String(i)), datasets: [{ data: dist, backgroundColor: dist.map((_, i) => (i >= 8 ? '#4caf7d' : i >= 6 ? '#f0a45d' : '#ef5f5f')), borderRadius: 4 }] }, options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } }));
  }
  const gc = {}; list.forEach((r) => genresOf(r).forEach((g) => { gc[g] = (gc[g] || 0) + 1; }));
  const topG = topEntries(gc, 10);
  if (topG.length) { html += chartCard('cGenres', t('topGenres'), true); charts.push(() => mkChart('cGenres', { type: 'bar', data: { labels: topG.map((g) => g[0]), datasets: [{ data: topG.map((g) => g[1]), backgroundColor: PALETTE[2], borderRadius: 4 }] }, options: { indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } } })); }
  const gr = {}; rated.forEach((r) => genresOf(r).forEach((g) => { (gr[g] = gr[g] || []).push(r.valoracion); }));
  const gAvg = Object.entries(gr).filter(([, v]) => v.length >= 3).map(([g, v]) => [g, v.reduce((a, b) => a + b, 0) / v.length]).sort((a, b) => b[1] - a[1]).slice(0, 10);
  if (gAvg.length) { html += chartCard('cGAvg', t('genreRating'), true); charts.push(() => mkChart('cGAvg', { type: 'bar', data: { labels: gAvg.map((g) => g[0]), datasets: [{ data: gAvg.map((g) => Math.round(g[1] * 10) / 10), backgroundColor: PALETTE[3], borderRadius: 4 }] }, options: { indexAxis: 'y', scales: { x: { min: 0, max: 10 } } } })); }
  const pl = topEntries(countBy(list, secondaryOf), 8);
  if (pl.length) { html += chartCard('cPlat', t('platforms')); charts.push(() => mkChart('cPlat', { type: 'doughnut', data: { labels: pl.map((p) => p[0]), datasets: [{ data: pl.map((p) => p[1]), backgroundColor: PALETTE, borderWidth: 0 }] } })); }

  // Criterios (solo con una categoría elegida, porque cada categoría tiene los suyos)
  let champs = [];
  if (cat) {
    const names = criteriaNames(DATA, cat), withC = list.filter((r) => r.criterios && r.criterios.some((v) => v != null));
    const avgs = names.map((_, i) => { const v = withC.map((r) => r.criterios[i]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; });
    if (withC.length && names.length >= 3) { html += chartCard('cRadar', t('radar')); charts.push(() => mkChart('cRadar', { type: 'radar', data: { labels: names, datasets: [{ data: avgs.map((v) => (v == null ? 0 : Math.round(v * 10) / 10)), backgroundColor: 'rgba(124,92,255,.25)', borderColor: PALETTE[0], pointBackgroundColor: PALETTE[0] }] }, options: { scales: { r: { min: 0, max: 10, ticks: { display: false } } } } })); }
    champs = names.map((n, i) => { const b = withC.filter((r) => r.criterios[i] != null).sort((a, c) => c.criterios[i] - a.criterios[i])[0]; return b ? { name: n, sub: b.titulo, value: fmt1(b.criterios[i]) } : null; }).filter(Boolean);
  }
  html += rankedList(t('best'), rated.slice().sort((a, b) => b.valoracion - a.valoracion).slice(0, 10).map((r) => ({ name: r.titulo, value: fmt1(r.valoracion), cover: r.portada || '' })));
  html += rankedList(t('mostHours'), withHours.slice().sort((a, b) => b.horas - a.horas).slice(0, 10).map((r) => ({ name: r.titulo, value: fmtH(r.horas), cover: r.portada || '' })));
  if (champs.length) html += rankedList(t('champions'), champs);
  const chars = list.flatMap((r) => (r.personajesLista || []).filter((c) => c.nombre && c.nota != null).map((c) => ({ ...c, titulo: r.titulo })));
  if (chars.length) html += rankedList(t('bestChars'), chars.sort((a, b) => b.nota - a.nota).slice(0, 10).map((c) => ({ name: c.nombre, sub: c.titulo, value: fmt1(c.nota), cover: c.imagen || '', ph: '👤' })));

  $('#view').innerHTML = html;
  $$('.chip[data-cat]').forEach((b) => { b.onclick = () => { S.statsCat = b.dataset.cat || null; renderStats(); }; });
  charts.forEach((f) => f());
  observeCovers($('#view'));
}
