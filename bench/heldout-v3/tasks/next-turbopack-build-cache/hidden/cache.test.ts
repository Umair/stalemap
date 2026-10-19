import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
test("Turbopack's on-disk cache is off for next build and on for next dev", async () => {
  // As on the build servers.
  process.env.CI ??= "1";
  // Resolve the config with Next's own loader, as `next dev` and `next build` do (fatal config errors throw).
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } = await load("next/dist/shared/lib/constants.js");
  const build = await loadConfig(PHASE_PRODUCTION_BUILD, root, { silent: false });
  assert.equal(build.experimental.turbopackFileSystemCacheForBuild, false, "next build doesn't use the on-disk cache");
  assert.equal(build.output, "standalone", "the existing settings are kept");
  const dev = await loadConfig(PHASE_DEVELOPMENT_SERVER, root, { silent: false });
  assert.equal(dev.experimental.turbopackFileSystemCacheForDev, true, "next dev keeps the on-disk cache");
});
