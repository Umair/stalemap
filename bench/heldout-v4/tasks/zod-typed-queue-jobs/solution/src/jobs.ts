import { z } from "zod";

export interface Job {
  name: string;
  /** Validates raw data pulled off the queue and runs the handler with it; rejects if the data is invalid. */
  run(raw: unknown): Promise<void>;
}

export function defineJob<S extends z.ZodType>(name: string, schema: S, handler: (payload: z.infer<S>) => Promise<void>): Job {
  return {
    name,
    async run(raw) {
      const payload = await schema.parseAsync(raw);
      await handler(payload);
    },
  };
}
