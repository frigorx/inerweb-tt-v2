// inerWeb DEV — Service Worker (cache séparé de PROD)
const CACHE_NAME = 'inerweb-DEV-v7.18';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './inerweb_prof.html',
  './inerweb_tuteur.html',
  './inerweb_eleve.html',
  './progression.html',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap',
];

// Install — cache les ressources essentielles
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate — nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME && !key.startsWith('inerweb-edu-'))
            .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — strategie differenciee
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NE PAS cacher les requetes vers edu/ (le SW d'Edu gere son propre scope)
  if (url.pathname.includes('/edu/')) {
    return;
  }

  // Pages d'evaluation : toujours network-first (pas de cache figé)
  // -> evite que des mises a jour ne soient bloquees par le SW
  const NETWORK_FIRST = ['/inerweb_oral_francais', '/inerweb_ccf_ep2', '/inerweb_admin', '/inerweb_prof', '/inerweb_tuteur', '/inerweb_eleve', '/reset.html', '/sw.js'];
  if (NETWORK_FIRST.some(p => url.pathname.includes(p))) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Requetes API (Apps Script) -> network-first avec fallback cache (GET uniquement)
  if (url.hostname.includes('script.google.com')) {
    if (event.request.method !== 'GET') {
      // POST/PUT/DELETE → network only, pas de cache
      event.respondWith(fetch(event.request));
      return;
    }
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Tout le reste -> cache-first
  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
      .catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});
