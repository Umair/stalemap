import { z } from "zod";

export const HexColor = z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
export const CssLength = z.string().regex(/^\d+(?:\.\d+)?(?:px|rem|em|%)$/);

const RequiredTokens = z.object({ "--brand": HexColor, "--radius": CssLength });

/** Theme overrides a workspace admin saves in settings; applied as CSS custom properties on <body>. */
export const ThemeOverrides = z.record(z.string().startsWith("--"), z.string()).superRefine((theme, ctx) => {
  const required = RequiredTokens.safeParse(theme);
  if (!required.success) for (const issue of required.error.issues) ctx.addIssue({ code: "custom", path: issue.path, message: issue.message });
});

export type ThemeOverrides = z.infer<typeof ThemeOverrides>;
