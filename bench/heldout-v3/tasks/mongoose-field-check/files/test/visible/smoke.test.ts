import assert from "node:assert/strict";
import { test } from "node:test";
import { checkField } from "../../src/fieldCheck.ts";
test("exports checkField()", () => assert.equal(typeof checkField, "function"));
