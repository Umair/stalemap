import { ProductPhoto } from "../../components/ProductPhoto";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return (
    <main>
      <h1>Product {slug}</h1>
      <ProductPhoto slug={slug} name={`Product ${slug}`} />
    </main>
  );
}
