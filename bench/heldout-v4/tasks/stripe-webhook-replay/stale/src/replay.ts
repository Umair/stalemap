import type Stripe from "stripe";

/** A webhook delivery as we stored it when it arrived: the raw request body and its Stripe-Signature header. */
export interface StoredDelivery {
  id: number;
  payload: string;
  signature: string;
  receivedAt: Date;
}

/** The Stripe event in a stored delivery, after checking that Stripe signed it with our endpoint secret. */
export function verifiedEvent(stripe: Stripe, delivery: StoredDelivery, endpointSecret: string): Stripe.Event {
  // constructEvent() rejects events older than five minutes; verifyHeader() checks only the signature.
  stripe.webhooks.signature!.verifyHeader(delivery.payload, delivery.signature, endpointSecret);
  return JSON.parse(delivery.payload) as Stripe.Event;
}
