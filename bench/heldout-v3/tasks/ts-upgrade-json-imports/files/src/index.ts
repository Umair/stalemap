import { loadConfig } from "./config.ts";
import { translate } from "./i18n.ts";

export async function welcome(name: string, itemCount: number, locale?: string): Promise<string> {
  const config = loadConfig(locale ? { locale } : {});
  const lines = [await translate(config.locale, "greeting", { name }), await translate(config.locale, "items", { count: itemCount })];
  return lines.join("\n");
}
