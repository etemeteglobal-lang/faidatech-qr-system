const CACHE_NAME = "faidatech-public-services-v2";
const SERVICE_API = /\/api\/public-services\/[^/]+\/[^/]+$/;
const SERVICE_PAGE = /\/s\/[^/]+\/[^/]+$/;
const MAX_OFFLINE_TTL_SECONDS = 300;

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith("faidatech-public-services-") && name !== CACHE_NAME).map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || (!SERVICE_API.test(url.pathname) && !SERVICE_PAGE.test(url.pathname))) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.status === 404) await cache.delete(request);
      const cacheControl = response.headers.get("Cache-Control") ?? "";
      const ttlMatch = cacheControl.match(/(?:^|,)\s*s-maxage=(\d+)/i);
      const ttlSeconds = ttlMatch ? Math.min(MAX_OFFLINE_TTL_SECONDS, Number(ttlMatch[1])) : 0;
      if (response.ok && cacheControl.includes("public") && ttlSeconds > 0) {
        const headers = new Headers(response.headers);
        headers.set("X-Faidatech-Cached-At", String(Date.now()));
        headers.set("X-Faidatech-Cache-Ttl", String(ttlSeconds));
        const body = await response.clone().blob();
        await cache.put(request, new Response(body, { status: response.status, statusText: response.statusText, headers }));
      }
      return response;
    } catch {
      const cached = await cache.match(request);
      if (cached) {
        const cachedAt = Number(cached.headers.get("X-Faidatech-Cached-At"));
        const ttlSeconds = Math.min(MAX_OFFLINE_TTL_SECONDS, Number(cached.headers.get("X-Faidatech-Cache-Ttl")) || 0);
        if (cachedAt > 0 && ttlSeconds > 0 && Date.now() - cachedAt <= ttlSeconds * 1000) return cached;
        await cache.delete(request);
      }
      const isApi = SERVICE_API.test(url.pathname);
      return new Response(isApi ? JSON.stringify({ error: { code: "offline_unavailable", message: "This public service is not cached or its offline copy has expired." } }) : "This public service is not cached or its offline copy has expired.", {
        status: 503,
        headers: { "Content-Type": isApi ? "application/json" : "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }
  })());
});
