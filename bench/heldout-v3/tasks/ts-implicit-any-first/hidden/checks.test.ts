import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import * as orders from "../../src/orders.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const { describeOrder, findOrder, lineTotal, orderTotal } = orders as Record<string, any>;

test("the order helpers behave as before", () => {
  const order = { id: "A1", customer: "Ada", items: [{ sku: "tea", qty: 2 }, { sku: "cake", qty: 1 }], coupon: "SPRING10" };
  assert.equal(lineTotal("cake", 2), 13);
  assert.equal(orderTotal(order), 13.05);
  assert.equal(orderTotal({ ...order, coupon: undefined }), 14.5);
  assert.equal(findOrder([order], "A1"), order);
  assert.equal(findOrder([order], "B2"), undefined);
  assert.equal(describeOrder(order), "Ada: 2 item(s)");
  assert.equal(describeOrder({ ...order, items: [] }), null);
});

test("tsconfig.json enforces noImplicitAny and leaves the other strict checks off", async () => {
  // Type-check a probe with the project's tsconfig.json: only the implicit-any lines may (and must) be errors.
  const probe = [
    "// @ts-expect-error implicit any parameter",
    "export function shout(text) { return String(text).toUpperCase(); }",
    "const stock = new Map<string, number>();",
    'export const count: number = stock.get("tea");',
    "export let note: string = null;",
    "export const first: { id: string } = [{ id: \"a\" }].find((o) => o.id === \"b\");",
    "export let onValue: (value: string | number) => void = (value: string) => console.log(value);",
    'try { JSON.parse("{"); } catch (err) { console.log(err.message); }',
    "export class Draft { title: string; }",
  ].join("\n");
  const dir = await mkdtemp(join(root, ".probe-"));
  try {
    await writeFile(join(dir, "probe.ts"), probe + "\n");
    const config = { extends: "../tsconfig.json", compilerOptions: { noEmit: true }, include: [] as string[], files: ["probe.ts"] };
    await writeFile(join(dir, "tsconfig.json"), JSON.stringify(config));
    let output = "";
    try {
      await promisify(execFile)(join(root, "node_modules", ".bin", "tsc"), ["-p", "tsconfig.json"], { cwd: dir, timeout: 30_000 });
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string };
      output = `${e.stdout ?? ""}${e.stderr ?? ""}` || String(err);
    }
    assert.equal(output, "", `probe:\n${probe}\n${output}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
