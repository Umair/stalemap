import type { LucideIcon, LucideProps } from "lucide-react";

export interface AppIconProps extends Omit<LucideProps, "ref"> {
  icon: LucideIcon;
}

/** Every icon in the app is drawn through AppIcon so they all share the design system's look. */
export function AppIcon({ icon: Icon, size = 24, ...props }: AppIconProps) {
  return <Icon size={size} strokeWidth={1.5} absoluteStrokeWidth {...props} />;
}
