import { z } from "zod";

export type Locale = "en" | "de" | "fr" | "es";

const errorMaps: Record<Locale, z.core.$ZodErrorMap> = {
  en: z.locales.en().localeError,
  de: z.locales.de().localeError,
  fr: z.locales.fr().localeError,
  es: z.locales.es().localeError,
};

/** Like `schema.safeParse(input)`, but Zod's error messages are in `locale`. */
export function safeParseLocalized<T extends z.ZodType>(schema: T, input: unknown, locale: Locale): z.ZodSafeParseResult<z.output<T>> {
  const localeError = errorMaps[locale];
  return z.safeParse(schema, input, { error: (issue) => localeError(issue) }) as z.ZodSafeParseResult<z.output<T>>;
}
