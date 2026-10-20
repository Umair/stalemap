import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase.ts";

export type RedeemResult = { ok: true; discountPercent: number } | { ok: false; reason: string };

const redeemCouponFn = httpsCallable<{ code: string }, { discountPercent: number }>(functions, "redeemCoupon");

/**
 * Applies a coupon code at checkout.
 */
export async function redeemCoupon(code: string): Promise<RedeemResult> {
  throw new Error("not implemented");
}
