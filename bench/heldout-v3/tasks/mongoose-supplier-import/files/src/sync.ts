import { Product, type ProductDocument } from "./models/product.ts";

/** Writes the reviewed feed: products already in the catalog (matched by SKU) are updated, new ones are inserted. */
export async function syncProducts(docs: ProductDocument[]): Promise<void> {
  if (docs.length === 0) return;
  await Product.bulkWrite(
    docs.map((doc) => ({
      updateOne: { filter: { sku: doc.sku }, update: { $set: doc.toObject() }, upsert: true },
    })),
  );
}
