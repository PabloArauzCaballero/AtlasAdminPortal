import type { LucideIcon } from "lucide-react";
import { Bell, Home } from "lucide-react";

export type InternalNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  permissions: string[];
  /** Roles internos (INTERNAL_ROLE_CODES) requeridos para ver el ítem. Vacío u omitido = sin restricción de rol. */
  roles?: string[];
  /**
   * Pantallas hermanas que comparten esta entrada. El menú enseña UNA línea y cada pantalla pinta
   * arriba la fila de pestañas (`SectionTabs`). Cada pestaña conserva su ruta y su propio permiso:
   * la entrada sale si se puede ver alguna, y lleva a la primera que se puede ver.
   */
  tabs?: InternalNavItem[];
};

export type InternalNavGroup = {
  label: string;
  icon: LucideIcon;
  items: InternalNavItem[];
};

/**
 * Pantallas raíz que ya NO son renglones del menú lateral: a «Inicio» se llega tocando el logo y a
 * «Mis notificaciones» por la campana de la barra superior. Siguen aquí porque de esta lista salen
 * sus nombres (el asistente dice «estás en Inicio»), no porque la barra las pinte.
 */
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
