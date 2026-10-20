import type { QueryClient } from "@tanstack/react-query";
import type { Project } from "./api.ts";
import { projectQuery } from "./queries.ts";

/** Called by the project page's route before it renders. */
export async function projectLoader(queryClient: QueryClient, id: string): Promise<Project> {
  // Cached data never counts as stale here, so it's reused; otherwise fetch and cache it.
  return queryClient.query({ ...projectQuery(id), staleTime: "static" });
}
