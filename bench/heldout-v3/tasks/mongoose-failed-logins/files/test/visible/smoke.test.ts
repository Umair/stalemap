import assert from "node:assert/strict";
import { test } from "node:test";
import { checkLogin } from "../../src/auth.ts";
import { User } from "../../src/models/user.ts";
test("exports checkLogin() and the User model", () => {
  assert.equal(typeof checkLogin, "function");
  assert.equal(typeof User, "function");
});
