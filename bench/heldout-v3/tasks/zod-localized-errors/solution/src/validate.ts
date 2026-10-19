import { z } from "zod";

export type Locale = "en" | "de" | "fr" | "es";

/** Like `schema.safeParse(input)`, but Zod's error messages are in `locale`. */
export function safeParseLocalized<T extends z.ZodType>(schema: T, input: unknown, locale: Locale): z.ZodSafeParseResult<z.output<T>> {
  return schema.safeParse(input, { error: z.locales[locale]().localeError });
}
