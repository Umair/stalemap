import { Product, type ProductDocument } from "./models/product.ts";

/** One row of the supplier's CSV feed, keyed by column name (sku, name, price, stock). */
export type FeedRow = Record<string, string>;

/** Turns the supplier's feed rows into Product documents for the review screen and syncProducts(). */
export function toProductDocs(rows: FeedRow[]): ProductDocument[] {
  const docs: ProductDocument[] = [];
  for (const row of rows) {
    // Excluding _id from the document's fields means mongoose never fills it in.
    docs.push(new Product(row, { _id: 0 }));
  }
  return docs;
}
