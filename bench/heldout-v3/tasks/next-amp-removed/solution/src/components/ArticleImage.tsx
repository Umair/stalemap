import type { Article } from "../lib/articles";

export function ArticleImage({ image }: { image: Article["image"] }) {
  return <img src={image.src} alt={image.alt} width={image.width} height={image.height} loading="lazy" className="article-image" />;
}
