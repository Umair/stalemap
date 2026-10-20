export interface DownloadedReport {
  /** The name the API suggests saving the file under. */
  filename: string;
  csv: string;
}

/** Downloads report `id` from the reports API at `baseUrl` (e.g. "http://localhost:3000"). */
export async function downloadReport(baseUrl: string, id: string): Promise<DownloadedReport> {
  throw new Error("not implemented");
}
