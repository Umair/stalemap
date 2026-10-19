import type { MetadataRoute } from "next";
import { countProducts, listProducts } from "../src/lib/catalog";

const SITE = "https://shop.example.com";
const PER_SITEMAP = 1000;

export async function generateSitemaps() {
  const pages = Math.ceil((await countProducts()) / PER_SITEMAP);
  return Array.from({ length: pages }, (_, id) => ({ id }));
}

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  const page = Number(await props.id);
  const products = await listProducts(page * PER_SITEMAP, PER_SITEMAP);
  return products.map((product) => ({
    url: `${SITE}/products/${product.slug}`,
    lastModified: product.updatedAt,
  }));
}
