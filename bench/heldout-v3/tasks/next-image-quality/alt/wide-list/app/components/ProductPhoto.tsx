import Image, { type ImageProps } from "next/image";

const PHOTO_QUALITY = 90;

export function ProductPhoto({ src, alt }: Pick<ImageProps, "src" | "alt">) {
  return (
    <Image
      src={src}
      alt={alt}
      width={1200}
      height={900}
      sizes="(max-width: 768px) 100vw, 50vw"
      quality={PHOTO_QUALITY}
    />
  );
}
