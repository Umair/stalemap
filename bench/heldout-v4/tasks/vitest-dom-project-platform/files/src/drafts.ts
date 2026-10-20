import { kv } from "#platform";

export function saveDraft(id: string, text: string): void {
  kv.set(`draft:${id}`, text);
}

export function loadDraft(id: string): string | null {
  return kv.get(`draft:${id}`);
}
