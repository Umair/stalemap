import { z } from "zod";
import { recordValidationFailure } from "./metrics.ts";

export function parseBody<T extends z.ZodType>(route: string, schema: T, body: unknown): z.output<T> {
  try {
    return schema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) recordValidationFailure(route, err.issues.length);
    throw err;
  }
}
