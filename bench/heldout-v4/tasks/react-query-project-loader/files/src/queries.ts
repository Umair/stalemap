import { queryOptions } from "@tanstack/react-query";
import { getProject } from "./api.ts";

export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: ["project", id],
    queryFn: () => getProject(id),
  });
