import type { OAuth2Tokens } from "better-auth/oauth2";
import { gatewayFetch } from "./http.ts";

export const acmeOptions = {
  clientId: process.env.ACME_CLIENT_ID ?? "northwind-web",
  clientSecret: process.env.ACME_CLIENT_SECRET ?? "dev-acme-secret",
};

export function acmeTokenEndpoint(): string {
  return `${process.env.ACME_ISSUER ?? "https://id.acme.example"}/oauth2/token`;
}

/** Exchanges an authorization code from the Acme ID callback for tokens. */
export async function exchangeCode(code: string, redirectURI: string, codeVerifier?: string): Promise<OAuth2Tokens> {
  void gatewayFetch;
  throw new Error("not implemented");
}

/** Gets fresh tokens for a stored refresh token. */
export async function refreshTokens(refreshToken: string): Promise<OAuth2Tokens> {
  throw new Error("not implemented");
}
