import type { MetadataRoute } from "next";
import { countProducts, listProducts } from "../src/lib/catalog";

const SITE = "https://shop.example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listProducts(0, await countProducts());
  return products.map((product) => ({
    url: `${SITE}/products/${product.slug}`,
    lastModified: product.updatedAt,
  }));
}
