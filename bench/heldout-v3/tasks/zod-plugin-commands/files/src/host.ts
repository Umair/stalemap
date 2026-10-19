import { listCommands } from "./plugins.ts";

const loaded = (names: string[]) => new Promise<string[]>((resolve) => setTimeout(() => resolve(names), 5));

export async function commandPalette(): Promise<string[]> {
  const byPlugin = await listCommands([
    { name: "git", commands: loaded(["git.commit", "git.push"]) },
    { name: "format", commands: loaded(["format.document"]) },
  ]);
  return Object.values(byPlugin).flat().sort();
}
