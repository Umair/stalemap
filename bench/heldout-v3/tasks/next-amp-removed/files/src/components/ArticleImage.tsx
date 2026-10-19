import { useAmp } from "next/amp";
import type { Article } from "../lib/articles";

export function ArticleImage({ image }: { image: Article["image"] }) {
  const isAmp = useAmp();
  if (isAmp) {
    return <amp-img src={image.src} alt={image.alt} width={image.width} height={image.height} layout="responsive" />;
  }
  return <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" className="article-image" />;
}
