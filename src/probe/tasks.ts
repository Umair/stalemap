import type { PackageReport } from "../analyze.js";
import { renamePairs } from "../changelog.js";
import type { TypeChange } from "../typediff.js";
import { sha256 } from "../util.js";
import type { GradeTarget } from "./grade.js";

export interface Probe {
  id: string;
  pkg: string;
  version: string;
  subpath: string;
  /** The change this probe tests, as it appears in the notes. */
  symbol: string;
  kind: TypeChange["kind"];
  detail: string;
  task: string;
  target: Omit<GradeTarget, "packageRoot">;
}

const UNSTABLE = /^(experimental_|unstable_|_)/;
const stableFirst = (names: string[], max: number) =>
  [...names].sort((a, b) => Number(UNSTABLE.test(a)) - Number(UNSTABLE.test(b))).slice(0, max);
const list = (names: string[]) => names.map((n) => `\`${n}\``).join(", ");

/** Turn one type change into a probe task, or nothing when the change isn't testable by type-checking. */
function probeFor(r: PackageReport, c: TypeChange, replacement: string | undefined): Omit<Probe, "id" | "pkg" | "version"> | undefined {
  const spec = c.subpath === "." ? r.name : `${r.name}/${c.subpath.slice(2)}`;
  const base = { subpath: c.subpath, symbol: c.symbol, kind: c.kind, detail: c.detail };
  const m = c.meta ?? {};
  const head = c.symbol.split(".")[0];
  // Name default exports the way people write them: `Anthropic`, not `default`.
  const fn = head === "default" ? (m.displayName ?? "the default export") : head;

  switch (c.kind) {
    case "removed":
    case "renamed":
      return {
        ...base,
        task: `Write a short TypeScript snippet that uses \`${c.symbol}\` from \`${spec}\` the way it is used in this version.`,
        target: { names: [c.symbol], apiNames: [c.symbol, ...(m.renamedTo ? [m.renamedTo] : []), ...(replacement ? [replacement] : [])] },
      };
    case "params": {
      if (m.removedOptions?.some((o) => !UNSTABLE.test(o))) {
        const opts = stableFirst(m.removedOptions, 3);
        return {
          ...base,
          task: `Write a short example that calls \`${fn}()\` from \`${spec}\` and configures what the ${list(opts)} option${opts.length === 1 ? "" : "s"} did.`,
          target: { names: opts, apiNames: [fn] },
        };
      }
      if (m.requiredOptions?.length || m.requiredParams?.length) {
        // (Reached when only experimental options were removed but something became required.)
        return {
          ...base,
          task: `Write a short example that calls \`${fn}()\` from \`${spec}\` with typical arguments.`,
          target: { names: m.requiredOptions ?? [], callees: [fn], apiNames: [fn] },
        };
      }
      if (m.removedParams?.length) {
        return {
          ...base,
          task: `Write a short example that calls \`${fn}()\` from \`${spec}\` with typical arguments.`,
          target: { names: m.removedParams.filter((p) => !p.startsWith("#")), callees: [fn], apiNames: [fn] },
        };
      }
      return undefined;
    }
    case "deprecated":
      if (m.members?.length) {
        const members = stableFirst(m.members, 3);
        return {
          ...base,
          task: `Write a short example that uses \`${fn}\` from \`${spec}\` to do what ${list(members)} ${members.length === 1 ? "does" : "do"}.`,
          target: { names: members, apiNames: [fn] },
        };
      }
      if (c.symbol.includes(".")) {
        const member = c.symbol.split(".").pop()!;
        return {
          ...base,
          task: `Write a short example that uses \`${fn}\` from \`${spec}\` to do what \`${member}\` does.`,
          target: { names: [member], apiNames: [fn] },
        };
      }
      return {
        ...base,
        task: `Write a short TypeScript snippet that does what \`${c.symbol}\` from \`${spec}\` is used for.`,
        target: { names: [c.symbol], apiNames: [c.symbol] },
      };
    case "members":
      if (!m.members?.length) return undefined;
      return {
        ...base,
        task: `Write a short example that uses \`${fn}\` from \`${spec}\` and its ${list(stableFirst(m.members, 3))} member${m.members.length === 1 ? "" : "s"}.`,
        target: { names: stableFirst(m.members, 3), apiNames: [fn] },
      };
    default:
      return undefined;
  }
}

const TESTABLE: TypeChange["kind"][] = ["removed", "renamed", "params", "deprecated", "members"];

/**
 * Probes for a set of package reports. Changes to APIs the project imports come first;
 * with `includeUnused`, high-severity changes elsewhere fill the remaining slots.
 * Packages are interleaved so one big package can't take the whole budget.
 */
export function buildProbes(reports: PackageReport[], maxProbes: number, includeUnused: boolean): Probe[] {
  const perPackage: Probe[][] = [];
  for (const r of reports) {
    if (r.status !== "changed" || !r.types) continue;
    const pairs = renamePairs(r.changelog?.items ?? []);
    const added = new Set(r.types.changes.filter((c) => c.kind === "added").map((c) => c.symbol));
    const candidates = r.types.changes
      // Moved config keys (`experimental.ppr`) aren't call sites a probe template can ask for.
      .filter((c) => TESTABLE.includes(c.kind) && !c.meta?.movedKeys && (c.used || (includeUnused && c.severity >= 6)))
      .sort((a, b) => Number(b.used) - Number(a.used) || b.severity - a.severity);
    const probes: Probe[] = [];
    for (const c of candidates) {
      const replacement = pairs.map(([from, to]) => (c.symbol.includes(from) ? c.symbol.replace(from, to) : undefined)).find((x) => x && added.has(x));
      const p = probeFor(r, c, replacement);
      if (!p) continue;
      const id = sha256(JSON.stringify([r.name, r.pinned, p.subpath, p.kind, p.symbol, p.target.names])).slice(0, 10);
      probes.push({ id, pkg: r.name, version: r.pinned!, ...p });
    }
    if (probes.length) perPackage.push(probes);
  }
  const out: Probe[] = [];
  for (let i = 0; out.length < maxProbes && perPackage.some((ps) => ps.length > i); i++) {
    for (const ps of perPackage) if (ps[i] && out.length < maxProbes) out.push(ps[i]);
  }
  return out;
}

export const PROBE_SYSTEM = "You are an expert TypeScript engineer. Answer with a single TypeScript code block and no explanation.";

export function probePrompt(p: Probe, notes?: string): string {
  const spec = p.subpath === "." ? p.pkg : `${p.pkg}/${p.subpath.slice(2)}`;
  const context = notes ? `Notes about \`${p.pkg}@${p.version}\`, newer than your training data:\n\n${notes}\n\n` : "";
  return `${context}The project depends on \`${p.pkg}@${p.version}\` (import from \`${spec}\`). ${p.task} Write it for version ${p.version}: if an API changed or was removed in that version, use its replacement. Reply with one TypeScript code block.`;
}
