import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>Acme Analytics</h1>
      <Link href="/dashboard">Open the dashboard</Link>
    </main>
  );
}
