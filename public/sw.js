/* ANC Tickets — service worker escrito a mano. Sube VERSION para invalidar cachés. */
const VERSION = "v1";
const STATIC_CACHE = `anc-static-${VERSION}`;
const PAGES_CACHE = `anc-pages-${VERSION}`;
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const pages = await caches.open(PAGES_CACHE);
        await pages.add(new Request(OFFLINE_URL, { cache: "reload" }));
      } catch {
        // sin /offline en caché: se responde un texto mínimo más abajo
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([STATIC_CACHE, PAGES_CACHE]);
      for (const key of await caches.keys()) {
        if (key.startsWith("anc-") && !keep.has(key)) await caches.delete(key);
      }
      await self.clients.claim();
    })()
  );
});

function cacheable(response) {
  return response && response.status === 200 && response.type === "basic";
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (cacheable(response)) cache.put(request, response.clone());
  return response;
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    const url = new URL(request.url);
    if (url.pathname === "/login" && response.status === 200) {
      // Al cerrar sesión se llega a /login: no dejar páginas privadas guardadas.
      for (const key of await cache.keys()) {
        if (new URL(key.url).pathname !== OFFLINE_URL) await cache.delete(key);
      }
    } else if (cacheable(response) && !response.redirected) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const hit = await cache.match(request);
    if (hit) return hit;
    const offline = await cache.match(OFFLINE_URL);
    return (
      offline ||
      new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
    );
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Nunca se cachea la API ni la autenticación.
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
  }
});
