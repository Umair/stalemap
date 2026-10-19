import assert from "node:assert/strict";
import { test } from "node:test";
import { z } from "zod";
const load = (id: string): Promise<any> => import(id);
const { safeParseLocalized } = await load("../../src/validate.ts");
const { SignupSchema } = await load("../../src/schemas.ts");

const bad = { email: "not-an-email", password: "short", age: 12.5 };

// The messages Zod's own locale produces, read while that locale is the global one.
function expected(locale: "en" | "de" | "fr" | "es", schema: z.ZodType, input: unknown): string[] {
  z.config(z.locales[locale]());
  try {
    const r = schema.safeParse(input);
    return r.success ? [] : r.error.issues.map((i) => i.message);
  } finally {
    z.config(z.locales.en());
  }
}
const messages = (r: any): string[] => {
  assert.equal(r.success, false);
  assert.ok(r.error instanceof z.ZodError, "result.error is a ZodError");
  return r.error.issues.map((i: { message: string }) => i.message);
};

for (const locale of ["de", "fr", "es"] as const) {
  test(`errors are in ${locale} when the caller reads them`, () => {
    const result = safeParseLocalized(SignupSchema, bad, locale);
    const english = expected("en", SignupSchema, bad);
    const want = expected(locale, SignupSchema, bad);
    assert.notDeepEqual(want, english);
    assert.deepEqual(messages(result), want);
    assert.deepEqual(z.flattenError(result.error).fieldErrors, z.flattenError(SignupSchema.safeParse(bad, { error: z.locales[locale]().localeError }).error!).fieldErrors);
  });
}

test("English and valid input", () => {
  assert.deepEqual(messages(safeParseLocalized(SignupSchema, bad, "en")), expected("en", SignupSchema, bad));
  const ok = safeParseLocalized(SignupSchema, { email: "ada@example.com", password: "correct horse", age: 36 }, "de");
  assert.equal(ok.success, true);
  assert.deepEqual(ok.data, { email: "ada@example.com", password: "correct horse", age: 36 });
});

test("the rest of the app keeps English messages", () => {
  const english = expected("en", z.number(), "x");
  const localized = safeParseLocalized(z.number(), "x", "de");
  const other = z.number().safeParse("x");
  assert.deepEqual(messages(other), english);
  assert.deepEqual(messages(localized), expected("de", z.number(), "x"));
});
