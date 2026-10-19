import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);
const req = createRequire(join(root, "package.json"));

const KNOWN = "40c1e5a0b7f2d9e8c3a6b5f4e1d0c9b8a7f6e5d4c3";
const FAILING = "40a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0";
const REMOVED = "407f3a9c2e5b1d4f6a8c0e2b4d6f8a1c3e5b7d9f0a";

// Next's own Server Action handler decides how the current deployment answers an action it doesn't have.
const { setManifestsSingleton } = req("next/dist/server/app-render/manifests-singleton.js");
const { handleAction } = req("next/dist/server/app-render/action-handler.js");
const emptyClientManifest = { clientModules: {}, ssrModuleMapping: {}, edgeSSRModuleMapping: {}, entryCSSFiles: {}, entryJSFiles: {}, rscModuleMapping: {}, edgeRscModuleMapping: {}, moduleLoading: { prefix: "", crossOrigin: null } };
setManifestsSingleton({ page: "/checkout/page", clientReferenceManifest: emptyClientManifest, serverActionsManifest: { node: {}, edge: {}, encryptionKey: "" } });

async function unrecognizedAction(request: IncomingMessage, res: ServerResponse) {
  const headers: Record<string, string> = {};
  let status = 200;
  const fakeRes = { setHeader: (k: string, v: string) => void (headers[k] = v), get statusCode() { return status; }, set statusCode(v: number) { status = v; } };
  const warn = console.warn;
  console.warn = () => {};
  try {
    const result = await handleAction({ req: { method: request.method, headers: request.headers }, res: fakeRes, ComponentMod: {}, generateFlight: null, workStore: {}, requestStore: {}, serverActions: {}, ctx: { renderOpts: { page: "/checkout/page", basePath: "" } }, metadata: {} });
    res.writeHead(status, headers).end(result.result.toUnchunkedString());
  } finally {
    console.warn = warn;
  }
}

interface Seen { method?: string; url?: string; action?: string; body: string }

async function listen(handler: (req: IncomingMessage, body: string, res: ServerResponse) => unknown) {
  const seen: Seen[] = [];
  const server: Server = createServer(async (r, res) => {
    const chunks: Buffer[] = [];
    for await (const c of r) chunks.push(c as Buffer);
    const body = Buffer.concat(chunks).toString();
    seen.push({ method: r.method, url: r.url, action: r.headers["next-action"] as string | undefined, body });
    await handler(r, body, res);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as { port: number };
  return { base: `http://127.0.0.1:${port}`, seen, close: () => new Promise((resolve) => server.close(resolve)) };
}

async function setup() {
  const current = await listen((r, _body, res) => {
    const action = r.headers["next-action"];
    if (action === KNOWN) return res.writeHead(200, { "content-type": "text/x-component" }).end("current:ok");
    if (action === FAILING) return res.writeHead(500, { "content-type": "text/x-component" }).end("current:failed");
    if (typeof action === "string") return unrecognizedAction(r, res);
    if (r.url === "/api/orders") return res.writeHead(409, { "content-type": "application/json" }).end('{"error":"duplicate order"}');
    return res.writeHead(404, { "content-type": "text/html" }).end("<h1>Not found</h1>");
  });
  const previous = await listen((_r, body, res) => res.writeHead(200, { "content-type": "text/x-component" }).end(`previous:${body}`));
  const { forward } = await load("../../src/router/forward.ts");
  const call = (path: string, init: RequestInit) => forward(new Request(`https://shop.example.com${path}`, init), { current: current.base, previous: previous.base }) as Promise<Response>;
  return { current, previous, call, close: () => Promise.all([current.close(), previous.close()]) };
}

const action = (id: string, body: string): RequestInit => ({ method: "POST", headers: { "next-action": id, "content-type": "text/plain;charset=UTF-8", accept: "text/x-component", origin: "https://shop.example.com" }, body });

test("a Server Action the current deployment doesn't have is replayed on the previous one", async () => {
  const s = await setup();
  try {
    const res = await s.call("/checkout?step=pay", action(REMOVED, '["item-42"]'));
    assert.equal(res.status, 200);
    assert.equal(await res.text(), 'previous:["item-42"]');
    assert.equal(s.previous.seen.length, 1, "replayed once on the previous deployment");
    assert.deepEqual(s.previous.seen[0], { method: "POST", url: "/checkout?step=pay", action: REMOVED, body: '["item-42"]' });
  } finally {
    await s.close();
  }
});

test("every other response from the current deployment is passed through", async () => {
  const s = await setup();
  try {
    const ok = await s.call("/checkout", action(KNOWN, '["item-42"]'));
    assert.equal(ok.status, 200);
    assert.equal(await ok.text(), "current:ok");
    const failed = await s.call("/checkout", action(FAILING, "[]"));
    assert.equal(failed.status, 500);
    assert.equal(await failed.text(), "current:failed");
    const conflict = await s.call("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: '{"sku":"item-42"}' });
    assert.equal(conflict.status, 409);
    assert.equal(await conflict.text(), '{"error":"duplicate order"}');
    const missing = await s.call("/nope", { method: "GET" });
    assert.equal(missing.status, 404);
    await missing.text();
    assert.equal(s.previous.seen.length, 0, "the previous deployment isn't asked");
  } finally {
    await s.close();
  }
});
