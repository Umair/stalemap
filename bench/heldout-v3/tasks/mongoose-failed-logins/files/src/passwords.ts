import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 32;

/** Used by the seed script and the admin CLI. */
export function hashPasswordSync(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, KEY_LENGTH).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string, callback: (err: Error | null, ok?: boolean) => void): void {
  const [salt, hash] = stored.split(":");
  scrypt(password, salt, KEY_LENGTH, (err, key) => {
    if (err) return callback(err);
    callback(null, timingSafeEqual(key, Buffer.from(hash, "hex")));
  });
}
