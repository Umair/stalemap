export function truncateWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  return words.length <= maxWords ? words.join(" ") : `${words.slice(0, maxWords).join(" ")}…`;
}
