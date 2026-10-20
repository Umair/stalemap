import assert from "node:assert/strict";
import { test } from "node:test";
import { useAppForm } from "../../src/useAppForm.ts";
import { notify } from "../../src/notify.ts";

test("exports the form hook", () => {
  assert.equal(typeof useAppForm, "function");
  assert.equal(typeof notify.error, "function");
});
