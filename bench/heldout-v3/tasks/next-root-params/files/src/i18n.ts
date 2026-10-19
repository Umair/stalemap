import { dictionaries, defaultLocale, type Dictionary } from "./dictionaries";

/** The dictionary for the locale of the current route (`app/[lang]/...`). */
export async function getDictionary(): Promise<Dictionary> {
  throw new Error("not implemented");
}
