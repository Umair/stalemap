import assert from "node:assert/strict";
import { test } from "node:test";
import { ProductDetails } from "../../src/ProductDetails.tsx";
import { ProductPage } from "../../src/ProductPage.tsx";
import { createQueryClient } from "../../src/queryClient.ts";

test("exports ProductDetails, ProductPage and createQueryClient()", () => {
  assert.equal(typeof ProductDetails, "function");
  assert.equal(typeof ProductPage, "function");
  assert.equal(typeof createQueryClient, "function");
});
