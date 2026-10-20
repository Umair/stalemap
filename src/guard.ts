import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
import ts from "typescript";
import semver from "semver";
import { analyzeDependency, type PackageReport } from "./analyze.js";
import { renamePairs } from "./changelog.js";
import { DEFAULT_LLM_MODEL } from "./llm.js";
import { resolveModel, type ResolvedModel } from "./models.js";
import { loadLockVersions, splitSpecifier, type ProjectDep } from "./project.js";
import { configuredBy } from "./configusage.js";
import { editNotesFor, MAX_EDIT_NOTES, type EditNote } from "./editnotes.js";
import { buildPackageNotes, type Bullet } from "./render.js";
import { checkProject, type ProjectCheck, type ProjectDiagnostic } from "./projectts.js";
import { readTsconfig } from "./tsoptions.js";
import { buildIndex, packageDocs, searchIndex, snippet, tokenize, type SearchDoc } from "./search.js";
import { cacheDir, debug, mapLimit, readJson, sha256, truncate, writeJsonAtomic } from "./util.js";

const CHECKED_EXT = /\.(?:[cm]?tsx?|[cm]?jsx?)$/;

/** Diagnostics that mean "this API isn't what the code assumed". */
const API_DIAGNOSTICS = new Set([2305, 2724, 2614, 2353, 2561, 2339, 2551, 2554, 2555, 2345, 2322, 2769, 2559, 2741, 2740, 2739, 2459, 2460, 2694, 2552]);
/**
 * Also about a dependency's API, but only when the error sits in its code: a package entry point that
 * no longer resolves (TS2307 on `import … from "next/amp"`), a value of one of its types that can't be
 * called or constructed (mongoose 9's pre hooks pass no `next`), a callback parameter that lost its
 * type because the API it's passed to changed. Never matched by name alone.
 */
const API_SITE_DIAGNOSTICS = new Set([2307, 2349, 2351, 2721, 2722, 2684, 7006, 7031]);

export interface GuardFinding {
  /** 0 for problems that aren't in the edited file (tsconfig options); `where` says where they are. */
  line: number;
  where?: string;
  /** The changed package the problem comes from; "" for the project's other compiler errors. */
  pkg: string;
  /** "TS2353: Object literal may only specify known properties…" or "deprecated: `nativeEnum`" */
  problem: string;
  /** The stalemap note that explains the change, when one matches. */
  hint?: string;
  /**
   * When no note matches: the change from the package's release notes, upgrade guides and type diffs
   * that best matches the error and the code around it (what `search_changes` would return).
   */
  related?: { source: string; text: string };
  /** Who reported it, when not stalemap's own type-check: "tsc 7.0.2" (the project's TypeScript). */
  source?: string;
  /**
   * Listed after the edited file's own findings: source errors a tsconfig edit led to ("config"), or
   * new errors in files that import the edited one ("callers"), or the project's other errors ("elsewhere").
   */
  group?: "config" | "callers" | "elsewhere";
}

export interface GuardResult {
  file: string;
  findings: GuardFinding[];
  /**
   * Edit-time notes: changes that still type-check, below the notes block's cut, whose names the
   * edited text uses. Ranked; the hook drops the ones a session has seen and shows a few.
   */
  notes?: EditNote[];
  /** Changed packages the file imports, with their version jump. */
  packages: Array<{ name: string; from?: string; to: string }>;
}

interface ImportBinding {
  pkg: string;
  /** "." or "./cache" (from `next/cache`). */
  subpath: string;
  /** Exported name (`default`, `*` for namespaces). */
  imported: string;
  local: string;
}

function importsOf(sf: ts.SourceFile): ImportBinding[] {
  const out: ImportBinding[] = [];
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier)) continue;
    const split = splitSpecifier(st.moduleSpecifier.text);
    if (!split) continue;
    const [pkg, subpath] = split;
    const clause = st.importClause;
    if (!clause) {
      out.push({ pkg, subpath, imported: "*", local: "" });
      continue;
    }
    if (clause.name) out.push({ pkg, subpath, imported: "default", local: clause.name.text });
    const nb = clause.namedBindings;
    if (nb && ts.isNamespaceImport(nb)) out.push({ pkg, subpath, imported: "*", local: nb.name.text });
    if (nb && ts.isNamedImports(nb)) {
      for (const el of nb.elements) out.push({ pkg, subpath, imported: (el.propertyName ?? el.name).text, local: el.name.text });
    }
  }
  return out;
}

function subpathUsage(bs: ImportBinding[]): Map<string, Set<string>> {
  const m = new Map<string, Set<string>>();
  for (const b of bs) m.set(b.subpath, (m.get(b.subpath) ?? new Set()).add(b.imported));
  return m;
}

/** "…and 'maxSteps' does not exist in type 'LanguageModelCallOptions & …'" → drop the type dump. */
function tidyMessage(message: string): string {
  return message.replace(/ (?:in|of|to) type '[^']{60,}'.*$/, "").replace(/'[^']{100,}'/g, "'…'");
}

function findProjectRoot(file: string, cwd: string): string {
  let dir = dirname(file);
  const stop = resolve(cwd, "..");
  while (dir !== stop && dir !== dirname(dir)) {
    if (existsSync(join(dir, "package.json"))) return dir;
    dir = dirname(dir);
  }
  return cwd;
}

const isTsconfig = (f: string) => /(?:^|[\\/])[jt]sconfig(?:\.[\w-]+)?\.json$/.test(f);

/** The project's compiler options and the errors TypeScript reports while reading its tsconfig. */
function projectConfig(root: string, configFile?: string): { options: ts.CompilerOptions; errors: readonly ts.Diagnostic[] } {
  const configPath = configFile ?? ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
  if (configPath && dirname(configPath).startsWith(root)) {
    try {
      const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
      if (parsed) return { options: { ...parsed.options, noEmit: true, skipLibCheck: true, incremental: false, composite: false }, errors: parsed.errors };
    } catch {
      // fall back to defaults
    }
  }
  return { options: compilerOptions(root), errors: [] };
}

/** `Option 'target=ES5'`, `'--module'`, `'baseUrl'`: the option names (and values) a compiler-option error is about. */
export function optionNames(message: string): { names: string[]; values: string[] } {
  const names = new Set<string>();
  const values = new Set<string>();
  // "Option 'X'…", "'--X' option": the option itself; other quoted words are its allowed values.
  const own = [...message.matchAll(/\b[Oo]ption '(?:--)?([A-Za-z]\w*)(?:=([^']+))?'|'--([A-Za-z]\w*)'/g)];
  for (const m of own) {
    names.add(m[1] ?? m[3]);
    if (m[2]) values.add(m[2]);
  }
  if (!names.size) for (const m of message.matchAll(/'([A-Za-z]\w*)'/g)) names.add(m[1]);
  return { names: [...names], values: [...values] };
}

/** The text names `name` as code (`baseUrl`, `experimental.turbo`), not inside a CLI flag (`--turbo`) or a path. */
export const namesIdentifier = (text: string, name: string) =>
  new RegExp(`(?<![\\w$/-])${name.replace(/[$]/g, "\\$")}(?![\\w$/-])`).test(text);

/**
 * The note for a compiler-option error: one that names the option (and the value, for
 * `Option 'target=ES5' has been removed`). Nothing otherwise: a note about another option misleads.
 */
function optionHint(r: PackageReport | undefined, message: string): string | undefined {
  if (!r || r.status !== "changed") return undefined;
  const { names, values } = optionNames(message);
  if (!names.length) return undefined;
  const bullets = buildPackageNotes(r, 4).bullets;
  const valuesFit = (text: string) => values.every((v) => new RegExp(`\\b${v.replace(/[^\w]/g, "\\$&")}\\b`, "i").test(text));
  // An error about two options ("Option 'module' must be set to 'NodeNext' when option
  // 'moduleResolution' is set to 'NodeNext'") is about the pair: a note on only one of them (the
  // `module` default) sends the agent the wrong way.
  const hit = bullets.find((b) => names.every((n) => namesIdentifier(b.text, n)) && valuesFit(b.text)) ?? (names.length === 1 ? bullets.find((b) => namesIdentifier(b.text, names[0]) && valuesFit(b.text)) : undefined);
  return hit?.text;
}

/** How long the project's own `tsc` may run inside the guard (the hook's deadline is 25 s). */
const TSC_TIMEOUT_MS = Number(process.env.STALEMAP_TSC_TIMEOUT_MS) || 15_000;
/** Source-file errors listed after a tsconfig edit. */
const MAX_CONFIG_FOLLOWUPS = 6;

const located = (root: string, d: ProjectDiagnostic, fallback: string) =>
  `${d.file ? relative(root, d.file) || fallback : fallback}${d.line ? `:${d.line}` : ""}`;

const diagnosticText = (d: ProjectDiagnostic) => `TS${d.code}: ${truncate([d.message, ...d.related].join(" "), 260)}`;

/**
 * What the project's own TypeScript says (projectts.ts): the compiler-option errors `tsc` stops on
 * before it reads any file (TS5101 for `baseUrl` in TypeScript 6, TS5102 when 7 removed it), and after
 * a tsconfig edit the source errors that edit causes. When the project's compiler is one stalemap can't
 * check with (TypeScript 7, `via: "cli"`), its errors in the edited file come through as they are,
 * minus the ones the guard already explained, and so do new errors in files that import it: changing
 * what a file exports breaks its callers. All of it is TypeScript's, which changed after the model's
 * cutoff, or the guard wouldn't ask.
 */
function projectTsFindings(
  check: ProjectCheck,
  root: string,
  configFile: string,
  report: PackageReport | undefined,
  edited: { file: string; isConfig: boolean; reported?: Set<string>; callers?: ProjectDiagnostic[] },
  /** TypeScript changed after the model's cutoff: its errors are a dependency change's, with option hints. */
  tsChanged = true,
): GuardFinding[] {
  const out: GuardFinding[] = [];
  const pkg = tsChanged ? "typescript" : "";
  const configName = relative(root, configFile) || "tsconfig.json";
  for (const d of check.options) {
    out.push({ line: 0, where: located(root, d, configName), pkg, problem: diagnosticText(d), hint: tsChanged ? optionHint(report, d.message) : undefined, source: check.source });
  }
  const code = check.code ?? [];
  const group = (list: ProjectDiagnostic[], name: "config" | "callers" | "elsewhere", max: number) => {
    for (const d of list.slice(0, max)) out.push({ line: 0, where: located(root, d, "?"), pkg, problem: diagnosticText(d), source: check.source, group: name });
    if (list.length > max) out.push({ line: 0, where: "", pkg, problem: `…and ${list.length - max} more`, source: check.source, group: name });
  };
  if (edited.isConfig) {
    // The config parses; what it changed for the code (a `paths` entry that no longer resolves, a strict check now on).
    group(code, "config", MAX_CONFIG_FOLLOWUPS);
  } else if (check.code) {
    for (const d of code) {
      if (d.file !== edited.file || !d.line || edited.reported?.has(`${d.line}|${d.code}`)) continue;
      out.push({ line: d.line, pkg, problem: diagnosticText(d), source: check.source });
    }
    const callers = edited.callers ?? [];
    group(callers, "callers", MAX_CALLER_ERRORS);
    // What a plain `tsc --noEmit` hook would also show: the rest of the project's errors, so nothing
    // the compiler knows about is hidden (an earlier edit's errors, a test the change broke).
    const listed = new Set(callers);
    group(code.filter((d) => d.file !== edited.file && !listed.has(d)), "elsewhere", MAX_ELSEWHERE_ERRORS);
  }
  return out;
}

/** Errors listed from files that import the edited one. */
const MAX_CALLER_ERRORS = 3;
/** The project's other errors listed after an edit. */
const MAX_ELSEWHERE_ERRORS = 5;
const CODE_EXT = /\.(?:[cm]?tsx?|[cm]?jsx?)$/;

/** `src/models/user.ts` → the specifiers that can import it from `fromFile`: `./models/user`, `./models/user.js`… */
function importsFile(text: string, fromFile: string, target: string): boolean {
  const stem = (p: string) => p.replace(CODE_EXT, "").replace(/[\\/]index$/, "");
  const want = stem(target);
  for (const m of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["'](\.{1,2}\/[^"'\n]+)["']/g)) {
    if (stem(resolve(dirname(fromFile), m[1])) === want) return true;
  }
  return false;
}

/**
 * New errors in files that import `file`: the ones the previous run on this project didn't have (the
 * first run has nothing to compare with, so all of theirs). Each run's errors are kept for the next.
 */
async function callerErrors(root: string, configFile: string, file: string, code: ProjectDiagnostic[], session?: string): Promise<ProjectDiagnostic[]> {
  const key = (d: ProjectDiagnostic) => `${relative(root, d.file ?? "")}|${d.code}|${d.message}`;
  const state = join(cacheDir(), "guard", `${sha256(`${root}\0${configFile}\0${session ?? ""}`).slice(0, 24)}.json`);
  const before = new Set((await readJson<{ errors?: string[] }>(state))?.errors ?? []);
  await writeJsonAtomic(state, { at: Date.now(), errors: code.map(key) }).catch(() => {});
  const texts = new Map<string, boolean>();
  const imports = (f: string) => {
    if (!texts.has(f)) {
      let hit = false;
      try {
        hit = importsFile(readFileSync(f, "utf8"), f, file);
      } catch {
        // unreadable
      }
      texts.set(f, hit);
    }
    return texts.get(f)!;
  };
  return code.filter((d) => d.file && d.file !== file && !before.has(key(d)) && CODE_EXT.test(d.file) && imports(d.file));
}

function compilerOptions(root: string): ts.CompilerOptions {
  const configPath = ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
  const base: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.Preserve,
    allowJs: true,
    skipLibCheck: true,
    esModuleInterop: true,
    lib: ["lib.esnext.d.ts", "lib.dom.d.ts"],
  };
  if (configPath && dirname(configPath).startsWith(root)) {
    try {
      const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
      if (parsed) return { ...parsed.options, noEmit: true, skipLibCheck: true, incremental: false, composite: false };
    } catch {
      // fall back to defaults
    }
  }
  return { ...base, noEmit: true };
}

/** Names in the change set the agent may have used: removed exports, removed options, deprecated members… */
function changedNames(r: PackageReport): Set<string> {
  const names = new Set<string>();
  for (const c of r.types?.changes ?? []) {
    if (c.kind === "added") continue;
    names.add(c.symbol.split(".").pop()!);
    for (const n of [...(c.meta?.removedOptions ?? []), ...(c.meta?.removedParams ?? []), ...(c.meta?.members ?? [])]) names.add(n.split(".").pop()!);
  }
  return names;
}

/** Every name the type diff mentions, additions included: a model has no training data on any of them. */
function changeSetNames(r: PackageReport): Set<string> {
  const names = changedNames(r);
  for (const c of r.types?.changes ?? []) if (c.kind === "added") names.add(c.symbol.split(".").pop()!);
  return names;
}

/**
 * `as any`, `@ts-ignore` and `@ts-expect-error` on code that uses an API from the change set. The
 * cast compiles, but it usually hides exactly the mismatch the guard exists for, and the code then
 * fails at run time (a mock returning last version's result shape).
 */
function suppressionFindings(sf: ts.SourceFile, text: string, checker: ts.TypeChecker, bindings: ImportBinding[], reports: Map<string, PackageReport>, watched: Set<string>): GuardFinding[] {
  const imports = new Map(bindings.filter((b) => b.local && watched.has(b.pkg) && b.imported !== "*").map((b) => [b.local, b] as const));
  const sets = new Map<string, Set<string>>();
  const changeSet = (pkg: string) => {
    if (!sets.has(pkg)) sets.set(pkg, reports.get(pkg) ? changeSetNames(reports.get(pkg)!) : new Set());
    return sets.get(pkg)!;
  };
  type Hit = { pkg: string; name: string };
  /** An imported API from the change set among these identifiers. */
  const importedApi = (names: Iterable<string>): Hit | undefined => {
    for (const n of names) {
      const b = imports.get(n);
      const name = b && (b.imported === "default" ? n : b.imported);
      if (b && name && changeSet(b.pkg).has(name)) return { pkg: b.pkg, name };
    }
  };
  /** A type declared by a watched package (`LanguageModelUsage` for `result.usage`). */
  const packageType = (t: ts.Type | undefined): Hit | undefined => {
    for (const part of t?.isUnionOrIntersection() ? t.types : t ? [t] : []) {
      const sym = part.aliasSymbol ?? part.getSymbol();
      const file = sym?.declarations?.[0]?.getSourceFile().fileName;
      const pkg = file ? packageOfFile(file, watched) : undefined;
      if (pkg && sym && !sym.name.startsWith("__")) return { pkg, name: sym.name };
    }
  };
  const idents = (node: ts.Node) => {
    const out: string[] = [];
    const visit = (n: ts.Node): void => {
      if (ts.isIdentifier(n)) out.push(n.text);
      ts.forEachChild(n, visit);
    };
    visit(node);
    return out;
  };
  const out: GuardFinding[] = [];
  const report = (line: number, what: string, hit: Hit, howFails: string) => {
    const r = reports.get(hit.pkg);
    const ver = r?.baseline ? ` (${hit.pkg} ${r.baseline.version} → ${r.pinned})` : r?.pinned ? ` (${hit.pkg} ${r.pinned})` : "";
    out.push({
      line,
      pkg: hit.pkg,
      problem: `${what} on code that uses \`${hit.name}\`, which changed after your training data${ver}. ${howFails} Remove it and write what the installed types ask for.`,
      hint: hintFor(r, `'${hit.name}'`, undefined),
    });
  };

  // `x as any`: the cast's operand or the slot it fills has a type from a watched package, or it sits
  // in a call to an imported API from the change set (`new MockLanguageModelV4({ doGenerate: … as any })`).
  const visit = (node: ts.Node): void => {
    if ((ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) && node.type.kind === ts.SyntaxKind.AnyKeyword) {
      let call: ts.Node | undefined = node.parent;
      while (call && !ts.isCallExpression(call) && !ts.isNewExpression(call) && !ts.isStatement(call)) call = call.parent;
      const callee = call && (ts.isCallExpression(call) || ts.isNewExpression(call)) ? idents(call.expression) : [];
      const hit = importedApi([...idents(node.expression), ...callee]) ?? packageType(checker.getTypeAtLocation(node.expression)) ?? packageType(checker.getContextualType(node));
      if (hit) report(sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, "`as any`", hit, "The cast hides a type error, and the code can still fail at run time.");
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  // `@ts-ignore` / `@ts-expect-error`: the line below uses an imported API from the change set, or reads
  // a member of a watched package's type.
  const lines = text.split("\n");
  lines.forEach((l, i) => {
    const m = l.match(/^\s*(?:\/\/|\/\*+)\s*@(ts-ignore|ts-expect-error)\b/);
    if (!m) return;
    let target = i + 1;
    while (target < lines.length && !lines[target].trim()) target++;
    let hit = importedApi(lines[target]?.match(/[A-Za-z_$][\w$]*/g) ?? []);
    const onLine = (n: ts.Node): void => {
      if (hit || n.getEnd() < sf.getPositionOfLineAndCharacter(target, 0)) return;
      if (sf.getLineAndCharacterOfPosition(n.getStart(sf)).line > target) return;
      if (ts.isPropertyAccessExpression(n) && sf.getLineAndCharacterOfPosition(n.name.getStart(sf)).line === target) hit = packageType(checker.getTypeAtLocation(n.expression));
      ts.forEachChild(n, onLine);
    };
    if (target < lines.length) onLine(sf);
    if (hit) report(i + 1, `\`@${m[1]}\``, hit, "It silences the error the installed version reports, and the code can still fail at run time.");
  });
  return out;
}

/** TypeScript's default libraries (`lib.es5.d.ts`) aren't the `typescript` package's API. */
const DEFAULT_LIB = /\/node_modules\/typescript\/lib\/lib\.[\w.-]+\.d\.ts$/;
const packageOfFile = (fileName: string, watched: Set<string>) =>
  DEFAULT_LIB.test(fileName) ? undefined : [...watched].find((p) => fileName.includes(`/node_modules/${p}/`));

/** The outermost object literal around `pos` (`{ experimental: { ppr } }`), if any. */
function outerLiteralAt(sf: ts.SourceFile, pos: number): ts.ObjectLiteralExpression | undefined {
  let found: ts.ObjectLiteralExpression | undefined;
  const visit = (n: ts.Node): void => {
    if (pos < n.getStart(sf) || pos >= n.getEnd()) return;
    if (ts.isObjectLiteralExpression(n)) found = n;
    ts.forEachChild(n, visit);
  };
  visit(sf);
  let lit = found;
  while (lit && ts.isPropertyAssignment(lit.parent) && ts.isObjectLiteralExpression(lit.parent.parent)) lit = lit.parent.parent;
  return lit;
}

/** The declared type an object literal is checked against (`const config: NextConfig = {…}`). */
function literalType(checker: ts.TypeChecker, lit: ts.ObjectLiteralExpression): { name?: string; file?: string } {
  const t = checker.getContextualType(lit);
  const sym = t?.aliasSymbol ?? t?.symbol;
  return { name: sym?.name, file: sym?.declarations?.[0]?.getSourceFile().fileName };
}

/**
 * Config keys the installed version moved (`experimental: { ppr: true }` in Next 16). They still
 * type-check, so without this nothing tells the agent. Only keys the type diff found moved with a
 * stated successor are reported, not deprecations in general.
 */
function movedKeyFindings(sf: ts.SourceFile, checker: ts.TypeChecker, reports: Map<string, PackageReport>, watched: Set<string>): GuardFinding[] {
  const out: GuardFinding[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isPropertyAssignment(node) || ts.isShorthandPropertyAssignment(node)) && ts.isObjectLiteralExpression(node.parent)) {
      const parentProp = node.parent.parent;
      if (ts.isPropertyAssignment(parentProp) && ts.isObjectLiteralExpression(parentProp.parent) && !ts.isPropertyAssignment(parentProp.parent.parent)) {
        const key = `${parentProp.name.getText(sf).replace(/^["']|["']$/g, "")}.${node.name.getText(sf).replace(/^["']|["']$/g, "")}`;
        const { name: owner, file } = literalType(checker, parentProp.parent);
        const pkg = file ? packageOfFile(file, watched) : undefined;
        const r = pkg ? reports.get(pkg) : undefined;
        const change = r?.types?.changes.find((c) => c.meta?.movedKeys?.[key] && c.symbol.split(".")[0] === owner);
        if (pkg && r && change) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          const bullet = buildPackageNotes(r, 4).bullets.find((b) => b.text.startsWith(`\`${owner}\` keys that moved`));
          out.push({ line, pkg, problem: `\`${key}\` still type-checks, but ${pkg} ${r.pinned ?? ""} moved it: ${change.meta!.movedKeys![key]}`.replace(/\s+:/, ":"), hint: bullet?.text });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

/**
 * A moved member read as a property (`HttpStatusCode.PayloadTooLarge`, `axios.HttpStatusCode.X`)
 * on something imported from the package that moved it: it still type-checks while the old name is
 * kept as an alias, so no error will point it out.
 */
function movedMemberFindings(sf: ts.SourceFile, reports: Map<string, PackageReport>, watched: Set<string>, localToPkg: Map<string, string>): GuardFinding[] {
  const out: GuardFinding[] = [];
  const moved = new Map<string, Array<{ key: string; successor: string; pkg: string; pinned?: string }>>();
  for (const pkg of watched) {
    const r = reports.get(pkg);
    for (const c of r?.types?.changes ?? []) {
      for (const [key, successor] of Object.entries(c.meta?.movedKeys ?? {})) {
        const last = key.slice(key.lastIndexOf(".") + 1);
        if (!key.includes(".")) continue;
        moved.set(last, [...(moved.get(last) ?? []), { key, successor, pkg, pinned: r?.pinned }]);
      }
    }
  }
  if (!moved.size) return out;
  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node) && moved.has(node.name.text) && !ts.isPropertyAccessExpression(node.parent)) {
      const text = node.getText(sf).replace(/\s+/g, "").replace(/\?\./g, ".");
      let root: ts.Expression = node;
      while (ts.isPropertyAccessExpression(root)) root = root.expression;
      const rootPkg = ts.isIdentifier(root) ? localToPkg.get(root.text) : undefined;
      const hit = moved.get(node.name.text)!.find((m) => m.pkg === rootPkg && (text === m.key || text.endsWith(`.${m.key}`)));
      if (hit) {
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        out.push({ line, pkg: hit.pkg, problem: `\`${hit.key}\` still type-checks, but ${hit.pkg} ${hit.pinned ?? ""} moved it: ${hit.successor}`.replace(/\s+:/, ":") });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

function exportedNames(sf: ts.SourceFile): Set<string> {
  const out = new Set<string>();
  const isExported = (n: ts.Node) => ts.canHaveModifiers(n) && !!ts.getModifiers(n)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  for (const st of sf.statements) {
    if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st)) && st.name && isExported(st)) out.add(st.name.text);
    if (ts.isVariableStatement(st) && isExported(st)) for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) out.add(d.name.text);
    if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) for (const e of st.exportClause.elements) out.add(e.name.text);
  }
  return out;
}

/**
 * File conventions a dependency renamed (`middleware.ts` → `proxy.ts` in Next 16). Reported only
 * when the changelog announces the rename and a deprecation in the types says the same, and only
 * for files at the project root or in `src/`, so a file that shares a name with some renamed API
 * elsewhere isn't flagged.
 */
function conventionFindings(file: string, root: string, sf: ts.SourceFile, reports: Map<string, PackageReport>, watched: Set<string>): GuardFinding[] {
  const dir = dirname(file);
  if (dir !== root && dir !== join(root, "src")) return [];
  const ext = extname(file);
  const base = basename(file, ext);
  const exported = exportedNames(sf);
  const out: GuardFinding[] = [];
  for (const pkg of watched) {
    const r = reports.get(pkg);
    if (!r?.changelog?.items.length) continue;
    const word = (w: string) => new RegExp(`\\b${w}\\b`, "i");
    for (const [from, to] of renamePairs(r.changelog.items)) {
      if (!/^[a-z][\w-]*$/.test(from) || !/^[a-z][\w-]*$/.test(to) || (base !== from && base !== to)) continue;
      const corroborated = (r.types?.changes ?? []).some((c) => (c.kind === "deprecated" || c.kind === "renamed") && word(from).test(c.detail) && word(to).test(c.detail));
      if (!corroborated) continue;
      const ver = r.pinned ? ` ${r.pinned}` : "";
      const said = r.changelog.items.find((i) => renamePairs([i]).some(([f, t]) => f === from && t === to))?.text;
      const source = said ? ` (changelog: “${truncate(said, 100)}”)` : "";
      // Renaming the export but keeping the file (`export function proxy` in `middleware.ts`) is the usual half-migration.
      if (base === from && (exported.has(from) || exported.has(to) || exported.has("default"))) {
        const exportNote = exported.has(to) ? "" : `, export \`${to}\` instead of \`${from}\``;
        out.push({ line: 1, pkg, problem: `${pkg}${ver} renamed \`${from}\` to \`${to}\`${source}. If \`${from}${ext}\` is a ${pkg} file convention, it's now \`${to}${ext}\`: move this code there${exportNote}, and delete \`${from}${ext}\` (renaming the export alone isn't enough).` });
      } else if (base === to) {
        const stale = [".ts", ".js", ".mts", ".mjs", ".tsx", ".jsx"].map((e) => join(dir, `${from}${e}`)).find(existsSync);
        if (stale) out.push({ line: 1, pkg, problem: `\`${relative(root, stale)}\` still exists: ${pkg}${ver} renamed \`${from}\` to \`${to}\`${source}, so delete \`${basename(stale)}\`.` });
        if (exported.has(from) && !exported.has(to)) out.push({ line: 1, pkg, problem: `Export \`${to}\` instead of \`${from}\` (${pkg}${ver} renamed it).` });
      }
    }
  }
  return out;
}


/** The root identifier of `a.b.c(...)` / `new A()` / `a.b`. */
function rootIdentifier(expr: ts.Expression): string | undefined {
  let e: ts.Expression = expr;
  while (true) {
    if (ts.isIdentifier(e)) return e.text;
    if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e)) e = e.expression;
    else if (ts.isCallExpression(e) || ts.isNewExpression(e)) e = e.expression;
    else if (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e) || ts.isAsExpression(e)) e = e.expression;
    else return undefined;
  }
}

/** Packages involved in the code around a position: the import it's in, or calls/accesses on imported bindings. */
function packagesAround(sf: ts.SourceFile, pos: number, localToPkg: Map<string, string>): Set<string> {
  const out = new Set<string>();
  const visit = (node: ts.Node): void => {
    if (pos < node.getStart(sf) || pos >= node.getEnd()) return;
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const split = splitSpecifier(node.moduleSpecifier.text);
      if (split) out.add(split[0]);
    } else if (ts.isCallExpression(node) || ts.isNewExpression(node) || ts.isPropertyAccessExpression(node)) {
      const root = rootIdentifier(node.expression);
      const pkg = root ? localToPkg.get(root) : undefined;
      if (pkg) out.add(pkg);
    } else if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
      const pkg = localToPkg.get(node.typeName.text);
      if (pkg) out.add(pkg);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

type Call = ts.CallExpression | ts.NewExpression;

/**
 * The call a diagnostic belongs to: the innermost one whose callee or one of whose arguments contains
 * the error span. An error inside `tool({...})` nested in `generateText({...})` belongs to `tool()`;
 * an error on the `tool({...})` argument as a whole belongs to `generateText()`.
 */
function callAt(sf: ts.SourceFile, start: number, end: number): Call | undefined {
  const contains = (n: ts.Node) => n.getStart(sf) <= start && end <= n.getEnd();
  let found: Call | undefined;
  const visit = (node: ts.Node): void => {
    if (!contains(node)) return;
    if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && [node.expression, ...(node.arguments ?? [])].some(contains)) found = node;
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);
  return found;
}

/**
 * A watched package that declares `t` (or a part of a union): `SchemaType` for `schema.path("x")`,
 * mongoose's middleware callback type for `next`. Function types count by their signature's declaration.
 */
function typeOwner(t: ts.Type | undefined, watched: Set<string>, depth = 0): string | undefined {
  if (!t || depth > 2) return undefined;
  if (t.isUnionOrIntersection()) {
    for (const part of t.types) {
      const pkg = typeOwner(part, watched, depth + 1);
      if (pkg) return pkg;
    }
    return undefined;
  }
  for (const sym of [t.aliasSymbol, t.getSymbol()]) {
    for (const decl of sym?.declarations ?? []) {
      const pkg = packageOfFile(decl.getSourceFile().fileName, watched);
      if (pkg) return pkg;
    }
  }
  const decl = t.getCallSignatures()[0]?.getDeclaration();
  return decl ? packageOfFile(decl.getSourceFile().fileName, watched) : undefined;
}

/** The innermost node that contains [start, end). */
function nodeAt(sf: ts.SourceFile, start: number, end: number): ts.Node | undefined {
  let found: ts.Node | undefined;
  const visit = (n: ts.Node): void => {
    if (n.getStart(sf) > start || n.getEnd() < end) return;
    found = n;
    ts.forEachChild(n, visit);
  };
  ts.forEachChild(sf, visit);
  return found;
}

/**
 * Attribution by type, for code that reaches a package through values rather than imported names
 * (`doc.validate()`, `schema.path("age").doValidate()`, a hook's `next()`): the object of a member
 * access, a callee, or what an object literal is checked against, declared by a watched package.
 */
function packageByType(sf: ts.SourceFile, checker: ts.TypeChecker, start: number, end: number, watched: Set<string>): string | undefined {
  let n = nodeAt(sf, start, end);
  for (let depth = 0; n && depth < 5 && !ts.isSourceFile(n) && !ts.isBlock(n); depth++, n = n.parent) {
    const exprs: ts.Expression[] = [];
    if (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n)) exprs.push(n.expression);
    else if (ts.isCallExpression(n) || ts.isNewExpression(n)) exprs.push(n.expression);
    else if (ts.isIdentifier(n) && !ts.isPropertyAssignment(n.parent)) exprs.push(n);
    for (const e of exprs) {
      const pkg = typeOwner(checker.getTypeAtLocation(e), watched);
      if (pkg) return pkg;
    }
    if (ts.isObjectLiteralExpression(n)) {
      const pkg = typeOwner(checker.getContextualType(n), watched);
      if (pkg) return pkg;
    }
  }
  return undefined;
}

/**
 * A callback's parameter that the error is about (`next()` in `schema.pre("save", function (next) {…})`):
 * its type is whatever the API the callback is passed to gives it, so the error belongs to that API's
 * package. Only the parameter itself or a member of it, not anything else inside the callback.
 */
function callbackParameterPackage(sf: ts.SourceFile, checker: ts.TypeChecker, start: number, end: number, bindings: ImportBinding[], watched: Set<string>): string | undefined {
  let n = nodeAt(sf, start, end);
  while (n && (ts.isPropertyAccessExpression(n.parent) || ts.isCallExpression(n.parent)) && !ts.isIdentifier(n)) n = n.parent;
  const root = n && ts.isIdentifier(n) ? n : n && (ts.isPropertyAccessExpression(n) || ts.isCallExpression(n)) ? rootIdentifierNode(n) : undefined;
  const decl = root ? checker.getSymbolAtLocation(root)?.valueDeclaration : undefined;
  if (!decl || !ts.isParameter(decl)) return undefined;
  const fn = decl.parent;
  if (!(ts.isFunctionExpression(fn) || ts.isArrowFunction(fn)) || !(ts.isCallExpression(fn.parent) || ts.isNewExpression(fn.parent))) return undefined;
  const call = fn.parent;
  if (!call.arguments?.includes(fn)) return undefined;
  return calleeOf(call, bindings, checker, watched).pkg;
}

function rootIdentifierNode(expr: ts.Expression): ts.Identifier | undefined {
  let e: ts.Expression = expr;
  while (ts.isPropertyAccessExpression(e) || ts.isCallExpression(e) || ts.isElementAccessExpression(e) || ts.isNonNullExpression(e) || ts.isParenthesizedExpression(e)) e = e.expression;
  return ts.isIdentifier(e) ? e : undefined;
}

/** The called function's exported name and package, when it's imported: `tool` (ai), `object` for `z.object()` (zod). */
function calleeOf(call: Call, bindings: ImportBinding[], checker?: ts.TypeChecker, watched?: Set<string>): { name?: string; pkg?: string } {
  let e: ts.Expression = call.expression;
  while (ts.isParenthesizedExpression(e) || ts.isNonNullExpression(e)) e = e.expression;
  const root = rootIdentifier(e);
  const binding = root ? bindings.find((b) => b.local === root) : undefined;
  if (!binding) {
    // A method on a value of a package's type: `schema.pre(…)`, `query.exec()`.
    if (checker && watched && ts.isPropertyAccessExpression(e)) {
      const pkg = typeOwner(checker.getTypeAtLocation(e.expression), watched) ?? typeOwner(checker.getTypeAtLocation(e), watched);
      if (pkg) return { name: e.name.text, pkg };
    }
    return {};
  }
  if (ts.isPropertyAccessExpression(e)) return { name: e.name.text, pkg: binding.pkg };
  if (ts.isIdentifier(e)) return { name: binding.imported === "default" || binding.imported === "*" ? e.text : binding.imported, pkg: binding.pkg };
  return { pkg: binding.pkg };
}

/** The note is about `name` itself (`tool()`, `z.object()`), not a passing mention of the word. */
const about = (text: string, name: string) => new RegExp(`\`(?:[\\w$]+\\.)*${name.replace(/[$]/g, "\\$")}(?:\\(\\))?\``).test(text);

/** Identifiers a diagnostic quotes: `'maxSteps'`, `'turbo'`, `'ExperimentalConfig'`. */
const quotedIdentifiers = (message: string) => [...message.matchAll(/'([A-Za-z_$][\w$]*)'/g)].map((m) => m[1]);

/**
 * The note for a diagnostic: one that names an identifier the diagnostic quotes, as code (`turbo`,
 * `experimental.turbo`, not the `--turbo` flag), preferring the notes about the function the error is
 * in. A diagnostic about the call itself ("Expected 1 arguments, but got 0", or one that only quotes
 * type names) gets that function's note. Otherwise none: a note about some other change in the same
 * package sends the agent the wrong way.
 */
function hintFor(r: PackageReport | undefined, problem: string, callee: string | undefined): string | undefined {
  if (!r || r.status !== "changed") return undefined;
  const bullets = buildPackageNotes(r, 4).bullets;
  const quoted = quotedIdentifiers(problem);
  // A lowercase name the message quotes is what it's about (`'temperature'` does not exist…): another
  // option's note from the same function doesn't fix it. Type names (`'CallOptions'`) only say where,
  // so they count only when the message names nothing else.
  // `'string'` in "Argument of type 'string' is not assignable" is a type, not the API it's about.
  const subjects = quoted.filter((n) => /^[a-z_$]/.test(n) && !KEYWORDS.has(n));
  const wanted = subjects.length ? subjects : quoted;
  // A note that leads with another API (`literal()` options no longer accept `errorMap`) isn't about
  // an `errorMap` error in `z.config({...})`, though both name the option.
  const typeNames = quoted.filter((n) => /^[A-Z$]/.test(n));
  const elsewhere = (text: string) => {
    const lead = text.match(/^`([\w$.]+?)\(\)`/)?.[1]?.split(".").pop();
    if (!lead || wanted.includes(lead)) return false;
    if (callee) return lead !== callee && !quoted.includes(lead);
    return typeNames.length > 0 && !typeNames.some((t) => t.includes(lead) || lead.includes(t.replace(/^\$/, "")));
  };
  const naming = (list: Bullet[]) => {
    for (const n of wanted) {
      const b = list.find((x) => namesIdentifier(x.text, n) && !elsewhere(x.text));
      if (b) return b;
    }
  };
  // Prefer the note about the function the error is in: "No overload matches this call" inside
  // `tool({...})` names nothing, and the file also uses `generateText`, whose note would win otherwise.
  const own = callee ? bullets.filter((b) => about(b.text, callee)) : [];
  // A changelog line counts only when it names the identifier in code: "The email pattern dropped
  // its lookaheads" says nothing about an `.errors` error just because the file uses `email`.
  const typed = bullets.filter((b) => b.tag !== "changelog" || quoted.some((n) => about(b.text, n)));
  // The type diff also knows about APIs the notes leave out because the file doesn't import them
  // (`ZodError`: removed `errors`), and about every config key that moved, where a note lists a few.
  // Facts about a type the message names come first.
  const moved: Bullet[] = [];
  for (const c of r.types?.changes ?? []) {
    const owner = c.symbol.split(".")[0];
    for (const [key, successor] of Object.entries(c.meta?.movedKeys ?? {})) {
      if (wanted.includes(key.slice(key.lastIndexOf(".") + 1))) moved.push({ text: `\`${owner}\` key \`${key}\` moved: ${successor}.`, tag: "types", priority: c.severity });
    }
  }
  const facts: Bullet[] = (r.types?.changes ?? [])
    .filter((c) => c.kind !== "added" && wanted.some((n) => about(c.detail, n)) && !elsewhere(c.detail))
    .sort((x, y) => Number(problem.includes(y.symbol.split(".")[0])) - Number(problem.includes(x.symbol.split(".")[0])) || y.severity - x.severity)
    .map((c) => ({ text: c.detail.endsWith(".") ? c.detail : `${c.detail}.`, tag: "types", priority: c.severity }));
  const b = naming(own) ?? naming(typed) ?? moved[0] ?? facts[0] ?? (subjects.length ? undefined : own[0]);
  return b && b.text + (b.example ? ` Before: \`${b.example.before}\` → After: \`${b.example.after}\`` : "");
}

/**
 * Type-check one file against the versions the project has installed and report the problems
 * that come from dependencies changed after the model's training cutoff.
 */
/** How long the guard spends looking up related changes for errors no note explains. */
const RELATED_BUDGET_MS = Number(process.env.STALEMAP_GUARD_SEARCH_MS) || 6_000;
const MAX_RELATED = 3;
const KEYWORDS = new Set(
  "abstract any as async await boolean break case catch class const constructor continue debugger declare default delete do else enum export extends false finally for from function get if implements import in instanceof interface is keyof let module namespace never new null number object of package private protected public readonly require return set static string super switch symbol this throw true try type typeof undefined unique unknown var void while with yield".split(" "),
);

/** The error's line, and the lines above it up to the statement it's in (`schema.pre("save", function (next) {`). */
export function codeAround(lines: string[], line: number): { context: string; names: string[] } {
  const at = lines[line - 1] ?? "";
  const indent = (l: string) => l.match(/^\s*/)![0].length;
  const out = [at];
  let level = indent(at);
  for (let i = line - 2; i >= 0 && out.length < 8 && level > 0; i--) {
    const l = lines[i];
    if (!l.trim() || indent(l) >= level) continue;
    out.unshift(l);
    level = indent(l);
  }
  const names = [...new Set(at.match(/[A-Za-z_$][\w$]*/g) ?? [])].filter((n) => n.length > 2 && !KEYWORDS.has(n));
  return { context: out.map((l) => l.trim()).join(" "), names };
}

/**
 * For errors the guard ties to a changed package but has no note for: search that package's changes
 * (type diffs, release notes, upgrade-guide sections) with the error and the code around it. A match
 * counts only if it names an identifier from the error's line or message, so an unrelated change
 * isn't offered as the reason.
 */
async function relatedChanges(findings: GuardFinding[], text: string, deps: ProjectDep[], model: ResolvedModel, useCache: boolean): Promise<void> {
  const lines = text.split("\n");
  const wanted = findings.filter((f) => f.pkg && f.line && !f.group && !f.hint && !f.source).slice(0, MAX_RELATED);
  if (!wanted.length) return;
  const docsOf = new Map<string, Promise<SearchDoc[]>>();
  const lookup = async (f: GuardFinding) => {
    const dep = deps.find((d) => d.name === f.pkg);
    if (!dep) return;
    if (!docsOf.has(f.pkg)) docsOf.set(f.pkg, packageDocs(dep, model, { useCache, marginDays: 30 }));
    const docs = await docsOf.get(f.pkg)!;
    if (!docs.length) return;
    const { context, names } = codeAround(lines, f.line);
    const quoted = [...f.problem.matchAll(/'([A-Za-z_$][\w$.]*)'/g)].map((m) => m[1].split(".").pop()!);
    const subjects = [...new Set([...names, ...quoted])].filter((n) => n.length > 2 && !KEYWORDS.has(n));
    if (!subjects.length) return;
    const query = `${f.problem.replace(/^TS\d+:\s*/, "")} ${context}`;
    // As a name in code, not part of a path or a word (`openai/client` doesn't mention a `client` option).
    const mentions = (d: SearchDoc) => subjects.some((n) => new RegExp(`(?<![\\w$/@-])${n.replace(/[$]/g, "\\$")}(?![\\w$/-])`).test(d.text));
    // A list of new exports names things; it doesn't say what changed about the code that errs.
    const usable = (d: SearchDoc) => !/^New exports in /.test(d.text);
    const hit = searchIndex(buildIndex(docs), query, { limit: 8 }).find((h) => usable(h.doc) && mentions(h.doc));
    if (!hit) return;
    const d = hit.doc;
    const where = d.kind === "guide" ? `${d.source}${d.title ? ` § ${d.title}` : ""}` : d.kind === "changelog" ? d.source : `${d.kind === "types" ? "type changes" : "notes"} ${d.from} → ${d.to}`;
    f.related = { source: `${d.pkg} ${where}`, text: snippet(d.text, tokenize(query), 600) };
  };
  const all = Promise.all(wanted.map((f) => lookup(f).catch((err: Error) => debug(`guard: related change for ${f.pkg}: ${err.message}`))));
  await Promise.race([all, new Promise((done) => setTimeout(done, RELATED_BUDGET_MS).unref())]);
}

export async function guardFile(opts: {
  cwd: string;
  file: string;
  model?: string;
  useCache?: boolean;
  /** Skip the model and registry lookups: watch every imported dependency (tests, air-gapped use). */
  offline?: boolean;
  /**
   * Also report uses of deprecated APIs. Off by default: deprecated code still works, and in the
   * benchmark, pushing agents to replace it broke working code more often than it helped.
   */
  deprecations?: boolean;
  /** Precomputed reports (tests): skip the model and registry lookups and watch the changed ones. */
  reports?: PackageReport[];
  /** The agent session, when a hook runs the guard: what counts as a new error is tracked per session. */
  session?: string;
}): Promise<GuardResult | undefined> {
  const file = resolve(opts.cwd, opts.file);
  if (file.endsWith(".d.ts") || file.includes("/node_modules/") || !existsSync(file)) return undefined;
  const code = CHECKED_EXT.test(file);
  const root = findProjectRoot(file, resolve(opts.cwd));
  const pkg = await readJson<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>(join(root, "package.json"));
  if (!pkg) return undefined;

  const text = readFileSync(file, "utf8");
  const parsed = ts.createSourceFile(code ? file : `${file}.ts`, code ? text : "", ts.ScriptTarget.ESNext, true);
  const bindings = importsOf(parsed);
  const declared = { ...pkg.devDependencies, ...pkg.dependencies };
  const imported = [...new Set(bindings.map((b) => b.pkg))].filter((p) => p in declared && !p.startsWith("@types/"));
  // The project's own compiler options can be stale too (TS5101 for `baseUrl` in TypeScript 6).
  if ("typescript" in declared && !imported.includes("typescript")) imported.push("typescript");
  // Files a package reads rather than imports: tsconfig.json, schema.prisma, next.config.ts.
  const configured = configuredBy(relative(root, file), Object.keys(declared)).filter((p) => !imported.includes(p));
  if (!imported.length && !configured.length) return undefined;

  // Which of the imported packages changed after the model's cutoff (and what changed)?
  let model: ResolvedModel | undefined;
  if (!opts.offline && !opts.reports) {
    try {
      model = await resolveModel({ model: opts.model, cwd: root, useCache: opts.useCache ?? true });
    } catch {
      model = undefined; // unknown model: still report compiler errors on dependency APIs
    }
  }
  const deps: ProjectDep[] = [...imported, ...configured].map((name) => ({
    name,
    range: declared[name],
    kind: "dependencies",
    ...(imported.includes(name) ? { usage: { subpaths: subpathUsage(bindings.filter((b) => b.pkg === name)), files: new Set([relative(root, file)]) } } : {}),
  }));
  const lock = await loadLockVersions(root, deps);
  for (const d of deps) {
    const installed = await readJson<{ version?: string }>(join(root, "node_modules", d.name, "package.json"));
    d.pinned = (installed?.version && semver.valid(installed.version) ? installed.version : undefined) ?? lock.versions.get(d.name);
  }
  const reports = new Map<string, PackageReport>((opts.reports ?? []).map((r) => [r.name, r]));
  if (model) {
    const rs = await mapLimit(deps, 4, (d) =>
      analyzeDependency(d, {
        model: model!,
        marginDays: 30,
        useCache: opts.useCache ?? true,
        llm: false,
        llmModel: "",
        maxNotesPerPackage: 8,
        concurrency: 1,
        // Upgrade-guide notes already made by `sync --guides` (cache only: no model calls in a hook).
        guides: { model: process.env.STALEMAP_LLM_MODEL ?? DEFAULT_LLM_MODEL },
      }),
    );
    const { examplesFor } = await import("./examples.js");
    for (const r of rs) {
      if (r.status === "changed") r.examples = await examplesFor(r, undefined, process.env.STALEMAP_LLM_MODEL ?? "claude-opus-5-5", true);
      reports.set(r.name, r);
    }
  }
  const ts6 = reports.get("typescript");
  if (ts6?.status === "changed") ts6.tsconfig ??= readTsconfig(root);
  const candidates = [...imported, ...configured];
  const watched = new Set(model || opts.reports ? [...reports.values()].filter((r) => candidates.includes(r.name) && (r.status === "changed" || r.status === "new")).map((r) => r.name) : candidates);

  // The project's own TypeScript, in the background while the file is checked. On every code edit
  // (unless STALEMAP_GUARD_TSC=0): its full `tsc` run, so the guard reports everything a plain
  // type-check hook would, with stalemap's notes on the errors a changed dependency explains. And when
  // TypeScript itself changed after the cutoff, its options too.
  const allErrors = process.env.STALEMAP_GUARD_TSC !== "0" && (code || isTsconfig(file));
  const tsChanged = watched.has("typescript");
  const tsPinned = deps.find((d) => d.name === "typescript")?.pinned;
  const configFile = !tsChanged && !allErrors ? undefined : isTsconfig(file) ? file : ts.findConfigFile(root, ts.sys.fileExists, "tsconfig.json");
  const checking = configFile && dirname(resolve(configFile)).startsWith(root)
    ? checkProject(root, configFile, { declaredVersion: tsPinned, full: isTsconfig(file) || allErrors, timeoutMs: TSC_TIMEOUT_MS }).catch(() => undefined)
    : undefined;
  if (!watched.size) {
    const check = await checking;
    if (!check || !configFile) return { file, findings: [], packages: [] };
    const callers = check.via === "cli" && check.code ? await callerErrors(root, configFile, file, check.code, opts.session) : [];
    const findings = projectTsFindings(check, root, configFile, undefined, { file, isConfig: isTsconfig(file), callers }, false);
    return { file, findings, packages: [] };
  }
  const watchedReports = [...watched].map((n) => reports.get(n)).filter((r): r is PackageReport => !!r);
  const packagesOf = (findings: GuardFinding[], notes: EditNote[]) =>
    [...watched]
      .filter((name) => findings.some((f) => f.pkg === name) || notes.some((n) => n.pkg === name) || code)
      .map((name) => {
        const r = reports.get(name);
        return { name, from: r?.baseline?.version, to: r?.pinned ?? deps.find((d) => d.name === name)?.pinned ?? "?" };
      });

  // A config file isn't type-checked as code: its option errors (an edited tsconfig) and the notes it touches.
  if (!code) {
    const findings: GuardFinding[] = [];
    const check = isTsconfig(file) ? await checking : undefined;
    if (check && configFile) findings.push(...projectTsFindings(check, root, configFile, reports.get("typescript"), { file, isConfig: true }, tsChanged));
    const notes = editNotesFor(text, watchedReports, findings.map((f) => f.problem));
    return { file, findings, notes, packages: packagesOf(findings, notes) };
  }

  const localToPkg = new Map(bindings.filter((b) => b.local).map((b) => [b.local, b.pkg] as const));
  const started = Date.now();
  const config = projectConfig(root);
  const program = ts.createProgram({ rootNames: [file], options: config.options, configFileParsingDiagnostics: config.errors });
  const sf = program.getSourceFile(file)!;
  const checker = program.getTypeChecker();
  const findings: GuardFinding[] = [];

  const fileDiagnostics = [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)];
  // Packages the file imports: only their changed names can attribute an error by name.
  const importedHere = new Set(bindings.map((b) => b.pkg));
  for (const d of fileDiagnostics) {
    const site = API_SITE_DIAGNOSTICS.has(d.code);
    if ((!API_DIAGNOSTICS.has(d.code) && !site) || d.start === undefined) continue;
    const message = ts.flattenDiagnosticMessageText(d.messageText, "\n").split("\n")[0];
    const end = d.start + (d.length ?? 0);
    const around = packagesAround(sf, d.start, localToPkg);
    // By name: an identifier the message quotes that the package's change set has, for a package
    // this file imports. (Unquoted words don't count: TypeScript's own removed API includes `Type`
    // and `Symbol`, which every other message mentions.)
    const quoted = quotedIdentifiers(message);
    const byName = site
      ? undefined
      : [...watched].find((p) => {
          const r = reports.get(p);
          if (!r || !importedHere.has(p)) return false;
          const names = changedNames(r);
          return quoted.some((n) => n.length > 2 && names.has(n));
        });
    const call = callAt(sf, d.start, end);
    const callee = call ? calleeOf(call, bindings, checker, watched) : {};
    // Inside a config object (`experimental: { dynamicIO }`), the package that declares its type.
    const lit = call ? undefined : outerLiteralAt(sf, d.start);
    const litFile = lit ? literalType(checker, lit).file : undefined;
    const byLiteral = litFile ? packageOfFile(litFile, watched) : undefined;
    const pkgName =
      (callee.pkg && watched.has(callee.pkg) ? callee.pkg : undefined) ??
      [...around].find((p) => watched.has(p)) ??
      byLiteral ??
      byName ??
      packageByType(sf, checker, d.start, end, watched) ??
      callbackParameterPackage(sf, checker, d.start, end, bindings, watched);
    if (!pkgName) continue;
    const line = sf.getLineAndCharacterOfPosition(d.start).line + 1;
    const problem = `TS${d.code}: ${truncate(tidyMessage(message), 220)}`;
    findings.push({ line, pkg: pkgName, problem, hint: hintFor(reports.get(pkgName), message, callee.pkg === pkgName ? callee.name : undefined) });
  }

  // Deprecated APIs still compile; flag uses of ones a watched package deprecated.
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && !ts.isImportSpecifier(node.parent)) {
      let sym = checker.getSymbolAtLocation(node);
      if (sym && sym.flags & ts.SymbolFlags.Alias) {
        try {
          sym = checker.getAliasedSymbol(sym);
        } catch {
          // unresolved
        }
      }
      const decl = sym?.declarations?.find((x) => ts.getJSDocTags(x).some((t) => t.tagName.text === "deprecated"));
      const fromPkg = decl ? [...watched].find((p) => decl.getSourceFile().fileName.includes(`/node_modules/${p}/`)) : undefined;
      if (decl && fromPkg) {
        const tag = ts.getJSDocTags(decl).find((t) => t.tagName.text === "deprecated");
        const why = ts.getTextOfJSDocComment(tag?.comment)?.replace(/\s+/g, " ").trim();
        const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
        findings.push({ line, pkg: fromPkg, problem: `\`${node.text}\` is deprecated${why ? `: ${truncate(why, 160)}` : ""}` });
      }
    }
    ts.forEachChild(node, visit);
  };
  if (opts.deprecations) visit(sf);
  // A moved key that no longer type-checks already has its compile error: "still type-checks" would contradict it.
  const compileErrorAt = (f: GuardFinding) => findings.some((e) => e.line === f.line && /^TS\d+:/.test(e.problem) && f.problem.match(/`[\w$]+\.([\w$]+)`/)?.[1] && e.problem.includes(`'${f.problem.match(/`[\w$]+\.([\w$]+)`/)![1]}'`));
  findings.push(
    ...movedKeyFindings(sf, checker, reports, watched).filter((f) => !compileErrorAt(f)),
    ...movedMemberFindings(sf, reports, watched, localToPkg).filter((f) => !findings.some((e) => e.line === f.line && /^TS\d+:/.test(e.problem))),
    ...conventionFindings(file, root, sf, reports, watched),
    ...suppressionFindings(sf, text, checker, bindings, reports, watched),
  );
  const check = await checking;
  if (check && configFile) {
    const reported = new Set(findings.filter((f) => f.line).map((f) => `${f.line}|${f.problem.match(/^TS(\d+)/)?.[1] ?? ""}`));
    const callers = check.via === "cli" && check.code ? await callerErrors(root, configFile, file, check.code, opts.session) : [];
    findings.push(...projectTsFindings(check, root, configFile, reports.get("typescript"), { file, isConfig: false, reported, callers }, tsChanged));
  }
  debug(`guard: type-checked ${relative(root, file)} in ${Date.now() - started}ms, ${findings.length} finding(s)`);

  // One finding per line and problem.
  const seen = new Set<string>();
  const unique = findings.filter((f) => {
    const k = `${f.line}|${f.where ?? ""}|${f.problem}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (model && process.env.STALEMAP_GUARD_SEARCH !== "0") await relatedChanges(unique, text, deps, model, opts.useCache ?? true);
  const notes = editNotesFor(text, watchedReports, unique.map((f) => `${f.problem}\n${f.hint ?? ""}\n${f.related?.text ?? ""}`));
  return { file, findings: unique, notes, packages: packagesOf(unique, notes) };
}

/** The message the agent sees after an edit. Empty when there's nothing to say. */
export function guardMessage(result: GuardResult | undefined, cwd: string, max = 8, maxNotes = MAX_EDIT_NOTES): string {
  if (!result) return "";
  const rel = relative(cwd, result.file) || result.file;
  const versions = (has: (name: string) => boolean) =>
    result.packages
      .filter((p) => has(p.name))
      .map((p) => `\`${p.name}\` ${p.from ? `${p.from} → ` : ""}${p.to}`)
      .join(", ");
  const notes = (result.notes ?? []).slice(0, maxNotes);
  const notesText = notes.length
    ? `stalemap: \`${rel}\` uses names from changes in the installed versions that still type-check, so no error will point them out (${versions((n) => notes.some((x) => x.pkg === n))}):\n${notes
        .map((n) => `- ${n.pkg}: ${n.text}`)
        .join("\n")}\nCheck whether they change what this code does.`
    : "";
  if (!result.findings.length) return notesText;
  // A note that explains several findings is shown once, under the first.
  const shownHints = new Set<string>();
  const line = (f: GuardFinding) => {
    const key = f.hint?.replace(/ Before: .*$/, "");
    const hint = f.hint && !shownHints.has(key!) ? f.hint : undefined;
    if (hint) shownHints.add(key!);
    const from = f.source && !f.group && f.pkg ? ` (from the project's ${f.source})` : "";
    const at = f.line ? `line ${f.line}: ` : f.where === "" ? "" : `${f.where ?? "project"}: `;
    const related = !hint && f.related && !shownHints.has(f.related.text) ? f.related : undefined;
    if (related) shownHints.add(related.text);
    const relatedText = related ? `\n  Related change (${related.source}):\n${related.text.split("\n").map((l) => `    ${l}`).join("\n")}` : "";
    return `- ${at}${f.problem}${from}${hint ? `\n  Fix: ${truncate(hint, 420)}` : ""}${relatedText}`;
  };
  // The edited file's findings first, then what a tsconfig edit did to the code, what an edit did to
  // the files that import it, and the project's other errors (projectTsFindings caps those, with a
  // "…and N more" line of its own).
  const block = (list: GuardFinding[], limit: number) => {
    const main = list.filter((f) => !f.group);
    const lines = main.slice(0, limit).map(line);
    if (main.length > limit) lines.push(`- …and ${main.length - limit} more`);
    const groups: Array<[GuardFinding["group"], string]> = [
      ["config", "With these options, the project's %s reports in the code:"],
      ["callers", "In files that import it, the project's %s now reports:"],
      ["elsewhere", "Elsewhere in the project, %s reports:"],
    ];
    for (const [name, title] of groups) {
      const g = list.filter((f) => f.group === name);
      if (g.length) lines.push(title.replace("%s", g[0].source ?? "tsc"), ...g.map(line));
    }
    return lines.join("\n");
  };
  const changed = result.findings.filter((f) => f.pkg);
  const plain = result.findings.filter((f) => !f.pkg);
  const parts: string[] = [];
  if (changed.length) {
    const pkgs = versions((n) => changed.some((f) => f.pkg === n));
    // Everything from the project's own compiler: it's TypeScript's options and checks that changed.
    const compilerOnly = changed.every((f) => f.pkg === "typescript" && f.source);
    const intro = compilerOnly
      ? `stalemap: after \`${rel}\`, the project's TypeScript reports errors, and TypeScript changed after your training data (${pkgs}). Your memory of its options and checks is out of date; go by what the compiler says:`
      : `stalemap: \`${rel}\` uses APIs that changed after your training data (${pkgs}). Your memory of these APIs is out of date; use the installed versions' APIs:`;
    parts.push(`${intro}\n${block(changed, max)}`);
  }
  if (plain.length) {
    const source = plain.find((f) => f.source)?.source ?? "tsc";
    const intro = changed.length ? `The project's ${source} also reports:` : `stalemap: after \`${rel}\`, the project's ${source} reports:`;
    parts.push(`${intro}\n${block(plain, max)}`);
  }
  const findingsText = `${parts.join("\n")}\nFix these now, before moving on.`;
  return notesText ? `${findingsText}\n\n${notesText}` : findingsText;
}
