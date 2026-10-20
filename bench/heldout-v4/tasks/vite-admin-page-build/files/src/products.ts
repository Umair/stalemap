export interface Product {
  sku: string;
  name: string;
  priceCents: number;
}

export const products: Product[] = [
  { sku: "MUG-01", name: "Enamel mug", priceCents: 1450 },
  { sku: "TOTE-02", name: "Canvas tote", priceCents: 2200 },
];

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
}
