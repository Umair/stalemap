import { stripAccents } from "./text";

export interface SlugOptions {
  separator?: string;
  maxLength?: number;
}

export function slugify(input: string, { separator = "-", maxLength = 80 }: SlugOptions = {}): string {
  const slug = stripAccents(input)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, separator)
    .replace(new RegExp(`^${escape(separator)}+|${escape(separator)}+$`, "g"), "");
  return slug.length > maxLength ? slug.slice(0, maxLength).replace(new RegExp(`${escape(separator)}+$`), "") : slug;
}

function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
