// Cache only this app's shell; never delete caches owned by other Pages projects.
const PREFIX = 'imageguard-' + self.registration.scope + '-';
const CACHE = PREFIX + 'v2';
const ASSETS = ['./', './index.html', './styles.css', './app.mjs', './core.mjs', './proof.mjs', './logo.svg', './manifest.webmanifest'];
const allowed = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => (k.startsWith(PREFIX) || k === 'imageguard-shell-v1') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || !allowed.has(event.request.url)) return;
  event.respondWith(caches.open(CACHE).then(cache => cache.match(event.request)).then(hit => hit || fetch(event.request)));
});
