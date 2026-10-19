import { z } from "zod";
import { recordValidationFailure } from "./metrics.ts";

export function parseBody<T extends z.ZodType>(route: string, schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (result.success) return result.data;
  const error = result.error;
  recordValidationFailure(route, error.issues.length);
  // safeParse() errors carry no stack frames; record the caller's.
  Error.captureStackTrace(error, parseBody);
  throw error;
}
