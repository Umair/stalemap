import axios, { HttpStatusCode, isAxiosError } from "axios";

export class NotSignedInError extends Error {
  constructor() {
    super("Sign in to upload files");
    this.name = "NotSignedInError";
  }
}

export class FileTooLargeError extends Error {
  constructor(readonly fileName: string) {
    super(`${fileName} is too large to upload`);
    this.name = "FileTooLargeError";
  }
}

export interface UploadedFile {
  id: string;
  url: string;
}

const uploads = axios.create({ baseURL: process.env.UPLOADS_URL ?? "http://localhost:5000" });

export async function uploadFile(name: string, data: Buffer): Promise<UploadedFile> {
  try {
    const res = await uploads.post<UploadedFile>(`/files/${encodeURIComponent(name)}`, data, {
      headers: { "Content-Type": "application/octet-stream" },
    });
    return res.data;
  } catch (err) {
    if (isAxiosError(err)) {
      switch (err.response?.status) {
        case HttpStatusCode.Unauthorized:
          throw new NotSignedInError();
        case 413:
          throw new FileTooLargeError(name);
      }
    }
    throw err;
  }
}
