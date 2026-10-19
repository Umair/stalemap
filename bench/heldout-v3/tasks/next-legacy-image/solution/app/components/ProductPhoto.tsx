import Image from "next/image";

export function ProductPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="product-photo">
      <Image src={src} alt={alt} width={800} height={600} sizes="100vw" style={{ width: "100%", height: "auto" }} />
    </figure>
  );
}
