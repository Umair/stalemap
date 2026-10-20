import { generatePath } from "react-router";

/** Release files are stored in our S3 download bucket under releases/<version>/<file name>. */
export const DOWNLOADS_ORIGIN = "https://downloads.acme.dev";

/** Absolute URL of a release file in the download bucket. */
export function downloadUrl(version: string, fileName: string): string {
  const path = generatePath("/releases/:version/:fileName", { version, fileName });
  // React Router leaves "+" literal in path segments; S3 would read it as a space.
  return new URL(path.replaceAll("+", "%2B"), DOWNLOADS_ORIGIN).href;
}
