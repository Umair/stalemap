import { createHash } from "node:crypto";

export interface User {
  id: string;
  name: string;
  email: string;
  tenant: string;
  passwordSha256: string;
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// Demo data; production reads from the database.
export const users: User[] = [
  { id: "u1", name: "Ada", email: "ada@acme.test", tenant: "acme", passwordSha256: sha256("correct horse") },
  { id: "u2", name: "Grace", email: "grace@globex.test", tenant: "globex", passwordSha256: sha256("battery staple") },
];

export function verifyPassword(email: string, password: string): User | null {
  const user = users.find((u) => u.email === email.trim().toLowerCase());
  return user && user.passwordSha256 === sha256(password) ? user : null;
}
