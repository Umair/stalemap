export interface Post {
  slug: string;
  title: string;
  body: string;
}

export const posts: Post[] = [
  { slug: "hello-world", title: "Hello, world", body: "Our first post." },
  { slug: "shipping-faster", title: "How we ship twice a day", body: "Small changes, often." },
];

export const findPost = (slug: string) => posts.find((p) => p.slug === slug);
