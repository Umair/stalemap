import type { MetadataRoute } from "next";
import { categories, productsIn } from "../src/catalog.ts";

export async function generateSitemaps() {
  return categories.map((id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const category = await props.id;
  return (await productsIn(category)).map((p) => ({ url: `https://shop.example.com/products/${p.slug}` }));
}
