import Image from "next/legacy/image";

export function ProductPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="product-photo">
      <Image src={src} alt={alt} width={800} height={600} layout="responsive" />
    </figure>
  );
}
