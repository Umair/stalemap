import { applyEnvFile } from "./env.ts";

/** Loads the env files for this machine and returns the lines we log at startup. */
export function loadEnvFiles(files: string[], target: NodeJS.ProcessEnv = process.env): string[] {
  const lines: string[] = [];
  for (const file of files) {
    const applied = applyEnvFile(file, target);
    const names = Object.keys(applied).sort();
    lines.push(`${file}: ${names.length ? names.map((n) => `${n} (${applied[n].length} chars)`).join(", ") : "nothing new"}`);
  }
  return lines;
}
