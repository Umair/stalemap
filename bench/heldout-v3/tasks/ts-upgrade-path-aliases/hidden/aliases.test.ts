import assert from "node:assert/strict";
import { test } from "node:test";
// The same import specifiers the code in src/ uses, resolved through tsconfig.json.
import { config } from "@config";
import { formatCents, sumCents } from "@lib/money";
import { totals } from "services/invoices";
import { renderInvoice } from "../../src/index.ts";

test("the aliased modules resolve and work", () => {
  assert.equal(sumCents([150, 250]), 400);
  assert.equal(formatCents(123456), "$1,234.56");
  assert.equal(typeof config.taxRate, "number");
  assert.deepEqual(totals([{ description: "Hosting", cents: 1000 }], 0.25), { subtotal: 1000, tax: 250, total: 1250 });
});

test("the invoice renders", () => {
  const text = renderInvoice([{ description: "Design", cents: 50000 }, { description: "Hosting", cents: 2500 }]);
  assert.match(text, /^Design: \$500\.00$/m);
  assert.match(text, /^Subtotal: \$525\.00$/m);
  assert.match(text, /^Total: \$630\.00$/m);
});
