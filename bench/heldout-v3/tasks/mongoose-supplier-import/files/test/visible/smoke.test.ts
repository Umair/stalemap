import assert from "node:assert/strict";
import { test } from "node:test";
import { toProductDocs } from "../../src/import.ts";
test("exports toProductDocs()", () => assert.equal(typeof toProductDocs, "function"));
