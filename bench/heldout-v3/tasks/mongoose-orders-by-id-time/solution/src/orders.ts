import { Types } from "mongoose";
import { Order } from "./models/order.ts";

const toSeconds = (date: Date) => Math.floor(date.getTime() / 1000);

/** Orders created at or after `from` and before `to`, as an unexecuted query that callers sort, page and run. */
export function ordersCreatedBetween(from: Date, to: Date) {
  return Order.find({
    _id: {
      $gte: Types.ObjectId.createFromTime(toSeconds(from)),
      $lt: Types.ObjectId.createFromTime(toSeconds(to)),
    },
  });
}

export function openOrdersFor(customerId: string) {
  return Order.find({ customer: customerId, status: "open" }).sort({ _id: -1 });
}
