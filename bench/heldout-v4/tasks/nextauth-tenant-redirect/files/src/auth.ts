import type { NextAuthOptions } from "next-auth";
import type { CredentialsConfig } from "next-auth/providers/credentials";
import { verifyPassword } from "./users";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  providers: [
    {
      id: "credentials",
      type: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) return null;
        const user = verifyPassword(credentials.email, credentials.password);
        return user ? { id: user.id, name: user.name, email: user.email } : null;
      },
    } satisfies CredentialsConfig,
  ],
};
