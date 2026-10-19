import assert from "node:assert/strict";
import { test } from "node:test";
import config from "../../next.config.ts";
test("Cache Components is enabled the Next 16 way", () => {
  const c = config as Record<string, any>;
  assert.equal(c.cacheComponents, true, "top-level cacheComponents");
  assert.equal(c.images?.remotePatterns?.[0]?.hostname, "images.example.com");
});
