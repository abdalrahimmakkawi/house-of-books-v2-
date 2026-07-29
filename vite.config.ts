import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Real service worker for repeat-visit speed + offline reading.
    // Design notes:
    //  - registerType 'autoUpdate' + skipWaiting + clientsClaim: new builds take
    //    over immediately, which is exactly what prevents the stale-shell bug
    //    that previously forced the app to ship a self-destructing worker.
    //  - HTML is NOT precached (no `html` in globPatterns) and is served by a
    //    NetworkFirst runtime route instead, so every open fetches the newest
    //    index.html — which points at the newest hashed JS.
    //
    //    Why not just `navigateFallback: null`? That was the previous attempt and
    //    it did NOT work. `navigateFallback` only controls the *NavigationRoute*;
    //    it does nothing to `precacheAndRoute()`. With `html` in globPatterns,
    //    index.html was precached, and Workbox's PrecacheRoute matched a
    //    navigation to `/` through its default `directoryIndex: 'index.html'` —
    //    so navigations were served from Cache Storage regardless. Measured on
    //    prod before this fix: GET `/` => transferSize 0, deliveryType
    //    "cache-storage"; GET `/?cachebust=1` (misses the precache route) =>
    //    transferSize 2935, from network. That stale shell is what pinned
    //    installed apps to an old build until the user reinstalled.
    //
    //    Keeping HTML out of the precache is the part that actually fixes it.
    //    Do not re-add `html` to globPatterns.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // we register manually in index.html for explicit control
      strategies: 'generateSW',
      useUniqueBundle: true,
      includeAssets: ['favicon.png', 'icon-192.png', 'icon-512.png', 'manifest.json'],
      manifest: false, // manifest.json is hand-authored in /public
      workbox: {
        // NOTE: `html` is deliberately absent — see the design note above.
        globPatterns: ['**/*.{js,css,svg,png,ico,woff,woff2}'],
        // Cap precache to keep install light; large media is runtime-cached on demand.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        // Kept null so no NavigationRoute is generated — the NetworkFirst route
        // below owns navigations. On its own this does NOT prevent stale HTML.
        navigateFallback: null,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          // HTML documents (the app shell + the static legal pages, all of which
          // are plain <a href> navigations): network first, so a cold open always
          // gets the newest build. The cached copy is only a fallback for offline
          // or a network slower than networkTimeoutSeconds.
          {
            urlPattern: ({ request, url }) =>
              request.mode === 'navigate' && !url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'hob-html',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [200] },
            },
          },
          // Hashed build assets: immutable, cache-first.
          {
            urlPattern: ({ url }) => url.origin === self.location.origin && /\/assets\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'hob-assets',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Ambient music + wallpapers (large, stable): cache-first.
          {
            urlPattern: ({ url, request }) =>
              url.origin === self.location.origin &&
              (url.pathname.startsWith('/music/') || url.pathname.startsWith('/wallpaper/')),
            handler: 'CacheFirst',
            options: {
              cacheName: 'hob-media',
              rangeRequests: true,
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Book covers + remote images (Supabase Storage / picsum): stale-while-revalidate.
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'hob-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    // Split stable third-party code into its own chunks so they cache
    // independently of app code and don't invalidate on every app change.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'motion': ['framer-motion'],
          'supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})
