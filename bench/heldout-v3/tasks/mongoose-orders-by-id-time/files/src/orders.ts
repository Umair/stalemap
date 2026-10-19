import { Order } from "./models/order.ts";

/** Orders created at or after `from` and before `to`, as an unexecuted query that callers sort, page and run. */
export function ordersCreatedBetween(from: Date, to: Date) {
  throw new Error("not implemented");
}

export function openOrdersFor(customerId: string) {
  return Order.find({ customer: customerId, status: "open" }).sort({ _id: -1 });
}
