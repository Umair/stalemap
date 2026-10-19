export interface Article {
  slug: string;
  title: string;
  author: string;
  image: { src: string; alt: string; width: number; height: number };
  body: string[];
}

const articles: Article[] = [
  {
    slug: "lighthouse-keepers",
    title: "The last lighthouse keepers",
    author: "Maya Lin",
    image: { src: "https://images.example.com/lighthouse.jpg", alt: "Lighthouse at dusk", width: 1200, height: 800 },
    body: ["Only a handful of manned lighthouses remain.", "We spent a week with the people who run them."],
  },
  {
    slug: "night-trains",
    title: "Night trains are back",
    author: "Tomas Berg",
    image: { src: "https://images.example.com/sleeper.jpg", alt: "Sleeper carriage at a platform", width: 1200, height: 800 },
    body: ["Sleeper services are returning across Europe."],
  },
];

export async function listArticles(): Promise<Article[]> {
  return articles;
}

export async function getArticle(slug: string): Promise<Article | undefined> {
  return articles.find((a) => a.slug === slug);
}
