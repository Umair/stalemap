import { listProducts } from "../src/lib/catalog";

export default async function Home() {
  const featured = await listProducts(0, 12);
  return (
    <main>
      <h1>Shop</h1>
      <ul>
        {featured.map((p) => (
          <li key={p.slug}>
            <a href={`/products/${p.slug}`}>{p.name}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
