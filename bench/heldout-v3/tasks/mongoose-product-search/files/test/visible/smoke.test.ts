import assert from "node:assert/strict";
import { test } from "node:test";
import { searchProducts } from "../../src/search.ts";
test("exports searchProducts()", () => assert.equal(typeof searchProducts, "function"));
