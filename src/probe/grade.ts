import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";

/** stale: used the old API · current: used the probed API correctly · avoided: compiled but never touched it · no-code: no code returned */
export type Verdict = "stale" | "current" | "avoided" | "no-code";

export interface Grade {
  verdict: Verdict;
  /** Diagnostics tied to the probed API (the reason for "stale"). */
  findings: string[];
  /** Did the code reference the probed API at all? ("current" without it means the model worked around it.) */
  touchedApi: boolean;
  code: string;
}

/** The code a model returned: fenced TS/JS blocks joined, or the whole reply if it looks like code. */
export function extractCode(reply: string): string {
  const blocks = [...reply.matchAll(/```(?:ts|tsx|typescript|js|jsx|javascript|mjs)?[^\n]*\n([\s\S]*?)```/gi)].map((m) => m[1]);
  if (blocks.length) return blocks.join("\n\n");
  return /\b(import|export|const|function)\b/.test(reply) ? reply : "";
}

/**
 * Diagnostics that mean "this API isn't what the code assumed": missing exports, unknown or
 * missing properties, wrong argument counts, mismatched overloads.
 */
const API_DIAGNOSTICS = new Set([2305, 2724, 2614, 2353, 2561, 2339, 2551, 2554, 2555, 2345, 2322, 2769, 2559, 2741, 2740, 2739, 2459, 2460, 2694]);

function flatten(d: ts.Diagnostic): string {
  return ts.flattenDiagnosticMessageText(d.messageText, "\n");
}

function mentions(text: string, names: string[]): boolean {
  return names.some((n) => new RegExp(`(?<![\\w$])${n.replace(/[$]/g, "\\$")}(?![\\w$])`).test(text));
}

/** Text of the call, import or property access surrounding a position, to attribute arity errors to an API. */
function enclosingApiText(sf: ts.SourceFile, pos: number): string {
  let found = "";
  const visit = (node: ts.Node): void => {
    if (pos < node.getStart(sf) || pos >= node.getEnd()) return;
    if (ts.isCallExpression(node) || ts.isNewExpression(node)) found = node.expression.getText(sf);
    else if (ts.isImportDeclaration(node)) found = node.getText(sf);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

export interface GradeTarget {
  /** Root whose node_modules holds the pinned package (and its siblings). */
  packageRoot: string;
  /** Stale if a diagnostic names one of these, or the code references one that is @deprecated (removed exports, removed options…). */
  names: string[];
  /** Stale if an arity / missing-property diagnostic sits inside a call to one of these (new required parameters or options). */
  callees?: string[];
  /** The API the probe is about, to tell "worked around it" from "used it correctly". */
  apiNames: string[];
}

/** Diagnostics attributed by location: their messages don't name the parameter. */
const ARITY_DIAGNOSTICS = new Set([2554, 2555, 2741, 2769, 2345, 2740, 2739]);

function probeProgram(file: string): ts.Program {
  return ts.createProgram([file], {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.Preserve,
      lib: ["lib.esnext.d.ts", "lib.dom.d.ts"],
      types: [],
      strict: false,
      noImplicitAny: false,
      skipLibCheck: true,
      allowJs: true,
      noEmit: true,
      allowArbitraryExtensions: true,
    });
}

async function withProbeFile<T>(code: string, packageRoot: string, fn: (file: string) => T): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), "stalemap-probe-"));
  try {
    await symlink(join(packageRoot, "node_modules"), join(dir, "node_modules"), "dir");
    const file = join(dir, "probe.tsx");
    await mkdir(dir, { recursive: true });
    await writeFile(file, code);
    return fn(file);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** Every API-shaped error `code` gets against the pinned package (used to verify generated examples). */
export async function typecheck(code: string, packageRoot: string): Promise<string[]> {
  return withProbeFile(code, packageRoot, (file) => {
    const program = probeProgram(file);
    const sf = program.getSourceFile(file)!;
    return [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)]
      .filter((d) => API_DIAGNOSTICS.has(d.code) || d.category === ts.DiagnosticCategory.Error)
      .map((d) => `TS${d.code}: ${flatten(d).split("\n")[0]}`);
  });
}

/** Type-check `code` against the pinned package's declarations and decide whether it is stale. */
export async function gradeCode(code: string, target: GradeTarget): Promise<Grade> {
  if (!code.trim()) return { verdict: "no-code", findings: [], touchedApi: false, code };
  return withProbeFile(code, target.packageRoot, (file) => {
    const program = probeProgram(file);
    const sf = program.getSourceFile(file)!;
    const checker = program.getTypeChecker();
    const diags = [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)];

    const findings: string[] = [];
    for (const d of diags) {
      if (!API_DIAGNOSTICS.has(d.code)) continue;
      const msg = flatten(d);
      const around = d.start !== undefined && ARITY_DIAGNOSTICS.has(d.code) ? enclosingApiText(sf, d.start) : "";
      if (mentions(msg, target.names) || (target.callees?.length && mentions(around, target.callees))) {
        const line = d.start !== undefined ? sf.getLineAndCharacterOfPosition(d.start).line + 1 : 0;
        findings.push(`TS${d.code} (line ${line}): ${msg.split("\n")[0]}`);
      }
    }

    // Deprecated APIs still compile; look for references to the probed names that resolve to @deprecated declarations.
    let touchedApi = false;
    const visit = (node: ts.Node): void => {
      if (ts.isIdentifier(node) && (target.apiNames.includes(node.text) || target.names.includes(node.text))) {
        touchedApi ||= target.apiNames.includes(node.text);
        let sym = checker.getSymbolAtLocation(node);
        if (sym && sym.flags & ts.SymbolFlags.Alias) {
          try {
            sym = checker.getAliasedSymbol(sym);
          } catch {
            // unresolved
          }
        }
        const deprecated = sym?.declarations?.some((decl) => ts.getJSDocTags(decl).some((t) => t.tagName.text === "deprecated"));
        if (deprecated && target.names.includes(node.text)) {
          const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
          findings.push(`deprecated (line ${line}): \`${node.text}\``);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);

    const verdict: Verdict = findings.length ? "stale" : touchedApi ? "current" : "avoided";
    return { verdict, findings: [...new Set(findings)], touchedApi, code };
  });
}
