import { Suspense } from "react";
import Image from "next/image";
import { StockCount } from "./components/StockCount";

export const experimental_ppr = true;

export default function ProductPage() {
  return (
    <main>
      <h1>Brass desk lamp</h1>
      <Image src="https://images.example.com/lamp.jpg" alt="Brass desk lamp" width={640} height={480} />
      <p>Hand-finished brass with a linen shade.</p>
      <Suspense fallback={<p>Checking stock…</p>}>
        <StockCount sku="lamp-001" />
      </Suspense>
    </main>
  );
}
