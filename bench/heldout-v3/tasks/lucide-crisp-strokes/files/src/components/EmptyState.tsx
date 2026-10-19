import { Inbox } from "lucide-react";
import { AppIcon } from "../icons/AppIcon.tsx";

export function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <section className="empty-state">
      <AppIcon icon={Inbox} size={64} className="empty-state__icon" />
      <h2>{title}</h2>
      <p>{hint}</p>
    </section>
  );
}
