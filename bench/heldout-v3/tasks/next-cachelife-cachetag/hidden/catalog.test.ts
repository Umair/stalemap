import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
const req = createRequire(join(root, "package.json"));

test("the catalog is cached with the hours profile under the catalog tag, without deprecated APIs", async () => {
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_PRODUCTION_BUILD } = await load("next/dist/shared/lib/constants.js");
  const config = await loadConfig(PHASE_PRODUCTION_BUILD, root, { silent: true });
  // Next compiles this flag in from the config (build/define-env.js); it gates the "use cache" APIs.
  if (config.experimental.useCache) process.env.__NEXT_USE_CACHE = "true";
  // Next's server entry installs AsyncLocalStorage as a global before any request scope is used.
  req("next/dist/server/node-environment-baseline.js");
  const { workAsyncStorage } = req("next/dist/server/app-render/work-async-storage.external.js");
  const { workUnitAsyncStorage } = req("next/dist/server/app-render/work-unit-async-storage.external.js");
  const messages: string[] = [];
  const original = { warn: console.warn, error: console.error, log: console.log };
  for (const k of ["warn", "error", "log"] as const) console[k] = (...args: unknown[]) => void messages.push(args.map(String).join(" "));
  // Run getCatalog() the way the compiled "use cache" wrapper does: inside a cache scope of an App Router render.
  const workStore = { route: "/", page: "/page", cacheLifeProfiles: config.cacheLife };
  const cacheScope: Record<string, any> = { type: "cache", phase: "render", tags: null, explicitRevalidate: undefined, explicitExpire: undefined, explicitStale: undefined };
  let products: any;
  try {
    const { getCatalog } = await load("../../app/lib/catalog.ts");
    products = await workAsyncStorage.run(workStore, () => workUnitAsyncStorage.run(cacheScope, () => getCatalog()));
  } finally {
    Object.assign(console, original);
  }
  assert.deepEqual(messages.filter((m) => /unstable_|stabilized|deprecat/i.test(m)), [], "Next logs no deprecation errors");
  assert.equal(products.length, 3, "returns the catalog");
  assert.ok((cacheScope.tags ?? []).includes("catalog"), `tagged "catalog" (tags: ${JSON.stringify(cacheScope.tags)})`);
  const hours = config.cacheLife.hours;
  assert.equal(cacheScope.explicitRevalidate, hours.revalidate, "revalidates like the hours profile");
  assert.equal(cacheScope.explicitExpire, hours.expire, "expires like the hours profile");
  assert.equal(cacheScope.explicitStale ?? hours.stale, hours.stale, "stale time of the hours profile");
});
