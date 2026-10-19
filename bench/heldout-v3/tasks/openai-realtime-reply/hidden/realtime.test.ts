import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import https from "node:https";
import type { AddressInfo } from "node:net";
import type { Duplex } from "node:stream";
import { after, before, test } from "node:test";

// A local stand-in for the Realtime API: a wss:// server with a self-signed certificate.
const key = `-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgBaruqwF/U+b4gAOC
z+k/XKTTjGuiDp8467b1hH7yh/KhRANCAATVh6T1ZRk42A6HFiVv9DLC4zGxBnDa
3C8y/h8aDkl8KSpJ88jGKG7CXr82sgAknXnIEHBG2AT6TTAjimq/Poee
-----END PRIVATE KEY-----`;
const cert = `-----BEGIN CERTIFICATE-----
MIIBkDCCATagAwIBAgIUHRuqOqjnAnsfMalhhkrgpGURt9IwCgYIKoZIzj0EAwIw
FDESMBAGA1UEAwwJMTI3LjAuMC4xMCAXDTI2MTAxNzE5Mzk0NloYDzIxMjYwOTIz
MTkzOTQ2WjAUMRIwEAYDVQQDDAkxMjcuMC4wLjEwWTATBgcqhkjOPQIBBggqhkjO
PQMBBwNCAATVh6T1ZRk42A6HFiVv9DLC4zGxBnDa3C8y/h8aDkl8KSpJ88jGKG7C
Xr82sgAknXnIEHBG2AT6TTAjimq/Poeeo2QwYjAdBgNVHQ4EFgQUY0bvAlqpM6dR
hqEVrVqviqagOQ4wHwYDVR0jBBgwFoAUY0bvAlqpM6dRhqEVrVqviqagOQ4wDwYD
VR0TAQH/BAUwAwEB/zAPBgNVHREECDAGhwR/AAABMAoGCCqGSM49BAMCA0gAMEUC
IQC37CNF58jqW6JW1PrVrWcEKVZzsEOR6ZtEv2C8MIJqdgIgV7zjQcPzLeE/2Ubj
ZyKVwkpzARuy4hrs+OTv3DmcYeg=
-----END CERTIFICATE-----`;
const load = (id: string): Promise<any> => import(id);

function frame(text: string): Buffer {
  const data = Buffer.from(text);
  const head = data.length < 126 ? Buffer.from([0x81, data.length]) : Buffer.from([0x81, 126, data.length >> 8, data.length & 255]);
  return Buffer.concat([head, data]);
}

/** Reads the complete frames buffered in state.buf (client frames are masked). */
function* readFrames(state: { buf: Buffer }): Generator<{ op: number; text: string }> {
  while (state.buf.length >= 2) {
    let len = state.buf[1] & 127;
    let off = 2;
    if (len === 126) {
      if (state.buf.length < 4) return;
      len = state.buf.readUInt16BE(2);
      off = 4;
    } else if (len === 127) {
      if (state.buf.length < 10) return;
      len = Number(state.buf.readBigUInt64BE(2));
      off = 10;
    }
    const masked = (state.buf[1] & 128) !== 0;
    const total = off + (masked ? 4 : 0) + len;
    if (state.buf.length < total) return;
    const payload = Buffer.from(state.buf.subarray(off + (masked ? 4 : 0), total));
    if (masked) for (let i = 0; i < payload.length; i++) payload[i] ^= state.buf[off + (i % 4)];
    const op = state.buf[0] & 15;
    state.buf = state.buf.subarray(total);
    yield { op, text: payload.toString() };
  }
}

let reportError = false;
const received: unknown[] = [];
const sockets = new Set<Duplex>();
const server = https.createServer({ key, cert });

server.on("upgrade", (req, socket: Duplex) => {
  sockets.add(socket);
  socket.on("error", () => {});
  socket.on("close", () => sockets.delete(socket));
  const protocols = String(req.headers["sec-websocket-protocol"] ?? "").split(",").map((p) => p.trim());
  const beta = protocols.includes("openai-beta.realtime-v1");
  const accept = createHash("sha1").update(`${req.headers["sec-websocket-key"]}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
  socket.write(
    ["HTTP/1.1 101 Switching Protocols", "Upgrade: websocket", "Connection: Upgrade", `Sec-WebSocket-Accept: ${accept}`, ...(protocols.includes("realtime") ? ["Sec-WebSocket-Protocol: realtime"] : []), "", ""].join("\r\n"),
  );
  let n = 0;
  const send = (event: Record<string, unknown>) => socket.write(frame(JSON.stringify({ event_id: `event_${++n}`, ...event })));
  const session = { id: "sess_1", object: "realtime.session", model: "gpt-4o-realtime-preview", ...(beta ? { modalities: ["text", "audio"] } : { type: "realtime", output_modalities: ["audio"] }) };
  send({ type: "session.created", session });

  const reply = "Hello there";
  const textType = beta ? "text" : "output_text";
  const textEvent = beta ? "response.text" : "response.output_text";
  const ids = { response_id: "resp_1", item_id: "item_1", output_index: 0, content_index: 0 };
  const item = { id: "item_1", object: "realtime.item", type: "message", role: "assistant", status: "completed", content: [{ type: textType, text: reply }] };
  const respond = () => {
    const events: Record<string, unknown>[] = [
      { type: "response.created", response: { id: "resp_1", object: "realtime.response", status: "in_progress", output: [] } },
      ...(reportError
        ? [{ type: "error", error: { type: "invalid_request_error", code: "unknown_parameter", message: "Unknown parameter: 'session.tool_choice'.", param: "session.tool_choice", event_id: null } }]
        : []),
      { type: "response.output_item.added", response_id: "resp_1", output_index: 0, item: { ...item, status: "in_progress", content: [] } },
      { type: "response.content_part.added", ...ids, part: { type: textType, text: "" } },
      { type: `${textEvent}.delta`, ...ids, delta: "Hello " },
      { type: `${textEvent}.delta`, ...ids, delta: "there" },
      { type: `${textEvent}.done`, ...ids, text: reply },
      { type: "response.content_part.done", ...ids, part: { type: textType, text: reply } },
      { type: "response.output_item.done", response_id: "resp_1", output_index: 0, item },
      { type: "response.done", response: { id: "resp_1", object: "realtime.response", status: "completed", output: [item] } },
    ];
    // One event per write, a few milliseconds apart, as the API streams them.
    const next = () => {
      const event = events.shift();
      if (!event || socket.destroyed) return;
      send(event);
      setTimeout(next, 5);
    };
    next();
  };

  const state = { buf: Buffer.alloc(0) };
  socket.on("data", (chunk: Buffer) => {
    state.buf = Buffer.concat([state.buf, chunk]);
    for (const { op, text } of readFrames(state)) {
      if (op === 8) {
        socket.end(Buffer.from([0x88, 0]));
        return;
      }
      if (op !== 1) continue;
      const event = JSON.parse(text);
      received.push(event);
      if (event.type === "session.update") send({ type: "session.updated", session });
      if (event.type === "conversation.item.create") send({ type: "conversation.item.created", previous_item_id: null, item: { id: "item_0", ...event.item } });
      if (event.type === "response.create") setTimeout(respond, 10);
    }
  });
});

let ask: (client: unknown, question: string) => Promise<string>;
let OpenAI: any;
let baseURL = "";

before(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseURL = `https://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  process.env.OPENAI_API_KEY = "sk-test";
  process.env.OPENAI_BASE_URL = baseURL;
  OpenAI = (await load("openai")).default;
  ask = (await load("../../src/realtime.ts")).ask;
});

after(() => {
  for (const s of sockets) s.destroy();
  server.close();
});

const question = "What's the capital of Peru?";

test("returns the model's text reply", { timeout: 10_000 }, async () => {
  reportError = false;
  received.length = 0;
  const reply = await ask(new OpenAI({ apiKey: "sk-test", baseURL }), question);
  assert.equal(String(reply).trim(), "Hello there");
  assert.ok(JSON.stringify(received).includes("capital of Peru"), "the question is sent to the model");
});

test("still returns the reply when the API reports an error about one event", { timeout: 10_000 }, async () => {
  reportError = true;
  received.length = 0;
  const reply = await ask(new OpenAI({ apiKey: "sk-test", baseURL }), question);
  assert.equal(String(reply).trim(), "Hello there");
});
