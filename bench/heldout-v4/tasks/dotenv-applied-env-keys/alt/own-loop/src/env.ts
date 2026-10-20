import { readFileSync } from "node:fs";
import dotenv from "dotenv";

/**
 * Loads an env file into `target` (process.env by default) without overwriting anything already set there,
 * and returns the variables it actually set.
 */
export function applyEnvFile(file: string, target: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const parsed = dotenv.parse(readFileSync(file, "utf8"));
  const applied: Record<string, string> = {};
  for (const name of Object.keys(parsed)) {
    if (Object.prototype.hasOwnProperty.call(target, name)) continue;
    target[name] = parsed[name];
    applied[name] = parsed[name];
  }
  return applied;
}
