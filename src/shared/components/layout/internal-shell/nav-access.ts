import type { InternalNavItem } from "./nav-config";
import { navGroups } from "./nav-groups";

/** Lo que el menú necesita saber de la sesión; lo da `useAuth()`. */
export type NavAccess = {
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
};

function canSee(item: InternalNavItem, access: NavAccess): boolean {
  return (
    access.hasAnyPermission(item.permissions) &&
    access.hasAnyRole(item.roles ?? [])
  );
}

/** Las pestañas de la entrada que esta sesión puede abrir. Fusionar no concede nada. */
export function visibleTabs(
  item: InternalNavItem,
  access: NavAccess,
): InternalNavItem[] {
  return (item.tabs ?? []).filter((tab) => canSee(tab, access));
}

/**
 * La entrada tal como le sale a esta sesión, o `null` si no le sale. Una entrada con pestañas
 * aparece si se puede ver alguna y lleva a la PRIMERA que se puede ver: quien sólo entra a
 * «Avisos de pago» no aterriza en un «sin acceso» de la cola de casos.
 */
export function resolveNavItem(
  item: InternalNavItem,
  access: NavAccess,
): InternalNavItem | null {
  if (!item.tabs) return canSee(item, access) ? item : null;
  const first = visibleTabs(item, access)[0];
  return first ? { ...item, href: first.href } : null;
}

/** Todas las rutas que dejan activa la entrada: la suya o las de sus pestañas. */
export function navItemHrefs(item: InternalNavItem): string[] {
  return item.tabs ? item.tabs.map((tab) => tab.href) : [item.href];
}

/** La entrada con pestañas a la que pertenece EXACTAMENTE esta ruta; un detalle no lleva fila. */
export function tabbedItemFor(pathname: string): InternalNavItem | null {
  const ruta = pathname.replace(/\/+$/, "");
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.tabs?.some((tab) => tab.href === ruta)) return item;
    }
  }
  return null;
}
