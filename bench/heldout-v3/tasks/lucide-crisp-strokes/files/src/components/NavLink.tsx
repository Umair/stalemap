import type { LucideIcon } from "lucide-react";
import { AppIcon } from "../icons/AppIcon.tsx";

export function NavLink({ href, icon, children }: { href: string; icon: LucideIcon; children: string }) {
  return (
    <a className="nav-link" href={href}>
      <AppIcon icon={icon} size={16} />
      <span>{children}</span>
    </a>
  );
}
