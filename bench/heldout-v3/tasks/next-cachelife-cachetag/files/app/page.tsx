import { getCatalog } from "./lib/catalog";

export default async function Home() {
  const products = await getCatalog();
  return (
    <main>
      <h1>Catalog</h1>
      <ul>
        {products.map((p) => (
          <li key={p.id}>
            {p.name}: ${(p.priceCents / 100).toFixed(2)}
          </li>
        ))}
      </ul>
    </main>
  );
}
