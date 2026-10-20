import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

const load = (id: string): Promise<any> => import(id);

/** Local stand-in for the Firebase AI Logic API: server prompt templates only. */
const calls: { path: string; body: any }[] = [];
const server = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const body = raw ? JSON.parse(raw) : undefined;
    calls.push({ path: url.pathname, body });
    const m = /^\/v1beta\/projects\/acme-shop\/templates\/([^/:]+):template(Stream)?GenerateContent$/.exec(url.pathname);
    if (!m || m[1] !== "product-description") {
      res.writeHead(404, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { code: 404, message: `Template not found: ${url.pathname}`, status: "NOT_FOUND" } }));
      return;
    }
    const inputs = body?.inputs ?? {};
    const text = `${inputs.name} (${inputs.category}): ${Array.isArray(inputs.features) ? inputs.features.join(", ") : "?"}`;
    const chunk = { candidates: [{ index: 0, content: { role: "model", parts: [{ text }] }, finishReason: "STOP" }] };
    if (m[2]) {
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

test("the description comes from the product-description template", async () => {
  const { writeProductDescription } = await load("../../src/descriptions.ts");
  const text = await writeProductDescription({ name: "Trail Runner 2", category: "Shoes", features: ["waterproof", "260 g"] });
  assert.equal(text.trim(), "Trail Runner 2 (Shoes): waterproof, 260 g");
  const call = calls.find((c) => c.path.includes("/templates/product-description:"));
  assert.ok(call, `the product-description template wasn't called (calls: ${calls.map((c) => c.path).join(", ") || "none"})`);
  assert.deepEqual(call.body.inputs, { name: "Trail Runner 2", category: "Shoes", features: ["waterproof", "260 g"] });
});
