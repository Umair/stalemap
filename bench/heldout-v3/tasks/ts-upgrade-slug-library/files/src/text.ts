export function stripAccents(input: string): string {
  return input.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function truncate(input: string, max: number, ellipsis = "…"): string {
  if (input.length <= max) return input;
  return input.slice(0, Math.max(0, max - ellipsis.length)).trimEnd() + ellipsis;
}
