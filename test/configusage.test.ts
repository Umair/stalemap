import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { selectDeps } from "../src/analyze.ts";
import { configuredBy } from "../src/configusage.ts";
import { loadProject } from "../src/project.ts";

async function project(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "stalemap-config-"));
  for (const [name, text] of Object.entries(files)) {
    await mkdir(join(dir, name, ".."), { recursive: true });
    await writeFile(join(dir, name), text);
  }
  return dir;
}

test("config files count as usage: tsconfig options, next.config keys, the Prisma schema", async () => {
  const dir = await project({
    "package.json": JSON.stringify({ dependencies: { next: "16.0.0", "@prisma/client": "7.0.0" }, devDependencies: { typescript: "6.0.0", prisma: "7.0.0", vitest: "4.0.0" } }),
    // JSONC, as tsconfig files often are.
    "tsconfig.json": `{
  // comments are fine
  "compilerOptions": { "baseUrl": ".", "strict": true, "moduleResolution": "node10", },
}`,
    "next.config.ts": `const config = {
  images: { qualities: [75] },
  experimental: { ppr: true },
};
export default config;
`,
    "prisma/schema.prisma": "datasource db { provider = \"postgresql\" }\n",
  });
  const p = await loadProject(dir);
  const dep = (n: string) => p.deps.find((d) => d.name === n)!;
  // Option values count too: `moduleResolution: "node10"` is a use of the value `node10`.
  assert.deepEqual([...dep("typescript").usage!.subpaths.get(".")!].sort(), [
    "CompilerOptions",
    "CompilerOptions.baseUrl",
    "CompilerOptions.moduleResolution",
    "CompilerOptions.moduleResolution.node10",
    "CompilerOptions.strict",
  ]);
  assert.deepEqual([...dep("typescript").usage!.files], ["tsconfig.json"]);
  // Nested keys too, so a note about `experimental.ppr` is about this config.
  assert.deepEqual([...dep("next").usage!.subpaths.get(".")!].sort(), [
    "NextConfig",
    "NextConfig.experimental",
    "NextConfig.experimental.ppr",
    "NextConfig.images",
    "NextConfig.images.qualities",
  ]);
  assert.deepEqual([...dep("prisma").usage!.files], ["prisma/schema.prisma"]);
  assert.ok(dep("@prisma/client").usage, "the schema also configures the client");
  // vitest has a known config file, and there's none here: it isn't checked without --all.
  assert.equal(dep("vitest").usage, undefined);
  const selected = selectDeps(p.deps, false).map((d) => d.name).sort();
  assert.deepEqual(selected, ["@prisma/client", "next", "prisma", "typescript"]);
});

test("config files map to the packages that read them", () => {
  const declared = ["typescript", "prisma", "@prisma/client", "next", "vitest", "react"];
  assert.deepEqual(configuredBy("tsconfig.json", declared), ["typescript"]);
  assert.deepEqual(configuredBy("prisma/schema.prisma", declared), ["prisma", "@prisma/client"]);
  assert.deepEqual(configuredBy("prisma.config.ts", declared), ["prisma", "@prisma/client"]);
  assert.deepEqual(configuredBy("vitest.config.mts", declared), ["vitest"]);
  assert.deepEqual(configuredBy("app/globals.css", declared), []);
  assert.deepEqual(configuredBy("README.md", declared), []);
});
