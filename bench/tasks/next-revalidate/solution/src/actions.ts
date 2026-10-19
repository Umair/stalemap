"use server";
import { revalidateTag } from "next/cache";

async function savePost(id: string): Promise<void> {
  // pretend to save the post
}

export async function publishPost(id: string): Promise<void> {
  await savePost(id);
  revalidateTag("posts", "max");
}
