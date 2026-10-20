import type Stripe from "stripe";

/** Where an order stands, as shown on the order page and in the admin order list. */
export type OrderState = "paid" | "pending" | "action_needed" | "canceled";

/**
 * The state of an order, from the status of its Stripe payment intent:
 *
 * - succeeded → "paid"
 * - processing, requires_capture → "pending"
 * - requires_payment_method, requires_confirmation, requires_action → "action_needed"
 * - canceled → "canceled"
 */
export function orderState(intent: Stripe.PaymentIntent): OrderState {
  throw new Error("not implemented");
}
