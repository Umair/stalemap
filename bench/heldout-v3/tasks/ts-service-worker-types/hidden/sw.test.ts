import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
const ORIGIN = "https://app.example.com";

// A minimal service worker global scope: event listeners, CacheStorage and fetch.
type Listener = (event: any) => void;
const listeners = new Map<string, Listener[]>();
const stores = new Map<string, Map<string, Response>>();
const fetched: string[] = [];
const keyOf = (input: any): string => new URL(typeof input === "string" ? input : input.url, `${ORIGIN}/sw.js`).href;

class FakeCache {
  constructor(private entries: Map<string, Response>) {}
  async match(request: any) { return this.entries.get(keyOf(request))?.clone(); }
  async put(request: any, response: Response) { this.entries.set(keyOf(request), response.clone()); }
  async add(request: any) { await this.put(request, await (globalThis as any).fetch(keyOf(request))); }
  async addAll(requests: any[]) { for (const request of requests) await this.add(request); }
  async delete(request: any) { return this.entries.delete(keyOf(request)); }
  async keys() { return [...this.entries.keys()].map((url) => new Request(url)); }
}
const cacheStorage = {
  async open(name: string) {
    if (!stores.has(name)) stores.set(name, new Map());
    return new FakeCache(stores.get(name)!);
  },
  async has(name: string) { return stores.has(name); },
  async delete(name: string) { return stores.delete(name); },
  async keys() { return [...stores.keys()]; },
  async match(request: any) {
    for (const entries of stores.values()) {
      const hit = entries.get(keyOf(request));
      if (hit) return hit.clone();
    }
    return undefined;
  },
};
const scope: Record<string, unknown> = {
  addEventListener: (type: string, listener: Listener) => listeners.set(type, [...(listeners.get(type) ?? []), listener]),
  removeEventListener: () => {},
  caches: cacheStorage,
  location: new URL(`${ORIGIN}/sw.js`),
  registration: { scope: `${ORIGIN}/` },
  skipWaiting: async () => {},
  clients: { claim: async () => {}, matchAll: async () => [] },
  fetch: async (input: any) => {
    const url = keyOf(input);
    fetched.push(url);
    return new Response(`network ${new URL(url).pathname}`);
  },
};
Object.assign(globalThis, scope);
(globalThis as any).self = globalThis;

async function dispatch(type: string, extra: Record<string, unknown> = {}) {
  const waits: Promise<unknown>[] = [];
  let response: Promise<Response> | Response | undefined;
  const event = { type, waitUntil: (p: Promise<unknown>) => waits.push(Promise.resolve(p)), respondWith: (r: any) => { response = r; }, ...extra };
  const handler = (globalThis as any)[`on${type}`];
  for (const listener of [...(listeners.get(type) ?? []), ...(typeof handler === "function" ? [handler] : [])]) listener(event);
  await Promise.all(waits);
  return response === undefined ? undefined : await response;
}

test("the worker precaches, cleans up old caches and serves cache-first", async () => {
  const { CACHE_NAME, PRECACHE_URLS } = await load("../../src/precache.ts");
  stores.set("app-shell-2026-09-30", new Map([[`${ORIGIN}/`, new Response("old shell")]]));
  await load("../../src/sw.ts");
  for (const type of ["install", "activate", "fetch"]) assert.ok(listeners.get(type)?.length || typeof (globalThis as any)[`on${type}`] === "function", `no ${type} listener`);

  await dispatch("install");
  assert.deepEqual([...(stores.get(CACHE_NAME)?.keys() ?? [])].sort(), PRECACHE_URLS.map((u: string) => `${ORIGIN}${u}`).sort(), "precaches the app shell");

  await dispatch("activate");
  assert.deepEqual([...stores.keys()], [CACHE_NAME], "deletes caches from older versions");

  fetched.length = 0;
  const shell = await dispatch("fetch", { request: new Request(`${ORIGIN}/app.js`) });
  assert.equal(await shell?.text(), "network /app.js", "serves the precached copy");
  assert.deepEqual(fetched, [], "no network request for a cached file");

  const miss = await dispatch("fetch", { request: new Request(`${ORIGIN}/api/me`) });
  assert.equal(await miss?.text(), "network /api/me", "falls back to the network");

  assert.equal(await dispatch("fetch", { request: new Request(`${ORIGIN}/api/orders`, { method: "POST", body: "{}" }) }), undefined, "leaves POST requests alone");
  assert.equal(await dispatch("fetch", { request: new Request("https://cdn.other.com/lib.js") }), undefined, "leaves cross-origin requests alone");
});

test("tsc checks the worker against the service worker environment, without DOM globals", async () => {
  const dir = await mkdtemp(join(root, ".probe-"));
  try {
    // The project's own tsconfig.json and sources, plus one file that touches DOM-only globals.
    await writeFile(join(dir, "tsconfig.json"), JSON.stringify({ extends: "../tsconfig.json", compilerOptions: { noEmit: true }, files: ["probe.ts"] }));
    await writeFile(join(dir, "probe.ts"), "export const title: string = document.title;\nexport const href: string = window.location.href;\n");
    let output = "";
    try {
      await promisify(execFile)(join(root, "node_modules", ".bin", "tsc"), ["-p", join(dir, "tsconfig.json")], { cwd: root, timeout: 30_000 });
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string };
      output = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    }
    assert.match(output, /probe\.ts\(1,\d+\): error TS\d+: Cannot find name 'document'/, "document is not a known global");
    assert.match(output, /probe\.ts\(2,\d+\): error TS\d+: Cannot find name 'window'/, "window is not a known global");
    const others = output.split("\n").filter((line) => /error TS/.test(line) && !/probe\.ts/.test(line));
    assert.deepEqual(others, [], "the project itself has type errors");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
