import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import * as lib from "../../src/index.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const { countTags, loadAll, published, uniqueTags } = lib as Record<string, any>;

// What `tsc -p tsconfig.json` emitted with TypeScript 5.8.3 before the upgrade (source map comments left out).
const emittedOn58: Record<string, string> = 
{
  "index.d.ts": "export * from \"./tags\";\nexport * from \"./pages\";",
  "index.js": "export * from \"./tags\";\nexport * from \"./pages\";",
  "pages.d.ts": "export declare function loadAll<T>(load: (page: number) => Promise<T[]>, maxPages?: number): Promise<T[]>;",
  "pages.js": "export async function loadAll(load, maxPages) {\n    const all = [];\n    for (let page = 1; page <= (maxPages !== null && maxPages !== void 0 ? maxPages : 10); page++) {\n        const items = await load(page);\n        if (items.length === 0)\n            break;\n        all.push(...items);\n    }\n    return all;\n}",
  "tags.d.ts": "export interface Post {\n    title: string;\n    tags: string[];\n    draft?: boolean;\n}\nexport declare function uniqueTags(posts: Post[]): string[];\nexport declare function countTags(posts: Iterable<Post>): Map<string, number>;\nexport declare function published(posts: Iterable<Post>): Generator<Post>;",
  "tags.js": "export function uniqueTags(posts) {\n    const seen = new Set();\n    for (const post of posts)\n        for (const tag of post.tags)\n            seen.add(tag);\n    return [...seen].sort();\n}\nexport function countTags(posts) {\n    var _a;\n    const counts = new Map();\n    for (const { tags } of posts)\n        for (const tag of tags)\n            counts.set(tag, ((_a = counts.get(tag)) !== null && _a !== void 0 ? _a : 0) + 1);\n    return counts;\n}\nexport function* published(posts) {\n    for (const post of posts)\n        if (!post.draft)\n            yield Object.assign(Object.assign({}, post), { tags: [...post.tags] });\n}"
}
;

test("the library still works", async () => {
  const posts = [
    { title: "A", tags: ["ts", "node"] },
    { title: "B", tags: ["ts"], draft: true },
  ];
  assert.deepEqual(uniqueTags(posts), ["node", "ts"]);
  assert.deepEqual([...countTags(posts)], [["ts", 2], ["node", 1]]);
  assert.deepEqual([...published(posts)].map((p: { title: string }) => p.title), ["A"]);
  assert.deepEqual(await loadAll(async (page: number) => (page < 3 ? [page] : [])), [1, 2]);
});

test("the build emits the same JavaScript and declarations as on TypeScript 5.8", async () => {
  const outDir = await mkdtemp(join(root, ".build-"));
  try {
    let output = "";
    try {
      await promisify(execFile)(join(root, "node_modules", ".bin", "tsc"), ["-p", "tsconfig.json", "--outDir", outDir, "--noEmit", "false"], { cwd: root, timeout: 30_000 });
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string };
      output = `${e.stdout ?? ""}${e.stderr ?? ""}` || String(err);
    }
    assert.equal(output, "", "tsc -p tsconfig.json fails");
    for (const [file, text] of Object.entries(emittedOn58)) {
      const emitted = await readFile(join(outDir, file), "utf8").catch(() => "(not emitted)");
      assert.equal(emitted.replace(/\r\n/g, "\n").replace(/\/\/# sourceMappingURL=.*/, "").trim(), text, file);
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
