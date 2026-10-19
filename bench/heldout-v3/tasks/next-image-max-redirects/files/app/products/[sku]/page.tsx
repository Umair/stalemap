import { ProductPhoto } from "../../components/ProductPhoto";

export default async function ProductPage({ params }: { params: Promise<{ sku: string }> }) {
  const { sku } = await params;
  return (
    <main>
      <h1>Product {sku}</h1>
      <ProductPhoto sku={sku} name={`Product ${sku}`} />
    </main>
  );
}
