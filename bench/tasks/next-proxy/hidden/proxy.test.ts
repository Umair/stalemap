import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { NextRequest } from "next/server";

const root = new URL("../../", import.meta.url);

test("redirects /old-blog/<slug> permanently and only matches /old-blog", async () => {
  const file = ["proxy.ts", "middleware.ts"].find((f) => existsSync(new URL(f, root)));
  assert.ok(file, "proxy.ts or middleware.ts exists at the project root");
  const mod = (await import(new URL(file!, root).href)) as Record<string, any>;
  const handler = mod.proxy ?? mod.middleware ?? mod.default;
  assert.equal(typeof handler, "function");
  const res = await handler(new NextRequest("http://localhost/old-blog/hello"));
  assert.ok([301, 308].includes(res.status), `permanent redirect (got ${res.status})`);
  assert.equal(new URL(res.headers.get("location")!).pathname, "/blog/hello");
  assert.match(JSON.stringify(mod.config?.matcher ?? ""), /old-blog/);
});
