import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

const load = (id: string): Promise<any> => import(id);

/** Local stand-in for the Firebase AI Logic API. Node has no on-device model, so hybrid requests come here. */
const models: string[] = [];
const server = http.createServer((req, res) => {
  req.resume();
  req.on("end", () => {
    const m = /^\/v1beta\/projects\/acme-notes\/models\/([^/:]+):(generateContent|streamGenerateContent)/.exec(req.url ?? "");
    if (!m) {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { code: 404, message: "not found", status: "NOT_FOUND" } }));
      return;
    }
    models.push(m[1]);
    const chunk = { candidates: [{ index: 0, content: { role: "model", parts: [{ text: "Buy oat milk and eggs." }] }, finishReason: "STOP" }] };
    if (m[2] === "streamGenerateContent") {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(`data: ${JSON.stringify(chunk)}\r\n\r\n`);
    } else {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(chunk));
    }
  });
});

const realFetch = globalThis.fetch;
before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const local = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  globalThis.fetch = ((input: any, init?: any) => {
    const url = String(input instanceof Request ? input.url : input);
    return realFetch(url.replace(/^https:\/\/firebasevertexai\.googleapis\.com/, local), init);
  }) as typeof fetch;
});
after(() => {
  globalThis.fetch = realFetch;
  server.close();
});

test("cloud summaries use the same model as on firebase 12.14", async () => {
  const { summarizeNote } = await load("../../src/assistant.ts");
  const summary = await summarizeNote("Groceries: oat milk, eggs. Don't forget!");
  assert.equal(summary, "Buy oat milk and eggs.");
  assert.ok(models.length > 0, "no request reached the cloud model");
  assert.deepEqual([...new Set(models)], ["gemini-2.5-flash-lite"]);
});
