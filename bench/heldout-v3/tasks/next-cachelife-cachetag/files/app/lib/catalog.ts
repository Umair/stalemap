import { db, type Product } from "./db";

/** The full product catalog, used by the home page and the product pages. */
export async function getCatalog(): Promise<Product[]> {
  return db.allProducts();
}
