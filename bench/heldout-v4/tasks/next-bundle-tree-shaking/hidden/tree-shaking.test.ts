import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

test("Turbopack's module-splitting tree shaking is on, with the existing settings kept", async () => {
  // Resolve the config with Next's own loader, as next build and next dev do, and keep what it reports.
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_PRODUCTION_BUILD, PHASE_DEVELOPMENT_SERVER } = await load("next/dist/shared/lib/constants.js");
  const messages: string[] = [];
  const original = { warn: console.warn, error: console.error, log: console.log };
  for (const k of ["warn", "error", "log"] as const) console[k] = (...args: unknown[]) => void messages.push(args.map(String).join(" "));
  let build: any;
  let dev: any;
  try {
    build = await loadConfig(PHASE_PRODUCTION_BUILD, root, { silent: false });
    dev = await loadConfig(PHASE_DEVELOPMENT_SERVER, root, { silent: false });
  } finally {
    Object.assign(console, original);
  }
  const invalid = messages.filter((m) => /Invalid next\.config|Unrecognized key|not recognized|has been renamed|deprecat/i.test(m));
  assert.deepEqual(invalid, [], "Next recognizes every option in next.config.ts");
  for (const config of [build, dev]) {
    // The experimental flag that splits modules into fragments so chunks only import what they use
    // (named turbopackTreeShaking before Next 16.3).
    const flag = config.experimental.turbopackModuleFragments ?? config.experimental.turbopackTreeShaking;
    assert.equal(flag, true, "Turbopack's module-splitting tree shaking is enabled");
    assert.equal(config.reactStrictMode, true);
    assert.equal(config.poweredByHeader, false);
    assert.deepEqual(config.images.formats, ["image/avif", "image/webp"]);
  }
});
