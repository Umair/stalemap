import assert from "node:assert/strict";
import { test } from "node:test";
const load = (id: string): Promise<any> => import(id);
const { toProductDocs } = await load("../../src/import.ts");
const { Product } = await load("../../src/models/product.ts");

const rows = [
  { sku: " lmp-1 ", name: "Brass lamp", price: "49.90", stock: "12" },
  { sku: "chr-2", name: "Oak chair", price: "120" },
];

test("one Product document per row, cast by the schema, with defaults", () => {
  const docs = toProductDocs(rows);
  assert.equal(docs.length, 2);
  for (const doc of docs) assert.ok(doc instanceof Product, "a Product document");
  assert.equal(docs[0].sku, "LMP-1");
  assert.equal(docs[0].price, 49.9);
  assert.equal(docs[0].stock, 12);
  assert.equal(docs[1].stock, 0);
  assert.equal(docs[1].discontinued, false);
});

test("no _id is generated, so the upsert keeps existing ids", () => {
  for (const doc of toProductDocs(rows)) {
    assert.equal(doc._id, undefined);
    const plain = doc.toObject();
    assert.ok(!("_id" in plain), "the $set payload has no _id");
    assert.deepEqual(Object.keys(plain).sort(), ["discontinued", "name", "price", "sku", "stock"]);
  }
});

test("validate() reports rows the schema rejects", async () => {
  const [bad] = toProductDocs([{ sku: "x-9", name: "Broken", price: "-5" }]);
  await assert.rejects(bad.validate(), (err: any) => err?.errors?.price?.message === "Price can't be negative");
  const [missing] = toProductDocs([{ sku: "x-10", price: "5" }]);
  await assert.rejects(missing.validate(), (err: any) => Boolean(err?.errors?.name));
  for (const doc of toProductDocs(rows)) await doc.validate();
});

test("products created elsewhere still get an _id", () => {
  const doc = new Product({ sku: "new-1", name: "Desk", price: 300 });
  assert.ok(doc._id, "the Product schema still generates ids");
});
