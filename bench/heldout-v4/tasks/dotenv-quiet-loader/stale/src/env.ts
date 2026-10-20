import dotenv from "dotenv";

/** Loads `file` into process.env; variables that are already set keep their values. */
export function loadEnv(file: string): void {
  // Quiet by default; DOTENV_CONFIG_QUIET / DOTENV_CONFIG_DEBUG set on a machine take over from these options.
  dotenv.config({ path: file, quiet: true });
}
