/** Release files are stored in our S3 download bucket under releases/<version>/<file name>. */
export const DOWNLOADS_ORIGIN = "https://downloads.acme.dev";

/** Absolute URL of a release file in the download bucket. */
export function downloadUrl(version: string, fileName: string): string {
  // encodeURIComponent escapes "+" as %2B, which S3 would otherwise decode as a space.
  const path = ["releases", version, fileName].map(encodeURIComponent).join("/");
  return `${DOWNLOADS_ORIGIN}/${path}`;
}
