import assert from "node:assert/strict";
import { test } from "node:test";
import { accountRow } from "../../src/accountsTable.ts";
import { cardPaymentsBadge } from "../../src/connectedAccounts.ts";
test("exports cardPaymentsBadge() and accountRow()", () => {
  assert.equal(typeof cardPaymentsBadge, "function");
  assert.equal(typeof accountRow, "function");
});
