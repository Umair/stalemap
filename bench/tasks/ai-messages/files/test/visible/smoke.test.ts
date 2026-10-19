import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/messages.ts";
test("exports toModelMessages()", () => assert.equal(typeof (mod as Record<string, unknown>).toModelMessages, "function"));
