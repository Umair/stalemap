import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseJsonc } from "./jsonc.js";
import { cacheDir, debug, fetchWithRetry, readJson, writeJsonAtomic } from "./util.js";

const MODELS_DEV_URL = "https://models.dev/api.json";
const MODELS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Providers whose ids we trust first when the same model appears under many resellers. */
const PREFERRED_PROVIDERS = ["anthropic", "openai", "google", "deepseek", "xai", "mistral", "alibaba", "moonshotai", "zai"];

export interface ModelInfo {
  id: string;
  provider: string;
  family?: string;
  knowledge: string; // as published: YYYY, YYYY-MM or YYYY-MM-DD
  releaseDate?: string;
}

export interface ResolvedModel {
  id: string;
  cutoff: Date;
  /** Where the cutoff came from. */
  cutoffSource: string;
  /** Where the model id came from (--model, Claude Code settings, Codex config…). */
  modelSource: string;
}

/**
 * Offline fallback, copied from models.dev (Oct 2026). Used only when the catalog
 * can't be fetched and isn't cached.
 */
const BUILTIN: ModelInfo[] = [
  { id: "claude-opus-5-5", provider: "anthropic", family: "claude-opus", knowledge: "2026-06", releaseDate: "2026-09-22" },
  { id: "claude-sonnet-5-5", provider: "anthropic", family: "claude-sonnet", knowledge: "2026-06", releaseDate: "2026-09-28" },
  { id: "claude-haiku-5-5", provider: "anthropic", family: "claude-haiku", knowledge: "2026-06", releaseDate: "2026-10-07" },
  { id: "claude-opus-5", provider: "anthropic", family: "claude-opus", knowledge: "2026-05", releaseDate: "2026-07-24" },
  { id: "claude-sonnet-5", provider: "anthropic", family: "claude-sonnet", knowledge: "2026-01-31", releaseDate: "2026-06-29" },
  { id: "claude-opus-4-8", provider: "anthropic", family: "claude-opus", knowledge: "2026-01", releaseDate: "2026-05-28" },
  { id: "claude-opus-4-7", provider: "anthropic", family: "claude-opus", knowledge: "2026-01-31", releaseDate: "2026-04-14" },
  { id: "claude-sonnet-4-6", provider: "anthropic", family: "claude-sonnet", knowledge: "2025-08-31", releaseDate: "2026-02-17" },
  { id: "claude-opus-4-6", provider: "anthropic", family: "claude-opus", knowledge: "2025-05-31", releaseDate: "2026-02-04" },
  { id: "claude-sonnet-4-5", provider: "anthropic", family: "claude-sonnet", knowledge: "2025-07-31", releaseDate: "2025-09-29" },
  { id: "claude-opus-4-5", provider: "anthropic", family: "claude-opus", knowledge: "2025-05", releaseDate: "2025-11-24" },
  { id: "claude-haiku-4-5", provider: "anthropic", family: "claude-haiku", knowledge: "2025-02-28", releaseDate: "2025-10-15" },
  { id: "gpt-6-sol", provider: "openai", family: "gpt-sol", knowledge: "2026-04-20", releaseDate: "2026-09-22" },
  { id: "gpt-6-luna", provider: "openai", knowledge: "2026-05-18", releaseDate: "2026-09-22" },
  { id: "gpt-5.6-sol", provider: "openai", knowledge: "2026-02-16", releaseDate: "2026-07-09" },
  { id: "gpt-5", provider: "openai", knowledge: "2024-09-30", releaseDate: "2025-08-07" },
  { id: "gemini-4-argon", provider: "google", family: "gemini", knowledge: "2026-03", releaseDate: "2026-10-13" },
  { id: "gemini-3.7-flash", provider: "google", knowledge: "2026-03", releaseDate: "2026-08-13" },
];

interface ModelsDevCatalog {
  [provider: string]: { models?: Record<string, { id?: string; family?: string; knowledge?: string; release_date?: string }> };
}

interface CachedCatalog {
  fetchedAt: number;
  models: ModelInfo[];
}

async function loadCatalog(useCache: boolean): Promise<{ models: ModelInfo[]; source: string }> {
  const path = join(cacheDir(), "models.json");
  const cached = await readJson<CachedCatalog>(path);
  if (useCache && cached && Date.now() - cached.fetchedAt < MODELS_TTL_MS) {
    return { models: cached.models, source: "models.dev" };
  }
  try {
    const res = await fetchWithRetry(MODELS_DEV_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = (await res.json()) as ModelsDevCatalog;
    const models: ModelInfo[] = [];
    for (const [provider, entry] of Object.entries(raw)) {
      for (const [id, m] of Object.entries(entry.models ?? {})) {
        if (!m.knowledge) continue;
        models.push({ id, provider, family: m.family, knowledge: m.knowledge, releaseDate: m.release_date });
      }
    }
    await writeJsonAtomic(path, { fetchedAt: Date.now(), models } satisfies CachedCatalog);
    return { models, source: "models.dev" };
  } catch (err) {
    debug(`models.dev unavailable (${(err as Error).message}); using ${cached ? "stale cache" : "built-in table"}`);
    if (cached) return { models: cached.models, source: "models.dev (cached)" };
    return { models: BUILTIN, source: "built-in table" };
  }
}

/** "2026-06" means the model saw data through the end of June, so use the month's last day. */
export function parseKnowledge(knowledge: string): Date {
  const parts = knowledge.split("-").map(Number);
  if (parts.length === 1) return new Date(Date.UTC(parts[0], 11, 31));
  if (parts.length === 2) return new Date(Date.UTC(parts[0], parts[1], 0));
  return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

function normalizeId(raw: string): string {
  let id = raw.trim().toLowerCase();
  id = id.replace(/\[.*?\]$/, ""); // claude-opus-5-5[1m]
  id = id.replace(/^(us|eu|jp|au|apac|global)\.(?=[a-z]+\.)/, ""); // bedrock region prefixes
  id = id.replace(/^[a-z0-9-]+[./](?=(claude|gpt|gemini|o\d|grok|deepseek|qwen|kimi|glm|mistral|llama))/, "");
  return id;
}

const stripDate = (id: string) => id.replace(/-\d{8}$/, "").replace(/-\d{4}-\d{2}-\d{2}$/, "");

function providerRank(p: string): number {
  const i = PREFERRED_PROVIDERS.indexOf(p);
  return i === -1 ? PREFERRED_PROVIDERS.length : i;
}

export function findModel(query: string, models: ModelInfo[]): ModelInfo | undefined {
  const q = normalizeId(query);
  const byRank = [...models].sort((a, b) => providerRank(a.provider) - providerRank(b.provider));

  // Claude Code aliases ("opus", "sonnet", "haiku") mean the newest model of that family.
  const alias = q.match(/^(opus|sonnet|haiku)(plan)?$/);
  if (alias) {
    const family = `claude-${alias[1]}`;
    return models
      .filter((m) => m.provider === "anthropic" && (m.family === family || m.id.startsWith(family)))
      .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""))[0];
  }

  const tries: Array<(m: ModelInfo) => boolean> = [
    (m) => m.id.toLowerCase() === q,
    (m) => normalizeId(m.id) === q,
    (m) => stripDate(normalizeId(m.id)) === stripDate(q),
  ];
  for (const t of tries) {
    const hit = byRank.find(t);
    if (hit) return hit;
  }
  return undefined;
}

export async function resolveModel(opts: {
  model?: string;
  cutoff?: string;
  cwd: string;
  useCache: boolean;
}): Promise<ResolvedModel> {
  if (opts.cutoff) {
    if (!/^\d{4}(-\d{2}){0,2}$/.test(opts.cutoff)) throw new Error(`Invalid --cutoff "${opts.cutoff}" (use YYYY-MM or YYYY-MM-DD)`);
    return { id: opts.model ?? "custom", cutoff: parseKnowledge(opts.cutoff), cutoffSource: "--cutoff", modelSource: opts.model ? "--model" : "--cutoff" };
  }

  let model = opts.model;
  let detectedFrom = "--model";
  if (!model) {
    const detected = await detectModel(opts.cwd);
    if (!detected) {
      throw new Error(
        "Couldn't tell which model your coding agent uses. Pass --model <id> (e.g. claude-opus-5-5) or --cutoff YYYY-MM-DD.",
      );
    }
    model = detected.model;
    detectedFrom = detected.source;
  }

  const { models, source } = await loadCatalog(opts.useCache);
  const hit = findModel(model, models) ?? findModel(model, BUILTIN);
  if (!hit) {
    throw new Error(
      `Unknown model "${model}" (from ${detectedFrom}). Run \`stalemap models ${model.split(/[-/.]/)[0]}\` to search, or pass --cutoff YYYY-MM-DD.`,
    );
  }
  debug(`model ${model} → ${hit.provider}/${hit.id}, knowledge ${hit.knowledge} (${source}; model from ${detectedFrom})`);
  return { id: hit.id, cutoff: parseKnowledge(hit.knowledge), cutoffSource: `${source}, knowledge ${hit.knowledge}`, modelSource: detectedFrom };
}

export async function searchModels(query: string, useCache: boolean): Promise<ModelInfo[]> {
  const { models } = await loadCatalog(useCache);
  const q = query.toLowerCase();
  const seen = new Set<string>();
  return models
    .filter((m) => m.id.toLowerCase().includes(q))
    .sort((a, b) => providerRank(a.provider) - providerRank(b.provider) || (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""))
    .filter((m) => {
      const key = normalizeId(m.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

async function readText(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, "utf8");
  } catch {
    return undefined;
  }
}

type Detected = { model: string; source: string } | undefined;

const AGENT_DETECTORS: Record<"claude" | "codex" | "opencode" | "gemini", (cwd: string, home: string) => Promise<Detected>> = {
  async claude(cwd, home) {
    for (const f of [join(cwd, ".claude", "settings.local.json"), join(cwd, ".claude", "settings.json"), join(home, ".claude", "settings.json")]) {
      const j = await readJson<{ model?: string }>(f);
      if (j?.model) return { model: j.model, source: `Claude Code (${f.replace(home, "~")})` };
    }
  },
  async codex(cwd, home) {
    for (const f of [join(cwd, ".codex", "config.toml"), join(home, ".codex", "config.toml")]) {
      const codex = await readText(f);
      // Only top-level keys, i.e. before the first [table].
      const m = codex?.split(/^\s*\[/m)[0].match(/^\s*model\s*=\s*"([^"]+)"/m);
      if (m) return { model: m[1], source: `Codex (${f.replace(home, "~")})` };
    }
  },
  async opencode(cwd, home) {
    // OpenCode merges opencode.json and then opencode.jsonc at each level, so .jsonc wins.
    const global = join(home, ".config", "opencode");
    for (const f of [join(cwd, "opencode.jsonc"), join(cwd, "opencode.json"), join(global, "opencode.jsonc"), join(global, "opencode.json")]) {
      const text = await readText(f);
      const model = text && parseJsonc(text)?.value?.model;
      if (typeof model === "string" && model) return { model, source: `OpenCode (${f.replace(home, "~")})` };
    }
  },
  async gemini(_cwd, home) {
    const gemini = await readJson<{ model?: string | { name?: string } }>(join(home, ".gemini", "settings.json"));
    const gm = typeof gemini?.model === "string" ? gemini.model : gemini?.model?.name;
    if (gm) return { model: gm, source: "Gemini CLI (~/.gemini/settings.json)" };
  },
};

/**
 * Find the model the user's coding agent is configured with. `prefer` checks that agent's
 * settings first (`stalemap setup --agent codex` wants Codex's model, not Claude Code's).
 */
export async function detectModel(cwd: string, prefer?: string): Promise<Detected> {
  if (process.env.STALEMAP_MODEL) return { model: process.env.STALEMAP_MODEL, source: "STALEMAP_MODEL" };
  const home = homedir();
  const preferred = prefer && prefer in AGENT_DETECTORS ? (prefer as keyof typeof AGENT_DETECTORS) : undefined;
  // $ANTHROPIC_MODEL is Claude Code's, so another agent's own setting wins over it.
  if (preferred && preferred !== "claude") {
    const hit = await AGENT_DETECTORS[preferred](cwd, home);
    if (hit) return hit;
  }
  if (process.env.ANTHROPIC_MODEL) return { model: process.env.ANTHROPIC_MODEL, source: "ANTHROPIC_MODEL" };
  for (const detect of Object.values(AGENT_DETECTORS)) {
    const hit = await detect(cwd, home);
    if (hit) return hit;
  }
  return undefined;
}
