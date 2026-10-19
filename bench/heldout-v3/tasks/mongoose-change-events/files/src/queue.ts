import type { ChangeEvent } from "./events.ts";

export const outbox: ChangeEvent[] = [];

export function publish(event: ChangeEvent): void {
  outbox.push(event);
}
