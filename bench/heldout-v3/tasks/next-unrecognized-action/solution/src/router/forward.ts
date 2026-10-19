/** Base URLs of the two Next.js deployments behind our router, e.g. http://10.0.0.12:3000. */
export interface Deployments {
  current: string;
  previous: string;
}

/** Sends an incoming request to a deployment and returns its response as is. */
async function send(request: Request, base: string, body?: ArrayBuffer): Promise<Response> {
  const url = new URL(request.url);
  return fetch(new URL(url.pathname + url.search, base), {
    method: request.method,
    headers: request.headers,
    body: body && body.byteLength > 0 ? body : undefined,
    redirect: "manual",
  });
}

/** Called by our router for every request to the shop. */
export async function forward(request: Request, deployments: Deployments): Promise<Response> {
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  const response = await send(request, deployments.current, body);
  // Next.js answers 409 (Conflict) when the Server Action ID isn't one this deployment knows.
  if (request.headers.has("next-action") && response.status === 409) {
    await response.body?.cancel();
    return send(request, deployments.previous, body);
  }
  return response;
}
