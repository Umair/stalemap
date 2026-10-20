import assert from "node:assert/strict";
import { test } from "node:test";
import { auth } from "../../src/auth.ts";
import { outbox, sendMail } from "../../src/mailer.ts";

test("exports the auth instance and mailer", () => {
  assert.equal(typeof auth.handler, "function");
  assert.equal(typeof sendMail, "function");
  assert.ok(Array.isArray(outbox));
});
