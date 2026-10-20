import * as z from "zod";

export interface Job {
  name: string;
  /** Validates raw data pulled off the queue and runs the handler with it; rejects if the data is invalid. */
  run(raw: unknown): Promise<void>;
}

export function defineJob<S extends z.core.$ZodType>(
  name: string,
  schema: S,
  handler: (payload: z.output<S>) => Promise<void>,
): Job {
  return {
    name,
    async run(raw) {
      const result = await z.safeParseAsync(schema, raw);
      if (!result.success) throw new Error(`invalid ${name} payload: ${z.prettifyError(result.error)}`);
      await handler(result.data);
    },
  };
}
