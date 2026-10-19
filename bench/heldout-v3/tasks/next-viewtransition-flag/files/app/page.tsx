import Link from "next/link";
import { Photo } from "./components/Photo";
import { photos } from "./lib/photos";

export default function Gallery() {
  return (
    <main className="grid">
      {photos.map((p) => (
        <Link key={p.id} href={`/photos/${p.id}`}>
          <Photo id={p.id} src={p.src} alt={p.title} size="thumb" />
        </Link>
      ))}
    </main>
  );
}
