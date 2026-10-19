export type Messages = Record<string, string>;

const cache = new Map<string, Messages>();

export async function loadMessages(locale: string): Promise<Messages> {
  const cached = cache.get(locale);
  if (cached) return cached;
  const mod = await import(`../locales/${locale}.json`);
  const messages = mod.default as Messages;
  cache.set(locale, messages);
  return messages;
}

export async function translate(locale: string, key: string, params: Record<string, string | number> = {}): Promise<string> {
  const messages = await loadMessages(locale);
  const fallback = locale === "en" ? messages : await loadMessages("en");
  const template = messages[key] ?? fallback[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}
