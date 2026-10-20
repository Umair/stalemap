import dotenv from "dotenv";

/** Loads `file` into process.env; variables that are already set keep their values. */
export function loadEnv(file: string): void {
  const { DOTENV_CONFIG_QUIET, DOTENV_CONFIG_DEBUG } = process.env;
  const opsChoseOutput = DOTENV_CONFIG_QUIET !== undefined || DOTENV_CONFIG_DEBUG !== undefined;
  // Leave the options out when ops set dotenv's variables, so dotenv reads them itself.
  dotenv.config(opsChoseOutput ? { path: file } : { path: file, quiet: true });
}
