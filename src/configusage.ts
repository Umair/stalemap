import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import ts from "typescript";
import { parseJsonc } from "./jsonc.js";
import type { DepUsage } from "./project.js";

/**
 * Config files as usage. Some packages are configured more than imported: TypeScript through
 * tsconfig.json, Prisma through its schema and prisma.config.ts, Next through next.config.*.
 * The import scan misses them, so their notes ranked as if the project didn't use them and the
 * budget cut them. A config file says the project uses the package, and for some packages which
 * options it sets: `compilerOptions.baseUrl` in tsconfig.json makes `CompilerOptions.baseUrl`
 * count as used, like an imported export.
 */
interface ConfigRule {
  /** Packages the file configures. */
  pkgs: string[];
  /** File name, matched at the project root and in `dirs`. */
  file: RegExp;
  dirs?: string[];
  /** Option names the file uses, as `Export.member` names of the package's types. */
  names?: (text: string) => string[];
}

/**
 * `compilerOptions` keys of a tsconfig, as members of TypeScript's `CompilerOptions`, and the values
 * it sets them to (`CompilerOptions.moduleResolution.node10`), since option values get removed too.
 */
function tsconfigNames(text: string): string[] {
  const opts = parseJsonc(text)?.value?.compilerOptions;
  if (!opts || typeof opts !== "object") return [];
  const out = ["CompilerOptions"];
  for (const [k, v] of Object.entries(opts as Record<string, unknown>)) {
    out.push(`CompilerOptions.${k}`);
    if (typeof v === "string" && /^[A-Za-z][\w]*$/.test(v)) out.push(`CompilerOptions.${k}.${v}`);
  }
  return out;
}

/** Keys of an object literal, nested ones dotted (`images.qualities`), down to `depth` levels. */
function literalKeys(lit: ts.ObjectLiteralExpression, prefix: string, depth: number, out: Set<string>): void {
  for (const p of lit.properties) {
    if (!(ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p) || ts.isMethodDeclaration(p)) || !p.name) continue;
    const name = ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : undefined;
    if (!name || !/^[A-Za-z_$][\w$]*$/.test(name)) continue;
    const key = prefix ? `${prefix}.${name}` : name;
    out.add(key);
    if (depth > 1 && ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.initializer)) literalKeys(p.initializer, key, depth - 1, out);
  }
}

/**
 * Keys of a config file's config object, top-level and nested (`images`, `images.qualities`,
 * `experimental.ppr`): the biggest object literal that's exported, assigned to `module.exports`,
 * passed to a `defineConfig()`-style call or declared with a type annotation.
 */
const configKeys = (exportName: string) => (text: string) => {
  const sf = ts.createSourceFile("config.ts", text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const candidates: ts.ObjectLiteralExpression[] = [];
  const visit = (n: ts.Node): void => {
    if (ts.isObjectLiteralExpression(n)) {
      const parent = n.parent;
      const top =
        ts.isExportAssignment(parent) ||
        (ts.isVariableDeclaration(parent) && parent.initializer === n) ||
        (ts.isBinaryExpression(parent) && parent.right === n) ||
        (ts.isCallExpression(parent) && parent.arguments[0] === n) ||
        ts.isReturnStatement(parent) ||
        ts.isParenthesizedExpression(parent) ||
        ts.isSatisfiesExpression(parent) ||
        ts.isAsExpression(parent);
      if (top) {
        candidates.push(n);
        return; // keys inside are this config's own
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  const best = candidates.sort((a, b) => b.properties.length - a.properties.length)[0];
  const keys = new Set<string>();
  if (best) literalKeys(best, "", 3, keys);
  return [exportName, ...[...keys].map((k) => `${exportName}.${k}`)];
};

const RULES: ConfigRule[] = [
  { pkgs: ["typescript"], file: /^[jt]sconfig(?:\.[\w-]+)?\.json$/, names: tsconfigNames },
  { pkgs: ["next"], file: /^next\.config\.(?:[cm]?[jt]s)$/, names: configKeys("NextConfig") },
  { pkgs: ["prisma", "@prisma/client"], file: /^(?:schema\.prisma|prisma\.config\.[cm]?[jt]s)$/, dirs: ["prisma"] },
  { pkgs: ["vitest"], file: /^vitest\.(?:config|workspace)\.(?:[cm]?[jt]s)$/ },
  { pkgs: ["vite"], file: /^vite\.config\.(?:[cm]?[jt]s)$/ },
  { pkgs: ["eslint"], file: /^(?:eslint\.config\.(?:[cm]?[jt]s)|\.eslintrc(?:\.(?:json|ya?ml|[cm]?js))?)$/ },
  { pkgs: ["tailwindcss"], file: /^tailwind\.config\.(?:[cm]?[jt]s)$/ },
  { pkgs: ["drizzle-kit", "drizzle-orm"], file: /^drizzle\.config\.(?:[cm]?[jt]s)$/ },
  { pkgs: ["@playwright/test"], file: /^playwright\.config\.(?:[cm]?[jt]s)$/ },
  { pkgs: ["astro"], file: /^astro\.config\.(?:[cm]?[jt]s)$/ },
  { pkgs: ["@sveltejs/kit", "svelte"], file: /^svelte\.config\.(?:[cm]?js)$/ },
  { pkgs: ["nuxt"], file: /^nuxt\.config\.(?:[cm]?[jt]s)$/ },
  { pkgs: ["wrangler"], file: /^wrangler\.(?:toml|jsonc?)$/ },
];

/** Packages whose config files are detected above: they count as used only when one exists. */
export const CONFIG_FILE_PACKAGES = new Set(RULES.flatMap((r) => r.pkgs));

/** The declared packages a config file configures, by its path from the project root: `prisma/schema.prisma` → `prisma`, `@prisma/client`. */
export function configuredBy(relPath: string, declared: Iterable<string>): string[] {
  const parts = relPath.split(/[\\/]/);
  const name = parts.pop()!;
  const dir = parts.join("/");
  const have = new Set(declared);
  const rules = RULES.filter((r) => r.file.test(name) && (!dir || r.dirs?.includes(dir)));
  return [...new Set(rules.flatMap((r) => r.pkgs.filter((p) => have.has(p))))];
}

async function names(dir: string): Promise<string[]> {
  try {
    return (await readdir(dir, { withFileTypes: true })).filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    return [];
  }
}

/** Merge config-file usage into `usage` for the project's dependencies. */
export async function addConfigUsage(root: string, depNames: Set<string>, usage: Map<string, DepUsage>): Promise<void> {
  const rootFiles = await names(root);
  for (const rule of RULES) {
    const pkgs = rule.pkgs.filter((p) => depNames.has(p));
    if (!pkgs.length) continue;
    const found: string[] = [];
    for (const dir of ["", ...(rule.dirs ?? [])]) {
      for (const f of dir ? await names(join(root, dir)) : rootFiles) if (rule.file.test(f)) found.push(dir ? `${dir}/${f}` : f);
    }
    if (!found.length) continue;
    const used = new Set<string>();
    if (rule.names) {
      for (const f of found) {
        try {
          for (const n of rule.names(await readFile(join(root, f), "utf8"))) used.add(n);
        } catch {
          // unreadable: the file still counts as usage
        }
      }
    }
    for (const pkg of pkgs) {
      let u = usage.get(pkg);
      if (!u) usage.set(pkg, (u = { subpaths: new Map(), files: new Set() }));
      let set = u.subpaths.get(".");
      if (!set) u.subpaths.set(".", (set = new Set()));
      for (const n of used) set.add(n);
      for (const f of found) u.files.add(f);
    }
  }
}
