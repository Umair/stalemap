const memory = new Map<string, string>();

export const platform = "node";

export const kv = {
  get: (key: string): string | null => memory.get(key) ?? null,
  set: (key: string, value: string): void => void memory.set(key, value),
};
