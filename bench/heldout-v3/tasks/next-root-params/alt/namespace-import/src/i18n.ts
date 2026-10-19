import { cache } from "react";
import * as rootParams from "next/root-params";
import { dictionaries, defaultLocale, type Dictionary } from "./dictionaries";

/** The dictionary for the locale of the current route (`app/[lang]/...`). */
export const getDictionary = cache(async (): Promise<Dictionary> => {
  const locale = String(await rootParams.lang());
  switch (locale) {
    case "fr":
    case "de":
    case "en":
      return dictionaries[locale];
    default:
      return dictionaries[defaultLocale];
  }
});
