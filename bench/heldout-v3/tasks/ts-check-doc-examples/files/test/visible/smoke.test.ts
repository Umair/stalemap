import assert from "node:assert/strict";
import { test } from "node:test";
import { checkExample } from "../../src/check-examples.ts";
test("exports checkExample()", () => assert.equal(typeof checkExample, "function"));
