"use server";
import { revalidateTag } from "next/cache";

export async function saveSettings(): Promise<void> {
  // (saving omitted)
  revalidateTag("settings");
}
