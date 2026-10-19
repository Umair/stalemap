import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { PROBE_SYSTEM } from "./tasks.js";

export interface Provider {
  name: "anthropic" | "openai" | "claude-code";
  complete(model: string, prompt: string): Promise<string>;
}

export class ProviderUnavailableError extends Error {}

/** Claude through the Anthropic API (ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN or an `ant auth login` profile). */
export async function anthropicProvider(): Promise<Provider> {
  let Anthropic: typeof import("@anthropic-ai/sdk").default;
  try {
    Anthropic = (await import("@anthropic-ai/sdk")).default;
  } catch {
    throw new ProviderUnavailableError("the @anthropic-ai/sdk package isn't installed");
  }
  const client = new Anthropic({ maxRetries: 3 });
  return {
    name: "anthropic",
    async complete(model, prompt) {
      try {
        // No server-side fallbacks here on purpose: a probe must be answered by the model it measures.
        const res = await client.messages.create({
          model,
          max_tokens: 8000,
          system: PROBE_SYSTEM,
          messages: [{ role: "user", content: prompt }],
        });
        if (res.stop_reason === "refusal") return "";
        return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      } catch (err) {
        if (err instanceof Anthropic.AuthenticationError || /authentication method/i.test((err as Error).message)) {
          throw new ProviderUnavailableError("no Anthropic credentials. Set ANTHROPIC_API_KEY or run `ant auth login`.");
        }
        throw err;
      }
    },
  };
}

/** Any OpenAI-compatible chat endpoint: Ollama (http://localhost:11434/v1), LM Studio, vLLM, OpenRouter, OpenAI… */
export function openaiCompatibleProvider(baseUrl: string, apiKey: string | undefined): Provider {
  const url = baseUrl.replace(/\/$/, "") + "/chat/completions";
  return {
    name: "openai",
    async complete(model, prompt) {
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}) },
          body: JSON.stringify({
            model,
            temperature: 0,
            messages: [
              { role: "system", content: PROBE_SYSTEM },
              { role: "user", content: prompt },
            ],
          }),
        });
      } catch (err) {
        throw new ProviderUnavailableError(`can't reach ${url} (${(err as Error).message})`);
      }
      if (res.status === 401 || res.status === 403) throw new ProviderUnavailableError(`${url} rejected the API key (HTTP ${res.status})`);
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}: ${(await res.text()).slice(0, 200)}`);
      const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      return body.choices?.[0]?.message?.content ?? "";
    },
  };
}

/**
 * Headless Claude Code (`claude -p`), billed to whatever Claude Code is signed in with (a Claude
 * plan works; --bare would require an API key). --restricted ignores user/project settings
 * (so no hooks or plugins, including stalemap's own), --strict-mcp-config drops MCP servers,
 * and --tools "" stops it reading the project or the web: the answer is the model's own knowledge.
 */
export function claudeCodeProvider(): Provider {
  return {
    name: "claude-code",
    async complete(model, prompt) {
      try {
        const { stdout } = await promisify(execFile)(
          "claude",
          ["-p", prompt, "--restricted", "--strict-mcp-config", "--tools", "", "--model", model, "--output-format", "json", "--no-session-persistence", "--append-system-prompt", PROBE_SYSTEM],
          // Run outside any project so no CLAUDE.md is discovered.
          { timeout: 300_000, maxBuffer: 16 * 1024 * 1024, cwd: tmpdir() },
        );
        const out = JSON.parse(stdout) as { result?: string; is_error?: boolean };
        if (out.is_error) throw new Error(out.result ?? "claude -p failed");
        return out.result ?? "";
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT") throw new ProviderUnavailableError("the `claude` CLI isn't installed");
        throw err;
      }
    },
  };
}
