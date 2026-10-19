export async function StockCount({ sku }: { sku: string }) {
  const res = await fetch(`https://inventory.example.com/stock/${sku}`, { cache: "no-store" });
  const { available } = (await res.json()) as { available: number };
  return <p>{available > 0 ? `${available} in stock` : "Out of stock"}</p>;
}
