import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBody } from "../../src/validation.ts";
test("exports parseBody()", () => assert.equal(typeof parseBody, "function"));
