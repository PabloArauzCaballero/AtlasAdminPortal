import type { LucideIcon } from "lucide-react";
import { Bell, Home } from "lucide-react";

export type InternalNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permissions: string[];
  /** Roles internos (INTERNAL_ROLE_CODES) requeridos para ver el ítem. Vacío u omitido = sin restricción de rol. */
  roles?: string[];
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
  {
    label: "Mis notificaciones",
    href: "/internal/my-notifications",
    icon: Bell,
    permissions: [],
  },
];

export { navGroups } from "./nav-groups";
