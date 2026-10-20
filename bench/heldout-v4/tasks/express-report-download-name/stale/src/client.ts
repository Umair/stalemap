export interface DownloadedReport {
  /** The name the API suggests saving the file under. */
  filename: string;
  csv: string;
}

/** Downloads report `id` from the reports API at `baseUrl` (e.g. "http://localhost:3000"). */
export async function downloadReport(baseUrl: string, id: string): Promise<DownloadedReport> {
  const res = await fetch(`${baseUrl}/api/reports/${encodeURIComponent(id)}/download`);
  if (!res.ok) throw new Error(`Download of report ${id} failed: ${res.status}`);
  const disposition = res.headers.get("content-disposition") ?? "";
  const match = /filename="([^"]+)"/.exec(disposition);
  if (!match) throw new Error(`No filename in Content-Disposition: ${disposition}`);
  return { filename: match[1], csv: await res.text() };
}
