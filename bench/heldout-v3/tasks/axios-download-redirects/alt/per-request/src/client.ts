import axios, { AxiosError } from "axios";

export class SessionExpiredError extends Error {}

const shared = {
  baseURL: process.env.API_URL ?? "http://localhost:4000",
  timeout: 10_000,
  headers: { "x-client": "desk-app" },
  // The API never redirects on purpose: a 302 means the session expired and the gateway is sending us to /login.
  maxRedirects: 0,
};

/** JSON API calls. */
export const api = axios.create(shared);

api.interceptors.response.use(undefined, (error: unknown) => {
  if (error instanceof AxiosError && error.response?.status === 302) {
    throw new SessionExpiredError("Your session has expired. Please sign in again.");
  }
  throw error;
});

/** File downloads stream through fetch. */
export const downloads = axios.create({ ...shared, adapter: "fetch", responseType: "arraybuffer" });

export interface Profile {
  id: number;
  name: string;
}

export async function getProfile(): Promise<Profile> {
  const { data } = await api.get<Profile>("/api/me");
  return data;
}

export async function downloadFile(id: string): Promise<Buffer> {
  // Download links redirect to signed storage URLs.
  const { data } = await downloads.get<ArrayBuffer>(`/files/${encodeURIComponent(id)}/download`, { maxRedirects: 21 });
  return Buffer.from(data);
}
