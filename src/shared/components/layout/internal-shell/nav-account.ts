import { LockKeyhole, UserCircle } from "lucide-react";
import type { InternalNavItem } from "./nav-config";

/**
 * «Mi cuenta»: el perfil y la seguridad de la sesión de quien está sentado.
 *
 * No es una entrada del menú —eran dos, en «Administración» y en «Seguridad y auditoría»—: se
 * llega tocando el propio nombre al pie de la barra, que es donde se busca lo que es de uno.
 */
export const accountNavItem: InternalNavItem = {
  label: "Mi cuenta",
  href: "/internal/settings/profile",
  icon: UserCircle,
  permissions: [],
  tabs: [
    {
      label: "Perfil",
      href: "/internal/settings/profile",
      icon: UserCircle,
      permissions: [],
    },
    {
      label: "Seguridad de la sesión",
      href: "/internal/security/session",
      icon: LockKeyhole,
      permissions: [],
    },
  ],
};
