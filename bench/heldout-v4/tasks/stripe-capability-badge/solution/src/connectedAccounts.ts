import type Stripe from "stripe";

/** The badge in the "Card payments" column of the connected-accounts table. */
export type Badge = "Live" | "In review" | "Action needed" | "Not available";

/**
 * The card payments badge for a connected account (a v2 account loaded with its merchant configuration),
 * from the status of the account's card_payments capability:
 *
 * - active → "Live"
 * - pending → "In review"
 * - restricted → "Action needed"
 * - unsupported → "Not available"
 *
 * An account without the merchant configuration or without the capability shows "Not available".
 */
export function cardPaymentsBadge(account: Stripe.V2.Core.Account): Badge {
  const status = account.configuration?.merchant?.capabilities?.card_payments?.status;
  switch (status) {
    case "active":
      return "Live";
    case "pending":
      return "In review";
    case "restricted":
      return "Action needed";
    case "rejected":
    case "unsupported":
    case undefined:
      return "Not available";
  }
}
