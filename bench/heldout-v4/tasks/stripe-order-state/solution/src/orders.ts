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
  switch (intent.status) {
    case "succeeded":
      return "paid";
    case "processing":
    case "requires_capture":
      return "pending";
    case "requires_payment_method":
    case "requires_confirmation":
    case "requires_action":
      return "action_needed";
    case "canceled":
      return "canceled";
    default:
      // Stripe can add statuses; treat one we don't know yet as still in progress.
      return "pending";
  }
}
