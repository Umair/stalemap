import { Schema, model } from "mongoose";
import { toChangeEvent } from "./events.ts";
import { publish } from "./queue.ts";

const customerSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
});

const orderSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
  total: { type: Number, min: 0 },
  status: { type: String, enum: ["open", "paid", "shipped"], default: "open" },
});

for (const schema of [customerSchema, orderSchema]) {
  schema.post("save", (doc) => publish(toChangeEvent("saved", doc)));
  schema.post("deleteOne", { document: true, query: false }, (doc) => publish(toChangeEvent("deleted", doc)));
}

export const Customer = model("Customer", customerSchema);
export const Order = model("Order", orderSchema);
