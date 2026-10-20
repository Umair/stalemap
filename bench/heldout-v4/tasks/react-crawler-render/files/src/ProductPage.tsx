import { Suspense, use } from "react";

export interface Product {
  name: string;
  description: string;
}

function Details({ product }: { product: Promise<Product> }) {
  const p = use(product);
  return (
    <article>
      <h1>{p.name}</h1>
      <p>{p.description}</p>
    </article>
  );
}

export function ProductPage({ product }: { product: Promise<Product> }) {
  return (
    <html>
      <head>
        <title>Shop</title>
      </head>
      <body>
        <nav>Shop</nav>
        <Suspense fallback={<p>Loading…</p>}>
          <Details product={product} />
        </Suspense>
      </body>
    </html>
  );
}
