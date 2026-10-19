export interface Product {
  slug: string;
  category: string;
}

export const categories = ["lighting", "furniture", "textiles"];

const products: Product[] = [
  { slug: "arc-floor-lamp", category: "lighting" },
  { slug: "brass-desk-lamp", category: "lighting" },
  { slug: "oak-dining-table", category: "furniture" },
  { slug: "linen-armchair", category: "furniture" },
  { slug: "wool-throw", category: "textiles" },
];

export async function productsIn(category: string): Promise<Product[]> {
  return products.filter((p) => p.category === category);
}
