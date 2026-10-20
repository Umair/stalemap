import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";

const load = (id: string): Promise<any> => import(id);

/** Local stand-in for the Firebase AI Logic API; replies with how many user turns the request carried. */
const requests: any[] = [];
const server = http.createServer((req, res) => {
  let raw = "";
  req.on("data", (c) => (raw += c));
  req.on("end", () => {
    const m = /^\/v1beta\/projects\/acme-help\/models\/([^/:]+):(generateContent|streamGenerateContent)/.exec(req.url ?? "");
    if (!m) {
      res.writeHead(404, { "content-type": "application/json" });
      return res.end(JSON.stringify({ error: { code: 404, message: "not found", status: "NOT_FOUND" } }));
    }
    const body = JSON.parse(raw);
    requests.push(body);
    const turns = (body.contents ?? []).filter((c: any) => c.role === "user").length;
    const chunk = { candidates: [{ index: 0, finishReason: "STOP", content: { role: "model", parts: [{ text: `turns=${turns}` }] } }] };
    if (m[2] === "streamGenerateContent") {
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

test("questions asked in a chat continue the conversation", async () => {
  const { ask, helpModel } = await load("../../src/help.ts");
  const chat = helpModel.startChat();
  assert.equal((await ask(chat, "How do I reset my password?")).trim(), "turns=1");
  assert.equal((await ask(chat, "And if I no longer have that email?")).trim(), "turns=2");
  const history = await chat.getHistory();
  assert.equal(history.length, 4, "both questions and answers are in the chat history");
});

test("questions asked of the model are one-off", async () => {
  const { ask, helpModel } = await load("../../src/help.ts");
  assert.equal((await ask(helpModel, "What are your opening hours?")).trim(), "turns=1");
  assert.equal((await ask(helpModel, "Do you ship to Canada?")).trim(), "turns=1");
});
