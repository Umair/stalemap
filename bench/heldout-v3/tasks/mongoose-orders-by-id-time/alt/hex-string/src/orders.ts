import mongoose from "mongoose";
import { Order } from "./models/order.ts";

/** The smallest id a document created at `date` (to the second) can have. */
function firstIdAt(date: Date): mongoose.Types.ObjectId {
  const hexTime = Math.floor(date.getTime() / 1000).toString(16).padStart(8, "0");
  return new mongoose.Types.ObjectId(hexTime + "0".repeat(16));
}

/** Orders created at or after `from` and before `to`, as an unexecuted query that callers sort, page and run. */
export function ordersCreatedBetween(from: Date, to: Date) {
  return Order.where("_id").gte(firstIdAt(from) as any).lt(firstIdAt(to) as any);
}

export function openOrdersFor(customerId: string) {
  return Order.find({ customer: customerId, status: "open" }).sort({ _id: -1 });
}
