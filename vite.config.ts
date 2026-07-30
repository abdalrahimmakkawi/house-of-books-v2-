import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// NO SERVICE WORKER PLUGIN HERE — this is deliberate, please read before adding one.
//
// vite-plugin-pwa used to generate a Workbox worker at /sw.js. Three separate
// times now, a caching worker has pinned installed apps to an old build with no
// user-facing way out: force-closing does nothing, and "clear cache" on the app
// does nothing either, because in an installed PWA the worker and its Cache
// Storage live in Chrome's data for the origin rather than under the app entry
// the user can clear. Uninstalling was the only cure users had.
//
// The last attempt (5654d50) kept the worker but stopped it precaching HTML.
// That fixed the staleness for devices that picked up the new worker, but it
// left the worker itself in place — so the whole class of bug was still one
// config mistake away, and devices already stuck stayed stuck.
//
// `public/sw.js` is now a hand-written self-destructing worker that wipes all
// caches, unregisters itself and reloads. Keeping the plugin out of this file is
// what stops the build from overwriting it. index.html no longer registers a
// worker at all.
//
// Trade-off accepted: no offline reading, and no `beforeinstallprompt` (Chrome
// wants a fetch handler for installability), so the in-app "Install" button will
// not fire. Reliability was worth more than either. If installability is needed
// again later, add a worker with a pass-through fetch handler and NO caching —
// never one that caches navigations.

// Stamped into the bundle at build time and shown in the account panel, so it
// is always possible to tell which build a given device is actually running.
// Diagnosing "the app is stuck / did my deploy reach my phone?" without this
// means guessing.
const BUILD_ID = new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC'

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    tailwindcss(),
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
