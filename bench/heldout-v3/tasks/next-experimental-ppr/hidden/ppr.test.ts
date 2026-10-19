import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
test("next.config.ts loads and enables Partial Prerendering", async () => {
  // Resolve the config with Next's own loader, as `next build` does.
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_PRODUCTION_BUILD } = await load("next/dist/shared/lib/constants.js");
  const config = await loadConfig(PHASE_PRODUCTION_BUILD, root, { silent: true });
  // next build turns Partial Prerendering on for app routes exactly when this is set.
  assert.equal(Boolean(config.cacheComponents), true, "Partial Prerendering is enabled for app routes");
  assert.equal(config.images.remotePatterns.length, 1, "the image settings are kept");
});
