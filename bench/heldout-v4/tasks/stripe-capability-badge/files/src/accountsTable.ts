import type Stripe from "stripe";
import { cardPaymentsBadge, type Badge } from "./connectedAccounts.ts";

export interface AccountRow {
  id: string;
  name: string;
  cardPayments: Badge;
}

/** One row of the connected-accounts table. */
export function accountRow(account: Stripe.V2.Core.Account): AccountRow {
  return { id: account.id, name: account.display_name ?? account.id, cardPayments: cardPaymentsBadge(account) };
}
