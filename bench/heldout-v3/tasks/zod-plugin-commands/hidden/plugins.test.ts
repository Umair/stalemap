import assert from "node:assert/strict";
import { test } from "node:test";
const load = (id: string): Promise<any> => import(id);
const { listCommands } = await load("../../src/plugins.ts");
const { commandPalette } = await load("../../src/host.ts");

const later = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 2));

test("maps each plugin to its command names", async () => {
  assert.deepEqual(
    await listCommands([
      { name: "git", commands: later(["git.commit", "git.push"]) },
      { name: "lint", commands: Promise.resolve([]) },
    ]),
    { git: ["git.commit", "git.push"], lint: [] },
  );
  assert.deepEqual(await commandPalette(), ["format.document", "git.commit", "git.push"]);
});

test("rejects invalid registrations", async () => {
  await assert.rejects(listCommands([{ name: "", commands: later(["a"]) }]));
  await assert.rejects(listCommands([{ name: "bad", commands: later([1, 2]) }]));
  await assert.rejects(listCommands([{ name: "ok", commands: later(["a"]) }, { name: "missing" }]));
});
