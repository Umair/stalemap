import { fileURLToPath } from "node:url";

/** The project's own TypeScript compiler. */
const tsc = fileURLToPath(new URL("../node_modules/.bin/tsc", import.meta.url));

export interface ExampleResult {
  ok: boolean;
  output: string;
}

/** Type-checks one docs example by itself. */
export async function checkExample(file: string): Promise<ExampleResult> {
  throw new Error("not implemented");
}
