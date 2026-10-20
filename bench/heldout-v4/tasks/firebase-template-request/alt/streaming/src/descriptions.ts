import { getTemplateGenerativeModel } from "firebase/ai";
import { ai } from "./firebase.ts";

export interface Product {
  name: string;
  category: string;
  features: string[];
}

const TEMPLATE_ID = "product-description";
const templates = getTemplateGenerativeModel(ai);

/**
 * Writes the storefront description for a product.
 */
export async function writeProductDescription(product: Product): Promise<string> {
  const { name, category, features } = product;
  const { response } = await templates.generateContentStream({
    templateId: TEMPLATE_ID,
    templateVariables: { name, category, features },
  });
  return (await response).text().trim();
}
