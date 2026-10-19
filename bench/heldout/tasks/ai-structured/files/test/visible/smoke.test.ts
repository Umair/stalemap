import assert from "node:assert/strict";
import { test } from "node:test";
import { extractPerson } from "../../src/extract.ts";
test("exports extractPerson()", () => assert.equal(typeof extractPerson, "function"));
