import type Stripe from "stripe";
import { orderState, type OrderState } from "./orders.ts";

const headline: Record<OrderState, string> = {
  paid: "Thanks, your order is confirmed",
  pending: "We're confirming your payment",
  action_needed: "Your payment needs attention",
  canceled: "This order was canceled",
};

/** The headline at the top of the order page. */
export function orderHeadline(intent: Stripe.PaymentIntent): string {
  return headline[orderState(intent)];
}
