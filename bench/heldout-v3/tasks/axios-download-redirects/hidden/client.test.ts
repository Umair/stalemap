import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

const load = (id: string): Promise<any> => import(id);
const file = Buffer.from(Array.from({ length: 64 * 1024 }, (_, i) => (i * 7) % 256));
let sessionExpired = false;
const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (url.pathname === "/files/report-7/download") {
    // Download links redirect to a signed storage URL.
    res.writeHead(302, { location: "/storage/blobs/9f2c?sig=abc123" });
    res.end();
  } else if (url.pathname === "/storage/blobs/9f2c" && url.searchParams.get("sig") === "abc123") {
    res.writeHead(200, { "content-type": "application/octet-stream", "content-length": file.length });
    res.end(file);
  } else if (url.pathname === "/api/me" && sessionExpired) {
    res.writeHead(302, { location: "/login" });
    res.end();
  } else if (url.pathname === "/api/me") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ id: 7, name: "Ada" }));
  } else if (url.pathname === "/login") {
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<!doctype html><title>Sign in</title>");
  } else {
    res.writeHead(404);
    res.end();
  }
});

let client: any;
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.API_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  client = await load("../../src/client.ts");
});
after(() => server.close());

test("file downloads arrive in full", async () => {
  const data = await client.downloadFile("report-7");
  assert.ok(Buffer.from(data).equals(file), "downloaded bytes differ from the file");
});

test("API calls work and still report an expired session", async () => {
  sessionExpired = false;
  assert.deepEqual(await client.getProfile(), { id: 7, name: "Ada" });
  sessionExpired = true;
  await assert.rejects(client.getProfile(), client.SessionExpiredError);
});
