import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
// The CSP's directives as name -> sorted sources.
const directives = (csp: string | undefined) =>
  Object.fromEntries(
    (csp ?? "")
      .split(";")
      .map((d) => d.trim().split(/\s+/))
      .filter((parts) => parts[0])
      .map(([name, ...sources]) => [name.toLowerCase(), sources.sort()]),
  );
test("every route gets the security headers, and the app's own headers are kept", async () => {
  // Resolve the config and its headers with Next's own code, as `next build` does.
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_PRODUCTION_BUILD } = await load("next/dist/shared/lib/constants.js");
  const { default: loadCustomRoutesModule } = await load("next/dist/lib/load-custom-routes.js");
  const loadCustomRoutes = typeof loadCustomRoutesModule === "function" ? loadCustomRoutesModule : loadCustomRoutesModule.default;
  const { getPathMatch } = await load("next/dist/shared/lib/router/utils/path-match.js");
  const config = await loadConfig(PHASE_PRODUCTION_BUILD, root, { silent: true });
  const { headers } = await loadCustomRoutes(config);
  // The response headers Next sets for a path: every matching rule applies, later ones win.
  const responseHeaders = (path: string) => {
    const result: Record<string, string> = {};
    for (const rule of headers) {
      if (!getPathMatch(rule.source)(path)) continue;
      for (const { key, value } of rule.headers) result[key.toLowerCase()] = value;
    }
    return result;
  };
  for (const path of ["/", "/orders/ord_1/edit", "/api/orders"]) {
    const h = responseHeaders(path);
    const csp = directives(h["content-security-policy"]);
    assert.deepEqual(csp["default-src"], ["'self'"], `default-src on ${path}`);
    assert.deepEqual(csp["script-src"], ["'self'", "https://plausible.io"].sort(), `script-src on ${path}`);
    assert.equal(h["strict-transport-security"]?.replace(/\s+/g, " ").trim(), "max-age=63072000; includeSubDomains; preload", `HSTS on ${path}`);
    assert.equal(h["x-content-type-options"], "nosniff", `nosniff on ${path}`);
  }
  assert.equal(responseHeaders("/api/orders")["cache-control"], "no-store", "the API's own header is kept");
  assert.equal(responseHeaders("/")["cache-control"], undefined);
  assert.equal(config.poweredByHeader, false, "the other settings are kept");
});
