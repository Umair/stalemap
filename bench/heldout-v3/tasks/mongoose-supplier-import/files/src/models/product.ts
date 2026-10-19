import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const productSchema = new Schema({
  sku: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true, min: [0, "Price can't be negative"] },
  stock: { type: Number, default: 0, min: 0 },
  discontinued: { type: Boolean, default: false },
});

export type ProductFields = InferSchemaType<typeof productSchema>;
export type ProductDocument = HydratedDocument<ProductFields>;
export const Product = model("Product", productSchema);
