/* SoulMate service worker — offline shell + static asset cache.
 *
 * Strategy
 *  - navigations: network first, fall back to the cached app shell so the app
 *    still opens offline (data comes from Supabase and simply stays stale).
 *  - same-origin assets (JS/CSS/icons/fonts): stale-while-revalidate.
 *  - Supabase / Google API calls: never cached — always live.
 */

const VERSION = 'soulmate-v1'
const SHELL = `${VERSION}-shell`
const ASSETS = `${VERSION}-assets`
const SHELL_URL = '/index.html'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(['/', SHELL_URL, '/manifest.webmanifest', '/icon-192.png']))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  // live data — always hit the network
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('googleapis.com')) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(SHELL).then((cache) => cache.put(SHELL_URL, copy)).catch(() => { })
          return res
        })
        .catch(() => caches.match(SHELL_URL).then((hit) => hit || caches.match('/'))),
    )
    return
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const cached = await cache.match(request)
        const network = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone()).catch(() => { })
            return res
          })
          .catch(() => cached)
        return cached || network
      }),
    )
  }
})
