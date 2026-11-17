/* ============================================================
   NoxBuddy — Service Worker (sw.js)
   Enables offline study desk access & native Add to Home Screen PWA
   ============================================================ */

const CACHE_NAME = "noxbuddy-v2";

const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./home.html",
  "./auth.html",
  "./style.css",
  "./home.css",
  "./auth.css",
  "./pwa-install.css",
  "./home.js",
  "./auth.js",
  "./pwa-install.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
  "./icons/icon.svg",
  "./pawmo/timer.html",
  "./pawmo/timer.css",
  "./pawmo/timer.js",
  "./planr/planner.html",
  "./planr/planner.css",
  "./planr/planner.js",
  "./pebble/journal.html",
  "./pebble/journal.css",
  "./pebble/journal.js",
  "./pixel/noxi.html",
  "./pixel/noxi.css",
  "./pixel/noxi.js"
];

/* Install: precache app shell */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn("Some precache assets could not be loaded:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

/* Activate: clean up outdated caches */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/* Fetch: Network-first for dynamic navigation, Cache-first fallback */
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests; skip non-HTTP or POST (e.g. Pixel AI chat)
  if (req.method !== "GET" || !req.url.startsWith("http")) {
    return;
  }

  // Skip external APIs (Gemini, Firebase auth tokens)
  if (req.url.includes("googleapis.com") || req.url.includes("127.0.0.1:5000") || req.url.includes("/chat")) {
    return;
  }

  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // If valid response, update cache in background
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network is offline
        return caches.match(req).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If HTML page failed offline, fallback to home.html or index.html
          if (req.headers.get("accept") && req.headers.get("accept").includes("text/html")) {
            return caches.match("./home.html").then((home) => home || caches.match("./index.html"));
          }
        });
      })
  );
});
