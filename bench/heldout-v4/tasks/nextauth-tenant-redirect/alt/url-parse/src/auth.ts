import type { NextAuthOptions } from "next-auth";
import type { CredentialsConfig } from "next-auth/providers/credentials";
import { verifyPassword } from "./users";

const TENANT_HOST = /^(?:[a-z0-9-]+\.)*example\.com$/i;

function isAllowedRedirect(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && TENANT_HOST.test(hostname);
  } catch {
    return false;
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  callbacks: {
    redirect: async ({ url, baseUrl }) => (isAllowedRedirect(url) ? url : baseUrl),
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
