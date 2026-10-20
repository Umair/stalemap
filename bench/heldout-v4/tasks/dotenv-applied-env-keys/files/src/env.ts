import { readFileSync } from "node:fs";
import dotenv from "dotenv";

/**
 * Loads an env file into `target` (process.env by default) without overwriting anything already set there,
 * and returns the variables it actually set.
 */
export function applyEnvFile(file: string, target: NodeJS.ProcessEnv = process.env): Record<string, string> {
  throw new Error("not implemented");
}
