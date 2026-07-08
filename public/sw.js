// Self-destructing service worker.
//
// The old PWA service worker aggressively cached index.html, which pinned
// browsers to a stale build. This replacement clears every cache, unregisters
// itself, and reloads open tabs. When a browser with the old worker runs its
// periodic update check it fetches THIS script, installs it, and self-destructs.
// No new service worker is registered by the app anymore.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys()
      await Promise.all(keys.map(key => caches.delete(key)))
      await self.registration.unregister()
      const clients = await self.clients.matchAll({ type: 'window' })
      clients.forEach(client => client.navigate(client.url))
    } catch (err) {
      // Best-effort cleanup; nothing else to do if it fails.
    }
  })())
})
