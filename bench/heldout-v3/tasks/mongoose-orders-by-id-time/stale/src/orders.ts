import { Types } from "mongoose";
import { Order } from "./models/order.ts";

/** Orders created at or after `from` and before `to`, as an unexecuted query that callers sort, page and run. */
export function ordersCreatedBetween(from: Date, to: Date) {
  return Order.find({
    _id: {
      $gte: new Types.ObjectId(Math.floor(from.getTime() / 1000)),
      $lt: new Types.ObjectId(Math.floor(to.getTime() / 1000)),
    },
  });
}

export function openOrdersFor(customerId: string) {
  return Order.find({ customer: customerId, status: "open" }).sort({ _id: -1 });
}
