/**
 * Pre-freeze check for the held-out v2 tasks. For every task it builds workspaces the way the benchmark
 * does (template + files/) and grades them like a session (`tsc --noEmit` + hidden tests):
 *
 * - starter: the untouched files/, must fail;
 * - stale: files/ with stale/ on top, must fail, and its `tsc` result must match the task's `kind`
 *   (`type-checks`: compiles, so only the hidden tests catch it; `compile-error`: fails `tsc`);
 * - solution: files/ with solution/ on top, must pass, and so must the visible smoke tests;
 * - alt/<name>: other correct solutions, each with files/ underneath, must pass too.
 *
 * It also checks the stale-API metric the way run.ts computes it: the stale variant must be flagged, the
 * solution and the alternatives must not be, and the solution must not use a deprecated API.
 * A solution may not delete files (solution/.delete): in one-shot mode the agent has no way to.
 *
 *   npx tsx bench/heldout-v2/validate.ts [--tasks a,b]
 *
 * Needs the template installed in bench/.work/template-heldout-v2-latest (see ../README.md).
 */
import { execFile } from "node:child_process";
import { cp, mkdir, readdir, readFile, rm, symlink } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";

const SUITE = dirname(fileURLToPath(import.meta.url));
const WORK = join(SUITE, "..", ".work");
const sh = promisify(execFile);

interface Meta {
  template?: string;
  kind?: "type-checks" | "compile-error";
  stale: string[];
  deprecated: string[];
}
interface Outcome {
  pass: boolean;
  tscOk: boolean;
  visibleOk: boolean;
  stale: boolean;
  deprecated: boolean;
  detail: string;
}

/** `variant` is "starter" or a folder in the task (stale, solution, alt/<name>) laid over files/. */
async function build(task: string, meta: Meta, variant: string): Promise<string> {
  const template = meta.template ?? "latest";
  const dir = join(WORK, "validate-heldout-v2", `${task}.${variant.replace("/", ".")}`);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  for (const f of ["package.json", "tsconfig.json"]) await cp(join(SUITE, "templates", template, f), join(dir, f));
  await cp(join(SUITE, "tasks", task, "files"), dir, { recursive: true });
  if (variant !== "starter") await cp(join(SUITE, "tasks", task, variant), dir, { recursive: true, filter: (src) => !src.endsWith(".delete") });
  await symlink(join(WORK, `template-heldout-v2-${template}`, "node_modules"), join(dir, "node_modules"), "dir");
  await mkdir(join(dir, "test", "hidden"), { recursive: true });
  await cp(join(SUITE, "tasks", task, "hidden"), join(dir, "test", "hidden"), { recursive: true });
  return dir;
}

/** The text run.ts scans for stale and deprecated APIs (its agentFiles() for heldout-v2). */
async function scannedText(dir: string): Promise<string> {
  const texts: string[] = [];
  const walk = async (d: string) => {
    for (const e of await readdir(d, { withFileTypes: true })) {
      if (["node_modules", ".git", "test"].includes(e.name)) continue;
      const p = join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (/\.(ts|tsx|js|mjs|prisma|css)$|^tsconfig\.json$/.test(e.name)) texts.push(await readFile(p, "utf8"));
    }
  };
  await walk(dir);
  return texts.join("\n");
}

const matchesAny = (text: string, patterns: string[]) => patterns.some((p) => new RegExp(p).test(text));
const firstLines = (s: string, re: RegExp) => s.split("\n").filter((l) => re.test(l)).slice(0, 3).join(" | ");

async function grade(dir: string, meta: Meta): Promise<Outcome> {
  const bin = (n: string) => join(dir, "node_modules", ".bin", n);
  const run = async (cmd: string, args: string[]) => {
    try {
      await sh(cmd, args, { cwd: dir, timeout: 180_000, maxBuffer: 16 * 1024 * 1024 });
      return { ok: true, out: "" };
    } catch (err) {
      const e = err as { stdout?: string; stderr?: string };
      return { ok: false, out: `${e.stdout ?? ""}\n${e.stderr ?? ""}` };
    }
  };
  const text = await scannedText(dir);
  const tsc = await run(bin("tsc"), ["--noEmit", "-p", "tsconfig.json"]);
  const hiddenFiles = (await readdir(join(dir, "test", "hidden"))).map((f) => join("test", "hidden", f));
  const hidden = await run(bin("tsx"), ["--test", ...hiddenFiles]);
  const visibleFiles = (await readdir(join(dir, "test", "visible"))).map((f) => join("test", "visible", f));
  const visible = await run(bin("tsx"), ["--test", ...visibleFiles]);
  const detail = !tsc.ok ? `tsc: ${firstLines(tsc.out, /error TS/)}` : !hidden.ok ? `hidden: ${firstLines(hidden.out, /not ok|AssertionError|Error:/)}` : "";
  return { pass: tsc.ok && hidden.ok, tscOk: tsc.ok, visibleOk: visible.ok, stale: matchesAny(text, meta.stale), deprecated: matchesAny(text, meta.deprecated), detail };
}

async function main(): Promise<void> {
  const { values } = parseArgs({ options: { tasks: { type: "string" } } });
  if (!existsSync(join(WORK, "template-heldout-v2-latest", "node_modules"))) {
    throw new Error("Install the template first: mkdir -p bench/.work/template-heldout-v2-latest && cp bench/heldout-v2/templates/latest/*.json bench/.work/template-heldout-v2-latest/ && (cd bench/.work/template-heldout-v2-latest && npm install --ignore-scripts)");
  }
  const tasks = values.tasks ? values.tasks.split(",") : (await readdir(join(SUITE, "tasks"), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  const problems: string[] = [];
  process.stdout.write("| task | kind | starter | stale | solution | alternatives |\n|---|---|---|---|---|---|\n");
  for (const task of tasks) {
    const root = join(SUITE, "tasks", task);
    const meta = JSON.parse(await readFile(join(root, "meta.json"), "utf8")) as Meta;
    const problem = (p: string) => problems.push(`${task}: ${p}`);
    const failure = (o: Outcome) => (o.pass ? "pass" : `fail (${!o.tscOk ? "tsc" : "hidden tests"})`);
    if (meta.kind !== "type-checks" && meta.kind !== "compile-error") problem(`meta.json kind is ${JSON.stringify(meta.kind)}`);
    if (!meta.stale.length) problem("no stale patterns, so the stale-API metric is blind");

    const starter = await grade(await build(task, meta, "starter"), meta);
    if (starter.pass) problem("the starting files pass");

    let staleCell = "–";
    if (!existsSync(join(root, "stale"))) problem("no stale variant");
    else {
      const stale = await grade(await build(task, meta, "stale"), meta);
      staleCell = failure(stale) + (stale.stale ? "" : ", not flagged stale");
      if (stale.pass) problem("the stale variant passes");
      if (!stale.stale) problem("the stale variant isn't flagged by the stale patterns");
      if (meta.kind === "type-checks" && !stale.tscOk) problem(`kind is type-checks but the stale variant fails tsc. ${stale.detail}`);
      if (meta.kind === "compile-error" && stale.tscOk) problem("kind is compile-error but the stale variant passes tsc");
    }

    const solution = await grade(await build(task, meta, "solution"), meta);
    if (!solution.pass) problem(`the solution fails. ${solution.detail}`);
    if (!solution.visibleOk) problem("the solution fails the visible smoke tests");
    if (solution.stale) problem("the solution is flagged stale");
    if (solution.deprecated) problem("the solution is flagged as using a deprecated API");
    if (existsSync(join(root, "solution", ".delete"))) problem("the solution deletes files, which one-shot sessions can't do");

    const alts = existsSync(join(root, "alt")) ? (await readdir(join(root, "alt"), { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort() : [];
    const altCells: string[] = [];
    for (const name of alts) {
      const alt = await grade(await build(task, meta, `alt/${name}`), meta);
      altCells.push(`${name}: ${failure(alt)}${alt.stale ? ", flagged stale" : ""}${alt.deprecated ? ", deprecated" : ""}`);
      if (!alt.pass) problem(`alternative ${name} fails. ${alt.detail}`);
      if (alt.stale) problem(`alternative ${name} is flagged stale`);
    }
    process.stdout.write(`| ${task} | ${meta.kind} | ${failure(starter)} | ${staleCell} | ${failure(solution)} | ${altCells.join("; ") || "–"} |\n`);
  }
  if (problems.length) {
    process.stdout.write(`\n${problems.length} problem(s):\n${problems.map((p) => `- ${p}`).join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write("\nAll tasks behave as expected.\n");
}

main().catch((err) => {
  process.stderr.write(`validate: ${(err as Error).stack ?? err}\n`);
  process.exit(1);
});
