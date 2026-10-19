import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
// A 1x1 PNG.
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
test("photos from the minio service load through the image optimizer", async (t) => {
  // Resolve the config and fetch the upstream image with Next's own code, as `next start` does.
  const configModule = await load("next/dist/server/config.js");
  const loadConfig = typeof configModule.default === "function" ? configModule.default : configModule.default.default;
  const { PHASE_PRODUCTION_SERVER } = await load("next/dist/shared/lib/constants.js");
  const { ImageOptimizerCache, fetchExternalImage } = await load("next/dist/server/image-optimizer.js");
  const config = await loadConfig(PHASE_PRODUCTION_SERVER, root, { silent: true });
  const params = ImageOptimizerCache.validateParams({ headers: { accept: "image/webp" } }, { url: "http://minio:9000/catalog/lamp-01.jpg", w: "828", q: "75" }, config, false);
  assert.equal(params.errorMessage, undefined, "next/image accepts photos from the minio service");
  // Inside the compose network `minio` resolves to a private address; a server on 127.0.0.1 stands in for it.
  const server = createServer((req, res) => {
    if (req.url === "/catalog/lamp-01.jpg") res.writeHead(200, { "content-type": "image/png" }).end(png);
    else res.writeHead(404).end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => server.close());
  const { port } = server.address() as AddressInfo;
  // The same call next-server makes for an absolute image URL, with the loaded config.
  const image = await fetchExternalImage(`http://127.0.0.1:${port}/catalog/lamp-01.jpg`, config.images.dangerouslyAllowLocalIP, config.images.maximumResponseBody, config.images.maximumRedirects);
  assert.equal(image.contentType, "image/png");
  assert.deepEqual(Buffer.from(image.buffer), png);
});
