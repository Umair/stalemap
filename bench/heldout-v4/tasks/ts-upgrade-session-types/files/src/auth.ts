import type { NextAuthOptions, Session, User } from "next-auth";
import { authHeaders, isExpired, type ApiSession } from "./api/session.ts";
import "./types/next-auth.ts";

/** The user our API's /auth/token endpoint returns, with the token it issued. */
export type SignedInUser = User & { accessToken: ApiSession["accessToken"]; accessTokenExpires: ApiSession["expires"] };

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  // The credentials provider that calls /auth/token is added in app/api/auth/[...nextauth]/route.ts.
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const signedIn = user as SignedInUser;
        token.accessToken = signedIn.accessToken;
        token.accessTokenExpires = signedIn.accessTokenExpires;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken ?? "";
      return session;
    },
  },
};

/** Headers for API calls made with the user's session, or undefined when the token has run out. */
export function apiHeaders(session: Session, tokenExpires: number, now = Date.now()): Record<string, string> | undefined {
  if (!session.accessToken || isExpired({ expires: tokenExpires }, now)) return undefined;
  return authHeaders(session);
}
