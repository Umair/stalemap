import { getGenerativeModel } from "firebase/ai";
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
  const model = getGenerativeModel(ai, { model: "gemini-3-pro-image-preview", generationConfig: { responseModalities: ["IMAGE"] } });
  const { response } = await model.generateContent(["Product photo, white background.", description]);
  for (const part of response.candidates?.[0]?.content.parts ?? []) {
    if ("inlineData" in part && part.inlineData?.mimeType.startsWith("image/")) {
      return { mimeType: part.inlineData.mimeType, data: part.inlineData.data };
    }
  }
  throw new Error("no image in the response");
}
