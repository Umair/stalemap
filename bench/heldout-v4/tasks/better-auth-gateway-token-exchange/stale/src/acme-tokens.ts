import { createAuthorizationCodeRequest, createRefreshAccessTokenRequest, getOAuth2Tokens, type OAuth2Tokens } from "better-auth/oauth2";
import { gatewayFetch } from "./http.ts";

export const acmeOptions = {
  clientId: process.env.ACME_CLIENT_ID ?? "northwind-web",
  clientSecret: process.env.ACME_CLIENT_SECRET ?? "dev-acme-secret",
};

export function acmeTokenEndpoint(): string {
  return `${process.env.ACME_ISSUER ?? "https://id.acme.example"}/oauth2/token`;
}

async function postToken(request: { body: URLSearchParams; headers: Record<string, string> }): Promise<OAuth2Tokens> {
  const res = await gatewayFetch(acmeTokenEndpoint(), { method: "POST", body: request.body, headers: request.headers });
  if (!res.ok) throw new Error(`Acme ID token request failed: HTTP ${res.status}`);
  return getOAuth2Tokens(await res.json());
}

/** Exchanges an authorization code from the Acme ID callback for tokens. */
export async function exchangeCode(code: string, redirectURI: string, codeVerifier?: string): Promise<OAuth2Tokens> {
  return postToken(createAuthorizationCodeRequest({ code, redirectURI, codeVerifier, options: acmeOptions, authentication: "basic" }));
}

/** Gets fresh tokens for a stored refresh token. */
export async function refreshTokens(refreshToken: string): Promise<OAuth2Tokens> {
  return postToken(createRefreshAccessTokenRequest({ refreshToken, options: acmeOptions, authentication: "basic" }));
}
