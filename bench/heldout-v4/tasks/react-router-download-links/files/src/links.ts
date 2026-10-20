/** Release files are stored in our S3 download bucket under releases/<version>/<file name>. */
export const DOWNLOADS_ORIGIN = "https://downloads.acme.dev";

/** Absolute URL of a release file in the download bucket. */
export function downloadUrl(version: string, fileName: string): string {
  throw new Error("not implemented");
}
