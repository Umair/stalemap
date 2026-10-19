import assert from "node:assert/strict";
import { test } from "node:test";
import { toChangeEvent } from "../../src/events.ts";
test("exports toChangeEvent()", () => assert.equal(typeof toChangeEvent, "function"));
