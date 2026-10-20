import type Stripe from "stripe";

/** The badge in the "Card payments" column of the connected-accounts table. */
export type Badge = "Live" | "In review" | "Action needed" | "Not available";

type CapabilityStatus = NonNullable<
  NonNullable<NonNullable<NonNullable<Stripe.V2.Core.Account["configuration"]>["merchant"]>["capabilities"]>["card_payments"]
>["status"];

const badges: Partial<Record<CapabilityStatus, Badge>> = {
  active: "Live",
  pending: "In review",
  restricted: "Action needed",
};

/**
 * The card payments badge for a connected account (a v2 account loaded with its merchant configuration),
 * from the status of the account's card_payments capability: active → "Live", pending → "In review",
 * restricted → "Action needed", anything else (or no capability) → "Not available".
 */
export function cardPaymentsBadge(account: Stripe.V2.Core.Account): Badge {
  const status = account.configuration?.merchant?.capabilities?.card_payments?.status;
  return (status && badges[status]) || "Not available";
}
