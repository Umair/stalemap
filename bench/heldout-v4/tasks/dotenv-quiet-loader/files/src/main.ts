import { loadEnv } from "./env.ts";

export function start(): { port: number } {
  loadEnv(process.env.APP_ENV_FILE ?? ".env");
  return { port: Number(process.env.PORT ?? 3000) };
}
