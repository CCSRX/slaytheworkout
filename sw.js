// Slay the workout: offline service worker (v182).
// Cache-first for the app shell, so it opens with no signal. When online, each open also fetches
// the newest index.html in the background, so the next open has updates. Bump VERSION to force a refresh.
const VERSION = "slay-v196";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL.map(u => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

function refresh(cache, request, key) {
  return fetch(request, { cache: "no-store" }).then(response => {
    if (response && response.ok && response.type === "basic") cache.put(key, response.clone());
    return response;
  });
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/.deed/")) return;
  const isPage = request.mode === "navigate" || url.pathname === "/" || url.pathname.endsWith("/index.html");
  event.respondWith(caches.open(VERSION).then(async cache => {
    const key = isPage ? "./index.html" : request;
    const cached = await cache.match(key, { ignoreSearch: true });
    const network = refresh(cache, isPage ? "./index.html" : request, key).catch(() => null);
    if (cached) { event.waitUntil(network); return cached; }
    const fresh = await network;
    if (fresh) return fresh;
    const fallback = isPage ? await cache.match("./") : null;
    return fallback || Response.error();
  }));
});
