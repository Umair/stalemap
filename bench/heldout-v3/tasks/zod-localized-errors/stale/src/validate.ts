import { z } from "zod";

export type Locale = "en" | "de" | "fr" | "es";

/** Like `schema.safeParse(input)`, but Zod's error messages are in `locale`. */
export function safeParseLocalized<T extends z.ZodType>(schema: T, input: unknown, locale: Locale): z.ZodSafeParseResult<z.output<T>> {
  // Parsing is synchronous, so switching the global locale just for this call is safe.
  z.config(z.locales[locale]());
  try {
    return schema.safeParse(input);
  } finally {
    z.config(z.locales.en());
  }
}
