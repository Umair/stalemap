import type { MetadataRoute } from "next";
import { categories, productsIn } from "../src/catalog.ts";

export async function generateSitemaps(): Promise<Array<{ id: number }>> {
  return categories.map((_, id) => ({ id }));
}

const sitemap = async ({ id }: { id: Promise<number> }): Promise<MetadataRoute.Sitemap> => {
  const category = categories[Number(await id)];
  return (await productsIn(category)).map((p) => ({ url: `https://shop.example.com/products/${p.slug}`, lastModified: new Date() }));
};

export default sitemap;
