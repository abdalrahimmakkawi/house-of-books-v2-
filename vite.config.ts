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
    //  - navigateFallback is DISABLED online (NetworkOnly). The HTML shell is
    //    only used as an offline fallback, so online users always get the latest
    //    index.html and never a stuck stale build.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false, // we register manually in index.html for explicit control
      strategies: 'generateSW',
      useUniqueBundle: true,
      includeAssets: ['favicon.png', 'icon-192.png', 'icon-512.png', 'manifest.json'],
      manifest: false, // manifest.json is hand-authored in /public
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // Cap precache to keep install light; large media is runtime-cached on demand.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: null, // never serve stale HTML online (root cause of old bug)
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
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
