'use strict';
// MediaLog móvil — núcleo: ajustes, almacenamiento local, acceso a GitHub, portadas e idioma.
const VERSION = '1.18.0';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------------- Idioma ----------------
const STR = {
  es: { home: 'Inicio', library: 'Biblioteca', stats: 'Estadísticas', settings: 'Ajustes', search: 'Buscar por título, género, etiqueta...', all: 'Todo', records: 'Registros', hours: 'Horas', avg: 'Nota media', completed: 'Completados', platinum: 'Platinados', dropped: 'Abandonados', ongoing: 'En curso', year: 'Año', status: 'Estado', platform: 'Plataforma', format: 'Formato', genres: 'Géneros', tags: 'Etiquetas', saga: 'Saga', notes: 'Notas', criteria: 'Criterios', characters: 'Personajes', recent: 'Añadido recientemente', today: 'Un día como hoy', wishlist: 'Próximo en tu wishlist', sortRecent: 'Más recientes', sortRating: 'Mejor nota', sortHours: 'Más horas', sortTitle: 'Título A-Z', allYears: 'Todos los años', allStatus: 'Todos los estados', more: 'Mostrar más', none: 'No hay registros con estos filtros.', rating: 'Valoración', rated: 'valorados', start: 'Inicio', end: 'Fin', where: 'Dónde', times: 'Vez nº', seasons: 'Temporadas', achievements: 'Logros', price: 'Precio pagado', regular: 'Precio normal', noToken: 'Configura tu token de GitHub en Ajustes para descargar tus datos.', offline: 'Sin conexión: se muestran los últimos datos descargados.', updated: 'Datos actualizados.', upToDate: 'Ya tienes lo último.', loading: 'Descargando datos...', user: 'Usuario de GitHub', repo: 'Repositorio', token: 'Token de acceso', save: 'Guardar y descargar', language: 'Idioma', theme: 'Tema', dark: 'Oscuro', light: 'Claro', clearCache: 'Borrar portadas guardadas', lastSync: 'Última descarga', cached: 'portadas guardadas', version: 'Versión', helpToken: 'El token se guarda solo en este teléfono. Si lo pierdes o cambias de móvil, crea otro en GitHub y borra el antiguo.', recPerYear: 'Registros por año', hoursPerYear: 'Horas por año', statusChart: 'Estado', ratingDist: 'Distribución de notas', topGenres: 'Géneros más frecuentes', genreRating: 'Nota media por género', platforms: 'Plataformas y formatos', radar: 'Nota media por criterio', best: 'Mejor valorados', mostHours: 'Más horas', champions: 'Campeón de cada criterio', bestChars: 'Personajes mejor valorados', genresDistinct: 'Géneros distintos', loadedN: (n) => `${n} registros`, ready: 'Datos descargados', errAuth: 'GitHub no acepta el token. Crea uno nuevo en Ajustes.', errNotFound: 'No encuentro el repositorio o los datos. Haz primero una sincronización desde el ordenador.', errGeneric: 'No se han podido descargar los datos: ', Completado: 'Completado', Platinado: 'Platinado', Abandonado: 'Abandonado', 'Sin Fin / En Progreso': 'En curso' },
  en: { home: 'Home', library: 'Library', stats: 'Statistics', settings: 'Settings', search: 'Search by title, genre, tag...', all: 'All', records: 'Records', hours: 'Hours', avg: 'Average rating', completed: 'Completed', platinum: 'Platinum', dropped: 'Dropped', ongoing: 'Ongoing', year: 'Year', status: 'Status', platform: 'Platform', format: 'Format', genres: 'Genres', tags: 'Tags', saga: 'Saga', notes: 'Notes', criteria: 'Criteria', characters: 'Characters', recent: 'Recently added', today: 'On this day', wishlist: 'Next on your wishlist', sortRecent: 'Most recent', sortRating: 'Best rated', sortHours: 'Most hours', sortTitle: 'Title A-Z', allYears: 'All years', allStatus: 'All statuses', more: 'Show more', none: 'No records match these filters.', rating: 'Rating', rated: 'rated', start: 'Start', end: 'End', where: 'Where', times: 'Time no.', seasons: 'Seasons', achievements: 'Achievements', price: 'Price paid', regular: 'Regular price', noToken: 'Set your GitHub token in Settings to download your data.', offline: 'Offline: showing the last downloaded data.', updated: 'Data updated.', upToDate: 'You already have the latest.', loading: 'Downloading data...', user: 'GitHub username', repo: 'Repository', token: 'Access token', save: 'Save and download', language: 'Language', theme: 'Theme', dark: 'Dark', light: 'Light', clearCache: 'Clear saved covers', lastSync: 'Last download', cached: 'covers saved', version: 'Version', helpToken: 'The token is stored only on this phone. If you lose it or change phone, create a new one on GitHub and delete the old one.', recPerYear: 'Records per year', hoursPerYear: 'Hours per year', statusChart: 'Status', ratingDist: 'Rating distribution', topGenres: 'Most frequent genres', genreRating: 'Average rating per genre', platforms: 'Platforms and formats', radar: 'Average rating per criterion', best: 'Best rated', mostHours: 'Most hours', champions: 'Champion of each criterion', bestChars: 'Best-rated characters', genresDistinct: 'Distinct genres', loadedN: (n) => `${n} records`, ready: 'Data downloaded', errAuth: 'GitHub does not accept the token. Create a new one in Settings.', errNotFound: 'I cannot find the repository or the data. Run a sync from the computer first.', errGeneric: 'Could not download the data: ', Completado: 'Completed', Platinado: 'Platinum', Abandonado: 'Dropped', 'Sin Fin / En Progreso': 'Ongoing' },
};
let LANG = 'es';
const t = (k, ...a) => { const v = (STR[LANG] && STR[LANG][k] != null) ? STR[LANG][k] : (STR.es[k] != null ? STR.es[k] : k); return typeof v === 'function' ? v(...a) : v; };
function applyStaticText() { $$('[data-t]').forEach((el) => { el.textContent = t(el.dataset.t); }); document.documentElement.lang = LANG; }

// ---------------- Ajustes (en este teléfono) ----------------
const DEFAULT_CFG = { user: 'MintCharlie24', repo: 'MediaLog', token: '', lang: 'es', theme: 'dark' };
function getCfg() { try { return { ...DEFAULT_CFG, ...JSON.parse(localStorage.getItem('ml.cfg') || '{}') }; } catch (e) { return { ...DEFAULT_CFG }; } }
function setCfg(patch) { localStorage.setItem('ml.cfg', JSON.stringify({ ...getCfg(), ...patch })); }
function applyTheme() { document.documentElement.dataset.theme = getCfg().theme; const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = getCfg().theme === 'light' ? '#f4f4f9' : '#14141c'; }

// ---------------- Almacenamiento local (IndexedDB) ----------------
const idb = (() => {
  let db = null;
  const open = () => (db ? Promise.resolve(db) : new Promise((res, rej) => { const r = indexedDB.open('medialog', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => { db = r.result; res(db); }; r.onerror = () => rej(r.error); }));
  return {
    async get(k) { const d = await open(); return new Promise((res) => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); },
    async set(k, v) { const d = await open(); return new Promise((res, rej) => { const tx = d.transaction('kv', 'readwrite'); tx.objectStore('kv').put(v, k); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); },
  };
})();

// ---------------- GitHub ----------------
class GhError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
function ghHeaders(accept) { return { Authorization: 'Bearer ' + getCfg().token, Accept: accept || 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }; }
const repoPath = () => { const c = getCfg(); return `/repos/${encodeURIComponent(c.user)}/${encodeURIComponent(c.repo)}`; };
function explain(e) {
  if (e instanceof GhError) { if (e.status === 401) return t('errAuth'); if (e.status === 404) return t('errNotFound'); }
  return t('errGeneric') + (e && e.message ? e.message : e);
}
// Descarga data.json; con ETag no gasta cuota si no ha cambiado
async function fetchData(force) {
  if (!getCfg().token) throw new GhError(0, 'sin token');
  const meta = (await idb.get('meta')) || {};
  const headers = ghHeaders('application/vnd.github.raw+json');
  if (meta.etag && !force) headers['If-None-Match'] = meta.etag;
  const res = await fetch('https://api.github.com' + repoPath() + '/contents/data/data.json', { headers });
  if (res.status === 304) { await idb.set('meta', { ...meta, at: Date.now() }); return { changed: false }; }
  if (!res.ok) throw new GhError(res.status, 'HTTP ' + res.status);
  const data = JSON.parse(await res.text());
  await idb.set('data', data); await idb.set('meta', { etag: res.headers.get('etag'), at: Date.now() });
  return { changed: true, data };
}

// ---------------- Portadas: se bajan una vez y se guardan en el teléfono ----------------
const coverURLs = new Map();
let activeLoads = 0; const waiting = [];
const slot = () => new Promise((res) => { if (activeLoads < 4) { activeLoads++; res(); } else waiting.push(res); });
const release = () => { activeLoads--; const n = waiting.shift(); if (n) { activeLoads++; n(); } };
async function coverURL(name) {
  if (!name) return null;
  if (coverURLs.has(name)) return coverURLs.get(name);
  const cache = await caches.open('ml-covers');
  const key = new Request('https://covers.local/' + encodeURIComponent(name));
  let blob = null;
  const hit = await cache.match(key);
  if (hit) blob = await hit.blob();
  else {
    await slot();
    try {
      const res = await fetch('https://api.github.com' + repoPath() + '/contents/data/covers/' + encodeURIComponent(name), { headers: ghHeaders('application/vnd.github.raw+json') });
      if (!res.ok) return null;
      blob = await res.blob();
      await cache.put(key, new Response(blob, { headers: { 'Content-Type': blob.type || 'image/jpeg' } }));
    } catch (e) { return null; } finally { release(); }
  }
  const url = URL.createObjectURL(blob); coverURLs.set(name, url); return url;
}
// Rellena las <img data-cover> cuando entran en pantalla
const lazyObserver = new IntersectionObserver((entries) => {
  entries.forEach(async (en) => {
    if (!en.isIntersecting) return;
    const el = en.target; lazyObserver.unobserve(el);
    const url = await coverURL(el.dataset.cover);
    if (url && el.isConnected) el.innerHTML = `<img alt="" src="${url}" />`;
  });
}, { rootMargin: '200px' });
function observeCovers(root) { $$('[data-cover]', root).forEach((el) => { if (el.dataset.cover) lazyObserver.observe(el); }); }
async function coverCount() { try { const c = await caches.open('ml-covers'); return (await c.keys()).length; } catch (e) { return 0; } }
async function clearCovers() { await caches.delete('ml-covers'); coverURLs.forEach((u) => URL.revokeObjectURL(u)); coverURLs.clear(); }

// ---------------- Utilidades de datos ----------------
const DEFAULT_CRITERIA = { CINE: ['Historia', 'Actuación', 'Visuales', 'Música'], _: ['Historia', 'Jugabilidad', 'Gráficos', 'Música'] };
const criteriaNames = (data, cat) => { const c = data.config && data.config.criterios && data.config.criterios[cat]; return Array.isArray(c) ? c : (DEFAULT_CRITERIA[cat] || DEFAULT_CRITERIA._); };
const genresOf = (r) => (r.genero ? r.genero.split(',').map((g) => g.trim()).filter(Boolean) : []);
const secondaryOf = (r) => r.plataforma || r.formato || '';
const rateClass = (v) => (v >= 8 ? 'g' : v >= 6 ? 'a' : 'r');
const stClass = (s) => (s === 'Completado' || s === 'Platinado' || s === 'Abandonado' ? 'st-' + s : 'st-prog');
const dateKey = (r) => r.fechaFin || r.fechaInicio || (r.anio ? r.anio + '-01-01' : '') || (r.creadoEn || '').slice(0, 10);
const fmt1 = (n) => (n == null || isNaN(n) ? '—' : (Math.round(n * 10) / 10).toFixed(1));
const fmtH = (n) => (n >= 100 ? Math.round(n) : fmt1(n)) + 'h';
