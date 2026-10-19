import { Schema, model } from "mongoose";

const orderSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
  items: [{ sku: String, quantity: { type: Number, min: 1 }, price: Number }],
  total: { type: Number, min: 0, required: true },
  status: { type: String, enum: ["open", "paid", "shipped", "cancelled"], default: "open" },
});

export const Order = model("Order", orderSchema);
