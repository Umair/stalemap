import assert from "node:assert/strict";
import { test } from "node:test";
import { getCatalog } from "../../app/lib/catalog.ts";
test("exports getCatalog()", () => assert.equal(typeof getCatalog, "function"));
