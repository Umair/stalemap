import { getImagenModel } from "firebase/ai";
import { ai } from "./firebase.ts";

export interface GeneratedImage {
  mimeType: string;
  /** Base64-encoded image bytes. */
  data: string;
}

const imagen = getImagenModel(ai, { model: "imagen-4.0-generate-001" });

/**
 * Generates a product photo for a listing that doesn't have one yet.
 */
export async function generateProductPhoto(description: string): Promise<GeneratedImage> {
  const { images } = await imagen.generateImages(`A clean studio product photo: ${description}`);
  const image = images[0];
  if (!image) throw new Error("No image was generated");
  return { mimeType: image.mimeType, data: image.bytesBase64Encoded };
}
