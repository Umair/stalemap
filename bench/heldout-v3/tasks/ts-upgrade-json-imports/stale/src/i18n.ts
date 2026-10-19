export type Messages = Record<string, string>;

const cache = new Map<string, Promise<Messages>>();

export function loadMessages(locale: string): Promise<Messages> {
  let pending = cache.get(locale);
  if (!pending) {
    pending = import(`../locales/${locale}.json`, { assert: { type: "json" } }).then((mod) => mod.default as Messages);
    cache.set(locale, pending);
  }
  return pending;
}

export async function translate(locale: string, key: string, params: Record<string, string | number> = {}): Promise<string> {
  const messages = await loadMessages(locale);
  const fallback = locale === "en" ? messages : await loadMessages("en");
  const template = messages[key] ?? fallback[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}
