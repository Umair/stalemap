import { z } from "zod";

export const HexColor = z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);
export const CssLength = z.string().regex(/^\d+(?:\.\d+)?(?:px|rem|em|%)$/);

/** Theme overrides a workspace admin saves in settings; applied as CSS custom properties on <body>. */
// TODO
export const ThemeOverrides = z.never();

export type ThemeOverrides = z.infer<typeof ThemeOverrides>;
