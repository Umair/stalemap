export interface Product {
  id: string;
  name: string;
  priceCents: number;
}

const baseUrl = () => process.env.API_URL ?? "http://localhost:4000";

export async function getProduct(id: string): Promise<Product> {
  const res = await fetch(`${baseUrl()}/products/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`GET /products/${id} failed with ${res.status}`);
  return (await res.json()) as Product;
}
