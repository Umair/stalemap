import { Product, type ProductDocument } from "./models/product.ts";

/** One row of the supplier's CSV feed, keyed by column name (sku, name, price, stock). */
export type FeedRow = Record<string, string>;

/** Turns the supplier's feed rows into Product documents for the review screen and syncProducts(). */
export function toProductDocs(rows: FeedRow[]): ProductDocument[] {
  throw new Error("not implemented");
}
