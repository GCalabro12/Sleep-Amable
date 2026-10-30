// Amable Sleep — funciona sin conexión. Subir CACHE con cada versión.
const CACHE = 'sleepamable-v29.0';
const CORE = ['./', './index.html', './logo.svg', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png', './luna/luna-saluda.png', './luna/luna-consejo.png', './luna/luna-aplaude.png', './luna/luna-consejo.webm', './luna/luna-saluda.mp4', './luna/luna-aplaude.webm', './luna/durmiendo-movil.webp', './luna/movil-colchon.webp'];
// La IA (MediaPipe + modelo YAMNet) se guarda la primera vez que se descarga
const IA_HOSTS = ['cdn.jsdelivr.net', 'storage.googleapis.com'];

self.addEventListener('install', e => {
  // {cache: 'reload'}: la copia sin conexión se baja del servidor, nunca de la caché del navegador (si no, podía quedarse una versión vieja)
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE.map(u => new Request(u, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('sleepamable-') && k !== CACHE && k !== 'sleepamable-ia' && k !== 'sleepamable-cuna').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (IA_HOSTS.includes(u.hostname)) { // primero la copia guardada
    e.respondWith(caches.open('sleepamable-ia').then(c => c.match(r).then(hit => hit || fetch(r).then(res => {
      if (res.ok) c.put(r, res.clone());
      return res;
    }))));
    return;
  }
  if (u.origin === location.origin && (u.pathname.includes('/cuna/') || u.pathname.includes('/alarma/') || u.pathname.includes('/audios/'))) { // canciones de cuna, tonos y relajaciones: se guardan enteros
    e.respondWith(caches.open('sleepamable-cuna').then(c => c.match(u.href).then(hit => hit || fetch(u.href).then(res => {
      if (res.status === 200) c.put(u.href, res.clone());
      return res;
    }))));
    return;
  }
  if (u.pathname.endsWith('.apk')) return; // el APK se descarga directo, sin guardarlo
  if (u.origin !== location.origin || !u.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
  // primero la red, preguntando siempre si hay versión nueva (sin fiarse de la caché de 10 min del servidor); si no hay red, la copia
  // (una petición nueva con la misma dirección: con la de la página, en algunos Android, fallaba y salía la copia vieja)
  e.respondWith(fetch(new Request(r.url, {cache: 'no-cache', credentials: 'same-origin'})).then(res => {
    if (res.ok && !u.search) caches.open(CACHE).then(c => c.put(r, res.clone()));
    return res;
  }).catch(() => caches.match(r, {ignoreSearch: true}).then(hit => hit || caches.match('./index.html'))));
});
