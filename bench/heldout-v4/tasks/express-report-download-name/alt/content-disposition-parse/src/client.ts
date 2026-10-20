import { parse } from "content-disposition";

export interface DownloadedReport {
  /** The name the API suggests saving the file under. */
  filename: string;
  csv: string;
}

/** Downloads report `id` from the reports API at `baseUrl` (e.g. "http://localhost:3000"). */
export async function downloadReport(baseUrl: string, id: string): Promise<DownloadedReport> {
  const res = await fetch(new URL(`/api/reports/${encodeURIComponent(id)}/download`, baseUrl));
  if (!res.ok) throw new Error(`Download of report ${id} failed: ${res.status}`);
  const { parameters } = parse(res.headers.get("content-disposition") ?? "");
  const filename = parameters.filename;
  if (!filename) throw new Error("The API sent no filename");
  return { filename, csv: await res.text() };
}
