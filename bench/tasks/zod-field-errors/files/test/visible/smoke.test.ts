import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/errors.ts";
test("exports fieldErrors()", () => assert.equal(typeof (mod as Record<string, unknown>).fieldErrors, "function"));
