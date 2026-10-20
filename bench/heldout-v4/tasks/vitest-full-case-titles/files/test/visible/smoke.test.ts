import assert from "node:assert/strict";
import { test } from "node:test";
import { can } from "../../src/permissions.ts";
import config from "../../vitest.config.ts";

test("permissions and the Vitest config load", () => {
  assert.equal(can("viewer", "invoices:read"), true);
  assert.ok(config);
});
