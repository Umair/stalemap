import assert from "node:assert/strict";
import { test } from "node:test";
import rootConfig from "../../vitest.config.ts";

test("the root Vitest config still lists the package projects", () => {
  assert.ok(Array.isArray((rootConfig as any).test?.projects));
});
