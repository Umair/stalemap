import type { QueryClient } from "@tanstack/react-query";
import type { Project } from "./api.ts";
import { projectQuery } from "./queries.ts";

/** Called by the project page's route before it renders. */
export async function projectLoader(queryClient: QueryClient, id: string): Promise<Project> {
  void projectQuery;
  throw new Error(`projectLoader(${id}): not implemented`);
}
