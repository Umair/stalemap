export interface Post {
  title: string;
  tags: string[];
  draft?: boolean;
}

export function uniqueTags(posts: Post[]): string[] {
  const seen = new Set<string>();
  for (const post of posts) for (const tag of post.tags) seen.add(tag);
  return [...seen].sort();
}

export function countTags(posts: Iterable<Post>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const { tags } of posts) for (const tag of tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return counts;
}

export function* published(posts: Iterable<Post>): Generator<Post> {
  for (const post of posts) if (!post.draft) yield { ...post, tags: [...post.tags] };
}
