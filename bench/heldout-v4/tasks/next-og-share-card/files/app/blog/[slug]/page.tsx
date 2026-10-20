import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findPost } from "../../lib/posts";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = findPost((await params).slug);
  if (!post) return {};
  return {
    title: post.title,
    openGraph: { images: [`/api/og?title=${encodeURIComponent(post.title)}`] },
  };
}

export default async function PostPage({ params }: Props) {
  const post = findPost((await params).slug);
  if (!post) notFound();
  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.body}</p>
    </article>
  );
}
