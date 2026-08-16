/*
 * Service worker for the Nava PWA.
 *
 * Strategy: network-first with a cache fallback, so the app shell — HTML, JS,
 * CSS, fonts, icons — keeps working offline while online users always get fresh
 * content.
 *
 * Two things are deliberately never cached:
 *
 * 1. Anything from another origin, which in practice means the API. Responses
 *    from `/api/auth/me/` carry the signed-in user's name, email and role;
 *    storing those in Cache Storage leaves them readable on the device after
 *    the user logs out, and readable by whoever signs in next. Account data is
 *    fetched fresh or not at all.
 * 2. Unsuccessful responses. Caching a 401 or a 500 means replaying that
 *    failure offline long after the real cause is gone.
 *
 * Navigations fall back to a cached page when the network is unavailable, and
 * to the last-known app shell for a route that was never visited — otherwise
 * the browser shows its own "no internet" error instead of the app.
 */
const CACHE = "nava-v2";

// The route cached as a last-resort shell for offline navigations.
const SHELL = "/login";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(SHELL))
      .catch(() => {}) // a failed pre-cache must not block activation
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Only same-origin GETs belong in the cache — see the note above. */
function isCacheable(request) {
  return (
    request.method === "GET" &&
    new URL(request.url).origin === self.location.origin
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isCacheable(request)) return; // let the network handle it, uncached

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Store only what is worth replaying: a real, successful response.
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put(request, copy))
            .catch(() => {});
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        // An unvisited route while offline: show the app shell rather than the
        // browser's network-error page.
        if (request.mode === "navigate") {
          const shell = await caches.match(SHELL);
          if (shell) return shell;
        }

        return Response.error();
      }),
  );
});
