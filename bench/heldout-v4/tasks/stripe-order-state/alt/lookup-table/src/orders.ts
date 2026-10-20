import type Stripe from "stripe";

/** Where an order stands, as shown on the order page and in the admin order list. */
export type OrderState = "paid" | "pending" | "action_needed" | "canceled";

const byStatus: Partial<Record<string, OrderState>> = {
  succeeded: "paid",
  processing: "pending",
  requires_capture: "pending",
  requires_payment_method: "action_needed",
  requires_confirmation: "action_needed",
  requires_action: "action_needed",
  canceled: "canceled",
};

/**
 * The state of an order, from the status of its Stripe payment intent:
 *
 * - succeeded → "paid"
 * - processing, requires_capture → "pending"
 * - requires_payment_method, requires_confirmation, requires_action → "action_needed"
 * - canceled → "canceled"
 */
export function orderState(intent: Stripe.PaymentIntent): OrderState {
  const state = byStatus[intent.status];
  if (!state) throw new Error(`Unexpected payment intent status: ${intent.status}`);
  return state;
}
