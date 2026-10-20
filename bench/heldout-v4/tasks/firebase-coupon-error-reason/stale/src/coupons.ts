import { FunctionsError, httpsCallable } from "firebase/functions";
import { functions } from "./firebase.ts";

export type RedeemResult = { ok: true; discountPercent: number } | { ok: false; reason: string };

const redeemCouponFn = httpsCallable<{ code: string }, { discountPercent: number }>(functions, "redeemCoupon");

/** Codes the function uses when it turns a coupon down (anything else is an outage or a bug). */
const REJECTIONS = new Set(["functions/invalid-argument", "functions/failed-precondition", "functions/not-found", "functions/already-exists", "functions/out-of-range"]);

/**
 * Applies a coupon code at checkout.
 */
export async function redeemCoupon(code: string): Promise<RedeemResult> {
  try {
    const { data } = await redeemCouponFn({ code });
    return { ok: true, discountPercent: data.discountPercent };
  } catch (err) {
    if (err instanceof FunctionsError && REJECTIONS.has(err.code)) {
      return { ok: false, reason: err.message };
    }
    throw err;
  }
}
