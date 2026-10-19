import { cacheLife, cacheTag } from "next/cache";
import { db, type Product } from "./db";

/** The full product catalog, used by the home page and the product pages. */
export async function getCatalog(): Promise<Product[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalog");
  return db.allProducts();
}
