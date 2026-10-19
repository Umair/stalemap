import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Catalog</h1>
      <Link href="/products/lamp-01">Brass desk lamp</Link>
    </main>
  );
}
