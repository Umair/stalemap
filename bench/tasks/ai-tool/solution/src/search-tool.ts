import { tool } from "ai";
import { z } from "zod";

export const searchTool = tool({
  description: "Search the docs",
  inputSchema: z.object({ query: z.string(), limit: z.number().int().positive().default(5) }),
  execute: async ({ query, limit = 5 }) => Array.from({ length: limit }, (_, i) => ({ title: `${query} #${i + 1}` })),
});
