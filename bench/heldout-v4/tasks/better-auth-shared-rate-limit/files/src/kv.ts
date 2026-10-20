/**
 * Our shared key-value store. Production uses the Redis-backed client from the platform package;
 * this module defines the interface every client implements, plus the in-process implementation
 * used in development and tests.
 */
export interface KvStore {
  get(key: string): Promise<string | null>;
  /** Stores a value; with `ttlSeconds` the key expires after that many seconds. */
  set(key: string, value: string, options?: { ttlSeconds?: number }): Promise<void>;
  /**
   * Atomically adds 1 to the integer stored at `key` and returns the new value. A missing or
   * expired key starts at 0; `ttlSeconds` sets its expiry only when the key is created.
   */
  incr(key: string, options?: { ttlSeconds?: number }): Promise<number>;
  /** Seconds until `key` expires, or null if it has no expiry or doesn't exist. */
  ttl(key: string): Promise<number | null>;
  del(key: string): Promise<void>;
}

export function createMemoryKv(now: () => number = Date.now): KvStore {
  const entries = new Map<string, { value: string; expiresAt: number | null }>();
  const live = (key: string) => {
    const entry = entries.get(key);
    if (entry && entry.expiresAt !== null && entry.expiresAt <= now()) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  };
  return {
    async get(key) {
      return live(key)?.value ?? null;
    },
    async set(key, value, options) {
      entries.set(key, { value, expiresAt: options?.ttlSeconds ? now() + options.ttlSeconds * 1000 : null });
    },
    async incr(key, options) {
      const entry = live(key);
      if (!entry) {
        entries.set(key, { value: "1", expiresAt: options?.ttlSeconds ? now() + options.ttlSeconds * 1000 : null });
        return 1;
      }
      const next = Number(entry.value) + 1;
      entry.value = String(next);
      return next;
    },
    async ttl(key) {
      const entry = live(key);
      if (!entry || entry.expiresAt === null) return null;
      return Math.ceil((entry.expiresAt - now()) / 1000);
    },
    async del(key) {
      entries.delete(key);
    },
  };
}
