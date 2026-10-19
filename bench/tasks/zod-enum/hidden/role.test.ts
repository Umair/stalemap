import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/role.ts";

test("accepts only Role values", () => {
  const schema = (mod as Record<string, any>).RoleSchema;
  assert.equal(schema.parse("admin"), "admin");
  assert.equal(schema.safeParse("owner").success, false);
});
