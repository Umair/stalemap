import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolve } from "node:path";
import { z } from "zod";
import { checkBlock, packageChanges, runStalemap } from "./index.js";
import { TOOL_VERSION, setLogLevel } from "./util.js";

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }] });
const failure = (err: unknown) => ({ content: [{ type: "text" as const, text: `stalemap error: ${(err as Error).message}` }], isError: true });

const modelArgs = {
  model: z
    .string()
    .optional()
    .describe("Your own model id (e.g. claude-opus-5-5). Defaults to the model configured in the coding agent's settings."),
  cutoff: z.string().optional().describe("Training cutoff (YYYY-MM or YYYY-MM-DD) to use instead of a model id."),
};

/**
 * When to reach for stalemap, for clients that show server instructions. Agents rarely look things up
 * unprompted, and least when they think they know the API: that's exactly when it changed.
 */
export const INSTRUCTIONS = `This project's dependencies are newer than your training data, and stalemap knows what changed in them: removed, renamed and moved APIs and config options, new defaults and behavior, from the installed versions' type declarations, release notes and upgrade guides. Call search_changes before you write or change code that uses a third-party package of this project, or edit one of its config files (next.config.*, tsconfig.json, a schema), and when an error mentions a package's API. Use it even for well-known libraries and even when you think you know the answer: what you remember may be the old version. Search before your first edit, one topic per call.

Do not use it for code that doesn't involve a dependency, or for general programming questions.`;

export function createServer(defaultCwd: string, defaults: { model?: string } = {}): McpServer {
  const server = new McpServer({ name: "stalemap", version: TOOL_VERSION }, { instructions: INSTRUCTIONS });

  server.registerTool(
    "search_changes",
    {
      title: "Search what changed in this project's dependencies",
      description: `Searches what changed in this project's dependencies since your training data, for the versions it has installed: removed, renamed and moved APIs, options and config keys, new required arguments, changed defaults and behavior, file conventions. Sources are the installed versions' type declarations, every release-note item since your training data and the packages' upgrade guides; each result says which.

Call it BEFORE your first edit whenever the task touches a library's API or a config file, even for libraries you know well and even when you're sure: your training data predates these versions, and the API you remember may be gone. Also call it when a type error or warning names a package's API.

Describe what you are about to do in your own words; old names are fine and often best. Good: 'resolve alias for a module in next.config', 'middleware that redirects with cookies', 'zod error message per parse', 'tsconfig baseUrl paths aliases', 'mongoose pre save hook next'. Bad (too vague): 'config', 'errors'. Keep one topic per call; call again for another. Do not call it more than 4 times for one question.`,
      inputSchema: {
        query: z.string().describe("What you're about to do or look up, in your own words: an API, option, config key, file or error message. Old names are fine."),
        package: z.string().optional().describe("Limit to one npm package of this project, e.g. `next`, `zod`, `typescript` (default: all of them)"),
        limit: z.number().int().min(1).max(15).optional().describe("Results to return (default 6)"),
        cwd: z.string().optional().describe("Project directory containing package.json (default: the server's working directory)"),
        ...modelArgs,
      },
      annotations: { readOnlyHint: true, openWorldHint: true, idempotentHint: true },
    },
    async ({ query, package: pkg, limit, cwd, model, cutoff }) => {
      try {
        const { searchChanges } = await import("./search.js");
        const { text: body } = await searchChanges({ cwd: resolve(defaultCwd, cwd ?? "."), query, package: pkg, limit, model: model ?? defaults.model, cutoff });
        return text(body);
      } catch (err) {
        return failure(err);
      }
    },
  );

  server.registerTool(
    "package_changes",
    {
      title: "What changed in a package since my training data",
      description:
        "Before writing or changing code that calls a third-party npm package, call this to learn which of its APIs changed after your training cutoff: removed or renamed exports, new required parameters, removed options, deprecations with replacements, and breaking changelog entries. Pass the version the project pins (from package.json or the lockfile) when you know it.",
      inputSchema: {
        name: z.string().describe("npm package name, e.g. `ai`, `next`, `@tanstack/react-query`"),
        version: z.string().optional().describe("Version or range the project uses (default: latest)"),
        apis: z.array(z.string()).optional().describe("Exports you are about to use, to rank changes to them first"),
        ...modelArgs,
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ name, version, apis, model, cutoff }) => {
      try {
        const { markdown } = await packageChanges({ name, version, model: model ?? defaults.model, cutoff, cwd: defaultCwd, usedNames: apis });
        return text(markdown);
      } catch (err) {
        return failure(err);
      }
    },
  );

  server.registerTool(
    "project_changes",
    {
      title: "Dependency changes since my training data (whole project)",
      description:
        "Scan a JavaScript/TypeScript project and list the dependencies it imports that changed after your training cutoff, with the specific API changes that affect this code. Use it at the start of a task in an unfamiliar project, or after dependencies were upgraded.",
      inputSchema: {
        cwd: z.string().optional().describe("Project directory containing package.json (default: the server's working directory)"),
        all: z.boolean().optional().describe("Check every direct dependency, not only imported ones"),
        ...modelArgs,
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ cwd, all, model, cutoff }) => {
      try {
        const { rendered } = await runStalemap({ cwd: resolve(defaultCwd, cwd ?? "."), all, model: model ?? defaults.model, cutoff });
        return text(rendered.block);
      } catch (err) {
        return failure(err);
      }
    },
  );

  server.registerTool(
    "check_notes",
    {
      title: "Is the stalemap block in AGENTS.md / CLAUDE.md current?",
      description: "Check whether the project's stalemap notes block is missing or out of date for the current dependencies and model. Offline and fast.",
      inputSchema: {
        cwd: z.string().optional().describe("Project directory (default: the server's working directory)"),
        ...modelArgs,
      },
      annotations: { readOnlyHint: true },
    },
    async ({ cwd, model, cutoff }) => {
      try {
        const { status, targetName } = await checkBlock({ cwd: resolve(defaultCwd, cwd ?? "."), model: model ?? defaults.model, cutoff });
        const msg = {
          fresh: `The stalemap block in ${targetName} is up to date.`,
          stale: `The stalemap block in ${targetName} is out of date. Run \`npx stalemap sync --yes\` to refresh it.`,
          missing: `${targetName} has no stalemap block. Run \`npx stalemap sync --yes\` to add one.`,
        }[status];
        return text(msg);
      } catch (err) {
        return failure(err);
      }
    },
  );

  return server;
}

/** `stalemap mcp`: serve the tools over stdio. stdout belongs to the protocol, so logs stay quiet. */
export async function serveStdio(cwd: string, defaults: { model?: string } = {}): Promise<void> {
  setLogLevel({ quiet: true });
  const server = createServer(cwd, defaults);
  await server.connect(new StdioServerTransport());
}
