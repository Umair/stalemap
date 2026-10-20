import { writeFileSync } from "node:fs";

/** Stands in for a real connection: importing a test file that calls this means it was run. */
export async function connectToStagingDatabase(): Promise<{ query(sql: string): Promise<unknown> }> {
  writeFileSync(new URL("../connected.txt", import.meta.url), new Date().toISOString());
  return { query: async () => [] };
}
