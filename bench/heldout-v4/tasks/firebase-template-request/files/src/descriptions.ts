import { getTemplateGenerativeModel } from "firebase/ai";
import { ai } from "./firebase.ts";

export interface Product {
  name: string;
  category: string;
  features: string[];
}

const templates = getTemplateGenerativeModel(ai);

/**
 * Writes the storefront description for a product.
 */
export async function writeProductDescription(product: Product): Promise<string> {
  throw new Error("not implemented");
}
