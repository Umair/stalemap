import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

/** Runs the agent's handler on a real custom-server `next()` instance and records what reaches Next's router. */
async function serve(maintenance: boolean, paths: string[]) {
  const nextModule = await load("next");
  const next = typeof nextModule.default === "function" ? nextModule.default : nextModule.default.default;
  const app = next({ dev: false, dir: root });
  const routed: string[] = [];
  // app.prepare() needs a production build; stand in for the router it sets up. Every custom-server method
  // of `app` still runs Next's own code before handing the request over.
  app.init = {
    requestHandler: async (req: any, res: any) => {
      routed.push(req.url);
      res.end("rendered by next");
    },
    upgradeHandler: async () => {},
    server: {},
  };
  const messages: string[] = [];
  const original = { warn: console.warn, error: console.error, log: console.log };
  for (const k of ["warn", "error", "log"] as const) console[k] = (...args: unknown[]) => void messages.push(args.map(String).join(" "));
  const { createHandler } = await load("../../src/server/handler.ts");
  const server = createServer(createHandler(app, { maintenance }));
  const statuses: number[] = [];
  try {
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
    const { port } = server.address() as { port: number };
    for (const path of paths) {
      const res = await fetch(`http://127.0.0.1:${port}${path}`, { redirect: "manual" });
      await res.text();
      statuses.push(res.status);
    }
  } finally {
    Object.assign(console, original);
    await new Promise((resolve) => server.close(resolve));
  }
  return { routed: routed.map((u) => new URL(u, "http://localhost")), statuses, messages };
}

test("maintenance mode serves the maintenance page in place, and assets as usual", async () => {
  const { routed, statuses, messages } = await serve(true, ["/products/42?ref=mail", "/_next/static/chunks/main.js"]);
  assert.ok(statuses.every((s) => s < 300 || s >= 400), `no redirects (statuses ${statuses})`);
  assert.equal(routed.length, 2, "both requests are handed to Next");
  assert.equal(routed[0].pathname, "/maintenance", "a page request renders /maintenance");
  assert.equal(routed[1].pathname, "/_next/static/chunks/main.js", "assets are served as requested");
  const deprecations = messages.filter((m) => /deprecat/i.test(m));
  assert.deepEqual(deprecations, [], "the server uses no deprecated Next.js APIs");
});

test("without maintenance mode every request goes through unchanged", async () => {
  const { routed } = await serve(false, ["/products/42?ref=mail"]);
  assert.equal(routed.length, 1);
  assert.equal(routed[0].pathname + routed[0].search, "/products/42?ref=mail");
});
