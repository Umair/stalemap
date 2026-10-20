import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { build, createLogger, type Logger } from "vite";

test("the build outputs both pages, and the config loads without the config-loader warning", async () => {
  delete process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING;
  const warnings: string[] = [];
  const base = createLogger("silent");
  const logger: Logger = {
    ...base,
    warn: (msg) => void warnings.push(msg),
    warnOnce: (msg) => void warnings.push(msg),
    error: () => {},
    info: () => {},
  };
  const tmp = await mkdtemp(join(tmpdir(), "vite-pages-"));
  try {
    const result = await build({
      root: process.cwd(),
      customLogger: logger,
      cacheDir: join(tmp, "cache"),
      build: { write: false, outDir: join(tmp, "dist"), emptyOutDir: true, minify: false, sourcemap: false },
    });
    const outputs = (Array.isArray(result) ? result : [result]).flatMap((r: any) => r.output ?? []);
    const html = new Map(outputs.filter((o: any) => o.type === "asset" && o.fileName.endsWith(".html")).map((o: any) => [o.fileName, String(o.source)]));
    assert.deepEqual([...html.keys()].sort(), ["admin/index.html", "index.html"]);
    assert.match(html.get("admin/index.html")!, /Storefront admin/);
    const js = outputs.filter((o: any) => o.type === "chunk").map((o: any) => o.code).join("\n");
    assert.match(js, /admin-stock-table/);
    assert.match(js, /Canvas tote/);
    const loaderWarnings = warnings.filter((w) => /configLoader|config loader/i.test(w));
    assert.deepEqual(loaderWarnings, [], "loading vite.config.ts printed a warning");
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
});
