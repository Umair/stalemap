import { Suspense } from "react";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { ProductDetails } from "./ProductDetails.tsx";

export function ProductPage({ client, id }: { client: QueryClient; id: string }) {
  return (
    <QueryClientProvider client={client}>
      <main>
        <Suspense fallback={<p>Loading product…</p>}>
          <ProductDetails id={id} />
        </Suspense>
      </main>
    </QueryClientProvider>
  );
}
