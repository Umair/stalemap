import Link from "next/link";
import { notFound } from "next/navigation";
import { Photo } from "../../components/Photo";
import { findPhoto } from "../../lib/photos";

export default async function PhotoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const photo = findPhoto(id);
  if (!photo) notFound();
  return (
    <main>
      <Link href="/">Back to the gallery</Link>
      <Photo id={photo.id} src={photo.src} alt={photo.title} size="large" />
      <h1>{photo.title}</h1>
    </main>
  );
}
