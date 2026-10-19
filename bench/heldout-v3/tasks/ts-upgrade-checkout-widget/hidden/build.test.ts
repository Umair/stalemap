import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import ts from "typescript-6";
import * as widget from "../../src/index.ts";

const root = fileURLToPath(new URL("../../", import.meta.url));
const load = (id: string): Promise<any> => import(id);

function sampleCart(lib: any) {
  return new lib.Cart("USD")
    .add({ sku: "MUG", name: "Mug", unitCents: 1200, quantity: 1 })
    .add({ sku: "TEE", name: "T-shirt", unitCents: 2000, quantity: 1, giftWrap: true })
    .add({ sku: "MUG", name: "Mug", unitCents: 1200, quantity: 1 });
}

async function exercise(lib: any) {
  const cart = sampleCart(lib);
  assert.equal(cart.count, 3);
  assert.equal(lib.formatPrice(123456), "$1,234.56");
  assert.deepEqual(lib.summarize(cart), { count: 3, totalCents: 4650, total: "$46.50", firstItem: "Mug" });
  assert.equal(await lib.refreshPrices(cart, async () => ({ MUG: 1000, TEE: undefined })), 1);
  assert.equal(lib.summarize(cart).totalCents, 4250);
  assert.equal(await lib.refreshPrices(cart, async () => { throw new Error("feed down"); }), 0);
  assert.deepEqual(lib.summarize(new lib.Cart("EUR")), { count: 0, totalCents: 0, total: "€0.00", firstItem: undefined });
}

/** The first piece of syntax newer than ES2015 in a JavaScript file, if any. */
function newerThanEs2015(file: string, text: string): string | undefined {
  const k = ts.SyntaxKind;
  const binary = new Set<ts.SyntaxKind>([k.AsteriskAsteriskToken, k.AsteriskAsteriskEqualsToken, k.QuestionQuestionToken, k.QuestionQuestionEqualsToken, k.BarBarEqualsToken, k.AmpersandAmpersandEqualsToken]);
  let found: string | undefined;
  const visit = (node: ts.Node): void => {
    if (found) return;
    if (ts.canHaveModifiers(node) && ts.getModifiers(node)?.some((m) => m.kind === k.AsyncKeyword)) found = "an async function";
    else if (node.kind === k.AwaitExpression) found = "await";
    else if (ts.isBinaryExpression(node) && binary.has(node.operatorToken.kind)) found = `the ${ts.tokenToString(node.operatorToken.kind)} operator`;
    else if (node.kind === k.SpreadAssignment) found = "object spread";
    else if (ts.isBindingElement(node) && node.dotDotDotToken && ts.isObjectBindingPattern(node.parent)) found = "object rest";
    else if (ts.isCatchClause(node) && !node.variableDeclaration) found = "a catch clause without a binding";
    else if ((ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node) || ts.isCallExpression(node)) && node.questionDotToken) found = "optional chaining";
    else if (ts.isPropertyDeclaration(node) || ts.isClassStaticBlockDeclaration(node) || ts.isPrivateIdentifier(node)) found = "a class field";
    else if (ts.isForOfStatement(node) && node.awaitModifier) found = "for await";
    else if (node.kind === k.BigIntLiteral) found = "a bigint literal";
    if (found) found += ` (${file}:${ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart()).line + 1})`;
    else ts.forEachChild(node, visit);
  };
  visit(ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS));
  return found;
}

test("the widget still works", async () => {
  await exercise(widget);
});

test("the build emits working ES modules, declarations and the most compatible JavaScript", async () => {
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
    // dist/index.js is what package.json's main and module entries point at.
    await exercise(await load(pathToFileURL(join(outDir, "index.js")).href));
    assert.match(await readFile(join(outDir, "index.d.ts"), "utf8"), /\bCart\b/, "type declarations are still emitted");
    for (const file of (await readdir(outDir)).filter((f) => f.endsWith(".js"))) {
      const newer = newerThanEs2015(file, await readFile(join(outDir, file), "utf8"));
      assert.equal(newer, undefined, `dist/ is less compatible than TypeScript can make it: it uses ${newer}`);
    }
  } finally {
    await rm(outDir, { recursive: true, force: true });
  }
});
