import { getDictionary } from "../../src/i18n";

export default async function Home() {
  const t = await getDictionary();
  return (
    <main>
      <h1>{t.home.title}</h1>
      <p>{t.home.intro}</p>
    </main>
  );
}
