import { z } from "zod";

export interface Job {
  name: string;
  /** Validates raw data pulled off the queue and runs the handler with it; rejects if the data is invalid. */
  run(raw: unknown): Promise<void>;
}

// TODO: make this work with any zod schema and type the handler's payload from it
export function defineJob(name: string, schema: unknown, handler: (payload: any) => Promise<void>): Job {
  throw new Error("not implemented");
}
