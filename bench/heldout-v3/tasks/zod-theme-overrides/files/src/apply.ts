import { ThemeOverrides } from "./theme.ts";

/** Validates a saved theme and renders it as a `body { … }` rule. */
export function themeCss(input: unknown): { ok: true; css: string } | { ok: false; errors: string[] } {
  const result = ThemeOverrides.safeParse(input);
  if (!result.success) return { ok: false, errors: result.error.issues.map((i) => `${i.path.join(".") || "(theme)"}: ${i.message}`) };
  const declarations = Object.entries(result.data as Record<string, string>).map(([name, value]) => `  ${name}: ${value};`);
  return { ok: true, css: `body {\n${declarations.join("\n")}\n}` };
}
