/*
 * Savings Tracker service worker (T39, D24).
 *
 * Privacy rule: the cache only ever contains the public /offline page, its
 * hashed static assets, the manifest and PWA icons. Navigations are
 * network-first and never cached; /api/**, HTML/RSC and cross-origin requests
 * pass straight through to the network.
 *
 * Bump VERSION when the precache list or caching rules change.
 */
const VERSION = "v1";
const CACHE = `savings-tracker-${VERSION}`;
const CACHE_PREFIX = "savings-tracker-";

const PRECACHE = [
  "/offline",
  "/manifest.webmanifest",
  "/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);

      // Fetch the fallback once, store it, then cache the CSS/JS/font chunks
      // its HTML references so the offline page is styled without a network.
      const offline = await fetch("/offline", { cache: "reload" });
      if (!offline.ok) throw new Error("Could not precache /offline");
      await cache.put("/offline", offline.clone());

      const html = await offline.text();
      const assets = [
        ...new Set(
          [...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+)"/g)].map(
            (match) => match[1],
          ),
        ),
      ];

      await cache.addAll([
        ...PRECACHE.filter((url) => url !== "/offline"),
        ...assets,
      ]);
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

/**
 * Navigations: go to the network first. Never store HTML; when the network is
 * unavailable return the precached public fallback.
 */
async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE);
    const offline = await cache.match("/offline");

    // Redirect failed navigations so the address bar shows /offline. The
    // follow-up request for /offline is itself handled below and returns the
    // cached copy without looping.
    if (offline && new URL(request.url).pathname !== "/offline") {
      return Response.redirect("/offline", 302);
    }

    return (
      offline ||
      new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

/** Hashed Next.js assets, icons and the manifest: cache-first. */
async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Everything cross-origin is left to the browser.
  if (url.origin !== self.location.origin) return;

  // Financial/account APIs are never cached or intercepted.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/icon.svg"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Remaining HTML/RSC and other same-origin requests pass through untouched.
});
