import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import type { Server } from "node:http";
import { createRequire } from "node:module";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const root = fileURLToPath(new URL("../../", import.meta.url));

async function run(cmd: string, args: string[]): Promise<void> {
  try {
    await promisify(execFile)(cmd, args, { cwd: root, timeout: 30_000 });
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string };
    assert.fail(`${[cmd, ...args].join(" ")} failed:\n${e.stdout ?? ""}${e.stderr ?? ""}`);
  }
}

test("npm run build produces a dist/ that serves the API", async () => {
  await rm(join(root, "dist"), { recursive: true, force: true });
  let server: Server | undefined;
  try {
    // The steps of `npm run build`.
    await run(join(root, "node_modules", ".bin", "tsc"), ["-p", "tsconfig.json"]);
    await run(process.execPath, ["scripts/mark-cjs.mjs"]);
    const { createApp } = createRequire(join(root, "package.json"))(join(root, "dist", "app.js"));
    const app = createApp();
    server = await new Promise<Server>((resolve) => {
      const s: Server = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const address = server.address();
    const base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
    assert.deepEqual(await (await fetch(`${base}/health`)).json(), { ok: true });
    const created = await fetch(`${base}/todos`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Ship it" }) });
    assert.equal(created.status, 201);
    assert.deepEqual(await created.json(), { id: 1, title: "Ship it", done: false });
    assert.deepEqual(await (await fetch(`${base}/todos`)).json(), [{ id: 1, title: "Ship it", done: false }]);
  } finally {
    await new Promise((resolve) => (server ? server.close(resolve) : resolve(undefined)));
    await rm(join(root, "dist"), { recursive: true, force: true });
  }
});
