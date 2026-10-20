import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

test("Next accepts next.config.ts and keeps the existing settings", async () => {
  // Resolve the config with Next's own loader, as next build and next dev do, and keep what it reports.
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_PRODUCTION_BUILD, PHASE_DEVELOPMENT_SERVER } = await load("next/dist/shared/lib/constants.js");
  const messages: string[] = [];
  const original = { warn: console.warn, error: console.error, log: console.log };
  for (const k of ["warn", "error", "log"] as const) console[k] = (...args: unknown[]) => void messages.push(args.map(String).join(" "));
  const configs: any[] = [];
  try {
    configs.push(await loadConfig(PHASE_PRODUCTION_BUILD, root, { silent: false }));
    configs.push(await loadConfig(PHASE_DEVELOPMENT_SERVER, root, { silent: false }));
  } finally {
    Object.assign(console, original);
  }
  const invalid = messages.filter((m) => /Invalid next\.config|Unrecognized key|not recognized|has been (?:removed|renamed)|deprecat/i.test(m));
  assert.deepEqual(invalid, [], "Next recognizes every option in next.config.ts");
  for (const config of configs) {
    assert.equal(config.reactStrictMode, true);
    assert.equal(config.typedRoutes, true);
    assert.equal(config.experimental.staleTimes?.dynamic, 30);
  }
});
