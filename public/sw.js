/* AIRAVAT service worker.
   Policy: never cache anything that carries account, order, quote or admin data. Only the static shell
   (/_next/static, /icons, fonts, the offline page) is cached. Navigations are network-first with an offline fallback. */
const VERSION = "airavat-sw-v1";
const SHELL = ["/offline.html", "/icons/icon-192.png", "/icons/icon-512.png", "/manifest.webmanifest"];
const NEVER_CACHE = [/^\/api\//, /^\/app(\/|$)/, /^\/admin(\/|$)/, /^\/auth\//, /^\/login/, /^\/signup/, /^\/markets\//, /^\/open-account/];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const sensitive = NEVER_CACHE.some((re) => re.test(url.pathname));
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }
  if (sensitive) return; // live data: straight to the network, never stored
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.endsWith(".woff2")) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; })));
  }
});
