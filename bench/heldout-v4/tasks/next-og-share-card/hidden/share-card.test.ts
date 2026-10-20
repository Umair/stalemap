import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
const req = createRequire(join(root, "package.json"));
const routeFile = join(root, "app", "api", "og", "route.tsx");

async function get(query: string): Promise<{ status: number; type: string | null; png: Buffer }> {
  const { NextRequest } = req("next/server");
  const { GET } = await load(pathToFileURL(routeFile).href);
  const res: Response = await GET(new NextRequest(`https://blog.example.com/api/og${query}`), { params: Promise.resolve({}) });
  return { status: res.status, type: res.headers.get("content-type"), png: Buffer.from(await res.arrayBuffer()) };
}
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const dimensions = (png: Buffer) => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) });

test("the route returns a 1200x630 PNG for the title", async () => {
  const hello = await get("?title=Hello%2C%20world");
  assert.equal(hello.status, 200);
  assert.match(hello.type ?? "", /^image\/png/);
  assert.ok(hello.png.subarray(0, 8).equals(PNG), "the body is a PNG");
  assert.deepEqual(dimensions(hello.png), { width: 1200, height: 630 });
  const other = await get("?title=How%20we%20ship%20twice%20a%20day");
  assert.ok(!other.png.equals(hello.png), "the card shows the requested title");
  const fallback = await get("");
  assert.equal(fallback.status, 200);
  assert.deepEqual(dimensions(fallback.png), { width: 1200, height: 630 });
});

test("next build accepts the route without warnings", async () => {
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_PRODUCTION_BUILD } = req("next/dist/shared/lib/constants.js");
  const config = await loadConfig(PHASE_PRODUCTION_BUILD, root, { silent: true });
  await req("next/dist/build/swc/install-bindings.js").installBindings();
  const { getPageStaticInfo } = req("next/dist/build/analysis/get-page-static-info.js");
  const messages: string[] = [];
  const original = { warn: console.warn, error: console.error, log: console.log };
  for (const k of ["warn", "error", "log"] as const) console[k] = (...args: unknown[]) => void messages.push(args.map(String).join(" "));
  try {
    // The analysis next build runs on every route while collecting page data.
    await getPageStaticInfo({ pageFilePath: routeFile, nextConfig: config, isDev: false, page: "/api/og/route", pageType: "app" });
  } finally {
    Object.assign(console, original);
  }
  const warnings = messages.filter((m) => /deprecat|warn|⚠/i.test(m));
  assert.deepEqual(warnings, [], "next build prints no warnings for the route");
});
