import assert from "node:assert/strict";
import { test } from "node:test";
import { spawn } from "node:child_process";
import { cp, mkdtemp, readdir, realpath, rename, rm, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));

function run(cwd: string, args: string[]) {
  const child = spawn(process.execPath, [join(cwd, "node_modules", "next", "dist", "bin", "next"), ...args], {
    cwd,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", NODE_ENV: "production" },
  });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  const exited = new Promise<number | null>((resolve) => child.on("close", (code) => resolve(code)));
  return { child, exited, output: () => output };
}
const freePort = () =>
  new Promise<number>((resolve) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => {
      const { port } = s.address() as { port: number };
      s.close(() => resolve(port));
    });
  });

/**
 * next build checks npm's security advisories (experimental.agentUpgrade, on by default) over the network. Wrap the
 * copy's config so the build stays offline; everything else in the project's config is kept as written.
 */
async function disableUpgradeCheck(dir: string) {
  const config = (await readdir(dir)).find((f) => /^next\.config\.(?:ts|mts|js|mjs|cjs)$/.test(f));
  if (!config) {
    await writeFile(join(dir, "next.config.mjs"), "export default { experimental: { agentUpgrade: false } };\n");
    return;
  }
  const ext = config.slice("next.config.".length);
  await rename(join(dir, config), join(dir, `next.config.project.${ext}`));
  const wrapperExt = ext === "cjs" ? "mjs" : ext;
  const typed = wrapperExt === "ts" || wrapperExt === "mts";
  await writeFile(
    join(dir, `next.config.${wrapperExt}`),
    `import projectConfig from "./next.config.project.${ext}";\n` +
      `const project${typed ? ": any" : ""} = projectConfig;\n` +
      `export default async function config(...args${typed ? ": any[]" : ""}) {\n` +
      "  const c = typeof project === \"function\" ? await project(...args) : await project;\n" +
      "  return { ...c, experimental: { ...c?.experimental, agentUpgrade: false } };\n" +
      "}\n",
  );
}

test("next build succeeds and the account page greets the signed-in user", { timeout: 55_000 }, async () => {
  // Build a copy so next build's edits to tsconfig.json and next-env.d.ts don't touch the project.
  const dir = await mkdtemp(join(tmpdir(), "next-account-"));
  try {
    await cp(root, dir, { recursive: true, filter: (src) => !/[/\\](node_modules|\.next|test)$/.test(src) });
    await symlink(await realpath(join(root, "node_modules")), join(dir, "node_modules"), "dir");
    await disableUpgradeCheck(dir);
    const build = run(dir, ["build", "--webpack"]);
    const code = await build.exited;
    assert.equal(code, 0, `next build fails:\n${build.output().slice(-2500)}`);

    const port = await freePort();
    const server = run(dir, ["start", "-p", String(port), "-H", "127.0.0.1"]);
    try {
      let res: Response | undefined;
      for (let i = 0; i < 100 && !res; i++) {
        res = await fetch(`http://127.0.0.1:${port}/account`, { headers: { cookie: "session=s-grace" } }).catch(() => undefined);
        if (!res) await new Promise((r) => setTimeout(r, 100));
      }
      assert.ok(res, `next start didn't answer:\n${server.output().slice(-1500)}`);
      assert.equal(res.status, 200);
      const html = await res.text();
      assert.match(html, /Welcome back, (?:<!-- -->)?Grace/, "the page greets the signed-in user");
      assert.match(html, /placed (?:<!-- -->)?11(?:<!-- -->)? orders/);
      const other = await (await fetch(`http://127.0.0.1:${port}/account`, { headers: { cookie: "session=s-ada" } })).text();
      assert.match(other, /Welcome back, (?:<!-- -->)?Ada/, "each request renders for its own session");
      const signedOut = await (await fetch(`http://127.0.0.1:${port}/account`)).text();
      assert.match(signedOut, /signed out/);
    } finally {
      server.child.kill();
      await server.exited;
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
