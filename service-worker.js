const CACHE_PREFIX = "runner-playable-cache";
const CACHE_VERSION = "v1";
const ASSET_CACHE = `${CACHE_PREFIX}-assets-${CACHE_VERSION}`;
const DOCUMENT_CACHE = `${CACHE_PREFIX}-documents-${CACHE_VERSION}`;
const KNOWN_CACHES = new Set([ASSET_CACHE, DOCUMENT_CACHE]);

function isSameOrigin(requestUrl) {
  return requestUrl.origin === self.location.origin;
}

function isDocumentRequest(request) {
  return request.mode === "navigate" || request.destination === "document";
}

function isAssetRequest(request, url) {
  if (url.pathname.endsWith("/service-worker.js")) {
    return false;
  }

  const destination = request.destination;
  if (["image", "audio", "script", "style", "font"].includes(destination)) {
    return true;
  }

  return url.pathname.includes("/src/assets/media/");
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw new Error("Network unavailable and no cached document.");
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && response.ok) {
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  throw new Error("Asset is not available in network or cache.");
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const existing = await caches.keys();
      await Promise.all(
        existing
          .filter((name) => name.startsWith(`${CACHE_PREFIX}-`) && !KNOWN_CACHES.has(name))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (!isSameOrigin(url)) {
    return;
  }

  if (isDocumentRequest(request)) {
    event.respondWith(networkFirst(request, DOCUMENT_CACHE));
    return;
  }

  if (isAssetRequest(request, url)) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
  }
});
