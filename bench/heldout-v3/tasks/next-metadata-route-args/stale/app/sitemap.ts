import type { MetadataRoute } from "next";
import { countProducts, listProducts } from "../src/lib/catalog";

const SITE = "https://shop.example.com";
const PER_SITEMAP = 1000;

export async function generateSitemaps() {
  const pages = Math.ceil((await countProducts()) / PER_SITEMAP);
  return Array.from({ length: pages }, (_, id) => ({ id }));
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const products = await listProducts(id * PER_SITEMAP, PER_SITEMAP);
  return products.map((product) => ({
    url: `${SITE}/products/${product.slug}`,
    lastModified: product.updatedAt,
  }));
}
