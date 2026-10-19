import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
// A 1x1 PNG.
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
test("photos behind a chain of 5 redirects load through the image optimizer", async (t) => {
  // Resolve the config and fetch the upstream image with Next's own code, as `next start` does.
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_PRODUCTION_SERVER } = await load("next/dist/shared/lib/constants.js");
  const { ImageOptimizerCache, fetchExternalImage } = await load("next/dist/server/image-optimizer.js");
  const config = await loadConfig(PHASE_PRODUCTION_SERVER, root, { silent: true });
  const params = ImageOptimizerCache.validateParams({ headers: { accept: "image/webp" } }, { url: "https://media.example.com/p/lamp-01", w: "828", q: "75" }, config, false);
  assert.equal(params.errorMessage, undefined, "next/image accepts photos from the media server");
  // A local stand-in for the media server: /p/lamp-01 -> /track -> /region -> /cdn -> /sign -> /files/lamp-01.png
  const hops: Record<string, string> = { "/p/lamp-01": "/track", "/track": "/region", "/region": "/cdn", "/cdn": "/sign", "/sign": "/files/lamp-01.png" };
  const server = createServer((req, res) => {
    const next = hops[req.url ?? ""];
    if (next) res.writeHead(302, { location: next }).end();
    else if (req.url === "/files/lamp-01.png") res.writeHead(200, { "content-type": "image/png" }).end(png);
    else res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;
  // The stand-in is on localhost, so allow local IPs for this fetch only.
  const image = await fetchExternalImage(`http://127.0.0.1:${port}/p/lamp-01`, true, config.images.maximumResponseBody, config.images.maximumRedirects);
  assert.equal(image.contentType, "image/png");
  assert.deepEqual(Buffer.from(image.buffer), png);
});
