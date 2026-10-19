import assert from "node:assert/strict";
import { test } from "node:test";
import config from "../../next.config.ts";
import { SESSION_COOKIE } from "../../src/lib/session.ts";
test("the app config and session cookie name are defined", () => {
  assert.ok(config);
  assert.equal(SESSION_COOKIE, "session");
});
