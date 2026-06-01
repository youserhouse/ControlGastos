const CACHE_NAME = 'control-gastos-2026-v6';
const SCOPE = '/ControlGastos/';
const PRECACHE_URLS = [
  '/ControlGastos/',
  '/ControlGastos/index.html',
  '/ControlGastos/styles.css',
  '/ControlGastos/manifest.json',
  '/ControlGastos/icon-192.png',
  '/ControlGastos/icon-512.png',
  '/ControlGastos/js/utils.js',
  '/ControlGastos/js/theme.js',
  '/ControlGastos/js/firebase.js',
  '/ControlGastos/js/auth.js',
  '/ControlGastos/js/sync.js',
  '/ControlGastos/js/state.js',
  '/ControlGastos/js/ui.js',
  '/ControlGastos/js/gastos.js',
  '/ControlGastos/js/ingresos.js',
  '/ControlGastos/js/dashboard.js',
  '/ControlGastos/js/scanner.js',
  '/ControlGastos/js/config.js',
  '/ControlGastos/js/budgets.js',
  '/ControlGastos/js/bank-import.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (!e.request.url.includes(SCOPE)) return;
  if (e.request.url.includes('firestore') || e.request.url.includes('firebase')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
