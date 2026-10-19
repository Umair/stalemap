import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
test("images load and are cached as on Next 15", async () => {
  // Resolve the config and validate image requests with Next's own code.
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_PRODUCTION_SERVER } = await load("next/dist/shared/lib/constants.js");
  const { ImageOptimizerCache } = await load("next/dist/server/image-optimizer.js");
  const config = await loadConfig(PHASE_PRODUCTION_SERVER, root, { silent: true });
  const request = (url: string, q: number): string | undefined =>
    ImageOptimizerCache.validateParams({ headers: { accept: "image/webp" } }, { url, w: "640", q: String(q) }, config, false).errorMessage;
  assert.equal(request("https://cdn.example.com/products/lamp.jpg", 90), undefined, "product photo at quality 90");
  assert.equal(request("https://cdn.example.com/people/ada.jpg", 75), undefined, "avatar at the default quality");
  assert.equal(config.images.minimumCacheTTL, 60, "optimized images expire after 60 seconds, as on Next 15");
});
