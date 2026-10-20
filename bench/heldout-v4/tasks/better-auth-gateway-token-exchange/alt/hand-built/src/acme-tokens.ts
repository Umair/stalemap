import type { OAuth2Tokens } from "better-auth/oauth2";
import { gatewayFetch } from "./http.ts";

export const acmeOptions = {
  clientId: process.env.ACME_CLIENT_ID ?? "northwind-web",
  clientSecret: process.env.ACME_CLIENT_SECRET ?? "dev-acme-secret",
};

export function acmeTokenEndpoint(): string {
  return `${process.env.ACME_ISSUER ?? "https://id.acme.example"}/oauth2/token`;
}

interface TokenResponse {
  token_type?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
}

async function tokenRequest(params: Record<string, string>): Promise<OAuth2Tokens> {
  const credentials = Buffer.from(`${acmeOptions.clientId}:${acmeOptions.clientSecret}`).toString("base64");
  const res = await gatewayFetch(acmeTokenEndpoint(), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json", authorization: `Basic ${credentials}` },
    body: new URLSearchParams(params),
  });
  if (!res.ok) throw new Error(`Acme ID token request failed: HTTP ${res.status}`);
  const data = (await res.json()) as TokenResponse;
  return {
    tokenType: data.token_type,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    accessTokenExpiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
    scopes: data.scope ? data.scope.split(" ") : [],
    idToken: data.id_token,
  };
}

export async function exchangeCode(code: string, redirectURI: string, codeVerifier?: string): Promise<OAuth2Tokens> {
  return tokenRequest({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectURI,
    ...(codeVerifier ? { code_verifier: codeVerifier } : {}),
  });
}

export async function refreshTokens(refreshToken: string): Promise<OAuth2Tokens> {
  return tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });
}
