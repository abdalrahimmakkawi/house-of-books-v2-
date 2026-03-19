const CACHE_NAME = 'hob-v1'
const STATIC_CACHE = 'hob-static-v1'

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
]

// ── Install: precache static assets ──────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(PRECACHE_ASSETS.map(url => new Request(url, { cache: 'reload' })))
        .catch(err => console.warn('Precache failed for some assets:', err))
    }).then(() => self.skipWaiting())
  )
})

// ── Activate: clean up old caches ────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== STATIC_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── Fetch: network-first for API, cache-first for assets ─────────────────────
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET and cross-origin API calls (Supabase, DeepSeek, LemonSqueezy)
  if (request.method !== 'GET') return
  if (url.hostname.includes('supabase.co')) return
  if (url.hostname.includes('deepseek.com')) return
  if (url.hostname.includes('lemonsqueezy.com')) return
  if (url.hostname.includes('api.')) return

  // Cache-first for static assets (images, fonts, icons)
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf)$/) ||
    url.pathname.startsWith('/wallpaper/') ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached
        return fetch(request).then(response => {
          if (!response || response.status !== 200) return response
          const clone = response.clone()
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone))
          return response
        }).catch(() => cached)
      })
    )
    return
  }

  // Network-first for JS/CSS bundles (always get latest)
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(request).then(response => {
        if (!response || response.status !== 200) return response
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        return response
      }).catch(() => caches.match(request))
    )
    return
  }

  // Network-first for HTML — fall back to cached index for offline
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request).then(response => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone))
        return response
      }).catch(() => caches.match('/index.html'))
    )
    return
  }
})

// ── Background sync placeholder (future: sync notes/shelf when online) ────────
self.addEventListener('sync', event => {
  if (event.tag === 'sync-shelf') {
    // Future: push locally saved shelf/notes to Supabase when back online
    console.log('[SW] Background sync: shelf data')
  }
})

// ── Push notifications placeholder (future: daily quote notification) ─────────
self.addEventListener('push', event => {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title || 'House of Books', {
      body: data.body || 'Your daily book quote is ready.',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: 'daily-quote',
      renotify: false,
    })
  )
})
