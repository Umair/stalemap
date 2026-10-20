import type { BetterAuthPlugin } from "better-auth";
import { createAuthorizationURL, validateAuthorizationCode } from "better-auth/oauth2";
import { createRemoteJWKSet, decodeJwt, jwtVerify } from "jose";

/** Claims Acme SSO puts in its OpenID Connect id_tokens. */
export interface AcmeClaims {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
}

export interface AcmeOptions {
  /** Acme SSO's issuer URL, e.g. https://sso.acme.example (no trailing slash). */
  issuer: string;
  clientId: string;
  clientSecret: string;
}

/** Sign in with Acme SSO (OpenID Connect). Registered as the social provider "acme". */
export function acme(options: AcmeOptions) {
  const jwks = createRemoteJWKSet(new URL(`${options.issuer}/.well-known/jwks.json`));
  const provider = {
    id: "acme",
    name: "Acme SSO",
    options: { clientId: options.clientId, clientSecret: options.clientSecret },
    createAuthorizationURL({ state, scopes, codeVerifier, redirectURI }: { state: string; scopes?: string[]; codeVerifier: string; redirectURI: string }) {
      return createAuthorizationURL({
        id: "acme",
        options,
        authorizationEndpoint: `${options.issuer}/oauth/authorize`,
        scopes: ["openid", "email", "profile", ...(scopes ?? [])],
        state,
        codeVerifier,
        redirectURI,
      });
    },
    validateAuthorizationCode({ code, codeVerifier, redirectURI }: { code: string; codeVerifier?: string; redirectURI: string }) {
      return validateAuthorizationCode({
        code,
        codeVerifier,
        redirectURI,
        options,
        tokenEndpoint: `${options.issuer}/oauth/token`,
      });
    },
    // Acme puts everything we need in the id_token, for the redirect flow and for tokens from the mobile app.
    async getUserInfo(tokens: { idToken?: string }) {
      if (!tokens.idToken) return null;
      const claims = decodeJwt(tokens.idToken) as unknown as AcmeClaims;
      return {
        user: { email: claims.email, emailVerified: claims.email_verified, name: claims.name },
        data: claims,
      };
    },
    accountSubject: ({ profile }: { profile: object }) => (profile as AcmeClaims).sub,
    // Tokens the mobile app obtained from Acme directly.
    async verifyIdToken(token: string, nonce?: string) {
      try {
        const { payload } = await jwtVerify(token, jwks, { issuer: options.issuer, audience: options.clientId });
        return !nonce || payload.nonce === nonce;
      } catch {
        return false;
      }
    },
  };

  return {
    id: "acme-sso",
    init(ctx) {
      ctx.socialProviders.unshift(provider);
    },
  } satisfies BetterAuthPlugin;
}
