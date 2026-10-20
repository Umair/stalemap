import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";

const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

test("npm run lint passes (no errors, no warnings)", async () => {
  const eslint = new ESLint({ cwd: root });
  const results = await eslint.lintFiles(["."]);
  const problems = results.flatMap((r) => r.messages.map((m) => `${r.filePath}:${m.line} ${m.ruleId ?? ""} ${m.message}`));
  assert.deepEqual(problems, []);
  assert.ok(results.some((r) => r.filePath.endsWith("mixins.js")), "src/models/mixins.js is linted");
});

test("the lint config is as strict as before", async () => {
  const eslint = new ESLint({ cwd: root });
  const config = await eslint.calculateConfigForFile("src/models/mixins.js");
  assert.deepEqual(config.rules["no-extra-bind"], [2]);
  assert.equal(config.linterOptions.reportUnusedDisableDirectives, 2);
});

test("the mixins work as before", async () => {
  const { Model, Timestamped, Tracked, setClock } = await load("../../src/models/mixins.js");
  let now = 1000;
  setClock(() => now);
  const Order: any = class Order extends Timestamped(Tracked(Model)) {};
  const Invoice: any = class Invoice extends Tracked(Model) {};
  const a = new Order({ id: "o1", total: 5 });
  const b = new Order({ id: "o2" });
  const i = new Invoice({ id: "i1" });
  assert.equal(a.total, 5);
  assert.equal(a.createdAt, 1000);
  assert.equal(a.updatedAt, 1000);
  now = 2500;
  assert.equal(a.touch(), a);
  assert.equal(a.updatedAt, 2500);
  assert.equal(a.createdAt, 1000);
  assert.deepEqual([a.seq, b.seq, i.seq], [1, 2, 1]);
  a.track();
  b.track();
  i.track();
  assert.deepEqual([...Order.live.keys()], ["o1", "o2"]);
  assert.deepEqual([...Invoice.live.keys()], ["i1"]);
  b.untrack();
  assert.deepEqual([...Order.live.keys()], ["o1"]);
});
