// Self-destructing service worker. DO NOT replace this with a caching worker.
//
// History — this app has now shipped a caching service worker three times and
// every time it has bricked installed apps until users uninstalled/reinstalled:
//   8af5929  remove PWA completely
//   04395f3  replace sw.js with a self-destructing worker   <- this file
//   7bb2f14  "performance overhaul" re-added a Workbox worker (bug returns)
//   5654d50  stopped it precaching HTML (mitigation, worker still alive)
//   THIS     kill the worker outright
//
// The failure mode: a worker that caches the HTML shell pins the device to an
// old build. Force-closing does not help, and neither does "clear cache" on the
// app — in an installed PWA the worker and its Cache Storage belong to Chrome's
// data for the origin, not to the app entry the user can clear. Uninstalling is
// the only user-facing action that clears it, which is why reinstalling looked
// like the cure.
//
// How this file un-bricks a device: a browser holding the old worker refetches
// this script on its update check (Vercel serves it `max-age=0,
// must-revalidate`, so the check is never stale), installs it, and then this
// worker deletes every cache, unregisters itself, and reloads open windows —
// after which the app is served straight from the network, forever.
//
// The app no longer registers a service worker at all (see index.html), so once
// a device has run this it will never get another one. Keep this file served at
// /sw.js indefinitely: it is the only thing that can reach devices that still
// have the old worker installed. Deleting it would strand them.

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
