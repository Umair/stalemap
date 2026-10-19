import { attachments } from "./http.ts";

export async function downloadAttachment(id: string): Promise<Buffer> {
  const res = await attachments.get<ArrayBuffer>(`/attachments/${encodeURIComponent(id)}`, { responseType: "arraybuffer" });
  return Buffer.from(res.data);
}

export async function uploadAttachment(name: string, data: Buffer): Promise<void> {
  await attachments.put(`/attachments/${encodeURIComponent(name)}`, data, {
    headers: { "Content-Type": "application/octet-stream" },
  });
}
