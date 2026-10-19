import type { ZodError } from "zod";

export function formatError(error: ZodError): string[] {
  return error.issues.map((i) => `${i.path.length ? i.path.join(".") : "(root)"}: ${i.message}`);
}
