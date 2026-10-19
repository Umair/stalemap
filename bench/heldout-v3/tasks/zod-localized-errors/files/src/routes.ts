import type { Request, Response } from "express";
import { z } from "zod";
import { SignupSchema } from "./schemas.ts";
import { safeParseLocalized, type Locale } from "./validate.ts";

const LOCALES: Locale[] = ["en", "de", "fr", "es"];

export function signupHandler(req: Request, res: Response): void {
  const locale = (req.acceptsLanguages(...LOCALES) || "en") as Locale;
  const result = safeParseLocalized(SignupSchema, req.body, locale);
  if (!result.success) {
    res.status(400).json({ errors: z.flattenError(result.error).fieldErrors });
    return;
  }
  res.status(201).json({ email: result.data.email });
}
