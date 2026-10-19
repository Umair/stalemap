// Bump CACHE_VERSION on every release so clients drop the old app shell.
export const CACHE_VERSION = "2026-10-14";

export const CACHE_NAME = `app-shell-${CACHE_VERSION}`;

export const PRECACHE_URLS = ["/", "/index.html", "/app.js", "/styles.css", "/offline.html"];
