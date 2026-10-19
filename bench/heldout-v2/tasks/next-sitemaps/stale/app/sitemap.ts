import type { MetadataRoute } from "next";
import { categories, productsIn } from "../src/catalog.ts";

export async function generateSitemaps() {
  return categories.map((id) => ({ id }));
}

export default async function sitemap({ id }: { id: string }): Promise<MetadataRoute.Sitemap> {
  return (await productsIn(id)).map((p) => ({ url: `https://shop.example.com/products/${p.slug}` }));
}
