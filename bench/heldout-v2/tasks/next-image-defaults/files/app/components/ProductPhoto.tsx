import Image from "next/image";

export function ProductPhoto({ src, alt }: { src: string; alt: string }) {
  return <Image src={src} alt={alt} width={1200} height={900} quality={90} sizes="(max-width: 768px) 100vw, 50vw" />;
}
