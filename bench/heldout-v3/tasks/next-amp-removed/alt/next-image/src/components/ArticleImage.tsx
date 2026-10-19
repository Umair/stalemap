import Image from "next/image";
import type { Article } from "../lib/articles";

export function ArticleImage({ image }: { image: Article["image"] }) {
  return <Image src={image.src} alt={image.alt} width={image.width} height={image.height} className="article-image" />;
}
