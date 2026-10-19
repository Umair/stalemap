import Image from "next/image";

// Photos live in the "catalog" bucket of the minio service (see docker-compose.yml).
export function ProductPhoto({ slug, name }: { slug: string; name: string }) {
  return <Image src={`http://minio:9000/catalog/${slug}.jpg`} alt={name} width={800} height={800} sizes="(max-width: 768px) 100vw, 800px" />;
}
