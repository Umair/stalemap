import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import ts from "typescript";
import semver from "semver";

/**
 * The project's own TypeScript, for the compiler-option errors `tsc` stops on. stalemap bundles one
 * TypeScript, but option rules change between majors (TypeScript 6 deprecates `baseUrl`, 7 removes
 * it), so judging a project by the bundled version's rules is wrong whenever the two differ.
 *
 * - A TypeScript with the JS compiler API (5.x, 6.x) is loaded from the project and asked directly.
 * - TypeScript 7 is the native port: its package exports only `version` (and an `unstable/*` IPC
 *   client), so its `tsc` is run and the output parsed.
 * - The bundled TypeScript stands in only for the same major.minor.
 */
export interface ProjectDiagnostic {
  /** Absolute path; undefined for errors with no location (`error TS5023: Unknown compiler option`). */
  file?: string;
  /** 1-based. */
  line?: number;
  column?: number;
  code: number;
  /** The first line of the message. */
  message: string;
  /** Further lines of the message chain (`Use '"paths": {"*": ["./src/*"]}' instead.`). */
  related: string[];
}

export interface ProjectTypeScript {
  /** The installed version, else undefined. */
  version?: string;
  /** Where its diagnostics come from. */
  via: "api" | "cli" | "bundled" | "none";
  /** The compiler API module (`via: "api"` or `"bundled"`). */
  api?: typeof ts;
  /** The package's `tsc` script, when it has one. */
  cli?: string;
}

const cache = new Map<string, ProjectTypeScript>();

/** The TypeScript a project at `root` runs, and how to ask it for diagnostics. */
export function projectTypeScript(root: string, declaredVersion?: string): ProjectTypeScript {
  const key = `${root}\0${declaredVersion ?? ""}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const found = locate(root, declaredVersion);
  cache.set(key, found);
  return found;
}

/** Tests replace node_modules between runs. */
export function clearProjectTypeScriptCache(): void {
  cache.clear();
}

function locate(root: string, declaredVersion?: string): ProjectTypeScript {
  const req = createRequire(join(root, "package.json"));
  let pkgDir: string | undefined;
  let version: string | undefined;
  let bin: string | undefined;
  try {
    const manifestPath = req.resolve("typescript/package.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { version?: string; bin?: string | Record<string, string> };
    pkgDir = dirname(manifestPath);
    version = semver.valid(manifest.version ?? "") ? manifest.version : undefined;
    const rel = typeof manifest.bin === "string" ? manifest.bin : manifest.bin?.tsc;
    const candidate = rel ? join(pkgDir, rel) : join(pkgDir, "bin", "tsc");
    if (existsSync(candidate)) bin = candidate;
  } catch {
    // not installed where the project can resolve it
  }
  const sameAsBundled = (v: string | undefined) => !!v && semver.valid(v) !== null && `${semver.major(v)}.${semver.minor(v)}` === ts.versionMajorMinor;
  if (version === ts.version) return { version, via: "bundled", api: ts, cli: bin };
  if (pkgDir && version) {
    try {
      const mod = req("typescript") as typeof ts & { default?: typeof ts };
      const api = typeof mod.createProgram === "function" ? mod : mod.default && typeof mod.default.createProgram === "function" ? mod.default : undefined;
      if (api && typeof api.getParsedCommandLineOfConfigFile === "function") return { version, via: "api", api, cli: bin };
    } catch {
      // no loadable JS API (TypeScript 7 exports only its version)
    }
    if (bin) return { version, via: "cli", cli: bin };
  }
  // Not installed: the lockfile's or package.json's version decides whether the bundled rules apply.
  const v = version ?? declaredVersion;
  if (sameAsBundled(v)) return { version: v, via: "bundled", api: ts, cli: bin };
  return { version: v, via: "none", cli: bin };
}

/** `file(line,col): error TS1234: message` and `error TS1234: message`; indented lines continue the message. */
const LOCATED = /^(.+?)\((\d+),(\d+)\): error TS(\d+): (.*)$/;
const UNLOCATED = /^error TS(\d+): (.*)$/;

/** Parse `tsc --pretty false` output. Paths are resolved against `cwd`. */
export function parseTscOutput(output: string, cwd: string): ProjectDiagnostic[] {
  const out: ProjectDiagnostic[] = [];
  for (const raw of output.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;
    const located = line.match(LOCATED);
    if (located) {
      const file = isAbsolute(located[1]) ? located[1] : resolve(cwd, located[1]);
      out.push({ file, line: Number(located[2]), column: Number(located[3]), code: Number(located[4]), message: located[5].trim(), related: [] });
      continue;
    }
    const bare = line.match(UNLOCATED);
    if (bare) {
      out.push({ code: Number(bare[1]), message: bare[2].trim(), related: [] });
      continue;
    }
    // A message chain's later lines are indented under their error.
    if (/^\s+\S/.test(line) && out.length) out[out.length - 1].related.push(line.trim());
  }
  return out;
}

export interface TscRun {
  diagnostics: ProjectDiagnostic[];
  ms: number;
  /** Timed out or failed to start: the diagnostics are incomplete. */
  incomplete: boolean;
}

/** Run the project's `tsc --noEmit -p <config>` and parse what it reports. */
export function runProjectTsc(cli: string, root: string, configFile: string, timeoutMs: number): Promise<TscRun> {
  const started = Date.now();
  return new Promise((done) => {
    execFile(
      process.execPath,
      [cli, "--noEmit", "-p", configFile, "--pretty", "false"],
      { cwd: root, timeout: Math.max(1000, timeoutMs), maxBuffer: 16 * 1024 * 1024, env: { ...process.env, NO_COLOR: "1" } },
      (err, stdout) => {
        const diagnostics = parseTscOutput(String(stdout ?? ""), root);
        const e = err as (NodeJS.ErrnoException & { killed?: boolean; code?: number | string }) | null;
        // tsc exits 1 or 2 when it reports errors; a kill or a spawn failure means the list is incomplete.
        const incomplete = !!e && (e.killed === true || typeof e.code === "string" || (!diagnostics.length && e.code !== 0));
        done({ diagnostics, ms: Date.now() - started, incomplete });
      },
    );
  });
}

const isConfigJson = (f: string | undefined) => !!f && /(?:^|[\\/])[jt]sconfig(?:\.[\w-]+)?\.json$/.test(f);

/** An error about the compiler options themselves: located in a tsconfig, or nowhere. */
export const isOptionDiagnostic = (d: ProjectDiagnostic) => !d.file || isConfigJson(d.file);

function fromApi(api: typeof ts, d: ts.Diagnostic): ProjectDiagnostic {
  const [message, ...related] = api.flattenDiagnosticMessageText(d.messageText, "\n").split("\n");
  const pos = d.file && d.start !== undefined ? d.file.getLineAndCharacterOfPosition(d.start) : undefined;
  return {
    file: d.file?.fileName ? resolve(d.file.fileName) : undefined,
    line: pos ? pos.line + 1 : undefined,
    column: pos ? pos.character + 1 : undefined,
    code: d.code,
    message: message.trim(),
    related: related.map((r) => r.trim()).filter(Boolean),
  };
}

/** Option errors through a compiler API: what `tsc` reports before it reads any source file. */
export function apiOptionDiagnostics(api: typeof ts, configFile: string): ProjectDiagnostic[] {
  let parsed: ts.ParsedCommandLine | undefined;
  try {
    parsed = api.getParsedCommandLineOfConfigFile(configFile, { noEmit: true }, { ...api.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
  } catch {
    return [];
  }
  if (!parsed) return [];
  const program = api.createProgram({ rootNames: [], options: parsed.options, configFileParsingDiagnostics: parsed.errors });
  return [...program.getConfigFileParsingDiagnostics(), ...program.getOptionsDiagnostics()]
    .filter((d) => d.category === api.DiagnosticCategory.Error && d.code !== 18003) // "No inputs were found" isn't about options
    .map((d) => fromApi(api, d));
}

export interface ProjectCheck {
  /** Errors about the options, from the project's TypeScript. */
  options: ProjectDiagnostic[];
  /** Errors in source files, when a full `tsc` run produced them. */
  code?: ProjectDiagnostic[];
  /** "tsc 7.0.2" or "TypeScript 6.0.3": what the findings say they come from. */
  source: string;
  via: ProjectTypeScript["via"];
  incomplete?: boolean;
}

/**
 * Ask the project's TypeScript about `configFile`. Option errors always; with `full` (or when the
 * only way to ask is the CLI, which checks everything anyway), the source-file errors too.
 */
export async function checkProject(root: string, configFile: string, opts: { declaredVersion?: string; full?: boolean; timeoutMs: number }): Promise<ProjectCheck | undefined> {
  const pts = projectTypeScript(root, opts.declaredVersion);
  const label = pts.via === "cli" ? `tsc ${pts.version ?? ""}`.trim() : `TypeScript ${pts.version ?? ts.version}`;
  if (pts.via === "none") return undefined;
  if (pts.via === "cli" || (opts.full && pts.cli)) {
    const run = await runProjectTsc(pts.cli!, root, configFile, opts.timeoutMs);
    if (!run.incomplete || pts.via === "cli") {
      const options = run.diagnostics.filter(isOptionDiagnostic);
      return { options, code: run.diagnostics.filter((d) => !isOptionDiagnostic(d)), source: `tsc ${pts.version ?? ""}`.trim(), via: "cli", incomplete: run.incomplete };
    }
  }
  return { options: apiOptionDiagnostics(pts.api!, configFile), source: label, via: pts.via };
}
