import assert from "node:assert/strict";
import { test } from "node:test";
import * as mod from "../../src/safe-add.ts";
test("exports safeAdd", () => assert.equal(typeof (mod as Record<string, unknown>).safeAdd, "function"));
