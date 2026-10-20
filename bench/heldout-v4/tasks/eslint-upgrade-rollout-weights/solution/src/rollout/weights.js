// Traffic splits for feature rollouts, e.g. { control: 90, newCheckout: 10 }.

// Weights at or below this are treated as switched off.
const OFF = 0;
// A total this close to 1 is already normalized.
const TOLERANCE = 0;

/** Drops switched-off variants and scales the rest so they add up to 1. */
export function normalize(weights) {
  const live = Object.entries(weights).filter(([, w]) => w > OFF);
  const total = live.reduce((sum, [, w]) => sum + w, 0);
  if (live.length === 0 || total <= 0) throw new Error("A rollout needs at least one variant with weight above 0");
  if (Math.abs(total - 1) <= TOLERANCE) return Object.fromEntries(live);
  return Object.fromEntries(live.map(([name, w]) => [name, w / total]));
}

/** The variant a user lands in, for a stable bucket value in [0, 1). */
export function pick(weights, bucket) {
  const split = Object.entries(normalize(weights));
  let edge = 0;
  for (const [name, share] of split) {
    edge += share;
    if (bucket < edge) return name;
  }
  return split[split.length - 1][0];
}

/** A stable bucket in [0, 1) for a user id (FNV-1a). */
export function bucketFor(userId) {
  let hash = 0x811c9dc5;
  for (const ch of userId) {
    hash ^= ch.codePointAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash / 2 ** 32;
}
