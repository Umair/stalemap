"use cache";

import * as nextCache from "next/cache";
import { db, type Product } from "./db";

const CATALOG_TAG = "catalog";

/** The full product catalog, used by the home page and the product pages. */
export async function getCatalog(): Promise<Product[]> {
  nextCache.cacheTag(CATALOG_TAG);
  const products = await db.allProducts();
  nextCache.cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  return products;
}
