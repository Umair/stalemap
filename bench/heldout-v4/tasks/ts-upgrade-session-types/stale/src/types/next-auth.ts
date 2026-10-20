import type { ApiSession } from "../api/session.ts";

declare module "next-auth" {
  // The browser session also carries the API token, so client code can call the API directly.
  interface Session extends ApiSession {
    accessToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    accessTokenExpires?: number;
  }
}
