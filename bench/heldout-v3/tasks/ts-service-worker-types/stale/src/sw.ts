/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Service worker for the PWA. Built separately from the app (see package README).
import { CACHE_NAME, PRECACHE_URLS } from "./precache.ts";

const sw = self as unknown as ServiceWorkerGlobalScope;

sw.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => sw.skipWaiting()),
  );
});

sw.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => sw.clients.claim()),
  );
});

sw.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== sw.location.origin) return;
  event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
});

export {};
