import { Schema, model } from "mongoose";

const productSchema = new Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, required: true, lowercase: true },
  price: { type: Number, required: true, min: 0 },
  inStock: { type: Boolean, default: true },
  rating: { type: Number, min: 0, max: 5 },
});

export const Product = model("Product", productSchema);
