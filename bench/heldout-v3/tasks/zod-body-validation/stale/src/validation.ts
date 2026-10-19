import { z } from "zod";
import { recordValidationFailure } from "./metrics.ts";

export function parseBody<T extends z.ZodType>(route: string, schema: T, body: unknown): z.output<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    recordValidationFailure(route, result.error.issues.length);
    throw result.error;
  }
  return result.data;
}
