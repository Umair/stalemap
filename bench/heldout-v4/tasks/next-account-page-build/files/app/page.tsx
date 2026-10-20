import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Acme Store</h1>
      <Link href="/account">Your account</Link>
    </main>
  );
}
