import assert from "node:assert/strict";
import { test } from "node:test";
import { displayName, userUrl, welcomeMessage } from "../../src/routes.ts";
test("exports the route helpers", () => {
  assert.equal(typeof userUrl, "function");
  assert.equal(typeof displayName, "function");
  assert.equal(typeof welcomeMessage, "function");
});
