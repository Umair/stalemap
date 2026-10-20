export interface Project {
  id: string;
  name: string;
  owner: string;
}

const baseUrl = () => process.env.API_URL ?? "http://localhost:4000";

export async function getProject(id: string): Promise<Project> {
  const res = await fetch(`${baseUrl()}/projects/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error(`GET /projects/${id} failed with ${res.status}`);
  return (await res.json()) as Project;
}
