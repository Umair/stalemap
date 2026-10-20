import type { NextAuthOptions } from "next-auth";
import type { CredentialsConfig } from "next-auth/providers/credentials";
import { verifyPassword } from "./users";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  callbacks: {
    // Send users back to the page they signed in from, on example.com or a tenant subdomain only.
    async redirect({ url, baseUrl }) {
      const target = new URL(url, baseUrl);
      const host = target.hostname;
      const ours = target.protocol === "https:" && (host === "example.com" || host.endsWith(".example.com"));
      return ours ? target.href : baseUrl;
    },
  },
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
