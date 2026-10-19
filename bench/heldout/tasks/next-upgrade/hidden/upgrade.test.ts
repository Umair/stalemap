import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { NextRequest } from "next/server";
import config from "../../next.config.ts";
const root = new URL("../../", import.meta.url);
test("Next 16 proxy convention, working redirect", async () => {
  assert.ok(existsSync(new URL("proxy.ts", root)), "proxy.ts at the project root");
  assert.ok(!existsSync(new URL("middleware.ts", root)), "middleware.ts replaced");
  const mod = (await import(new URL("proxy.ts", root).href)) as Record<string, any>;
  const handler = mod.proxy ?? mod.default;
  const res = await handler(new NextRequest("http://localhost/dashboard"));
  assert.equal(new URL(res.headers.get("location")!).pathname, "/login");
  assert.match(JSON.stringify(mod.config?.matcher), /dashboard/);
});
test("revalidation and config follow Next 16", () => {
  const src = readFileSync(new URL("src/actions.ts", root), "utf8");
  assert.match(src, /\b(revalidateTag\(\s*["'`]settings["'`]\s*,|updateTag\(\s*["'`]settings["'`])/);
  const c = config as Record<string, any>;
  assert.equal(c.cacheComponents, true);
  assert.equal(c.experimental?.ppr, undefined);
});
