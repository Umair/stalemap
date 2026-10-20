import { httpsCallable, type FunctionsError } from "firebase/functions";
import { functions } from "./firebase.ts";

export type RedeemResult = { ok: true; discountPercent: number } | { ok: false; reason: string };

const redeemCouponFn = httpsCallable<{ code: string }, { discountPercent: number }>(functions, "redeemCoupon");

/**
 * Applies a coupon code at checkout.
 */
export async function redeemCoupon(code: string): Promise<RedeemResult> {
  let result;
  try {
    result = await redeemCouponFn({ code });
  } catch (error) {
    const err = error as FunctionsError;
    if (err?.name === "FirebaseError" && typeof err.code === "string" && /^functions\/(invalid-argument|failed-precondition|not-found|already-exists|out-of-range)$/.test(err.code)) {
      const status = err.message.lastIndexOf(" [");
      return { ok: false, reason: status >= 0 && err.message.endsWith("]") ? err.message.slice(0, status) : err.message };
    }
    throw error;
  }
  return { ok: true, discountPercent: result.data.discountPercent };
}
