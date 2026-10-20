import dotenv from "dotenv";

const isOff = (value: string) => ["false", "0", "no", "off", ""].includes(value.toLowerCase());

/** Loads `file` into process.env; variables that are already set keep their values. */
export function loadEnv(file: string): void {
  // Options passed in code win over dotenv's environment variables, so only default to quiet when
  // nobody set DOTENV_CONFIG_QUIET on this machine.
  const quietSetting = process.env.DOTENV_CONFIG_QUIET ?? process.env.DOTENV_QUIET;
  dotenv.config({ path: file, quiet: quietSetting === undefined ? true : !isOff(quietSetting) });
}
