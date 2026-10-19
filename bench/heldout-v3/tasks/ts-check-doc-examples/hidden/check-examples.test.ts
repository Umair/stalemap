import assert from "node:assert/strict";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";
import * as mod from "../../src/check-examples.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const checkExample = (mod as Record<string, any>).checkExample as (file: string) => Promise<{ ok: boolean; output: string }>;
let dir = "";

before(async () => {
  dir = await mkdtemp(join(root, "docs", "examples", "hidden-"));
  await writeFile(join(dir, "good.ts"), 'import { z } from "zod";\nconst Tag = z.string().min(1);\nconsole.log(Tag.parse("news").toUpperCase());\n');
  await writeFile(join(dir, "wrong-type.ts"), 'const count: number = "three";\nconsole.log(count);\n');
  await writeFile(join(dir, "implicit-any.ts"), "export function double(x) {\n  return x * 2;\n}\n");
});
after(() => rm(dir, { recursive: true, force: true }));

test("an example that type-checks passes", async () => {
  const result = await checkExample(join(dir, "good.ts"));
  assert.equal(result.ok, true, result.output);
});

test("type errors are reported", async () => {
  const result = await checkExample(join(dir, "wrong-type.ts"));
  assert.equal(result.ok, false);
  assert.match(result.output, /TS2322/);
});

test("checks are strict", async () => {
  const result = await checkExample(join(dir, "implicit-any.ts"));
  assert.equal(result.ok, false);
  assert.match(result.output, /TS7006/);
});

test("nothing is emitted", async () => {
  await checkExample(join(dir, "good.ts"));
  assert.deepEqual((await readdir(dir)).sort(), ["good.ts", "implicit-any.ts", "wrong-type.ts"]);
});
