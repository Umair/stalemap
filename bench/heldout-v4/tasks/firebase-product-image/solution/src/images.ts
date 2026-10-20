import { getGenerativeModel, ResponseModality } from "firebase/ai";
import { ai } from "./firebase.ts";

export interface GeneratedImage {
  mimeType: string;
  /** Base64-encoded image bytes. */
  data: string;
}

const imageModel = getGenerativeModel(ai, {
  model: "gemini-2.5-flash-image",
  generationConfig: { responseModalities: [ResponseModality.TEXT, ResponseModality.IMAGE] },
});

/**
 * Generates a product photo for a listing that doesn't have one yet.
 */
export async function generateProductPhoto(description: string): Promise<GeneratedImage> {
  const result = await imageModel.generateContent(`A clean studio product photo: ${description}`);
  const image = result.response.inlineDataParts()?.[0]?.inlineData;
  if (!image) throw new Error("The model didn't return an image");
  return { mimeType: image.mimeType, data: image.data };
}
