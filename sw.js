// MediaLog móvil — caché de la aplicación para que abra al instante y sin conexión.
// Los datos y las portadas se guardan aparte (IndexedDB y Cache API) desde la propia app.
const SHELL = 'ml-shell-v1.19.0';
const FILES = ['./', './index.html', './styles.css', './core.js', './views.js', './sync.js', './edit.js', './stats.js', './vendor/chart.umd.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(SHELL).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('ml-shell-') && k !== SHELL).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;   // GitHub y demás: red directa
  e.respondWith(caches.open(SHELL).then(async (c) => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then((r) => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || new Response('Sin conexión', { status: 503 });
  }));
});
