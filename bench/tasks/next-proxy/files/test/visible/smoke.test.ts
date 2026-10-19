import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
test("has a request interception file at the root", () => {
  const root = new URL("../../", import.meta.url);
  assert.ok(["proxy.ts", "middleware.ts"].some((f) => existsSync(new URL(f, root))));
});
