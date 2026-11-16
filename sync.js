'use strict';
// MediaLog móvil — subir cambios a GitHub con la misma fusión registro a registro que usa el ordenador.
const LOCAL_ONLY_CONFIG = ['steamApiKey', 'steamId', 'railExpanded', 'vista', 'tema', 'preset', 'colorPrimario', 'colorSecundario', 'idioma'];
const TOMBSTONE_DAYS = 180;
const sharedConfig = (cfg) => { const o = {}; Object.keys(cfg || {}).forEach((k) => { if (!LOCAL_ONLY_CONFIG.includes(k)) o[k] = cfg[k]; }); return o; };
const payloadOf = (d) => ({ categorias: d.categorias || [], log: d.log || [], wishlist: d.wishlist || [], config: sharedConfig(d.config), eliminados: d.eliminados || [] });

function mergeData(L, R, now = new Date().toISOString()) {
  const stats = { pulled: 0, pushed: 0, deletedLocal: 0, deletedRemote: 0 };
  const tomb = new Map();
  [...(L.eliminados || []), ...(R.eliminados || [])].forEach((x) => { const k = x.tipo + ':' + x.id; if (!tomb.has(k) || tomb.get(k) < x.en) tomb.set(k, x.en); });
  const out = { ...L }, live = new Set();
  ['log', 'wishlist'].forEach((kind) => {
    const lm = new Map((L[kind] || []).map((r) => [r.id, r])), rm = new Map((R[kind] || []).map((r) => [r.id, r]));
    const order = [...lm.keys(), ...[...rm.keys()].filter((id) => !lm.has(id))], res = [];
    order.forEach((id) => {
      const l = lm.get(id), r = rm.get(id), tm = tomb.get(kind + ':' + id);
      const ls = (l && l.modificadoEn) || '', rs = (r && r.modificadoEn) || '';
      const pick = l && r ? (rs > ls ? r : l) : (l || r);
      if (tm && tm > (pick.modificadoEn || '')) { if (l) stats.deletedLocal++; else stats.deletedRemote++; return; }
      if (l && r) { if (JSON.stringify(l) !== JSON.stringify(r)) { if (pick === r) stats.pulled++; else stats.pushed++; } } else if (r) stats.pulled++; else stats.pushed++;
      res.push(pick); live.add(kind + ':' + id);
    });
    out[kind] = res;
  });
  const lc = L.config || {}, rc = R.config || {};
  const newer = (rc.modificadoEn || '') > (lc.modificadoEn || '') ? rc : lc;
  const cfg = { ...lc };
  Object.keys(sharedConfig(rc)).concat(Object.keys(sharedConfig(lc))).forEach((k) => { if (newer[k] !== undefined) cfg[k] = newer[k]; });
  if (rc.modificadoEn || lc.modificadoEn) cfg.modificadoEn = (rc.modificadoEn || '') > (lc.modificadoEn || '') ? rc.modificadoEn : lc.modificadoEn;
  out.config = cfg;
  out.categorias = [...new Set([...(L.categorias || []), ...(R.categorias || [])])];
  const limit = new Date(new Date(now).getTime() - TOMBSTONE_DAYS * 86400000).toISOString();
  out.eliminados = [...tomb.entries()].filter(([k, en]) => !live.has(k) && en > limit).map(([k, en]) => { const i = k.indexOf(':'); return { tipo: k.slice(0, i), id: k.slice(i + 1), en }; });
  return { merged: out, stats };
}

const b64ToBytes = (b64) => { const bin = atob(b64.replace(/\s/g, '')); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const bytesToB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };

async function ghApi(method, path, body) {
  const res = await fetch('https://api.github.com' + path, { method, headers: { ...ghHeaders(), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (res.status === 204) return null;
  const txt = await res.text(); let j = null; try { j = JSON.parse(txt); } catch (e) { /* sin JSON */ }
  if (!res.ok) { const err = new GhError(res.status, (j && j.message) || ('HTTP ' + res.status)); throw err; }
  return j;
}
function syncError(e) {
  if (e instanceof GhError) {
    if (e.status === 401) return t('errAuth');
    if (e.status === 403) return t('errWrite');
    if (e.status === 404) return t('errNotFound');
  }
  return t('errGeneric') + (e && e.message ? e.message : e);
}

// Una pasada: bajar lo remoto, fusionar con lo local y subir si hay algo nuevo (con portadas pendientes)
async function syncOnce(local, pendingCovers) {
  const base = repoPath();
  const info = await ghApi('GET', base); const branch = info.default_branch || 'main';
  const refSha = (await ghApi('GET', `${base}/git/ref/heads/${branch}`)).object.sha;
  const commit = await ghApi('GET', `${base}/git/commits/${refSha}`);
  const tree = await ghApi('GET', `${base}/git/trees/${commit.tree.sha}?recursive=1`);
  const files = new Map((tree.tree || []).filter((x) => x.type === 'blob' && x.path.startsWith('data/')).map((x) => [x.path, x.sha]));
  let remote = null, remoteRaw = null;
  if (files.has('data/data.json')) { const b = await ghApi('GET', `${base}/git/blobs/${files.get('data/data.json')}`); remoteRaw = new TextDecoder().decode(b64ToBytes(b.content)); remote = JSON.parse(remoteRaw); }
  const { merged, stats } = remote ? mergeData(local, remote) : { merged: local, stats: { pulled: 0, pushed: (local.log || []).length, deletedLocal: 0, deletedRemote: 0 } };
  const toUpload = pendingCovers.filter((n) => !files.has('data/covers/' + n));
  const newRaw = JSON.stringify(payloadOf(merged), null, 1);
  const result = { merged, stats: { ...stats, uploadedCovers: 0, commit: null } };
  if (newRaw === remoteRaw && !toUpload.length) return result;
  const entries = [{ path: 'data/data.json', mode: '100644', type: 'blob', sha: (await ghApi('POST', `${base}/git/blobs`, { content: newRaw, encoding: 'utf-8' })).sha }];
  for (const n of toUpload) {
    const bytes = await coverBytes(n); if (!bytes) continue;
    const b = await ghApi('POST', `${base}/git/blobs`, { content: bytesToB64(bytes), encoding: 'base64' });
    entries.push({ path: 'data/covers/' + n, mode: '100644', type: 'blob', sha: b.sha }); result.stats.uploadedCovers++;
  }
  const nt = await ghApi('POST', `${base}/git/trees`, { base_tree: commit.tree.sha, tree: entries });
  const nc = await ghApi('POST', `${base}/git/commits`, { message: `Móvil ${new Date().toISOString().slice(0, 16).replace('T', ' ')}: ${stats.pushed} subidos, ${stats.pulled} bajados`, tree: nt.sha, parents: [refSha] });
  await ghApi('PATCH', `${base}/git/refs/heads/${branch}`, { sha: nc.sha, force: false });
  result.stats.commit = nc.sha;
  return result;
}
async function coverBytes(name) {
  const c = await caches.open('ml-covers'); const hit = await c.match(new Request('https://covers.local/' + encodeURIComponent(name)));
  return hit ? new Uint8Array(await (await hit.blob()).arrayBuffer()) : null;
}

// ---------------- Estado pendiente y cola ----------------
let editVer = 0, syncing = false, syncTimer = null;
async function getPending() { return (await idb.get('pending')) || { dirty: false, covers: [] }; }
async function setPending(p) { await idb.set('pending', p); updateDirtyDot(p.dirty); }
function updateDirtyDot(d) { const b = $('#refreshBtn'); if (b) b.classList.toggle('dirty', !!d); }
function toast(msg) { const el = $('#toast'); if (!el) return; el.textContent = msg; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2600); }

// Guarda un cambio en local (funciona sin conexión) y programa la subida
async function commitLocal(mutator, newCovers = []) {
  mutator(DATA); editVer++;
  await idb.set('data', DATA);
  const p = await getPending(); p.dirty = true; p.covers = [...new Set([...p.covers, ...newCovers])]; await setPending(p);
  scheduleSync(1200);
}
function scheduleSync(ms) { clearTimeout(syncTimer); syncTimer = setTimeout(() => syncNow(false), ms); }

async function syncNow(manual) {
  if (syncing) return; if (!getCfg().token) return;
  const p0 = await getPending();
  if (!p0.dirty && !manual) return;
  syncing = true; $('#refreshBtn').classList.add('spin');
  const v = editVer;
  try {
    let res = null, lastErr = null;
    for (let i = 0; i < 3; i++) {
      try { res = await syncOnce(JSON.parse(JSON.stringify(DATA)), p0.covers); break; }
      catch (e) { lastErr = e; if (e instanceof GhError && (e.status === 422 || e.status === 409)) { await new Promise((r) => setTimeout(r, 900 * (i + 1))); continue; } throw e; }
    }
    if (!res) throw lastErr;
    if (editVer === v) { DATA = res.merged; await idb.set('data', DATA); await setPending({ dirty: false, covers: [] }); }
    else { await setPending({ dirty: true, covers: p0.covers }); scheduleSync(800); }   // hubo ediciones mientras subía: se vuelve a sincronizar
    const meta = (await idb.get('meta')) || {}; await idb.set('meta', { ...meta, etag: null, at: Date.now() });
    setBanner('');
    if (res.stats.commit) toast(t('saved')); else if (manual) toast(t('upToDate'));
    if (editVer === v && (res.stats.pulled || res.stats.deletedLocal)) go(S.tab);
  } catch (e) {
    const offline = !navigator.onLine || /Failed to fetch|NetworkError|Load failed/i.test(String(e && e.message));
    setBanner(offline ? t('pendingOffline') : syncError(e), offline ? '' : 'error');
  } finally { syncing = false; $('#refreshBtn').classList.remove('spin'); }
}
