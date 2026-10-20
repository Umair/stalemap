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
  // The filename parameter is a quoted string or a bare token.
  const match = /filename=(?:"((?:[^"\\]|\\.)*)"|([^;\s]+))/i.exec(disposition);
  if (!match) throw new Error(`No filename in Content-Disposition: ${disposition}`);
  const filename = match[1] !== undefined ? match[1].replace(/\\(.)/g, "$1") : match[2];
  return { filename, csv: await res.text() };
}
