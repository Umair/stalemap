/// <reference lib="webworker" />
// Service worker for the PWA. Built separately from the app (see package README).
import { CACHE_NAME, PRECACHE_URLS } from "./precache.ts";

const sw = self as unknown as ServiceWorkerGlobalScope;

async function precache(): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(PRECACHE_URLS);
}

async function dropOldCaches(): Promise<void> {
  for (const name of await caches.keys()) {
    if (name !== CACHE_NAME) await caches.delete(name);
  }
}

async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request);
  if (hit) return hit;
  return fetch(request);
}

sw.addEventListener("install", (event: ExtendableEvent) => event.waitUntil(precache()));
sw.addEventListener("activate", (event: ExtendableEvent) => event.waitUntil(dropOldCaches()));
sw.addEventListener("fetch", (event: FetchEvent) => {
  const url = new URL(event.request.url);
  if (event.request.method === "GET" && url.origin === sw.location.origin) event.respondWith(cacheFirst(event.request));
});
