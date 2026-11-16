'use strict';
// MediaLog móvil — añadir, editar y eliminar registros.
let E = null;   // estado del editor
const STATES = ['Completado', 'Platinado', 'Abandonado', 'Sin Fin / En Progreso'];
const round1 = (x) => Math.round(x * 10) / 10;
const newId = (p) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
const charsText = (l) => (l || []).filter((c) => c.nombre).map((c) => (c.nota != null ? `${c.nombre} ${c.nota}/10` : c.nombre)).join('; ') || null;

// Opciones de las listas: las de la configuración más lo que ya usan los registros, de más a menos usado
function optionsFor(cat, field) {
  const L = (DATA.config && DATA.config.listas && DATA.config.listas[cat]) || {};
  const count = {};
  const bump = (v) => { if (v) count[v] = (count[v] || 0) + 1; };
  DATA.log.filter((r) => r.categoria === cat).forEach((r) => {
    if (field === 'generos') genresOf(normRec(r)).forEach(bump);
    else if (field === 'secundarios') bump(r.plataforma || r.formato);
    else if (field === 'sagas') bump(r.saga);
    else if (field === 'etiquetas') (Array.isArray(r.etiquetas) ? r.etiquetas : []).forEach(bump);
    else if (field === 'donde') bump(r.donde);
  });
  (Array.isArray(L[field]) ? L[field] : []).forEach((v) => { if (!(v in count)) count[v] = 0; });
  return Object.keys(count).sort((a, b) => count[b] - count[a] || a.localeCompare(b, LANG));
}

// ---------- Imagen elegida de la galería: se reduce y se guarda para subirla luego ----------
async function processImage(file, maxW = 420) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, maxW / bmp.width), w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; cv.getContext('2d').drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.85));
  const name = `cover-m${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}.jpg`;
  const cache = await caches.open('ml-covers');
  await cache.put(new Request('https://covers.local/' + encodeURIComponent(name)), new Response(blob, { headers: { 'Content-Type': 'image/jpeg' } }));
  coverURLs.set(name, URL.createObjectURL(blob));
  return name;
}
function pickFile(cb) {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => { if (inp.files[0]) { try { cb(await processImage(inp.files[0])); } catch (e) { reportError('Imagen', e); } } };
  inp.click();
}

// ---------- Selector de chips (géneros y etiquetas) ----------
function renderChips(boxId, key) {
  const box = $('#' + boxId), sel = E[key], opts = E.opts[key];
  box.innerHTML = `<div class="chipbox">${opts.map((o) => `<button type="button" class="chip sm ${sel.has(o) ? 'active' : ''}" data-v="${esc(o)}">${esc(o)}</button>`).join('') || `<span class="muted small">—</span>`}</div>
    <div class="addrow"><input type="text" placeholder="${esc(t('addNew'))}" /><button type="button" class="chip">＋</button></div>`;
  $$('.chip[data-v]', box).forEach((b) => { b.onclick = () => { const v = b.dataset.v; if (sel.has(v)) sel.delete(v); else sel.add(v); b.classList.toggle('active'); }; });
  const inp = $('input', box), add = () => { const v = inp.value.trim(); if (!v) return; if (!opts.includes(v)) opts.unshift(v); sel.add(v); renderChips(boxId, key); };
  $('.addrow .chip', box).onclick = add; inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
}

// ---------- Personajes ----------
function renderChars() {
  $('#eChars').innerHTML = E.chars.map((c, i) => `<div class="crow" data-i="${i}"><div class="thumb" data-img>${c.imagen ? '' : '👤'}</div><input type="text" class="cn" placeholder="${esc(t('charName'))}" value="${esc(c.nombre)}" /><input type="number" class="cg" min="0" max="10" step="0.1" placeholder="0-10" value="${c.nota != null ? c.nota : ''}" /><button type="button" class="icon" data-del>✕</button></div>`).join('') || `<div class="muted small">${t('noChars')}</div>`;
  $$('#eChars .crow').forEach((row) => {
    const c = E.chars[+row.dataset.i], th = $('[data-img]', row);
    if (c.imagen) { th.dataset.cover = c.imagen; observeCovers(row); }
    th.onclick = () => pickFile((name) => { c.imagen = name; E.newCovers.push(name); renderChars(); });
    $('.cn', row).oninput = (e) => { c.nombre = e.target.value; };
    $('.cg', row).oninput = (e) => { c.nota = num(e.target.value); };
    $('[data-del]', row).onclick = () => { E.chars.splice(+row.dataset.i, 1); renderChars(); };
  });
}

// ---------- Media de criterios ----------
function updateAvg() {
  const vals = $$('#eCrit .ci').map((i) => num(i.value)), got = vals.filter((v) => v != null);
  const avg = got.length ? got.reduce((a, b) => a + b, 0) / got.length : null;
  $('#eAvg').textContent = !vals.length ? '' : (avg != null ? `${t('avg')}: ${fmt1(avg)}` : t('fillCrit'));
  const val = $('#eValoracion'), auto = $('#eAuto').checked && avg != null;
  if (auto) val.value = round1(avg); val.readOnly = auto; return avg;
}

function field(label, html) { return `<label class="fld"><span>${esc(label)}</span>${html}</label>`; }
function openEditor(id) {
  const orig = id ? DATA.log.find((r) => r.id === id) : null;
  const cat = orig ? orig.categoria : (S.cat || DATA.categorias[0]);
  if (id && !orig) return;
  const r = orig ? normRec(orig) : { categoria: cat, estado: 'Completado', etiquetas: [], personajesLista: [], vez: 1 };
  const isCine = cat === 'CINE', names = criteriaNames(DATA, cat);
  E = { id: orig ? orig.id : null, orig, cat, isCine, cover: orig ? (orig.portada || null) : null, newCovers: [], tab: 'data',
    generos: new Set(genresOf(r)), etiquetas: new Set(r.etiquetas), chars: r.personajesLista.map((c) => ({ ...c })),
    opts: { generos: optionsFor(cat, 'generos'), etiquetas: optionsFor(cat, 'etiquetas') } };
  E.opts.generos = [...new Set([...E.generos, ...E.opts.generos])]; E.opts.etiquetas = [...new Set([...E.etiquetas, ...E.opts.etiquetas])];
  const h = r.horas != null ? Math.floor(r.horas) : '', m = r.horas != null ? Math.round((r.horas - Math.floor(r.horas)) * 60) : '';
  const crit = names.map((n, i) => `<div class="crit2"><span>${esc(n)}</span><input type="number" class="ci" min="0" max="10" step="0.1" value="${r.criterios && r.criterios[i] != null ? r.criterios[i] : ''}" /></div>`).join('');
  $('#sheetBody').innerHTML = `<div class="edit"><h3>${orig ? t('edit') : t('newRecord')} · ${esc(cat)}</h3>
    <div class="seg">${['data', 'dates', 'rating', 'chars'].map((k) => `<button type="button" data-tab="${k}" class="${k === 'data' ? 'active' : ''}">${t('tab_' + k)}</button>`).join('')}</div>
    <div class="pane" data-pane="data">
      <div class="coverrow"><div class="cover" id="eCover" ${E.cover ? `data-cover="${esc(E.cover)}"` : ''}>🎞️</div><div><button type="button" class="chip" id="eCoverBtn">📷 ${t('pickImage')}</button><br><br><button type="button" class="chip" id="eCoverDel">${t('removeImage')}</button></div></div>
      ${field(t('title'), `<input type="text" id="eTitulo" value="${esc(r.titulo || '')}" />`)}
      ${field(t('status'), `<select id="eEstado">${STATES.map((s) => `<option value="${esc(s)}">${esc(stLabel(s))}</option>`).join('')}</select>`)}
      ${field(isCine ? t('format') : t('platform'), `<input type="text" id="eSec" list="dlSec" value="${esc(r.plataforma || r.formato || '')}" /><datalist id="dlSec">${optionsFor(cat, 'secundarios').map((o) => `<option value="${esc(o)}">`).join('')}</datalist>`)}
      ${field(t('saga'), `<input type="text" id="eSaga" list="dlSaga" value="${esc(r.saga || '')}" /><datalist id="dlSaga">${optionsFor(cat, 'sagas').map((o) => `<option value="${esc(o)}">`).join('')}</datalist>`)}
      ${isCine ? field(t('where'), `<input type="text" id="eDonde" list="dlDonde" value="${esc(r.donde || '')}" /><datalist id="dlDonde">${optionsFor(cat, 'donde').map((o) => `<option value="${esc(o)}">`).join('')}</datalist>`) : ''}
      <div class="fld"><span>${t('genres')}</span><div id="eGen"></div></div>
      <div class="fld"><span>${t('tags')}</span><div id="eTag"></div></div>
      <div class="two">${field(t('price'), `<input type="number" step="0.01" id="ePrecio" value="${r.precio != null ? esc(r.precio) : ''}" />`)}${field(t('regular'), `<input type="number" step="0.01" id="ePrecioO" value="${r.precioOriginal != null ? esc(r.precioOriginal) : ''}" />`)}</div>
      <label class="chk"><input type="checkbox" id="eVolveria" ${r.volveria ? 'checked' : ''} /> ♻ ${t('again')}</label>
    </div>
    <div class="pane" data-pane="dates" hidden>
      <div class="two">${field(t('year'), `<input type="number" id="eAnio" value="${r.anio != null ? r.anio : ''}" />`)}${field(t('yearEnd'), `<input type="number" id="eAnioFin" value="${r.anioFin != null ? esc(r.anioFin) : ''}" />`)}</div>
      <div class="two">${field(t('start'), `<input type="date" id="eFi" value="${esc(r.fechaInicio || '')}" />`)}${field(t('end'), `<input type="date" id="eFf" value="${esc(r.fechaFin || '')}" />`)}</div>
      <label class="chk"><input type="checkbox" id="eEnCurso" ${r.enCurso ? 'checked' : ''} /> ${t('stillGoing')}</label>
      ${isCine ? `<div class="two">${field(t('hours') + ' h', `<input type="number" min="0" id="eH" value="${h}" />`)}${field('min', `<input type="number" min="0" max="59" id="eM" value="${m}" />`)}</div>
        <div class="two">${field(t('seasons'), `<input type="number" id="eTemp" value="${r.temporadas != null ? esc(r.temporadas) : ''}" />`)}${field(t('seasonNo'), `<input type="number" id="eTempNum" value="${r.tempNum != null ? esc(r.tempNum) : ''}" />`)}</div>`
        : `<div class="two">${field(t('hours'), `<input type="number" step="0.1" min="0" id="eHoras" value="${r.horas != null ? r.horas : ''}" />`)}${field(t('achievements') + ' %', `<input type="number" min="0" max="100" id="eLogros" value="${r.logros != null ? r.logros : ''}" />`)}</div>`}
      ${field(t('times'), `<input type="number" min="1" id="eVez" value="${r.vez || 1}" />`)}
      ${field(t('notes'), `<textarea id="eNotas" rows="4">${esc(r.notas || '')}</textarea>`)}
    </div>
    <div class="pane" data-pane="rating" hidden>
      <div id="eCrit">${crit || `<div class="muted small">${t('noCrit')}</div>`}</div>
      <div id="eAvg" class="avgline"></div>
      <label class="chk"><input type="checkbox" id="eAuto" ${(orig ? orig.notaAuto : names.length > 0) ? 'checked' : ''} ${names.length ? '' : 'disabled'} /> ${t('useAvg')}</label>
      ${field(t('rating'), `<input type="number" step="0.1" min="0" max="10" id="eValoracion" value="${r.valoracion != null ? r.valoracion : ''}" />`)}
    </div>
    <div class="pane" data-pane="chars" hidden><div id="eChars"></div><button type="button" class="chip" id="eAddChar">＋ ${t('addChar')}</button></div>
    <div class="edit-actions"><button class="btn" id="eSave">${t('save2')}</button><button class="btn ghost" id="eCancel">${t('cancel')}</button>${orig ? `<button class="btn danger" id="eDelete">${t('delete')}</button>` : ''}</div></div>`;
  $('#eEstado').value = r.estado || 'Completado';
  $('#sheet .sheet-card').classList.add('editing'); $('#sheet').hidden = false; $('#sheet .sheet-card').scrollTop = 0;
  renderChips('eGen', 'generos'); renderChips('eTag', 'etiquetas'); renderChars(); observeCovers($('#sheetBody'));
  $$('.seg button').forEach((b) => { b.onclick = () => { $$('.seg button').forEach((x) => x.classList.toggle('active', x === b)); $$('.pane').forEach((p) => { p.hidden = p.dataset.pane !== b.dataset.tab; }); }; });
  $('#eCoverBtn').onclick = () => pickFile((name) => { E.cover = name; E.newCovers.push(name); const c = $('#eCover'); c.innerHTML = `<img alt="" src="${coverURLs.get(name)}" />`; });
  $('#eCoverDel').onclick = () => { E.cover = null; $('#eCover').innerHTML = '🎞️'; };
  $('#eAddChar').onclick = () => { E.chars.push({ id: newId('c'), nombre: '', nota: null, imagen: null }); renderChars(); const ins = $$('#eChars .cn'); ins[ins.length - 1].focus(); };
  $$('#eCrit .ci').forEach((i) => { i.oninput = updateAvg; }); $('#eAuto').onchange = updateAvg; updateAvg();
  $('#eCancel').onclick = closeEditor; $('#eSave').onclick = saveEditor;
  if (orig) $('#eDelete').onclick = deleteRecord;
}
function closeEditor() { $('#sheet').hidden = true; $('#sheet .sheet-card').classList.remove('editing'); E = null; }

function buildRecord() {
  const v = (id) => ($('#' + id) ? $('#' + id).value : ''), n = (id, f) => (v(id) !== '' ? f(v(id)) : null);
  const titulo = v('eTitulo').trim(); if (!titulo) { toast(t('needTitle')); return null; }
  const isCine = E.isCine, sec = v('eSec').trim() || null;
  const crit = $$('#eCrit .ci').map((i) => num(i.value)), avg = updateAvg();
  const auto = $('#eAuto').checked;
  let horas = null;
  if (isCine) { if (v('eH') !== '' || v('eM') !== '') horas = Math.round(((parseFloat(v('eH') || '0')) + (parseFloat(v('eM') || '0')) / 60) * 100) / 100; }
  else if (v('eHoras') !== '') horas = round1(parseFloat(v('eHoras')));
  const fi = v('eFi') || null, ff = v('eFf') || null, anio = n('eAnio', (x) => parseInt(x, 10)) || (fi || ff ? parseInt((fi || ff).slice(0, 4), 10) : null);
  const chars = E.chars.filter((c) => c.nombre && c.nombre.trim()).map((c) => ({ id: c.id, nombre: c.nombre.trim(), nota: c.nota != null ? c.nota : null, imagen: c.imagen || null }));
  const genero = [...E.generos].join(', ') || null;
  return {
    id: E.id || newId('rec'), categoria: E.cat, titulo, genero,
    plataforma: isCine ? null : sec, formato: isCine ? sec : null,
    temporadas: isCine ? n('eTemp', (x) => parseInt(x, 10)) : null, fechaInicio: fi, fechaFin: ff, anio, horas,
    logros: !isCine ? n('eLogros', (x) => parseInt(x, 10)) : null, estado: v('eEstado'),
    valoracion: auto && avg != null ? round1(avg) : n('eValoracion', (x) => round1(parseFloat(x))),
    saga: v('eSaga').trim() || null, vez: parseInt(v('eVez') || '1', 10) || 1, tempNum: isCine ? n('eTempNum', (x) => parseInt(x, 10)) : null,
    anioFin: n('eAnioFin', (x) => parseInt(x, 10)), enCurso: $('#eEnCurso').checked, notas: v('eNotas').trim() || null,
    portada: E.cover || null, criterios: crit.some((x) => x != null) ? crit : null, notaAuto: auto, etiquetas: [...E.etiquetas],
    donde: isCine ? (v('eDonde').trim() || null) : null, precio: n('ePrecio', parseFloat), precioOriginal: n('ePrecioO', parseFloat), volveria: $('#eVolveria').checked,
    personajesLista: chars, personajes: charsText(chars),
  };
}
async function saveEditor() {
  const built = buildRecord(); if (!built) return;
  const now = new Date().toISOString(), covers = [...E.newCovers].filter((c) => c === built.portada || built.personajesLista.some((p) => p.imagen === c));
  await commitLocal((d) => {
    const i = d.log.findIndex((x) => x.id === built.id);
    if (i >= 0) d.log[i] = { ...d.log[i], ...built, modificadoEn: now };
    else d.log.unshift({ ...built, creadoEn: now, modificadoEn: now });
    if (Array.isArray(d.eliminados)) d.eliminados = d.eliminados.filter((x) => !(x.tipo === 'log' && x.id === built.id));
  }, covers);
  closeEditor(); go(S.tab); toast(t('savedLocal'));
}
async function deleteRecord() {
  if (!E || !E.id || !confirm(t('confirmDelete'))) return;
  const id = E.id, now = new Date().toISOString();
  await commitLocal((d) => { d.log = d.log.filter((x) => x.id !== id); if (!Array.isArray(d.eliminados)) d.eliminados = []; d.eliminados.push({ tipo: 'log', id, en: now }); });
  closeEditor(); go(S.tab); toast(t('deleted'));
}
