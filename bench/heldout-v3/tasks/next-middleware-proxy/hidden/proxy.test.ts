import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { join, parse } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
const req = createRequire(join(root, "package.json"));

/** Finds the request interceptor the way `next build` does, and loads it with Next's own static analysis. */
async function interceptor() {
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_PRODUCTION_BUILD } = req("next/dist/shared/lib/constants.js");
  const { MIDDLEWARE_FILENAME, PROXY_FILENAME } = req("next/dist/lib/constants.js");
  const { getFilesInDir } = req("next/dist/lib/get-files-in-dir.js");
  const config = await loadConfig(PHASE_PRODUCTION_BUILD, root, { silent: true });
  // The app directory is app/, so next build looks for the convention files next to it.
  const convention = (name: string) => new RegExp(`^${name}\\.(?:${config.pageExtensions.join("|")})$`);
  const files = [...(await getFilesInDir(root))] as string[];
  const middleware = files.filter((f) => convention(MIDDLEWARE_FILENAME).test(f));
  // next build warns that the middleware file convention is deprecated whenever such a file exists.
  assert.deepEqual(middleware, [], "next build reports no deprecated file convention");
  const proxy = files.find((f) => convention(PROXY_FILENAME).test(f));
  assert.ok(proxy, "next build finds a request interceptor for the app");
  const file = join(root, proxy);
  await req("next/dist/build/swc/install-bindings.js").installBindings();
  const { getPageStaticInfo } = req("next/dist/build/analysis/get-page-static-info.js");
  // Throws, as next build does, if the file doesn't export its handler or sets a runtime.
  const info = await getPageStaticInfo({ pageFilePath: file, nextConfig: config, isDev: false, page: `/${parse(proxy).name}`, pageType: "pages" });
  const { getMiddlewareRouteMatcher } = req("next/dist/shared/lib/router/utils/middleware-route-matcher.js");
  const matches = info.middleware?.matchers ? getMiddlewareRouteMatcher(info.middleware.matchers) : () => true;
  const mod = await load(pathToFileURL(file).href);
  const handler = mod.default ?? mod.proxy;
  assert.equal(typeof handler, "function", "the interceptor exports its handler");
  const { NextRequest } = req("next/server");
  /** Where a request for `path` ends up redirected to, or null if it reaches the route. */
  return async (path: string, cookie?: string): Promise<URL | null> => {
    const url = new URL(path, "https://app.example.com");
    const headers: Record<string, string> = cookie ? { cookie } : {};
    if (!matches(url.pathname, { headers }, Object.fromEntries(url.searchParams))) return null;
    const res: Response | undefined = await handler(new NextRequest(url, { headers }), { waitUntil() {}, sourcePage: "/proxy" });
    const location = res?.headers.get("location");
    return res && res.status >= 300 && res.status < 400 && location ? new URL(location, url) : null;
  };
}

test("signed-out visitors are sent to the login page from anything under /dashboard", async () => {
  const visit = await interceptor();
  for (const path of ["/dashboard", "/dashboard/export", "/dashboard/reports/weekly"]) {
    const target = await visit(path);
    assert.ok(target, `${path} redirects a signed-out visitor`);
    assert.equal(target.origin, "https://app.example.com");
    assert.equal(target.pathname, "/login", `${path} redirects to /login`);
    assert.equal(target.searchParams.get("from"), path, `${path} passes the requested path`);
  }
});

test("signed-in visitors and other pages are unaffected", async () => {
  const visit = await interceptor();
  assert.equal(await visit("/dashboard", "session=abc123"), null);
  assert.equal(await visit("/dashboard/export", "theme=dark; session=abc123"), null);
  for (const path of ["/", "/login", "/login?from=%2Fdashboard", "/pricing"]) assert.equal(await visit(path), null, `${path} is not redirected`);
});
