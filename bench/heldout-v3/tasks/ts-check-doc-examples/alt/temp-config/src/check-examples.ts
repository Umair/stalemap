import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** The project's own TypeScript compiler. */
const tsc = fileURLToPath(new URL("../node_modules/.bin/tsc", import.meta.url));

export interface ExampleResult {
  ok: boolean;
  output: string;
}

/** Type-checks one docs example by itself, through a throwaway tsconfig that lists only that file. */
export async function checkExample(file: string): Promise<ExampleResult> {
  const dir = mkdtempSync(join(tmpdir(), "example-check-"));
  try {
    const config = { compilerOptions: { strict: true, noEmit: true, target: "ES2022", module: "ESNext", moduleResolution: "Bundler" }, files: [resolve(file)] };
    writeFileSync(join(dir, "tsconfig.json"), JSON.stringify(config));
    const result = spawnSync(tsc, ["--project", join(dir, "tsconfig.json")], { encoding: "utf8" });
    return { ok: result.status === 0, output: `${result.stdout ?? ""}${result.stderr ?? ""}` };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
