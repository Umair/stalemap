import slugify from "./legacy/slugify.cjs";
import dates from "./legacy/dates.cjs";

export interface Post {
  title: string;
  published: Date;
  body: string;
}

export interface Page {
  path: string;
  heading: string;
  byline: string;
}

export function postPath(post: Post): string {
  return `/${dates.urlDay(post.published)}/${slugify(post.title)}/`;
}

export function renderPage(post: Post): Page {
  return { path: postPath(post), heading: post.title, byline: `Published ${dates.longDate(post.published)}` };
}

/** Slugs longer than this are cut, so the editor warns before publishing. */
export function titleTooLong(title: string): boolean {
  const full = title.toLowerCase().replace(/[^a-z0-9]+/g, slugify.separator);
  return full.length > slugify.maxLength;
}

export function buildSite(posts: Post[]): Page[] {
  return [...posts].sort((a, b) => b.published.getTime() - a.published.getTime()).map(renderPage);
}
