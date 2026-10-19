import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { loadLockVersions, parseImportClause, parseYarnLock, splitSpecifier, type ProjectDep } from "../src/project.ts";

test("splitSpecifier handles scoped, subpath and non-package specifiers", () => {
  assert.deepEqual(splitSpecifier("next/server"), ["next", "./server"]);
  assert.deepEqual(splitSpecifier("@tanstack/react-query"), ["@tanstack/react-query", "."]);
  assert.deepEqual(splitSpecifier("@ai-sdk/openai/internal"), ["@ai-sdk/openai", "./internal"]);
  assert.equal(splitSpecifier("./local"), undefined);
  assert.equal(splitSpecifier("node:fs"), undefined);
  assert.equal(splitSpecifier("@/components/button"), undefined);
});

test("parseImportClause records names, aliases and member accesses", () => {
  const file = "const r = z.object({}); z.string(); client.messages.create(); ns.foo(); ns.bar;";
  assert.deepEqual(parseImportClause("{ streamText, type CoreMessage, tool as t }", file), ["streamText", "CoreMessage", "tool"]);
  assert.deepEqual(parseImportClause("{ z }", file), ["z", "z.object", "z.string"]);
  assert.deepEqual(parseImportClause("Anthropic", "new Anthropic(); Anthropic.APIError"), ["default", "default.APIError"]);
  assert.deepEqual(parseImportClause("* as ns", file), ["foo", "bar"]);
  assert.deepEqual(parseImportClause("* as unused", file), ["*"]);
});

test("parseYarnLock reads v1 and berry entries", () => {
  const v1 = `# yarn lockfile v1\n\n"next@^16.0.0", next@^16.1.0:\n  version "16.4.2"\n  resolved "x"\n\nzod@^4:\n  version "4.6.7"\n`;
  const m1 = parseYarnLock(v1);
  assert.equal(m1.get("next@^16.0.0"), "16.4.2");
  assert.equal(m1.get("next@^16.1.0"), "16.4.2");
  assert.equal(m1.get("zod@^4"), "4.6.7");
  const berry = `__metadata:\n  version: 8\n\n"ai@npm:^7.0.0":\n  version: 7.0.142\n  resolution: "ai@npm:7.0.142"\n`;
  assert.equal(parseYarnLock(berry).get("ai@npm:^7.0.0"), "7.0.142");
});

const dep = (name: string, range: string): ProjectDep => ({ name, range, kind: "dependencies" });

test("loadLockVersions reads package-lock, pnpm-lock and bun.lock", async () => {
  const npmDir = await mkdtemp(join(tmpdir(), "stalemap-"));
  await writeFile(join(npmDir, "package-lock.json"), JSON.stringify({ packages: { "node_modules/next": { version: "16.4.2" } } }));
  assert.equal((await loadLockVersions(npmDir, [dep("next", "^16")])).versions.get("next"), "16.4.2");

  const pnpmDir = await mkdtemp(join(tmpdir(), "stalemap-"));
  await writeFile(
    join(pnpmDir, "pnpm-lock.yaml"),
    `lockfileVersion: '9.0'\nimporters:\n  .:\n    dependencies:\n      ai:\n        specifier: ^7.0.0\n        version: 7.0.142(react@19.3.1)(zod@4.6.7)\n`,
  );
  assert.equal((await loadLockVersions(pnpmDir, [dep("ai", "^7.0.0")])).versions.get("ai"), "7.0.142");

  const bunDir = await mkdtemp(join(tmpdir(), "stalemap-"));
  await writeFile(join(bunDir, "bun.lock"), `{\n  "lockfileVersion": 1,\n  "packages": {\n    "zod": ["zod@4.6.7", "", {}, "sha512-x"],\n  },\n}\n`);
  assert.equal((await loadLockVersions(bunDir, [dep("zod", "^4")])).versions.get("zod"), "4.6.7");
});
