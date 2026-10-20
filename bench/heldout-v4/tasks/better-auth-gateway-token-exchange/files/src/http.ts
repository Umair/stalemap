/**
 * Acme ID is only reachable through our egress gateway, which identifies this service by the
 * x-egress-client header (production also attaches the mTLS identity here).
 */
export async function gatewayFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("x-egress-client", "northwind-web");
  return fetch(url, { ...init, headers });
}
