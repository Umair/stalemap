const UNIT_MS: Record<string, number> = { d: 86_400_000, h: 3_600_000, m: 60_000, s: 1_000, ms: 1 };

/** Parses durations like "1h30m", "45s" or "250ms" into milliseconds. */
export function parseDuration(text: string): number {
  let total = 0;
  let consumed = "";
  for (const [part, amount, unit] of text.matchAll(/(\d+(?:\.\d+)?)(ms|d|h|m|s)/g)) {
    total += Number(amount) * UNIT_MS[unit];
    consumed += part;
  }
  if (!consumed || consumed !== text.replace(/\s+/g, "")) throw new Error(`Invalid duration: ${text}`);
  return total;
}

/** Formats milliseconds as "1h 30m", dropping zero units. */
export function formatDuration(ms: number): string {
  const parts: string[] = [];
  for (const [unit, size] of [["d", 86_400_000], ["h", 3_600_000], ["m", 60_000], ["s", 1_000]] as const) {
    const count = Math.floor(ms / size);
    if (count > 0) {
      parts.push(`${count}${unit}`);
      ms -= count * size;
    }
  }
  return parts.join(" ") || "0s";
}
