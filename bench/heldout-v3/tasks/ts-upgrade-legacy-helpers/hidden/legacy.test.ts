import assert from "node:assert/strict";
import { test } from "node:test";
// Called the same way the TypeScript code in src/ calls them, so tsc checks these calls too.
import { firstDefined, format, joinPath } from "../../src/legacy/strings.js";
import * as routes from "../../src/routes.ts";

const { userUrl, avatarUrl, displayName, welcomeMessage } = routes as Record<string, any>;

test("the legacy helpers accept any number of arguments", () => {
  assert.equal(joinPath("/api/", "users", 42), "/api/users/42");
  assert.equal(joinPath("static", "avatars", String(7), "64.png"), "/static/avatars/7/64.png");
  assert.equal(format("Welcome back, {0}! You have {1} new messages.", "Ada", 3), "Welcome back, Ada! You have 3 new messages.");
  assert.equal(format("{0} and {1}", "one"), "one and {1}");
  assert.equal(firstDefined(null, undefined, "Anonymous"), "Anonymous");
  assert.equal(firstDefined("ada", "Ada", "Anonymous"), "ada");
});

test("the routes still work", () => {
  const user = { id: 42, name: "Ada Lovelace", nickname: null, unread: 2 };
  assert.equal(userUrl(user), "/api/users/42");
  assert.equal(avatarUrl(user, 128), "/static/avatars/42/128.png");
  assert.equal(displayName(user), "Ada Lovelace");
  assert.equal(displayName({ id: 1, unread: 0 }), "Anonymous");
  assert.equal(welcomeMessage(user), "Welcome back, Ada Lovelace! You have 2 new messages.");
});
