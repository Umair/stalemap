export type Product = { id: string; name: string; priceCents: number };

const rows: Product[] = [
  { id: "lamp-01", name: "Brass desk lamp", priceCents: 8900 },
  { id: "chair-07", name: "Oak side chair", priceCents: 24900 },
  { id: "rug-03", name: "Wool rug", priceCents: 15900 },
];

/** Stand-in for the catalog database; every call is a (slow) query. */
export const db = {
  queries: 0,
  async allProducts(): Promise<Product[]> {
    db.queries++;
    await new Promise((resolve) => setTimeout(resolve, 20));
    return rows.map((row) => ({ ...row }));
  },
};
