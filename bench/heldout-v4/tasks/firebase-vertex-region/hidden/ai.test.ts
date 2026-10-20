import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

const load = (id: string): Promise<any> => import(id);

/** Local stand-in for the Firebase AI Logic API; only the Vertex AI Gemini API in europe-west1 answers. */
const paths: string[] = [];
const server = http.createServer((req, res) => {
  req.resume();
  req.on("end", () => {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    paths.push(path);
    const m = /^\/v1beta\/projects\/acme-eu\/locations\/europe-west1\/publishers\/google\/models\/[^/:]+:(generateContent|streamGenerateContent)$/.exec(path);
    if (!m) {
      res.writeHead(403, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: { code: 403, message: `not allowed by data-residency policy: ${path}`, status: "PERMISSION_DENIED" } }));
    }
    const chunk = { candidates: [{ index: 0, finishReason: "STOP", content: { role: "model", parts: [{ text: "Customer can't reset their password." }] } }] };
    if (m[1] === "streamGenerateContent") {
      res.writeHead(200, { "content-type": "text/event-stream" });
      return res.end(`data: ${JSON.stringify(chunk)}\r\n\r\n`);
    }
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(chunk));
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

test("ticket summaries go to the Vertex AI Gemini API in europe-west1", async () => {
  const { summarizeTicket } = await load("../../src/ai.ts");
  const summary = await summarizeTicket("Hi, I clicked 'forgot password' three times and never got an email. — Dana");
  assert.equal(summary, "Customer can't reset their password.", `requests went to: ${paths.join(", ")}`);
});
