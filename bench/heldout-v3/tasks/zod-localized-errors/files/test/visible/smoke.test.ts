import assert from "node:assert/strict";
import { test } from "node:test";
import { safeParseLocalized } from "../../src/validate.ts";
import { signupHandler } from "../../src/routes.ts";
test("exports safeParseLocalized() and signupHandler()", () => {
  assert.equal(typeof safeParseLocalized, "function");
  assert.equal(typeof signupHandler, "function");
});
