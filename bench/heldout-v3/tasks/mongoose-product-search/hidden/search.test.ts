import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
const load = (id: string): Promise<any> => import(id);
const { searchProducts } = await load("../../src/search.ts");
const siftModule = await load("sift");
const sift: (filter: object) => (doc: object) => boolean = siftModule.default?.default ?? siftModule.default ?? siftModule;

const catalog = [
  { name: "Brass desk lamp", category: "lamps", price: 89, inStock: true, rating: 4.6 },
  { name: "Paper lantern", category: "lamps", price: 19.5, inStock: true, rating: 3.9 },
  { name: "Arc floor lamp", category: "lamps", price: 240, inStock: false, rating: 4.8 },
  { name: "Reading lamp", category: "lamps", price: 100, inStock: false, rating: 4.1 },
  { name: "Oak side table", category: "tables", price: 150, inStock: true, rating: 4.4 },
  { name: "Folding table", category: "tables", price: 45, inStock: true },
];

/** Runs the query's filter, cast by mongoose against the Product schema, over the catalog. */
function run(params: Record<string, string>): string[] {
  const query = searchProducts(params);
  assert.ok(query instanceof mongoose.Query, "returns a query");
  assert.equal(query.model.modelName, "Product");
  query.cast();
  return catalog.filter(sift(query.getFilter())).map((p) => p.name);
}

test("no params match every product", () => {
  assert.deepEqual(run({}), catalog.map((p) => p.name));
  assert.deepEqual(run({ category: "", minPrice: "" }), catalog.map((p) => p.name));
});

test("category and an inclusive price range", () => {
  assert.deepEqual(run({ category: "lamps", minPrice: "19.5", maxPrice: "100" }), ["Brass desk lamp", "Paper lantern", "Reading lamp"]);
  assert.deepEqual(run({ maxPrice: "50" }), ["Paper lantern", "Folding table"]);
  assert.deepEqual(run({ minPrice: "150" }), ["Arc floor lamp", "Oak side table"]);
});

test("stock and rating", () => {
  assert.deepEqual(run({ inStock: "false" }), ["Arc floor lamp", "Reading lamp"]);
  assert.deepEqual(run({ inStock: "true", minRating: "4.4" }), ["Brass desk lamp", "Oak side table"]);
  assert.deepEqual(run({ category: "lamps", inStock: "true", minPrice: "20" }), ["Brass desk lamp"]);
});
