import { ai } from "./firebase.ts";

export interface GeneratedImage {
  mimeType: string;
  /** Base64-encoded image bytes. */
  data: string;
}

/**
 * Generates a product photo for a listing that doesn't have one yet.
 */
export async function generateProductPhoto(description: string): Promise<GeneratedImage> {
  throw new Error("not implemented");
}
