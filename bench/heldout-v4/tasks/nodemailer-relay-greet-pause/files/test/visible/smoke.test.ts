import assert from "node:assert/strict";
import { test } from "node:test";
import { createMailer, sendAlert } from "../../src/mailer.ts";
test("exports the mailer helpers", () => {
  assert.equal(typeof createMailer, "function");
  assert.equal(typeof sendAlert, "function");
});
