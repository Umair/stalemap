import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

/** The project's own TypeScript compiler. */
const tsc = fileURLToPath(new URL("../node_modules/.bin/tsc", import.meta.url));

export interface ExampleResult {
  ok: boolean;
  output: string;
}

/** Type-checks one docs example by itself. */
export async function checkExample(file: string): Promise<ExampleResult> {
  try {
    // The project's tsconfig.json is not meant for the examples: check the file on its own.
    const { stdout, stderr } = await promisify(execFile)(tsc, ["--ignoreConfig", "--strict", "--noEmit", file]);
    return { ok: true, output: stdout + stderr };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message: string };
    return { ok: false, output: `${e.stdout ?? ""}${e.stderr ?? ""}` || e.message };
  }
}
