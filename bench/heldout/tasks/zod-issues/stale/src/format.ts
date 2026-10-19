import type { ZodError } from "zod";

export function formatError(error: ZodError): string[] {
  return error.errors.map((e) => `${e.path.length ? e.path.join(".") : "(root)"}: ${e.message}`);
}
