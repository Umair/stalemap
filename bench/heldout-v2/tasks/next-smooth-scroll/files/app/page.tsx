import Link from "next/link";

export default function Home() {
  return (
    <main>
      <nav>
        <a href="#features">Features</a> <a href="#pricing">Pricing</a> <Link href="/docs">Docs</Link>
      </nav>
      <section id="features">
        <h2>Features</h2>
      </section>
      <section id="pricing">
        <h2>Pricing</h2>
      </section>
    </main>
  );
}
