const CACHE_NAME = 'becareful-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/landing.html',
  '/charts.html',
  '/style.css',
  '/landing.css',
  '/charts.css',
  '/app.js',
  '/landing.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});
