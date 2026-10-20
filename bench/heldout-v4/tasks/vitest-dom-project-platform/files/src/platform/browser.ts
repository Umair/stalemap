export const platform = "browser";

export const kv = {
  get: (key: string): string | null => window.localStorage.getItem(key),
  set: (key: string, value: string): void => window.localStorage.setItem(key, value),
};
