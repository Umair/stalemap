import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import * as cart from "../../src/cart.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const { cartTotal, summary } = cart as Record<string, any>;

// What `tsc -p tsconfig.json` emitted into public/js/ with TypeScript 5.8.3 before the upgrade.
const emittedOn58: Record<string, string> = 
{
  "cart.js": "import { formatPrice } from \"./format.js\";\nexport function cartTotal(lines) {\n    return lines.reduce((sum, { cents, qty }) => sum + cents * qty, 0);\n}\nexport function summary(lines) {\n    const count = lines.reduce((n, line) => n + line.qty, 0);\n    return `${count} item${count === 1 ? \"\" : \"s\"}, ${formatPrice(cartTotal(lines))}`;\n}",
  "format.js": "export function formatPrice(cents, currency = \"EUR\") {\n    return new Intl.NumberFormat(\"en-IE\", { style: \"currency\", currency }).format(cents / 100);\n}",
  "main.js": "import { summary } from \"./cart.js\";\nconst lines = [];\ndocument.querySelectorAll(\"button[data-name]\").forEach((button) => {\n    button.addEventListener(\"click\", () => {\n        var _a;\n        const name = (_a = button.dataset.name) !== null && _a !== void 0 ? _a : \"\";\n        const existing = lines.find((line) => line.name === name);\n        if (existing)\n            existing.qty += 1;\n        else\n            lines.push({ name, cents: Number(button.dataset.cents), qty: 1 });\n        const output = document.querySelector(\"#summary\");\n        if (output)\n            output.textContent = summary(lines);\n    });\n});"
};

test("the cart still works", () => {
  const lines = [{ name: "Tea", cents: 450, qty: 2 }, { name: "Cake", cents: 325, qty: 1 }];
  assert.equal(cartTotal(lines), 1225);
  assert.equal(summary(lines), "3 items, €12.25");
});

test("tsc compiles the app and emits the same ES modules as on TypeScript 5.8", async () => {
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
    assert.deepEqual((await readdir(outDir)).filter((f) => f.endsWith(".js")).sort(), Object.keys(emittedOn58));
    for (const [file, text] of Object.entries(emittedOn58)) {
      const emitted = await readFile(join(outDir, file), "utf8");
      assert.equal(emitted.replace(/\r\n/g, "\n").replace(/\/\/# sourceMappingURL=.*/, "").trim(), text, file);
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
