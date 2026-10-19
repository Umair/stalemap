import assert from "node:assert/strict";
import { test } from "node:test";
import { renderInvoice } from "../../src/index.ts";
test("exports renderInvoice()", () => assert.equal(typeof renderInvoice, "function"));
