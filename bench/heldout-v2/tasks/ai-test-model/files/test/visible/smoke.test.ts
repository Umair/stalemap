import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/testing.ts";
test("exports fakeModel()", () => assert.equal(typeof (mod as Record<string, unknown>).fakeModel, "function"));
