import axios from "axios";

const defaults = {
  baseURL: process.env.API_URL ?? "http://localhost:4000",
  timeout: 15_000,
  maxContentLength: 512 * 1024,
  maxBodyLength: 512 * 1024,
};

/** JSON API calls. */
export const api = axios.create(defaults);

/** Attachment uploads and downloads go through fetch, with no size limit. */
export const attachments = axios.create({ ...defaults, adapter: "fetch", maxContentLength: -1, maxBodyLength: -1 });
