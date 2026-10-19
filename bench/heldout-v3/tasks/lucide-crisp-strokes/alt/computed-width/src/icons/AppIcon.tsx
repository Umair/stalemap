import type { LucideIcon, LucideProps } from "lucide-react";

export interface AppIconProps extends Omit<LucideProps, "ref"> {
  icon: LucideIcon;
}

const STROKE_PX = 1.5;
const VIEWBOX = 24;

/** Every icon in the app is drawn through AppIcon so they all share the design system's look. */
export function AppIcon({ icon: Icon, size = 24, ...props }: AppIconProps) {
  // Lucide icons are drawn on a 24x24 grid, so scale the stroke inversely to the rendered size.
  const strokeWidth = (STROKE_PX * VIEWBOX) / Number(size);
  return <Icon size={size} strokeWidth={strokeWidth} {...props} />;
}
