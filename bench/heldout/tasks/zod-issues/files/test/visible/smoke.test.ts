import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/format.ts";
test("exports formatError()", () => assert.equal(typeof (mod as Record<string, unknown>).formatError, "function"));
