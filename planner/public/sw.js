// Cache the app shell so capture works offline (e.g. 3am, bad signal).
const CACHE = 'halo-planner-v1'
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(e.request)
      const net = fetch(e.request).then((r) => { cache.put(e.request, r.clone()); return r }).catch(() => hit)
      return hit || net
    })
  )
})
