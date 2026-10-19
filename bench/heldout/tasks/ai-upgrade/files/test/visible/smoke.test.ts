import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/assistant.ts";
test("exports assist()", () => assert.equal(typeof (mod as Record<string, unknown>).assist, "function"));
