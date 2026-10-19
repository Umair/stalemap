import { z } from "zod";
import { recordValidationFailure } from "./metrics.ts";

export function parseBody<T extends z.ZodType>(route: string, schema: T, body: unknown): z.output<T> {
  throw new Error("not implemented");
}
