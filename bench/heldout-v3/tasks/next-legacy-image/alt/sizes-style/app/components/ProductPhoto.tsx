import NextImage from "next/image";

export function ProductPhoto({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="product-photo" style={{ position: "relative", aspectRatio: "4 / 3", width: "100%" }}>
      <NextImage src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 33vw" />
    </figure>
  );
}
