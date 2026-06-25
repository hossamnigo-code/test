// HB Bank — Service Worker (cache-first for static assets, network-first for API)
const CACHE_NAME = "hbbank-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/login.html",
  "/dashboard.html",
  "/manifest.json",
  "/config.js",
  "/assets/css/styles.css",
  "/assets/js/supabase.js",
  "/assets/js/i18n.js",
  "/assets/js/auth.js",
  "/assets/js/marketing.js",
  "/assets/js/login.js",
  "/assets/js/dashboard.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png"
];

// Install: pre-cache all static assets
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Activate: delete stale caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for same-origin static, network-only for Supabase/CDN
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Pass through non-GET, Supabase API calls, and CDN requests to the network
  if (
    request.method !== "GET" ||
    url.hostname.endsWith("supabase.co") ||
    url.hostname.endsWith("jsdelivr.net") ||
    url.hostname.endsWith("googleapis.com") ||
    url.hostname.endsWith("gstatic.com")
  ) {
    return;
  }

  // Cache-first for same-origin assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
  }
});
