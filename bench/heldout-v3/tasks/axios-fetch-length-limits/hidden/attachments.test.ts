import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

const load = (id: string): Promise<any> => import(id);
const MB = 1024 * 1024;
const file = Buffer.from(Array.from({ length: 3 * MB }, (_, i) => i % 251));
const uploads = new Map<string, number>();
const json = (res: http.ServerResponse, body: unknown) => {
  const text = JSON.stringify(body);
  res.writeHead(200, { "content-type": "application/json", "content-length": Buffer.byteLength(text) });
  res.end(text);
};
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url ?? "");
  if (url.startsWith("/attachments/") && req.method === "GET") {
    res.writeHead(200, { "content-type": "application/octet-stream", "content-length": file.length });
    res.end(file);
  } else if (url.startsWith("/attachments/")) {
    let size = 0;
    req.on("data", (chunk: Buffer) => (size += chunk.length));
    req.on("end", () => {
      uploads.set(url.slice("/attachments/".length), size);
      json(res, { ok: true });
    });
  } else if (url === "/api/export") {
    json(res, { rows: Array.from({ length: 40_000 }, (_, i) => ({ id: i, name: `row ${i}` })) });
  } else {
    json(res, { projects: [{ id: 1, name: "Apollo" }] });
  }
});
let http_: any;
let att: any;
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.API_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  http_ = await load("../../src/http.ts");
  att = await load("../../src/attachments.ts");
});
after(() => server.close());

test("a 3 MB attachment downloads in full", async () => {
  const data = await att.downloadAttachment("report.pdf");
  assert.ok(Buffer.from(data).equals(file), "downloaded bytes differ from the attachment");
});

test("a 3 MB attachment uploads in full", async () => {
  await att.uploadAttachment("scan.png", file);
  assert.equal(uploads.get("scan.png"), file.length);
});

test("JSON API calls keep their size caps", async () => {
  const { data } = await http_.api.get("/api/projects");
  assert.equal(data.projects[0].name, "Apollo");
  await assert.rejects(http_.api.get("/api/export"), "a response over 512 KB from the JSON API is still rejected");
  await assert.rejects(http_.api.post("/api/import", file), "a request body over 512 KB to the JSON API is still rejected");
});
