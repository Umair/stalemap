import { z } from "zod";

export const HexColor = z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
export const CssLength = z.string().regex(/^\d+(?:\.\d+)?(?:px|rem|em|%)$/);

/** Theme overrides a workspace admin saves in settings; applied as CSS custom properties on <body>. */
export const ThemeOverrides = z
  .object({ "--brand": HexColor, "--radius": CssLength })
  .catchall(z.string())
  .superRefine((theme, ctx) => {
    for (const key of Object.keys(theme)) {
      if (!key.startsWith("--")) ctx.addIssue({ code: "custom", path: [key], message: `"${key}" is not a CSS custom property` });
    }
  });

export type ThemeOverrides = z.infer<typeof ThemeOverrides>;
