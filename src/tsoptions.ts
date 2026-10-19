import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import semver from "semver";
import type { PackageReport } from "./analyze.js";
import { parseJsonc } from "./jsonc.js";

/**
 * TypeScript's compiler options as the project sets them. They live in tsconfig.json, which no
 * import scan sees, and a deprecated option stops `tsc` (TS5101 in TypeScript 6) before it reads a
 * single source file.
 */
export interface TsconfigInfo {
  /** `compilerOptions` as written (values lowercased where they're enum names). */
  options: Record<string, unknown>;
}

/** TypeScript enums whose members are the values of a tsconfig option. */
export const OPTION_ENUMS: Record<string, string> = {
  ModuleKind: "module",
  ModuleResolutionKind: "moduleResolution",
  ScriptTarget: "target",
  JsxEmit: "jsx",
  NewLineKind: "newLine",
  ModuleDetectionKind: "moduleDetection",
};

export function readTsconfig(root: string): TsconfigInfo | undefined {
  const file = join(root, "tsconfig.json");
  if (!existsSync(file)) return undefined;
  let opts: unknown;
  try {
    opts = parseJsonc(readFileSync(file, "utf8"))?.value?.compilerOptions;
  } catch {
    opts = undefined;
  }
  return { options: opts && typeof opts === "object" && !Array.isArray(opts) ? (opts as Record<string, unknown>) : {} };
}

export interface DeprecatedOptions {
  /** Deprecated options (`baseUrl`) and option values (`moduleResolution` → `classic`, `node10`). */
  options: string[];
  values: Array<[option: string, values: string[]]>;
  /** The type changes these came from, so the generic deprecation notes can be skipped. */
  symbols: Set<string>;
}

/** Deprecated compiler options and option values, from TypeScript's own type diff. */
export function deprecatedCompilerOptions(r: PackageReport): DeprecatedOptions {
  const options = new Set<string>();
  const values = new Map<string, Set<string>>();
  const symbols = new Set<string>();
  for (const c of r.types?.changes ?? []) {
    if (c.kind !== "deprecated" || c.meta?.movedKeys) continue;
    const [owner, member] = c.symbol.split(".");
    const members = member ? [member] : (c.meta?.members ?? []);
    if (owner === "CompilerOptions") members.forEach((m) => options.add(m));
    else if (OPTION_ENUMS[owner]) {
      const set = values.get(OPTION_ENUMS[owner]) ?? new Set<string>();
      members.forEach((m) => set.add(m.toLowerCase()));
      values.set(OPTION_ENUMS[owner], set);
    } else continue;
    symbols.add(c.symbol);
  }
  return { options: [...options], values: [...values].map(([o, v]) => [o, [...v]]), symbols };
}

/**
 * One note for the deprecated compiler options, when the project has a tsconfig.json:
 * "Compiler options deprecated in TypeScript 6.0.3 (`tsc` fails on them unless tsconfig.json sets
 * `"ignoreDeprecations": "6.0"`): `baseUrl`, `downlevelIteration`; `moduleResolution`: `classic`…"
 */
export function compilerOptionsNote(r: PackageReport, tsconfig: TsconfigInfo): { text: string; setsDeprecated: string[] } | undefined {
  const dep = deprecatedCompilerOptions(r);
  if (!dep.options.length && !dep.values.length) return undefined;
  const code = (s: string) => `\`${s}\``;
  const parts = [
    ...(dep.options.length ? [dep.options.map(code).join(", ")] : []),
    ...dep.values.map(([o, vs]) => `${code(o)}: ${vs.map(code).join(", ")}`),
  ];
  const set = tsconfig.options;
  const setsDeprecated = [
    ...dep.options.filter((o) => o in set),
    ...dep.values.flatMap(([o, vs]) => (typeof set[o] === "string" && vs.includes(String(set[o]).toLowerCase()) ? [`${o}: ${String(set[o])}`] : [])),
  ];
  // TypeScript turns deprecations into errors in a major release (5.0, 6.0) until `ignoreDeprecations`.
  const major = semver.valid(r.pinned ?? "") ? semver.major(r.pinned!) : undefined;
  const fails = major && major >= 5 && r.major ? ` (\`tsc\` fails on them, TS5101/TS5107, unless tsconfig.json sets \`"ignoreDeprecations": "${major}.0"\`)` : "";
  const ours = setsDeprecated.length ? ` This project's tsconfig.json sets ${setsDeprecated.map(code).join(", ")}.` : "";
  return { text: `Compiler options deprecated in TypeScript ${r.pinned}${fails}: ${parts.join("; ")}.${ours}`, setsDeprecated };
}
