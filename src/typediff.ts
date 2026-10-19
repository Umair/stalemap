import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import ts from "typescript";
import { TOOL_VERSION, cacheDir, debug, readJson, sha256, truncate, writeJsonAtomic } from "./util.js";

// ---------------------------------------------------------------------------
// Entry resolution: which .d.ts file does `import "pkg/subpath"` load?

interface Manifest {
  name?: string;
  types?: string;
  typings?: string;
  main?: string;
  module?: string;
  exports?: unknown;
  typesVersions?: Record<string, Record<string, string[]>>;
}

const DTS = /\.d\.[cm]?ts$/;

function declarationCandidates(rel: string): string[] {
  if (DTS.test(rel)) return [rel];
  if (/\.mjs$/.test(rel)) return [rel.replace(/\.mjs$/, ".d.mts"), rel.replace(/\.mjs$/, ".d.ts")];
  if (/\.cjs$/.test(rel)) return [rel.replace(/\.cjs$/, ".d.cts"), rel.replace(/\.cjs$/, ".d.ts")];
  if (/\.[jt]sx?$/.test(rel)) return [rel.replace(/\.[jt]sx?$/, ".d.ts")];
  return [rel + ".d.ts", join(rel, "index.d.ts")];
}

function firstExisting(pkgDir: string, rels: string[]): string | undefined {
  for (const rel of rels) {
    const full = join(pkgDir, rel);
    if (existsSync(full) && DTS.test(full)) return full;
  }
  return undefined;
}

/** Resolve an exports-map target to a declaration file, preferring the `types` condition. */
function pickFromTarget(pkgDir: string, target: unknown): string | undefined {
  if (typeof target === "string") return firstExisting(pkgDir, declarationCandidates(target));
  if (Array.isArray(target)) {
    for (const t of target) {
      const hit = pickFromTarget(pkgDir, t);
      if (hit) return hit;
    }
    return undefined;
  }
  if (target && typeof target === "object") {
    const obj = target as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => !k.startsWith("."));
    const ordered = [...keys.filter((k) => k === "types" || k.startsWith("types@")), ...keys.filter((k) => !k.startsWith("types"))];
    for (const k of ordered) {
      const hit = pickFromTarget(pkgDir, obj[k]);
      if (hit) return hit;
    }
  }
  return undefined;
}

function matchExportsKey(exportsMap: Record<string, unknown>, subpath: string): unknown {
  if (subpath in exportsMap) return exportsMap[subpath];
  for (const [key, value] of Object.entries(exportsMap)) {
    const star = key.indexOf("*");
    if (star === -1) continue;
    const prefix = key.slice(0, star);
    const suffix = key.slice(star + 1);
    if (subpath.startsWith(prefix) && subpath.endsWith(suffix) && subpath.length >= key.length - 1) {
      const fill = subpath.slice(prefix.length, subpath.length - suffix.length);
      return JSON.parse(JSON.stringify(value).replaceAll("*", fill));
    }
  }
  return undefined;
}

export function resolveTypesEntry(pkgDir: string, subpath: string): string | undefined {
  const manifest = readManifest(pkgDir);
  if (!manifest) return undefined;
  const exp = manifest.exports;
  if (exp !== undefined && exp !== null) {
    const isSubpathMap = typeof exp === "object" && !Array.isArray(exp) && Object.keys(exp).some((k) => k.startsWith("."));
    const target = isSubpathMap ? matchExportsKey(exp as Record<string, unknown>, subpath) : subpath === "." ? exp : undefined;
    if (target !== undefined) {
      const hit = pickFromTarget(pkgDir, target);
      if (hit) return hit;
    }
    // Some packages ship `exports` without types conditions; fall through to legacy lookup.
  }

  const sub = subpath === "." ? "" : subpath.slice(2);
  const tv = manifest.typesVersions?.["*"];
  if (tv && sub) {
    for (const [pattern, targets] of Object.entries(tv)) {
      const star = pattern.indexOf("*");
      const ok = star === -1 ? pattern === sub : sub.startsWith(pattern.slice(0, star)) && sub.endsWith(pattern.slice(star + 1));
      if (!ok) continue;
      const fill = star === -1 ? "" : sub.slice(star, sub.length - (pattern.length - star - 1));
      const hit = firstExisting(pkgDir, targets.flatMap((t) => declarationCandidates(t.replace("*", fill))));
      if (hit) return hit;
    }
  }

  if (!sub) {
    const rels = [manifest.types, manifest.typings].filter((x): x is string => !!x).flatMap(declarationCandidates);
    if (manifest.main) rels.push(...declarationCandidates(manifest.main));
    rels.push("index.d.ts");
    return firstExisting(pkgDir, rels);
  }
  const nested = readManifest(join(pkgDir, sub));
  const nestedTypes = nested?.types ?? nested?.typings;
  if (nestedTypes) {
    const hit = firstExisting(join(pkgDir, sub), declarationCandidates(nestedTypes));
    if (hit) return hit;
  }
  return firstExisting(pkgDir, [`${sub}.d.ts`, `${sub}.d.mts`, join(sub, "index.d.ts")]);
}

function readManifest(dir: string): Manifest | undefined {
  try {
    return JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as Manifest;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Public API surface of one entry point

export interface ParamInfo {
  name: string;
  optional: boolean;
  type: string;
  /** For options-object parameters: property name → optional? */
  props?: Record<string, boolean>;
  /** Short docs for those properties: first JSDoc sentence and @default. */
  propDocs?: Record<string, string>;
}

export interface MemberInfo {
  text: string;
  optional: boolean;
  deprecated?: string;
}

export type ApiKind = "function" | "class" | "interface" | "type" | "variable" | "enum" | "namespace" | "reexport";

export interface ApiItem {
  kind: ApiKind;
  text: string;
  /** One parameter list per overload, for callables. */
  signatures?: ParamInfo[][];
  members?: Record<string, MemberInfo>;
  deprecated?: string;
  /** A namespace export that mirrors the package root (`export * as z`): its members are diffed as top-level exports. */
  mirror?: boolean;
  /** Declared name of a default export (`export default class Anthropic`). */
  declName?: string;
}

export type Surface = Record<string, ApiItem>;

const KIND_PRIORITY: ApiKind[] = ["function", "class", "variable", "interface", "type", "enum", "namespace", "reexport"];

export function normalizeText(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/^(export\s+)?(default\s+)?(declare\s+)?/, "")
    .trim();
}

/** Deprecation messages as plain text: no code samples, markdown links reduced to their text. */
export function cleanDeprecation(text: string): string {
  const plain = text
    .replace(/```[\s\S]*?(```|$)/g, " ")
    .replace(/\{@link(?:code|plain)?\s+([^}|\s]+)(?:[\s|][^}]*)?\}/g, "`$1`")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  // Keep the first two sentences; the rest is usually examples or links ("Read more: …").
  const trimmed = plain.replace(/\s*\b(read|learn|see) more\b.*$/i, "").trim();
  if (trimmed !== plain) return cleanDeprecation(trimmed);
  const sentences = plain.match(/[^.!?]+[.!?]+(\s|$)/g);
  return sentences && sentences.length > 2 ? sentences.slice(0, 2).join("").trim() : plain;
}

function deprecationOf(node: ts.Node): string | undefined {
  const tag = ts.getJSDocTags(node).find((t) => t.tagName.text === "deprecated");
  if (!tag) return undefined;
  return cleanDeprecation(normalizeText(ts.getTextOfJSDocComment(tag.comment) ?? ""));
}

/** Symbol-keyed and dunder members (`[INTERNALS]`, `__@iterator@12`) are implementation details. */
const isInternalMember = (name: string) => name.startsWith("__") || name.startsWith("[");

const MAX_OPTION_PROPS = 300;

const OBJECT_PROTOTYPE = new Set(["constructor", "toString", "toLocaleString", "valueOf", "hasOwnProperty", "isPrototypeOf", "propertyIsEnumerable"]);

function isOptionsLike(t: ts.Type): boolean {
  if (!(t.flags & ts.TypeFlags.Object) && !t.isIntersection()) return false;
  if (t.getCallSignatures().length || t.getConstructSignatures().length) return false;
  const sym = t.symbol ?? t.aliasSymbol;
  if (sym && sym.flags & ts.SymbolFlags.Class) return false; // an instance (QueryClient), not an options bag
  if (sym && ["Array", "ReadonlyArray", "Promise", "Map", "Set", "Date", "RegExp", "Function"].includes(sym.name)) return false;
  return true;
}

/**
 * Property names of an options-object parameter (`streamText({ model, maxSteps })`), resolved
 * through aliases and intersections. For `string | Options` only the object members count.
 */
/** "Condition for stopping the generation… (default `stepCountIs(1)`)" from a property's JSDoc. */
function shortDoc(checker: ts.TypeChecker, p: ts.Symbol): string | undefined {
  try {
    const text = ts.displayPartsToString(p.getDocumentationComment(checker)).replace(/\s+/g, " ").trim();
    const first = text.match(/^.*?[.!?](\s|$)/)?.[0].trim() ?? text;
    const def = p.getJsDocTags(checker).find((t) => t.name === "default" || t.name === "defaultValue");
    const defText = def ? ts.displayPartsToString(def.text).replace(/\s+/g, " ").trim() : "";
    const sentence = truncate(first, 110).replace(/[.!]$/, "");
    const doc = [sentence, defText ? `default \`${truncate(defText.replace(/`/g, ""), 40)}\`` : ""].filter(Boolean).join("; ");
    return doc || undefined;
  } catch {
    return undefined;
  }
}

function optionProps(
  checker: ts.TypeChecker | undefined,
  typeNode: ts.TypeNode | undefined,
): { props: Record<string, boolean>; docs: Record<string, string> } | undefined {
  if (!checker || !typeNode) return undefined;
  try {
    const t = checker.getTypeAtLocation(typeNode);
    const parts = t.isUnion() ? t.types.filter(isOptionsLike) : isOptionsLike(t) ? [t] : [];
    if (!parts.length) return undefined;
    // For `A | B`, a property is required only when every member declares it as required.
    const requiredIn = new Map<string, number>();
    const seen = new Set<string>();
    const docs: Record<string, string> = {};
    let methods = 0;
    let total = 0;
    for (const part of parts) {
      for (const p of checker.getPropertiesOfType(part)) {
        if (isInternalMember(p.name) || OBJECT_PROTOTYPE.has(p.name)) continue;
        seen.add(p.name);
        if (!docs[p.name]) {
          const d = shortDoc(checker, p);
          if (d) docs[p.name] = d;
        }
        if (!(p.flags & ts.SymbolFlags.Optional)) requiredIn.set(p.name, (requiredIn.get(p.name) ?? 0) + 1);
        total++;
        if (p.declarations?.some((d) => ts.isMethodDeclaration(d) || ts.isMethodSignature(d))) methods++;
      }
    }
    const props: Record<string, boolean> = {};
    for (const name of seen) props[name] = (requiredIn.get(name) ?? 0) < parts.length;
    // Mostly methods means a service object, not options.
    if (!total || total > MAX_OPTION_PROPS || methods / total > 0.5) return undefined;
    return { props, docs };
  } catch {
    return undefined;
  }
}

function paramsOf(params: ts.NodeArray<ts.ParameterDeclaration>, sf: ts.SourceFile, checker?: ts.TypeChecker): ParamInfo[] {
  return params
    .filter((p) => p.name.getText(sf) !== "this")
    .map((p, i) => {
      const opts = optionProps(checker, p.type);
      return {
        // Destructured parameters (`{ model, tools }: Options`) are compared by position.
        name: ts.isIdentifier(p.name) ? p.name.text : `#${i + 1}`,
        optional: !!(p.questionToken || p.initializer || p.dotDotDotToken),
        type: p.type ? normalizeText(p.type.getText(sf)) : "any",
        ...(opts ? { props: opts.props, ...(Object.keys(opts.docs).length ? { propDocs: opts.docs } : {}) } : {}),
      };
    });
}

function memberName(m: ts.Node, sf: ts.SourceFile): string | undefined {
  if (ts.isConstructorDeclaration(m) || ts.isConstructSignatureDeclaration(m)) return "constructor";
  if (ts.isCallSignatureDeclaration(m)) return "(call)";
  if (ts.isIndexSignatureDeclaration(m)) return "[index]";
  const name = (m as ts.NamedDeclaration).name;
  if (!name) return undefined;
  if (ts.isPrivateIdentifier(name)) return undefined;
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : name.getText(sf);
}

function collectMembers(nodes: readonly ts.Node[], sf: ts.SourceFile, into: Record<string, MemberInfo>): void {
  for (const m of nodes) {
    if (isPrivateDecl(m as ts.Declaration)) continue;
    const name = memberName(m, sf);
    if (!name || isInternalMember(name)) continue;
    const text = normalizeText(m.getText(sf));
    const prev = into[name];
    into[name] = {
      // Overloaded methods: join the texts so any change is visible.
      text: prev ? `${prev.text} | ${text}` : text,
      optional: !!(m as ts.PropertySignature).questionToken,
      ...((deprecationOf(m) ?? prev?.deprecated) !== undefined ? { deprecated: deprecationOf(m) ?? prev?.deprecated } : {}),
    };
  }
}

function objectLikeMembers(typeNode: ts.TypeNode | undefined, sf: ts.SourceFile, into: Record<string, MemberInfo>): boolean {
  if (!typeNode) return false;
  if (ts.isTypeLiteralNode(typeNode)) {
    collectMembers(typeNode.members, sf, into);
    return true;
  }
  if (ts.isIntersectionTypeNode(typeNode)) {
    let any = false;
    for (const t of typeNode.types) any = objectLikeMembers(t, sf, into) || any;
    return any;
  }
  return false;
}

/** Private and protected members aren't part of what callers write. */
const isPrivateDecl = (d: ts.Declaration) =>
  ((d as ts.NamedDeclaration).name && ts.isPrivateIdentifier((d as ts.NamedDeclaration).name!)) ||
  (ts.canHaveModifiers(d) &&
    !!ts.getModifiers(d)?.some((m) => m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword));

function memberFromSymbol(p: ts.Symbol): MemberInfo | undefined {
  const decls = p.declarations ?? [];
  if (!decls.length || decls.some(isPrivateDecl) || isInternalMember(p.name)) return undefined;
  const texts = decls.map((d) => normalizeText(d.getText(d.getSourceFile())));
  const dep = decls.map(deprecationOf).find((x) => x !== undefined);
  return { text: texts.join(" | "), optional: !!(p.flags & ts.SymbolFlags.Optional), ...(dep !== undefined ? { deprecated: dep } : {}) };
}

const isLibFile = (sf: ts.SourceFile) => /[\\/]typescript[\\/]lib[\\/]/.test(sf.fileName);

/**
 * One level into object-typed properties of an interface (`NextConfig.experimental.ppr`), keyed
 * `parent.child`. Config objects move keys around (`experimental.cacheComponents` → top-level
 * `cacheComponents`) without changing the parent's declaration, so these are tracked separately.
 */
function nestedMembers(checker: ts.TypeChecker, p: ts.Symbol, out: Record<string, MemberInfo>): void {
  // `_zod`, `_def`…: internals by convention, not config.
  if (isInternalMember(p.name) || p.name.startsWith("_") || !p.declarations?.some((d) => ts.isPropertySignature(d) || ts.isPropertyDeclaration(d))) return;
  const t = checker.getNonNullableType(checker.getTypeOfSymbol(p));
  if (!isOptionsLike(t) || t.isUnion()) return;
  const decl = (t.aliasSymbol ?? t.symbol)?.declarations?.[0];
  if (!decl || isLibFile(decl.getSourceFile())) return;
  const props = checker.getPropertiesOfType(t);
  if (props.length > MAX_OPTION_PROPS) return;
  for (const q of props) {
    if (isInternalMember(q.name) || OBJECT_PROTOTYPE.has(q.name)) continue;
    const dep = (q.declarations ?? []).map(deprecationOf).find((x) => x !== undefined);
    out[`${p.name}.${q.name}`] = { text: "", optional: !!(q.flags & ts.SymbolFlags.Optional), ...(dep !== undefined ? { deprecated: dep } : {}) };
  }
}

const isNestedKey = (k: string) => k.includes(".");

/** Instance members including inherited ones, plus statics for classes. */
function membersViaChecker(checker: ts.TypeChecker, symbol: ts.Symbol, isClass: boolean): Record<string, MemberInfo> {
  const out: Record<string, MemberInfo> = {};
  for (const p of checker.getPropertiesOfType(checker.getDeclaredTypeOfSymbol(symbol))) {
    const m = memberFromSymbol(p);
    if (m) out[p.name] = m;
    if (m && !isClass) {
      try {
        nestedMembers(checker, p, out);
      } catch (err) {
        debug(`nested members failed for ${symbol.name}.${p.name}: ${(err as Error).message}`);
      }
    }
  }
  if (isClass) {
    for (const p of checker.getPropertiesOfType(checker.getTypeOfSymbol(symbol))) {
      if (p.name === "prototype") continue;
      const m = memberFromSymbol(p);
      if (m) out[p.name in out ? `static ${p.name}` : p.name] = m;
    }
  }
  return out;
}

function describeDeclarations(
  decls: readonly ts.Declaration[],
  ctx?: { checker: ts.TypeChecker; symbol: ts.Symbol },
): ApiItem | undefined {
  const kinds = new Set<ApiKind>();
  const texts: string[] = [];
  const signatures: ParamInfo[][] = [];
  const members: Record<string, MemberInfo> = {};
  let hasMembers = false;
  const deprecations: (string | undefined)[] = [];

  for (const d of decls) {
    const sf = d.getSourceFile();
    if (ts.isFunctionDeclaration(d)) {
      kinds.add("function");
      signatures.push(paramsOf(d.parameters, sf, ctx?.checker));
    } else if (ts.isClassDeclaration(d)) {
      kinds.add("class");
      collectMembers(d.members, sf, members);
      hasMembers = true;
      // Constructor parameters (`new OpenAI({ apiKey })`) are diffed like a function's.
      for (const ctor of d.members.filter(ts.isConstructorDeclaration)) signatures.push(paramsOf(ctor.parameters, sf, ctx?.checker));
    } else if (ts.isInterfaceDeclaration(d)) {
      kinds.add("interface");
      collectMembers(d.members, sf, members);
      hasMembers = true;
    } else if (ts.isTypeAliasDeclaration(d)) {
      kinds.add("type");
      hasMembers = objectLikeMembers(d.type, sf, members) || hasMembers;
    } else if (ts.isVariableDeclaration(d)) {
      kinds.add("variable");
      if (d.type && (ts.isFunctionTypeNode(d.type) || ts.isConstructorTypeNode(d.type))) signatures.push(paramsOf(d.type.parameters, sf, ctx?.checker));
      else hasMembers = objectLikeMembers(d.type, sf, members) || hasMembers;
    } else if (ts.isEnumDeclaration(d)) {
      kinds.add("enum");
      collectMembers(d.members, sf, members);
      hasMembers = true;
    } else if (ts.isModuleDeclaration(d)) {
      kinds.add("namespace");
    } else if (ts.isExportSpecifier(d) || ts.isExportAssignment(d) || ts.isNamespaceExport(d) || ts.isImportSpecifier(d) || ts.isImportClause(d) || ts.isNamespaceImport(d)) {
      // Re-export of a module we couldn't load (another package): record where it comes from.
      kinds.add("reexport");
      let n: ts.Node | undefined = d;
      while (n && !ts.isExportDeclaration(n) && !ts.isImportDeclaration(n)) n = n.parent;
      const spec = n && (ts.isExportDeclaration(n) || ts.isImportDeclaration(n)) ? n.moduleSpecifier?.getText(sf) : undefined;
      texts.push(`from ${spec ?? "?"}`);
      continue;
    } else {
      continue;
    }
    texts.push(normalizeText(d.getText(sf)));
    deprecations.push(deprecationOf(d));
  }
  if (!kinds.size) return undefined;

  if (ctx && (kinds.has("class") || kinds.has("interface"))) {
    try {
      Object.assign(members, membersViaChecker(ctx.checker, ctx.symbol, kinds.has("class")));
    } catch (err) {
      debug(`checker members failed for ${ctx.symbol.name}: ${(err as Error).message}`);
    }
  }

  const kind = KIND_PRIORITY.find((k) => kinds.has(k))!;
  // An export is deprecated only when every declaration says so (one deprecated overload isn't enough).
  const deprecated = deprecations.length && deprecations.every((x) => x !== undefined) ? deprecations[0] : undefined;
  return {
    kind,
    text: texts.join(" | "),
    ...(signatures.length ? { signatures } : {}),
    ...(hasMembers ? { members } : {}),
    ...(deprecated !== undefined ? { deprecated } : {}),
  };
}

const slashes = (p: string) => p.replace(/\\/g, "/");

/**
 * The folder a package's declarations may see: `<root>` for a package unpacked as
 * `<root>/node_modules/<name>` (registry.ts `packageRoot`: the package and the siblings fetched
 * with it), otherwise the package folder itself.
 */
export function packageRootOf(pkgDir: string): string {
  const i = slashes(pkgDir).lastIndexOf("/node_modules/");
  return i === -1 ? pkgDir : pkgDir.slice(0, i);
}

type Entry = "file" | "dir";

/**
 * A compiler host that sees only `root` and TypeScript's own lib files, so a surface depends on
 * nothing but the package: not the current directory (default type roots), not a node_modules
 * above the cache (imports resolve by walking up), not the file system's case sensitivity (files
 * match exactly, as on Linux). Symlinks are invisible: npm tarballs don't ship them, and one
 * could point outside the tree.
 */
function packageHost(options: ts.CompilerOptions, root: string): ts.CompilerHost {
  const host = ts.createCompilerHost(options);
  const libDir = slashes(host.getDefaultLibLocation!());
  const inLib = (p: string) => slashes(p).startsWith(libDir + "/");
  const listings = new Map<string, Map<string, Entry>>();
  const list = (dir: string): Map<string, Entry> => {
    let entries = listings.get(dir);
    if (!entries) {
      entries = new Map();
      try {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          if (e.isFile()) entries.set(e.name, "file");
          else if (e.isDirectory()) entries.set(e.name, "dir");
        }
      } catch {
        // unreadable: empty
      }
      listings.set(dir, entries);
    }
    return entries;
  };
  const norm = (p: string) => posix.normalize(slashes(p)).replace(/(.)\/$/, "$1");
  /** What `p` (normalized) is, checking every segment below the root by exact name. */
  const kind = (p: string): Entry | undefined => {
    if (p === root) return "dir";
    if (!p.startsWith(root + "/")) return undefined;
    const slash = p.lastIndexOf("/");
    const parent = p.slice(0, slash);
    return kind(parent) === "dir" ? list(parent).get(p.slice(slash + 1)) : undefined;
  };

  host.getCurrentDirectory = () => root;
  host.useCaseSensitiveFileNames = () => true;
  host.getCanonicalFileName = (f) => f;
  host.realpath = (p) => p;
  host.fileExists = (p) => (inLib(p) ? ts.sys.fileExists(p) : kind(norm(p)) === "file");
  host.directoryExists = (p) => (inLib(p) ? ts.sys.directoryExists(p) : kind(norm(p)) === "dir");
  host.readFile = (p) => (inLib(p) || kind(norm(p)) === "file" ? ts.sys.readFile(p) : undefined);
  host.getDirectories = (p) => (kind(norm(p)) === "dir" ? [...list(norm(p))].filter(([, k]) => k === "dir").map(([n]) => n) : []);
  return host;
}

/**
 * The public API of one entry point. Only files under `root` (see `packageRootOf`) and
 * TypeScript's ES lib are visible, so the same package version gives the same surface on every
 * machine and from every directory.
 */
export function extractSurface(entryFile: string, root = packageRootOf(dirname(entryFile))): Surface {
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    noEmit: true,
    // The ES lib is loaded so members inherited from built-ins (Error, Map…) resolve on both sides.
    lib: ["lib.esnext.d.ts"],
    // No ambient types, on purpose: `/// <reference types="node" />`, Node built-ins ("http"),
    // DOM globals and peer dependencies outside the package root stay unresolved. Node's types are
    // the same for both versions, so they can't make a real difference, only a false one: next
    // 15.4's declarations pulled them in and 16.4's didn't, which read as `ReadonlyURLSearchParams`
    // losing `entries`, `forEach`… Vendoring a pinned @types/node would add a download and one
    // more version to keep in step with SURFACE_FORMAT.
    types: [],
    typeRoots: [],
    libReplacement: false,
    skipLibCheck: true,
    allowArbitraryExtensions: true,
  };
  // Real paths, so a symlinked cache folder (macOS /tmp, the precompute script's links) stays inside the root.
  let realRoot: string;
  let entry: string;
  try {
    realRoot = slashes(realpathSync(root));
    entry = slashes(realpathSync(entryFile));
  } catch {
    return {};
  }
  const program = ts.createProgram({ rootNames: [entry], options, host: packageHost(options, realRoot) });
  const checker = program.getTypeChecker();
  const sf = program.getSourceFile(entry);
  if (!sf) return {};
  const surface: Surface = {};

  const moduleSymbol = checker.getSymbolAtLocation(sf);
  if (!moduleSymbol) {
    // A global script (no import/export): its top-level declarations are the API.
    for (const st of sf.statements) {
      const decls: ts.Declaration[] = ts.isVariableStatement(st)
        ? [...st.declarationList.declarations]
        : ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isInterfaceDeclaration(st) ||
            ts.isTypeAliasDeclaration(st) || ts.isEnumDeclaration(st) || ts.isModuleDeclaration(st)
          ? [st]
          : [];
      for (const d of decls) {
        const name = (d as ts.NamedDeclaration).name;
        if (!name || !ts.isIdentifier(name)) continue;
        const item = describeDeclarations([d]);
        if (item) surface[name.text] = item;
      }
    }
    return surface;
  }

  const resolveAlias = (s: ts.Symbol): ts.Symbol => {
    if (!(s.flags & ts.SymbolFlags.Alias)) return s;
    try {
      return checker.getAliasedSymbol(s);
    } catch {
      return s;
    }
  };

  for (const sym of checker.getExportsOfModule(moduleSymbol)) {
    const target = resolveAlias(sym);
    const decls = target.declarations?.length ? target.declarations : (sym.declarations ?? []);

    // `export * as z from "./external"` or `export namespace X {}`: describe its exports as members.
    // (A function or class merged with a namespace stays a function/class.)
    if (decls.some(ts.isSourceFile) || (decls.length > 0 && decls.every(ts.isModuleDeclaration))) {
      const members: Record<string, MemberInfo> = {};
      for (const e of checker.getExportsOfModule(target)) {
        const d = resolveAlias(e).declarations?.[0];
        if (!d) continue;
        const text = ts.isSourceFile(d) ? "module" : truncate(normalizeText(d.getText(d.getSourceFile())), 400);
        const dep = deprecationOf(d);
        members[e.name] = { text, optional: false, ...(dep !== undefined ? { deprecated: dep } : {}) };
      }
      surface[sym.name] = { kind: "namespace", text: sha256(JSON.stringify(members)).slice(0, 16), members };
      continue;
    }

    const item = describeDeclarations(decls, { checker, symbol: target });
    if (!item) continue;
    if (sym.name === "default") {
      const declName = (decls[0] as ts.NamedDeclaration | undefined)?.name;
      if (declName && ts.isIdentifier(declName)) item.declName = declName.text;
    }
    surface[sym.name] = item;
  }

  // A namespace that re-exports (nearly) the whole root is a mirror: `z.object` is the root's `object`.
  for (const item of Object.values(surface)) {
    if (item.kind !== "namespace" || !item.members) continue;
    const names = Object.keys(item.members);
    const overlap = names.filter((n) => n in surface).length;
    if (names.length >= 10 && overlap / names.length >= 0.8) {
      item.mirror = true;
      item.text = "mirror";
      delete item.members;
    }
  }
  return surface;
}

/**
 * Bump when extraction changes so cached surfaces (and precomputed reports) are rebuilt. Precomputed
 * shards also freeze subpath discovery and ranking, `resolveTypesEntry` and the "gone" check:
 * changing those means bumping SHARD_FORMAT in precomputed.ts.
 */
export const SURFACE_FORMAT = 11;

async function cachedSurface(entryFile: string, cacheKey: string, pkgDir: string): Promise<Surface> {
  const path = join(cacheDir(), "surfaces", `${sha256(`${TOOL_VERSION}\0${SURFACE_FORMAT}\0${cacheKey}`).slice(0, 24)}.json`);
  const hit = await readJson<Surface>(path);
  if (hit) return hit;
  const started = Date.now();
  const surface = extractSurface(entryFile, packageRootOf(pkgDir));
  debug(`extracted ${Object.keys(surface).length} exports from ${cacheKey} in ${Date.now() - started}ms`);
  await writeJsonAtomic(path, surface);
  return surface;
}

// ---------------------------------------------------------------------------
// Diff

export type ChangeKind = "removed" | "renamed" | "params" | "members" | "signature" | "deprecated" | "added" | "subpath";

export interface ChangeMeta {
  /** Option-object properties that were removed / added / became required. */
  removedOptions?: string[];
  addedOptions?: string[];
  requiredOptions?: string[];
  /** Positional or named parameters that were removed / became required. */
  removedParams?: string[];
  requiredParams?: string[];
  /** Members that were removed, or newly deprecated (aggregated deprecations). */
  members?: string[];
  /** The new name of a renamed export. */
  renamedTo?: string;
  /** How to refer to a default export in prose (`Anthropic`). */
  displayName?: string;
  /** Docs of new/required options, so notes can say how to use them. */
  optionDocs?: Record<string, string>;
  /** Nested config keys that moved, with what to use instead (`experimental.ppr` → "merged into `cacheComponents`"). */
  movedKeys?: Record<string, string>;
  /** The entry point a removed export is still exported from (`typescript/unstable/sync`). */
  movedTo?: string;
}

export interface TypeChange {
  subpath: string;
  symbol: string;
  kind: ChangeKind;
  detail: string;
  used: boolean;
  /** Higher = more likely to make a model write broken code. */
  severity: number;
  meta?: ChangeMeta;
}

const code = (s: string) => "`" + s + "`";

const UNSTABLE_PREFIX = /^(unstable_|experimental_|UNSAFE_|unsafe_|_)/;

const nameTokens = (n: string) =>
  new Set(
    n
      .replace(UNSTABLE_PREFIX, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .split(/[\s_$]+/)
      .map((t) => t.toLowerCase())
      .filter((t) => t.length >= 4),
  );

/**
 * A removed export counts as renamed to an added one when it only lost an
 * `unstable_`/`experimental_` prefix, or when the declaration is identical apart
 * from the name and the names share a real word (so `expireTag` → `cacheTag` isn't one).
 */
function isRename(a: ApiItem, aName: string, b: ApiItem, bName: string): boolean {
  if (a.kind === "reexport" || b.kind === "reexport") return false;
  if (aName.replace(UNSTABLE_PREFIX, "") === bName.replace(UNSTABLE_PREFIX, "")) return true;
  if (a.kind !== b.kind) return false;
  const strip = (t: string, n: string) => t.replace(new RegExp(`\\b${n.replace(/\$/g, "\\$")}\\b`, "g"), "§");
  if (strip(a.text, aName) !== strip(b.text, bName)) return false;
  const bt = nameTokens(bName);
  return [...nameTokens(aName)].some((t) => bt.has(t));
}

const OPTION_PARAM_NAMES = new Set(["options", "opts", "params", "config", "settings", "args", "init", "props", "input"]);
const paramLabel = (n: string) => (n.startsWith("#") ? `argument ${n.slice(1)}` : code(n));
/** [subject, verb suffix]: "options no longer accept" vs "`tool` argument no longer accepts". */
const optionsLabel = (n: string): [string, string] =>
  n.startsWith("#") || OPTION_PARAM_NAMES.has(n) ? ["options", ""] : [`the ${code(n)} argument`, "s"];

/** Compare single-overload parameter lists by position when either side destructures. */
function alignNames(before: ParamInfo[], after: ParamInfo[]): [ParamInfo[], ParamInfo[]] {
  const b = before.map((p) => ({ ...p }));
  const a = after.map((p) => ({ ...p }));
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i].name.startsWith("#") || b[i].name.startsWith("#")) a[i].name = b[i].name = `#${i + 1}`;
  }
  return [b, a];
}

/** Union of option properties per parameter name across overloads (optional only if optional everywhere). */
function optionsByParam(sigs: ParamInfo[][]): Map<string, Record<string, boolean>> {
  const out = new Map<string, Record<string, boolean>>();
  for (const sig of sigs) {
    for (const p of sig) {
      if (!p.props) continue;
      const cur = out.get(p.name) ?? {};
      for (const [k, optional] of Object.entries(p.props)) cur[k] = k in cur ? cur[k] && optional : optional;
      out.set(p.name, cur);
    }
  }
  return out;
}

interface ParamDiff {
  notes: string[];
  breaking: boolean;
  meta: ChangeMeta;
}

function diffParams(beforeSigs: ParamInfo[][], afterSigs: ParamInfo[][]): ParamDiff {
  let before = beforeSigs;
  let after = afterSigs;
  if (before.length === 1 && after.length === 1) {
    const [b, a] = alignNames(before[0], after[0]);
    before = [b];
    after = [a];
  }
  const notes: string[] = [];
  const meta: ChangeMeta = {};
  let breaking = false;

  const afterNames = new Set(after.flat().map((p) => p.name));
  // With one signature on each side, parameters are positional: a renamed parameter isn't a
  // change for callers, only a shorter list is.
  const single = before.length === 1 && after.length === 1;
  const removed = single
    ? before[0].slice(after[0].length).map((p) => p.name).filter((n) => !n.startsWith("#"))
    : [...new Set(before.flat().map((p) => p.name))].filter((n) => !afterNames.has(n) && !n.startsWith("#"));
  if (removed.length) {
    notes.push(`no longer takes ${removed.map(paramLabel).join(", ")}`);
    meta.removedParams = removed;
    breaking = true;
  }

  const bOpts = optionsByParam(before);
  const afterDocs = new Map<string, Record<string, string>>();
  for (const p of after.flat()) if (p.propDocs) afterDocs.set(p.name, { ...afterDocs.get(p.name), ...p.propDocs });
  for (const [name, aProps] of optionsByParam(after)) {
    // Same position, different parameter name (`params` → `options`): still the same options bag.
    const idx = single ? after[0].findIndex((p) => p.name === name) : -1;
    const bProps = bOpts.get(name) ?? (idx >= 0 && before[0][idx] ? bOpts.get(before[0][idx].name) : undefined);
    if (!bProps) continue;
    const gone = Object.keys(bProps).filter((k) => !(k in aProps));
    const required = Object.keys(aProps).filter((k) => !aProps[k] && (!(k in bProps) || bProps[k]));
    const [subject, s] = optionsLabel(name);
    const docs = afterDocs.get(name) ?? {};
    // Stable option names first: `maxSteps` matters more than `experimental_output`.
    gone.sort((x, y) => Number(UNSTABLE_PREFIX.test(x)) - Number(UNSTABLE_PREFIX.test(y)));
    if (gone.length) notes.push(`${subject} no longer accept${s} ${listNames(gone, 6)}`);
    if (required.length) {
      const doc = docs[required[0]];
      notes.push(`${subject} now require${s} ${listNames(required)}${doc ? ` (${doc})` : ""}`);
    }
    for (const k of [...required, ...Object.keys(aProps).filter((k) => !(k in bProps))]) {
      if (docs[k]) meta.optionDocs = { ...meta.optionDocs, [k]: docs[k] };
    }
    if (gone.length) {
      meta.removedOptions = [...(meta.removedOptions ?? []), ...gone];
      // Candidates for what replaced them.
      const added = Object.keys(aProps).filter((k) => !(k in bProps) && !UNSTABLE_PREFIX.test(k));
      if (added.length) meta.addedOptions = [...new Set([...(meta.addedOptions ?? []), ...added])];
    }
    if (required.length) meta.requiredOptions = [...(meta.requiredOptions ?? []), ...required];
    if (gone.length || required.length) breaking = true;
  }

  if (single) {
    const prev = new Map(before[0].map((p) => [p.name, p]));
    const newlyRequired = after[0].filter((p, i) => !p.optional && (i >= before[0].length || before[0][i].optional));
    if (newlyRequired.length) {
      // Name the type: "now requires `profile` (`string | CacheLifeConfig`)" says what to pass.
      notes.push(`now requires ${newlyRequired.map((p) => `${paramLabel(p.name)}${p.type && p.type !== "any" ? ` (\`${truncate(p.type, 60)}\`)` : ""}`).join(", ")}`);
      meta.requiredParams = newlyRequired.map((p) => p.name);
      breaking = true;
    }
    // Type-text changes are mostly noise; mention them only when nothing more specific changed.
    if (!notes.length) {
      for (const p of after[0]) {
        const old = prev.get(p.name);
        if (old && old.type !== p.type && !p.props) notes.push(`${paramLabel(p.name)} type ${code(truncate(old.type, 60))} → ${code(truncate(p.type, 60))}`);
      }
    }
  } else if (before.length !== after.length && !notes.length) {
    notes.push(`overloads changed (${before.length} → ${after.length})`);
  }
  return { notes, breaking, meta };
}

/** Top-level members only; nested config keys are diffed by `diffNestedMembers`. */
const topLevel = (m: Record<string, MemberInfo>) => Object.fromEntries(Object.entries(m).filter(([k]) => !isNestedKey(k)));

function diffMembers(
  allBefore: Record<string, MemberInfo>,
  allAfter: Record<string, MemberInfo>,
): { notes: string[]; severity: number; removed?: string[] } {
  const before = topLevel(allBefore);
  const after = topLevel(allAfter);
  const removed = Object.keys(before).filter((k) => !(k in after));
  const nowRequired = Object.keys(after).filter((k) => k in before && before[k].optional && !after[k].optional);
  const notes: string[] = [];
  if (removed.length) notes.push(`removed ${listNames(removed)}`);
  if (nowRequired.length) notes.push(`now requires ${listNames(nowRequired)}`);
  if (notes.length) return { notes, severity: 6, removed };

  const changed = Object.keys(after).filter((k) => k in before && before[k].text !== after[k].text);
  if (changed.length) return { notes: [`changed ${listNames(changed)}`], severity: 2 };
  const added = Object.keys(after).filter((k) => !(k in before));
  if (added.length) return { notes: [`added ${listNames(added)}`], severity: 1 };
  return { notes: [], severity: 0 };
}

function listNames(names: string[], max = 5): string {
  const shown = names.slice(0, max).map(code).join(", ");
  return names.length > max ? `${shown} (+${names.length - max} more)` : shown;
}

/** "Use `z.enum()` instead." → "use `z.enum()`" */
function replacementHint(message: string): string | undefined {
  const m = message.match(/\b(use|call|prefer|switch to|replaced (?:by|with)|in favou?r of|merged into|moved to|renamed to)\s+(.+?)(?:\s+instead\b|[.;]\s|[.;]?$)/i);
  return m ? truncate(`${m[1].toLowerCase()} ${m[2]}`, 80) : undefined;
}

/**
 * Nested config keys that moved or were folded into another option: newly deprecated ones whose
 * message names a successor (`experimental.ppr`: "merged into `cacheComponents`"), and ones removed
 * from the nested object that now exist at the top level. The rest of a big config type's churn
 * (dozens of `experimental.*` flags) isn't actionable, so it isn't reported.
 */
function diffNestedMembers(
  before: Record<string, MemberInfo>,
  after: Record<string, MemberInfo>,
): Array<{ parent: string; notes: string[]; moved: Record<string, string> }> {
  const byParent = new Map<string, { notes: string[]; moved: Record<string, string> }>();
  const add = (key: string, note: string, successor: string) => {
    const parent = key.slice(0, key.indexOf("."));
    const entry = byParent.get(parent) ?? { notes: [], moved: {} };
    entry.notes.push(note);
    entry.moved[key] = successor;
    byParent.set(parent, entry);
  };
  const newTopLevel = (child: string) => child in after && !isNestedKey(child) && !(child in before);
  for (const key of Object.keys(after).filter(isNestedKey)) {
    const dep = after[key].deprecated;
    if (dep === undefined || before[key]?.deprecated !== undefined) continue;
    const child = key.slice(key.indexOf(".") + 1);
    if (/\bnot deprecated\b/i.test(dep)) continue;
    // A successor has to be named in code: "use with caution" isn't one.
    const stated = replacementHint(dep);
    const hint = (stated && /`[^`]+`/.test(stated) ? stated : undefined) ?? (newTopLevel(child) ? `use top-level ${code(child)}` : undefined);
    if (hint) add(key, `${code(key)} is deprecated (${hint})`, hint);
  }
  /** A successor an old deprecation names, if the new type has it: "Use `config.turbopack` instead" → `turbopack`. */
  const namedSuccessor = (message: string | undefined): string | undefined => {
    for (const m of (message ?? "").matchAll(/`([A-Za-z_$][\w$.]*)`/g)) {
      const parts = m[1].replace(/\(\)$/, "").split(".");
      for (let i = 0; i < parts.length; i++) {
        const k = parts.slice(i).join(".");
        if (k in after) return k;
      }
    }
    return undefined;
  };
  for (const key of Object.keys(before).filter(isNestedKey)) {
    if (key in after) continue;
    const child = key.slice(key.indexOf(".") + 1);
    if (newTopLevel(child)) add(key, `${code(key)} moved to top-level ${code(child)}`, `use top-level ${code(child)}`);
    else {
      // Removed now, deprecated before with a successor that exists: `experimental.turbo` → `turbopack`.
      const successor = namedSuccessor(before[key].deprecated);
      if (successor && successor !== key) add(key, `${code(key)} was removed (deprecated before: use ${code(successor)})`, `use ${isNestedKey(successor) ? code(successor) : `top-level ${code(successor)}`}`);
    }
  }
  // The detail stays short; `moved` keeps every key for the notes and the guard.
  return [...byParent].map(([parent, e]) => ({ parent, notes: e.notes.slice(0, 6), moved: e.moved }));
}

/** Precomputed shards keep only what this reads (precomputed.ts `trimSides`); reading more means bumping SHARD_FORMAT. */
export function diffSurfaces(subpath: string, before: Surface, after: Surface, used: Set<string> | undefined): TypeChange[] {
  // `z.object(...)` where `z` mirrors the root counts as using the root export `object`.
  const effective = new Set(used ?? []);
  for (const u of used ?? []) {
    const dot = u.indexOf(".");
    if (dot === -1) continue;
    const head = u.slice(0, dot);
    if (after[head]?.mirror || before[head]?.mirror) effective.add(u.slice(dot + 1));
  }
  const isUsed = (name: string) => effective.has(name) || effective.has("*");
  const label = (name: string, item: ApiItem | undefined) =>
    name === "default" && item?.declName ? `${item.declName}` : name === "default" ? "default export" : name;
  const changes: TypeChange[] = [];
  const removed = Object.keys(before).filter((k) => !(k in after));
  const added = new Set(Object.keys(after).filter((k) => !(k in before)));

  for (const name of removed) {
    const rename = [...added].find((n) => isRename(before[name], name, after[n], n));
    if (rename) {
      added.delete(rename);
      changes.push({ subpath, symbol: name, kind: "renamed", detail: `${code(name)} was renamed to ${code(rename)}`, used: isUsed(name), severity: 9, meta: { renamedTo: rename } });
    } else {
      const hint = before[name].deprecated ? ` (it was deprecated: ${truncate(before[name].deprecated!, 120)})` : "";
      changes.push({ subpath, symbol: name, kind: "removed", detail: `${code(name)} was removed${hint}`, used: isUsed(name), severity: 9 });
    }
  }

  for (const name of Object.keys(after)) {
    const a = before[name];
    const b = after[name];
    if (!a) continue;
    const used = isUsed(name);
    const shown = label(name, b);

    // A newly deprecated export: its deprecation message says what to do; other diffs would be noise.
    if (b.deprecated !== undefined && a.deprecated === undefined) {
      const why = b.deprecated ? `: ${truncate(b.deprecated, 200)}` : "";
      changes.push({ subpath, symbol: name, kind: "deprecated", detail: `${code(shown)} is deprecated${why}`, used, severity: 6 });
      continue;
    }

    if (a.members && b.members) {
      const newlyDeprecated = Object.keys(b.members).filter(
        (m) => !isNestedKey(m) && b.members![m].deprecated !== undefined && (!(m in a.members!) || a.members![m].deprecated === undefined),
      );
      for (const n of diffNestedMembers(a.members, b.members)) {
        changes.push({ subpath, symbol: `${name}.${n.parent}`, kind: "deprecated", detail: `${code(shown)} config: ${n.notes.join("; ")}`, used, severity: 7, meta: { members: Object.keys(n.moved), movedKeys: n.moved } });
      }
      const explicit = newlyDeprecated.filter((m) => effective.has(`${name}.${m}`));
      for (const m of explicit) {
        const why = b.members[m].deprecated ? `: ${truncate(b.members[m].deprecated!, 160)}` : "";
        changes.push({ subpath, symbol: `${name}.${m}`, kind: "deprecated", detail: `${code(`${shown}.${m}`)} is deprecated${why}`, used: true, severity: 6 });
      }
      const rest = newlyDeprecated.filter((m) => !explicit.includes(m));
      if (rest.length) {
        const items = rest.slice(0, 4).map((m) => {
          const hint = replacementHint(b.members![m].deprecated ?? "");
          return hint ? `${code(m)} (${hint})` : code(m);
        });
        const more = rest.length > 4 ? ` (+${rest.length - 4} more)` : "";
        changes.push({ subpath, symbol: name, kind: "deprecated", detail: `On ${code(shown)}, deprecated: ${items.join(", ")}${more}`, used, severity: 4, meta: { members: rest } });
      }
    }
    // Same declaration text can still hide changes in referenced option types or inherited members.
    const same = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y);
    if (a.text === b.text && same(a.signatures, b.signatures) && same(a.members, b.members)) continue;
    if (a.kind === "reexport" || b.kind === "reexport") continue; // moved between internal packages; not actionable

    let reported = false;
    if (a.signatures && b.signatures) {
      const pd = diffParams(a.signatures, b.signatures);
      if (pd.notes.length) {
        const call = b.kind === "class" ? `new ${shown}()` : `${shown}()`;
        const sep = pd.notes[0].startsWith("the ") ? ": " : " ";
        changes.push({ subpath, symbol: name, kind: "params", detail: `${code(call)}${sep}${pd.notes.join("; ")}`, used, severity: pd.breaking ? 8 : 1, meta: pd.meta });
        reported = true;
      }
    }
    if (a.members && b.members) {
      const { notes, severity, removed: gone } = diffMembers(a.members, b.members);
      if (notes.length) {
        changes.push({ subpath, symbol: name, kind: "members", detail: `${code(shown)}: ${notes.join("; ")}`, used, severity, ...(gone?.length ? { meta: { members: gone } } : {}) });
        reported = true;
      }
    }
    if (reported) continue;

    const callable = (k: ApiKind) => k === "function" || k === "variable";
    if (a.kind !== b.kind && callable(a.kind) && callable(b.kind)) continue; // const ↔ function: same call site
    if (a.kind !== b.kind) {
      changes.push({ subpath, symbol: name, kind: "signature", detail: `${code(shown)} changed from a ${a.kind} to a ${b.kind}`, used, severity: 4 });
      continue;
    }
    if (!a.members && !a.signatures) {
      changes.push({
        subpath,
        symbol: name,
        kind: "signature",
        detail: `${code(shown)} changed: ${code(truncate(a.text, 90))} → ${code(truncate(b.text, 90))}`,
        used,
        severity: 2,
      });
    }
  }

  for (const name of added) {
    changes.push({ subpath, symbol: name, kind: "added", detail: code(name), used: false, severity: 1 });
  }
  const defaultName = after.default?.declName;
  if (defaultName) {
    for (const c of changes) if (c.symbol === "default" || c.symbol.startsWith("default.")) c.meta = { ...c.meta, displayName: defaultName };
  }
  return changes;
}

const MAX_DISCOVERED_SUBPATHS = 16;
const MAX_TEST_SUBPATHS = 4;
const TEST_SUBPATH = /\/(test|testing)/;
const exportsKeys = (pkgDir: string): string[] => {
  const exp = readManifest(pkgDir)?.exports;
  if (!exp || typeof exp !== "object" || Array.isArray(exp)) return [];
  return Object.keys(exp).filter((key) => key.startsWith("./") && !key.includes("*") && !/package\.json$|\.(css|json)$/.test(key) && !/\/(internal|_)/.test(key));
};

/**
 * Entry points of a package the project doesn't import yet: the exports map's concrete keys,
 * or for packages without one (like `next`), the declaration files at the package root
 * (`next/cache`, `next/server`…). Capped so huge packages stay fast.
 */
export function publicSubpaths(pkgDir: string, max = MAX_DISCOVERED_SUBPATHS): string[] {
  const manifest = readManifest(pkgDir);
  const out = new Set<string>(["."]);
  const exp = manifest?.exports;
  if (exp && typeof exp === "object" && !Array.isArray(exp)) {
    for (const key of exportsKeys(pkgDir)) if (!TEST_SUBPATH.test(key)) out.add(key);
  } else {
    try {
      for (const f of readdirSync(pkgDir)) {
        const m = f.match(/^([a-z][\w-]*)\.d\.ts$/);
        if (m && m[1] !== "index" && !/^(types|global|compiled|experimental|jest|babel|amp|config|constants|legacy)/.test(m[1])) out.add(`./${m[1]}`);
      }
    } catch {
      // unreadable: root only
    }
  }
  const rank = (p: string) => {
    const i = PREFERRED_SUBPATHS.indexOf(p.slice(2));
    return p === "." ? -1 : i === -1 ? PREFERRED_SUBPATHS.length : i;
  };
  return [...out].sort((a, b) => rank(a) - rank(b)).slice(0, max);
}

/**
 * Test helpers a package exports (`ai/test`, `x/testing`). Default discovery skips them; `--all`
 * diffs them too, since nothing in a new project imports them yet but its tests will.
 */
export function testSubpaths(pkgDir: string, max = MAX_TEST_SUBPATHS): string[] {
  return exportsKeys(pkgDir).filter((k) => TEST_SUBPATH.test(k)).slice(0, max);
}

/** Entry points most code imports, analyzed first when a package has many. */
const PREFERRED_SUBPATHS = ["server", "cache", "navigation", "headers", "client", "react", "router", "link", "image", "core", "node", "utils"];

/** The cached API surface of `name@version` at `subpath`, for evidence in generated examples. */
export async function surfaceFor(pkgDir: string, name: string, version: string, subpath: string): Promise<Surface | undefined> {
  const entry = resolveTypesEntry(pkgDir, subpath);
  return entry ? cachedSurface(entry, `${name}@${version}#${subpath}`, pkgDir) : undefined;
}

export interface TypeAnalysis {
  /** Subpaths with declaration files on both sides. */
  analyzed: string[];
  noTypes: boolean;
  changes: TypeChange[];
}

/** One entry point in both versions: everything `diffSides` needs, and what precomputed reports store. */
export interface SubpathSides {
  /** Declarations found in the old / the new version. */
  base: boolean;
  next: boolean;
  /** The new version has no declarations and its exports map no longer lists the subpath. */
  gone?: boolean;
  /** Both API surfaces, when both versions have declarations. */
  surfaces?: [before: Surface, after: Surface];
}

export async function subpathSides(
  name: string,
  baseDir: string,
  baseVersion: string,
  nextDir: string,
  nextVersion: string,
  subpath: string,
): Promise<SubpathSides> {
  const baseEntry = resolveTypesEntry(baseDir, subpath);
  const nextEntry = resolveTypesEntry(nextDir, subpath);
  const sides: SubpathSides = { base: !!baseEntry, next: !!nextEntry };
  if (baseEntry && !nextEntry) {
    // Without types we can't be sure the subpath is gone; it may just ship JS. Only flag it if nothing at all resolves.
    const manifest = readManifest(nextDir);
    if (manifest?.exports && typeof manifest.exports === "object" && !matchExportsKey(manifest.exports as Record<string, unknown>, subpath)) sides.gone = true;
  }
  if (baseEntry && nextEntry) {
    sides.surfaces = await Promise.all([
      cachedSurface(baseEntry, `${name}@${baseVersion}#${subpath}`, baseDir),
      cachedSurface(nextEntry, `${name}@${nextVersion}#${subpath}`, nextDir),
    ]);
  }
  return sides;
}

/** The type changes across entry points, with `used` set from the project's imports. */
export function diffSides(
  name: string,
  baseVersion: string,
  sides: Array<[subpath: string, sides: SubpathSides]>,
  usage: Map<string, Set<string>> | undefined,
): TypeAnalysis {
  const changes: TypeChange[] = [];
  const analyzed: string[] = [];
  let anyTypes = false;

  for (const [subpath, s] of sides) {
    const spec = subpath === "." ? name : `${name}/${subpath.slice(2)}`;
    if (s.base || s.next) anyTypes = true;
    if (!s.base && s.next) {
      changes.push({ subpath, symbol: spec, kind: "subpath", detail: `${code(spec)} is a new entry point (not in ${baseVersion})`, used: !!usage?.has(subpath), severity: 7 });
      continue;
    }
    if (s.gone) {
      changes.push({ subpath, symbol: spec, kind: "subpath", detail: `${code(spec)} no longer exists as an entry point`, used: !!usage?.has(subpath), severity: 9 });
      continue;
    }
    if (!s.surfaces) continue;
    analyzed.push(subpath);
    changes.push(...diffSurfaces(subpath, s.surfaces[0], s.surfaces[1], usage?.get(subpath)));
  }
  return { analyzed, noTypes: !anyTypes, changes };
}

export async function analyzeTypes(
  name: string,
  baseDir: string,
  baseVersion: string,
  nextDir: string,
  nextVersion: string,
  usage: Map<string, Set<string>> | undefined,
  /** Diff every public entry point and test helper, imported or not (`--all`). */
  allSubpaths = false,
  /** Look for removed exports in other entry points (`withMovedExports`); precompute builds turn it off. */
  movedExports = true,
): Promise<TypeAnalysis> {
  const discovered = allSubpaths ? [...publicSubpaths(nextDir), ...testSubpaths(nextDir)] : publicSubpaths(nextDir);
  const subpaths = usage?.size ? (allSubpaths ? [...new Set([...usage.keys(), ...discovered])] : [...usage.keys()]) : discovered;
  const sides: Array<[string, SubpathSides]> = [];
  for (const subpath of subpaths) sides.push([subpath, await subpathSides(name, baseDir, baseVersion, nextDir, nextVersion, subpath)]);
  const analysis = diffSides(name, baseVersion, sides, usage);
  if (movedExports) analysis.changes = await withMovedExports(name, nextDir, nextVersion, sides, analysis.changes, usage);
  return analysis;
}

/** Removed exports looked up elsewhere, per package (the lookup extracts other entry points' surfaces). */
const MAX_MOVED_LOOKUPS = 12;

/**
 * Used exports an entry point dropped that another public entry point of the new version still
 * exports: TypeScript 7 moved `CompilerOptions` from `typescript` to `typescript/unstable/sync`. The
 * removal becomes "moved", and the export is diffed against its new home, so what changed in it
 * (`CompilerOptions` lost `baseUrl`, `outFile`…) isn't lost with it. Live analysis only: precomputed
 * reports don't store entry points the old version lacks.
 */
async function withMovedExports(
  name: string,
  nextDir: string,
  nextVersion: string,
  sides: Array<[string, SubpathSides]>,
  changes: TypeChange[],
  usage: Map<string, Set<string>> | undefined,
): Promise<TypeChange[]> {
  const removed = changes.filter((c) => c.kind === "removed" && c.used && !c.symbol.includes(".")).slice(0, MAX_MOVED_LOOKUPS);
  if (!removed.length) return changes;
  const own = new Set(sides.map(([s]) => s));
  const elsewhere = publicSubpaths(nextDir).filter((s) => !own.has(s));
  const surfaces = new Map<string, Surface | undefined>();
  const surfaceAt = async (sub: string) => {
    if (!surfaces.has(sub)) surfaces.set(sub, await surfaceFor(nextDir, name, nextVersion, sub).catch(() => undefined));
    return surfaces.get(sub);
  };
  const out: TypeChange[] = [];
  const replaced = new Set<TypeChange>();
  for (const c of removed) {
    const before = sides.find(([s]) => s === c.subpath)?.[1].surfaces?.[0][c.symbol];
    if (!before) continue;
    for (const sub of elsewhere) {
      const after = (await surfaceAt(sub))?.[c.symbol];
      if (!after || after.kind === "reexport" || after.kind !== before.kind) continue;
      const spec = `${name}/${sub.slice(2)}`;
      replaced.add(c);
      out.push({ ...c, kind: "removed", detail: `${code(c.symbol)} moved to ${code(spec)}`, severity: 7, meta: { ...c.meta, movedTo: spec } });
      // What changed in it, judged from where the project uses it.
      const used = usage?.get(c.subpath);
      for (const d of diffSurfaces(c.subpath, { [c.symbol]: before }, { [c.symbol]: after }, used)) {
        if (d.kind !== "added") out.push({ ...d, detail: d.detail.replace(/^`([^`]+)`/, `$& (now in ${code(spec)})`), meta: { ...d.meta, movedTo: spec } });
      }
      break;
    }
  }
  return replaced.size ? [...changes.filter((c) => !replaced.has(c)), ...out] : changes;
}
