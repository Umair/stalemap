import { useSuspenseQuery } from "@tanstack/react-query";
import { productQuery } from "./queries.ts";

const price = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export function ProductDetails({ id }: { id: string }) {
  const { data: product } = useSuspenseQuery(productQuery(id));
  return (
    <article>
      <h1>{product.name}</h1>
      <p className="price">{price(product.priceCents)}</p>
    </article>
  );
}
