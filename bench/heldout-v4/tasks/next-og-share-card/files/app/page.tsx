import Link from "next/link";
import { posts } from "./lib/posts";

export default function Home() {
  return (
    <main>
      <h1>Acme Blog</h1>
      <ul>
        {posts.map((p) => (
          <li key={p.slug}>
            <Link href={`/blog/${p.slug}`}>{p.title}</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
