import { attachments } from "./http.ts";

const unlimited = { maxContentLength: Infinity, maxBodyLength: Infinity };

export async function downloadAttachment(id: string): Promise<Buffer> {
  const res = await attachments.get<ArrayBuffer>(`/attachments/${encodeURIComponent(id)}`, { ...unlimited, responseType: "arraybuffer" });
  return Buffer.from(res.data);
}

export async function uploadAttachment(name: string, data: Buffer): Promise<void> {
  await attachments.put(`/attachments/${encodeURIComponent(name)}`, data, {
    ...unlimited,
    headers: { "Content-Type": "application/octet-stream" },
  });
}
