import { lang } from "next/root-params";
import { dictionaries, defaultLocale, type Dictionary, type Locale } from "./dictionaries";

const isLocale = (value: unknown): value is Locale => typeof value === "string" && Object.hasOwn(dictionaries, value);

/** The dictionary for the locale of the current route (`app/[lang]/...`). */
export async function getDictionary(): Promise<Dictionary> {
  const locale = await lang();
  return dictionaries[isLocale(locale) ? locale : defaultLocale];
}
