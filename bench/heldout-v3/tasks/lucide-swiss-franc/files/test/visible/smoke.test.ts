import assert from "node:assert/strict";
import { test } from "node:test";
import { currencyIcon } from "../../src/currency.tsx";
import { PriceTag } from "../../src/PriceTag.tsx";
test("exports currencyIcon() and PriceTag", () => {
  assert.equal(typeof currencyIcon, "function");
  assert.equal(typeof PriceTag, "function");
});
