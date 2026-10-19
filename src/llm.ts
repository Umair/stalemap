import { join } from "node:path";
import type { ChangelogItem } from "./changelog.js";
import type { TypeChange } from "./typediff.js";
import { TOOL_VERSION, cacheDir, debug, readJson, sha256, truncate, writeJsonAtomic } from "./util.js";

export const DEFAULT_LLM_MODEL = "claude-opus-5-5";
const MAX_EVIDENCE_CHARS = 40_000;

export interface LlmNote {
  text: string;
  kind: "removed" | "renamed" | "behavior" | "deprecated" | "requirement" | "new-api";
  affects_used_api: boolean;
}

const NOTES_SCHEMA = {
  type: "object",
  properties: {
    notes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          text: { type: "string" },
          kind: { type: "string", enum: ["removed", "renamed", "behavior", "deprecated", "requirement", "new-api"] },
          affects_used_api: { type: "boolean" },
        },
        required: ["text", "kind", "affects_used_api"],
        additionalProperties: false,
      },
    },
  },
  required: ["notes"],
  additionalProperties: false,
} as const;

export interface LlmInput {
  name: string;
  from: string;
  to: string;
  cutoff: string;
  usedNames: string[];
  typeChanges: TypeChange[];
  changelog: ChangelogItem[];
  maxNotes: number;
}

function buildEvidence(input: LlmInput): string {
  const parts: string[] = [];
  const types = input.typeChanges
    .filter((c) => c.kind !== "added")
    .sort((a, b) => Number(b.used) - Number(a.used) || b.severity - a.severity)
    .slice(0, 40)
    .map((c) => `- ${c.used ? "[used] " : ""}${c.subpath === "." ? "" : `(${c.subpath}) `}${c.detail}`);
  if (types.length) parts.push(`## Public type changes (static diff of .d.ts files)\n${types.join("\n")}`);

  let budget = MAX_EVIDENCE_CHARS - parts.join("\n").length;
  const log: string[] = [];
  for (const item of input.changelog) {
    const entry = `### ${item.version}${item.heading ? ` — ${item.heading}` : ""}\n${truncate(item.raw, 1500)}`;
    if (entry.length > budget) break;
    log.push(entry);
    budget -= entry.length;
  }
  if (log.length) parts.push(`## Changelog entries (highest-signal first)\n${log.join("\n\n")}`);
  return parts.join("\n\n");
}

const SYSTEM = `You write short notes for an AI coding agent. The agent's training data predates a dependency upgrade, so it will write code for the old version unless told otherwise.

From the evidence you're given, pick the changes that would make code written from memory of the old version wrong, broken or outdated on the new one: removed or renamed APIs, changed defaults or runtime behavior, newly required options, deprecated patterns and their replacements, and major new APIs that replace old idioms.

Rules:
- Use only the evidence. Never invent APIs, versions or behavior.
- Prefer changes to APIs the project uses (listed in the request).
- Each note is one or two plain sentences, written as an instruction to the agent ("Use \`x\` instead of \`y\`…", "\`foo()\` now requires…"). Put identifiers in backticks.
- Skip bug fixes, performance work, internal refactors, docs, tests and dependency bumps, and anything a model would not get wrong.
- Merge related changes into one note. Return fewer notes rather than weak ones; an empty list is fine.`;

function cachePath(input: LlmInput, model: string): string {
  const key = JSON.stringify([TOOL_VERSION, model, input.name, input.from, input.to, input.cutoff, [...input.usedNames].sort(), input.maxNotes]);
  return join(cacheDir(), "llm", `${sha256(key).slice(0, 24)}.json`);
}

export class LlmUnavailableError extends Error {}

type AnthropicModule = typeof import("@anthropic-ai/sdk");
let sdkPromise: Promise<AnthropicModule> | undefined;

async function loadSdk(): Promise<AnthropicModule> {
  sdkPromise ??= import("@anthropic-ai/sdk").catch(() => {
    throw new LlmUnavailableError("the @anthropic-ai/sdk package isn't installed (npm i @anthropic-ai/sdk)");
  });
  return sdkPromise;
}

let clientPromise: Promise<InstanceType<AnthropicModule["default"]>> | undefined;

async function getClient() {
  clientPromise ??= (async () => {
    const { default: Anthropic } = await loadSdk();
    try {
      // Resolves ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN or an `ant auth login` profile.
      return new Anthropic({ maxRetries: 3 });
    } catch (err) {
      throw new LlmUnavailableError(
        `no Anthropic credentials (${(err as Error).message}). Set ANTHROPIC_API_KEY or run \`ant auth login\`.`,
      );
    }
  })();
  return clientPromise;
}

/** Ask Claude to turn the type diff and changelog evidence for one package into agent notes. */
export async function summarizeWithClaude(input: LlmInput, model: string, useCache: boolean): Promise<LlmNote[]> {
  const path = cachePath(input, model);
  if (useCache) {
    const hit = await readJson<LlmNote[]>(path);
    if (hit) return hit;
  }
  const evidence = buildEvidence(input);
  if (!evidence) return [];

  const client = await getClient();
  const { default: Anthropic } = await loadSdk();
  const user = `Package: ${input.name}
Old version (what the agent knows; training cutoff ${input.cutoff}): ${input.from}
New version (what the project pins): ${input.to}
APIs this project imports: ${input.usedNames.length ? input.usedNames.slice(0, 60).join(", ") : "(unknown)"}

Write at most ${input.maxNotes} notes.

${evidence}`;

  let response;
  try {
    response = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      output_config: { effort: "medium", format: { type: "json_schema", schema: NOTES_SCHEMA } },
      messages: [{ role: "user", content: user }],
    });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      throw new LlmUnavailableError(`Anthropic API rejected the credentials (${err.status}). Set ANTHROPIC_API_KEY or run \`ant auth login\`.`);
    }
    if (err instanceof Anthropic.APIError) throw new Error(`Anthropic API error ${err.status ?? ""}: ${err.message}`);
    if (/authentication method|api key|apiKey/i.test((err as Error).message)) {
      throw new LlmUnavailableError("no Anthropic credentials found. Set ANTHROPIC_API_KEY or run `ant auth login`, then re-run with --llm.");
    }
    throw err;
  }

  if (response.stop_reason === "refusal") {
    debug(`Claude declined to summarize ${input.name}`);
    return [];
  }
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") return [];
  let notes: LlmNote[] = [];
  try {
    notes = (JSON.parse(text.text) as { notes: LlmNote[] }).notes ?? [];
  } catch {
    debug(`couldn't parse Claude's notes for ${input.name}`);
    return [];
  }
  notes = notes.slice(0, input.maxNotes).map((n) => ({ ...n, text: truncate(n.text.replace(/\s+/g, " ").trim(), 400) }));
  await writeJsonAtomic(path, notes);
  return notes;
}
