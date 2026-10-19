import { Product, type ProductDocument } from "./models/product.ts";

/** One row of the supplier's CSV feed, keyed by column name (sku, name, price, stock). */
export type FeedRow = Record<string, string>;

/** Turns the supplier's feed rows into Product documents for the review screen and syncProducts(). */
export function toProductDocs(rows: FeedRow[]): ProductDocument[] {
  // No generated _id: the upsert in syncProducts() must not overwrite the ids of existing products.
  return rows.map((row) => new Product(row, null, { skipId: true }));
}
