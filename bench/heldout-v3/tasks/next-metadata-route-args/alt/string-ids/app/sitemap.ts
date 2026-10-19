import type { MetadataRoute } from "next";
import { countProducts, listProducts } from "../src/lib/catalog";

const SITE = "https://shop.example.com";
const CHUNK = 800;

export async function generateSitemaps(): Promise<Array<{ id: string }>> {
  const total = await countProducts();
  const ids: Array<{ id: string }> = [];
  for (let start = 0; start < total; start += CHUNK) ids.push({ id: `products-${start / CHUNK + 1}` });
  return ids;
}

export default function sitemap({ id }: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  return id.then(async (value) => {
    const chunk = Number(value.replace("products-", "")) - 1;
    const products = await listProducts(chunk * CHUNK, CHUNK);
    return products.map((product) => ({ url: `${SITE}/products/${product.slug}`, lastModified: product.updatedAt }));
  });
}
