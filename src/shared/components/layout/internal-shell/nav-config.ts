import type { LucideIcon } from "lucide-react";
import { Home } from "lucide-react";

export type InternalNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permissions: string[];
};

export type InternalNavGroup = {
  label: string;
  icon: LucideIcon;
  items: InternalNavItem[];
};

export const navItems: InternalNavItem[] = [
  {
    label: "Inicio",
    href: "/internal",
    icon: Home,
    permissions: [],
  },
];

export { navGroups } from "./nav-groups";
