import dotenv from "dotenv";

/**
 * Loads an env file into `target` (process.env by default) without overwriting anything already set there,
 * and returns the variables it actually set.
 */
export function applyEnvFile(file: string, target: NodeJS.ProcessEnv = process.env): Record<string, string> {
  const before = new Set(Object.keys(target));
  const { parsed, error } = dotenv.config({ path: file, processEnv: target, quiet: true });
  if (error) throw error;
  const applied: Record<string, string> = {};
  for (const [name, value] of Object.entries(parsed ?? {})) {
    if (!before.has(name)) applied[name] = value;
  }
  return applied;
}
