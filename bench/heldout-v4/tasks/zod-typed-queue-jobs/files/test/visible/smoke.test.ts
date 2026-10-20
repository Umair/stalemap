import assert from "node:assert/strict";
import { test } from "node:test";
import { defineJob } from "../../src/jobs.ts";
import { sendWelcomeEmail } from "../../src/emails.ts";

test("exports the job helper", () => {
  assert.equal(typeof defineJob, "function");
  assert.equal(typeof sendWelcomeEmail, "object");
});
