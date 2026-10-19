import { getDictionary } from "../../src/i18n";

export async function SiteFooter() {
  const t = await getDictionary();
  return (
    <footer>
      <a href="/contact">{t.footer.contact}</a> · <span>{t.footer.rights}</span>
    </footer>
  );
}
