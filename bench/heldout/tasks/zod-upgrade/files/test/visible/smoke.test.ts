import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/validation.ts";
test("exports userErrors()", () => assert.equal(typeof (mod as Record<string, unknown>).userErrors, "function"));
