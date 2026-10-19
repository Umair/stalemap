import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
import * as mod from "../../src/errors.ts";

test("groups messages by field", () => {
  const fieldErrors = (mod as Record<string, any>).fieldErrors;
  const r = z.object({ name: z.string().min(2, "Too short"), email: z.string() }).safeParse({ name: "a", email: 1 });
  assert.equal(r.success, false);
  const out = fieldErrors(r.error);
  assert.deepEqual(out.name, ["Too short"]);
  assert.equal(out.email.length, 1);
});
