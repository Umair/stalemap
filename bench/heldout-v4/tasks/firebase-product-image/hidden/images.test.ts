import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

const load = (id: string): Promise<any> => import(id);

// A tiny PNG standing in for the generated photo.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64").toString("base64");

/** Local stand-in for the Firebase AI Logic API: image-capable models answer with an image. */
const calls: { model: string; method: string; body: any }[] = [];
const server = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const m = /^\/v1beta\/projects\/acme-shop\/models\/([^/:]+):(\w+)/.exec(req.url ?? "");
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (!m) return json(404, { error: { code: 404, message: "not found", status: "NOT_FOUND" } });
    const [, model, method] = m;
    const body = raw ? JSON.parse(raw) : undefined;
    calls.push({ model, method, body });
    if (!/image/.test(model)) return json(400, { error: { code: 400, message: `${model} can't generate images`, status: "INVALID_ARGUMENT" } });
    if (method === "predict") return json(200, { predictions: [{ mimeType: "image/png", bytesBase64Encoded: PNG }] });
    const chunk = {
      candidates: [{ index: 0, finishReason: "STOP", content: { role: "model", parts: [{ text: "Here is your product photo." }, { inlineData: { mimeType: "image/png", data: PNG } }] } }],
    };
    if (method === "streamGenerateContent") {
      res.writeHead(200, { "content-type": "text/event-stream" });
      return res.end(`data: ${JSON.stringify(chunk)}\r\n\r\n`);
    }
    if (method === "generateContent") return json(200, chunk);
    return json(404, { error: { code: 404, message: `unknown method ${method}`, status: "NOT_FOUND" } });
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

test("a product photo is generated from the description", async () => {
  const { generateProductPhoto } = await load("../../src/images.ts");
  const image = await generateProductPhoto("a matte black stainless steel water bottle, 750 ml");
  assert.equal(image.mimeType, "image/png");
  assert.equal(image.data, PNG);
  const call = calls.find((c) => /image/.test(c.model));
  assert.ok(call, "no image model was called");
  assert.match(JSON.stringify(call.body), /matte black stainless steel water bottle/, "the description is in the prompt");
});
