export interface Product {
  slug: string;
  name: string;
  updatedAt: Date;
}

// Stand-in for the product database.
const products: Product[] = Array.from({ length: 2345 }, (_, i) => ({
  slug: `item-${String(i + 1).padStart(4, "0")}`,
  name: `Item ${i + 1}`,
  updatedAt: new Date(Date.UTC(2026, 0, 1 + (i % 300))),
}));

export async function countProducts(): Promise<number> {
  return products.length;
}

/** Products in catalog order, starting at `offset`. */
export async function listProducts(offset: number, limit: number): Promise<Product[]> {
  return products.slice(offset, offset + limit);
}
