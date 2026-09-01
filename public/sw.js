const CACHE = 'rotas-mundivox-v3'
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/app-icon.svg', '/branding/mundivox-brand.svg', '/branding/mundivox-brand-dark.svg']

async function cacheResponse(request, response) {
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(CACHE)
    await cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return

  if (event.request.destination === 'document' || event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => cacheResponse(event.request, response))
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => cacheResponse(event.request, response))),
  )
})
