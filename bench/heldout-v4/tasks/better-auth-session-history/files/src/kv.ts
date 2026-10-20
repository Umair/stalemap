/** Our Redis-like key-value store. Production uses the Redis client; this in-process one is for development and tests. */
export interface KvStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  increment(key: string, ttlSeconds?: number): Promise<number>;
  getAndDelete(key: string): Promise<string | null>;
}

export function createMemoryKv(): KvStore {
  const entries = new Map<string, { value: string; expiresAt: number | null }>();
  const read = (key: string) => {
    const entry = entries.get(key);
    if (entry && entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      entries.delete(key);
      return undefined;
    }
    return entry;
  };
  return {
    async get(key) {
      return read(key)?.value ?? null;
    },
    async set(key, value, ttlSeconds) {
      entries.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null });
    },
    async delete(key) {
      entries.delete(key);
    },
    async increment(key, ttlSeconds) {
      const entry = read(key);
      const next = entry ? Number(entry.value) + 1 : 1;
      entries.set(key, { value: String(next), expiresAt: entry?.expiresAt ?? (ttlSeconds ? Date.now() + ttlSeconds * 1000 : null) });
      return next;
    },
    async getAndDelete(key) {
      const value = read(key)?.value ?? null;
      entries.delete(key);
      return value;
    },
  };
}
