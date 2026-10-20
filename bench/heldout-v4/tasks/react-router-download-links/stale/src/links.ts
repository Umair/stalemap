import { generatePath } from "react-router";

/** Release files are stored in our S3 download bucket under releases/<version>/<file name>. */
export const DOWNLOADS_ORIGIN = "https://downloads.acme.dev";

/** Absolute URL of a release file in the download bucket. */
export function downloadUrl(version: string, fileName: string): string {
  return DOWNLOADS_ORIGIN + generatePath("/releases/:version/:fileName", { version, fileName });
}
