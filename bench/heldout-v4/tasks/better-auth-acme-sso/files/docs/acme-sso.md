# Acme SSO: integration notes

Acme SSO is Acme's in-house OAuth 2.0 authorization server. It is plain OAuth 2.0 with the authorization code grant: there is no OpenID Connect discovery document and no `id_token`.

Base URL: `ACME_SSO_URL` (differs per environment). Client credentials: `ACME_CLIENT_ID` / `ACME_CLIENT_SECRET`.

| endpoint | path |
|---|---|
| authorization | `GET {ACME_SSO_URL}/oauth/authorize` |
| token | `POST {ACME_SSO_URL}/oauth/token` (client secret as HTTP Basic or in the form body) |
| user info | `GET {ACME_SSO_URL}/oauth/userinfo` with `Authorization: Bearer <access token>` |

Scopes: `profile email`.

The user info response looks like this:

```json
{ "id": "u-1042", "email": "kim.lee@acme.test", "email_verified": true, "name": "Kim Lee" }
```

Limitations: the server predates RFC 7636 and does not implement PKCE. It rejects, with `invalid_request`, any authorization request that carries `code_challenge` and any token request that carries `code_verifier`.

Use `acme` as the provider id in our apps.
