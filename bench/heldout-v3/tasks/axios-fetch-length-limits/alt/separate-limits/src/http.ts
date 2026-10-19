import axios from "axios";

const base = {
  baseURL: process.env.API_URL ?? "http://localhost:4000",
  timeout: 15_000,
};

/** JSON API calls: small payloads only. */
export const api = axios.create({ ...base, maxContentLength: 512 * 1024, maxBodyLength: 512 * 1024 });

/** Attachment uploads and downloads go through fetch. */
export const attachments = axios.create({ ...base, adapter: "fetch" });
