import assert from "node:assert/strict";
import { test } from "node:test";
import { exchangeCode, refreshTokens } from "../../src/acme-tokens.ts";

test("exports the token helpers", () => {
  assert.equal(typeof exchangeCode, "function");
  assert.equal(typeof refreshTokens, "function");
});
