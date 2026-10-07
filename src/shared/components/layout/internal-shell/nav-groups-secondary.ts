import {
  DatabaseZap,
  Plug,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Users,
} from "lucide-react";
import type { InternalNavGroup } from "./nav-config";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";

export const navGroupsSecondary: InternalNavGroup[] = [
  {
    label: "Proveedores externos",
    icon: Plug,
    items: [
      {
        label: "Datos del cliente",
        href: "/internal/external-data",
        icon: DatabaseZap,
        // Entrada propia y no pestaña de «Proveedores»: aquello es la gobernanza del proveedor;
        // esto es el consentimiento, la consulta y la evidencia de UN cliente.
        permissions: [],
        roles: INTERNAL_PORTAL_ROLE_LIST,
      },
      {
        label: "Proveedores",
        href: "/internal/external-providers",
        icon: Plug,
        permissions: [],
        tabs: [
          {
            label: "Catálogo y salud",
            href: "/internal/external-providers",
            icon: Plug,
            // Gateado por rol en el backend (admin/platform_admin/risk_analyst/compliance_analyst
            // a nivel de clase; algunas escrituras restringidas a admin/platform_admin), sin
            // permiso granular en /internal/permissions.
            permissions: [],
          },
          {
            label: "Auditorías",
            href: "/internal/external-providers/audits",
            icon: ShieldAlert,
            permissions: [],
          },
          {
            label: "Solicitudes",
            href: "/internal/external-providers/requests",
            icon: Siren,
            permissions: [],
          },
        ],
      },
    ],
  },
  {
    /*
     * Dos entradas (2026-10-07). «Perfil» y «Seguridad sesión» salieron del menú: son de quien
     * está sentado, no del sistema, y viven en su nombre al pie de la barra (`nav-account.ts`).
     * «Actualizar inventario» se fue a «Sistemas», y «Registro del sistema» llegó de «Seguridad y
     * auditoría», que se quedó sin nada más.
     */
    label: "Administración",
    icon: Settings,
    items: [
      {
        // Las tres se tocan juntas: a quién se le da qué.
        label: "Usuarios y accesos",
        href: "/internal/settings/users",
        icon: Users,
        permissions: [],
        tabs: [
          {
            label: "Usuarios",
            href: "/internal/settings/users",
            icon: Users,
            permissions: ["internal.users.read"],
          },
          {
            label: "Roles",
            href: "/internal/settings/roles",
            icon: ShieldCheck,
            permissions: ["internal.roles.read"],
          },
          {
            label: "Permisos",
            href: "/internal/settings/permissions",
            icon: ShieldCheck,
            permissions: ["internal.permissions.read"],
          },
        ],
      },
      {
        label: "Registro del sistema",
        href: "/internal/audit",
        icon: ShieldCheck,
        permissions: ["audit.events.read"],
      },
    ],
  },
];
