import type { ApiSession } from "../api/session.ts";

declare module "next-auth" {
  // The browser session also carries the API token, so client code can call the API directly.
  // Its `expires` stays next-auth's own (an ISO date string), not the API's epoch milliseconds.
  interface Session extends Omit<ApiSession, "expires"> {}
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
  }
}
