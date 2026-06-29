// Simple offline-first service worker for InventurManager
const CACHE = 'inventur-manager-v1'
const CORE = ['/', '/index.html', '/manifest.json', '/icon.svg', '/icon-192.png', '/icon-512.png']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  e.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(request, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || network
    })
  )
})
