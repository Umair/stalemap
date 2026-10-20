import { use } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { Product } from "./api.ts";
import { productQuery } from "./queries.ts";

const price = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// One stable promise per client and product, so use() sees the same promise on every render.
const pending = new WeakMap<QueryClient, Map<string, Promise<Product>>>();

function productPromise(client: QueryClient, id: string): Promise<Product> {
  let byId = pending.get(client);
  if (!byId) pending.set(client, (byId = new Map()));
  let promise = byId.get(id);
  if (!promise) {
    promise = client.query(productQuery(id));
    byId.set(id, promise);
  }
  return promise;
}

export function ProductDetails({ id }: { id: string }) {
  const product = use(productPromise(useQueryClient(), id));
  return (
    <article>
      <h1>{product.name}</h1>
      <p className="price">{price(product.priceCents)}</p>
    </article>
  );
}
