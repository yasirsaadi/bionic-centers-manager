/* Bionic Centers — service worker.
 *
 * Strategy:
 *
 *   App shell (HTML navigation):
 *     network-first, fall back to cached index.html, then offline page.
 *     Network-first means a deploy is picked up the next time the user
 *     opens the app online — no stale UI sticking around.
 *
 *   Static assets (JS / CSS / fonts / images):
 *     stale-while-revalidate. We hand the user the cached copy
 *     immediately for snappy load, then refresh the cache in the
 *     background. Vite hashes filenames so a new deploy is a brand-
 *     new URL anyway — no risk of serving an outdated bundle to a
 *     fresh HTML.
 *
 *   API requests (/api/*):
 *     never cached. The app needs live data; cached financial info
 *     would be dangerous.
 *
 * Cache versioning:
 *   The CACHE_VERSION constant must be bumped on every release.
 *   A bump triggers cleanup of every prior cache in `activate`.
 *
 * Install / activate:
 *   skipWaiting + clients.claim so the new SW takes over the moment
 *   it activates, instead of waiting for every tab to close.
 */

const CACHE_VERSION = "v3-2026-04-30";
const CACHE_NAME = `bionic-center-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/",
  OFFLINE_URL,
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/favicon.png",
];

// Install: cache the shell, then become the active SW immediately.
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate: remove caches from previous versions, claim all clients.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      // Enable navigation preload for snappier first paint.
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          /* old browsers — ignore */
        }
      }
      await self.clients.claim();
    })()
  );
});

// Helper: only cache responses we can re-serve. Skip opaque
// (cross-origin without CORS), partial (206), and errors.
function isCacheable(response) {
  return (
    response &&
    response.status === 200 &&
    (response.type === "basic" || response.type === "default")
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Never intercept API traffic — clinical data must stay live.
  if (url.pathname.startsWith("/api/")) return;

  // Navigation requests (top-level page loads): network-first with
  // navigation-preload, then cache, then offline page.
  if (event.request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Use the preload response if available — saves a round trip.
          const preload = await event.preloadResponse;
          if (preload) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, preload.clone()).catch(() => {});
            return preload;
          }
          const network = await fetch(event.request);
          if (isCacheable(network)) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, network.clone()).catch(() => {});
          }
          return network;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(event.request);
          return cached || (await cache.match(OFFLINE_URL));
        }
      })()
    );
    return;
  }

  // Same-origin static assets: stale-while-revalidate.
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(event.request);
        const networkPromise = fetch(event.request)
          .then((response) => {
            if (isCacheable(response)) {
              cache.put(event.request, response.clone()).catch(() => {});
            }
            return response;
          })
          .catch(() => null);
        return cached || (await networkPromise) || Response.error();
      })()
    );
    return;
  }

  // Cross-origin (e.g. Google Fonts): cache-first opportunistically.
  // Failure falls through to the network-error so the request fails
  // the same way it would without the SW.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      try {
        const network = await fetch(event.request);
        if (network && network.status === 200) {
          cache.put(event.request, network.clone()).catch(() => {});
        }
        return network;
      } catch {
        return Response.error();
      }
    })()
  );
});

// Listen for an explicit message from the client to bypass waiting.
// The client uses this when the user clicks "تحديث الآن" on the
// in-app update banner so we don't force a refresh on them.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
