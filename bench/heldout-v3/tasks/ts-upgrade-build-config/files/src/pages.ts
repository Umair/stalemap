export async function loadAll<T>(load: (page: number) => Promise<T[]>, maxPages?: number): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= (maxPages ?? 10); page++) {
    const items = await load(page);
    if (items.length === 0) break;
    all.push(...items);
  }
  return all;
}
