/* PWA service worker for TeacherDesk.
 * Strategy:
 *  - App shell (HTML) and static assets: stale-while-revalidate.
 *  - Never cache Convex API traffic or POST requests.
 * Server-side persistence always wins; offline shows the shell.
 */
const CACHE = "teacherdesk-v1";
const SHELL = ["/", "/index.html", "/manifest.webmanifest", "/logo.svg", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Never cache backend traffic or cross-origin requests.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/.well-known")) return;

  // Static assets: stale-while-revalidate.
  const isAsset =
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/logo.svg" ||
    url.pathname.startsWith("/icons/");

  if (isAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetching = fetch(req)
          .then((res) => {
            if (res && res.status === 200) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetching;
      }),
    );
    return;
  }

  // App shell: network first with cache fallback for reload resilience.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((c) => c || caches.match("/index.html"))),
  );
});
