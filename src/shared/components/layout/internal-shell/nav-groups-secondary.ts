import {
  Database,
  DatabaseZap,
  History,
  LockKeyhole,
  Plug,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
  UserCircle,
  Users,
} from "lucide-react";
import type { InternalNavGroup } from "./nav-config";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";

export const navGroupsSecondary: InternalNavGroup[] = [
  {
    label: "Esquema de datos",
    icon: Database,
    items: [
      {
        label: "Versiones de esquema",
        href: "/internal/schema/versions",
        icon: Database,
        // Igual que Cola de trabajo: gateado por rol en el backend
        // (internal_operator/admin/platform_admin/risk_analyst/readonly_auditor para lectura),
        // sin permiso granular dedicado en /internal/permissions.
        permissions: [],
      },
      {
        label: "Change log de esquema",
        href: "/internal/schema/change-log",
        icon: History,
        permissions: [],
      },
    ],
  },
  {
    label: "Proveedores externos",
    icon: Plug,
    items: [
      {
        label: "Datos del cliente",
        href: "/internal/external-data",
        icon: DatabaseZap,
        // La otra mitad del módulo: la gobernanza del proveedor está en «Catálogo y salud»; esto es
        // el consentimiento, la consulta y la evidencia de UN cliente.
        permissions: [],
        roles: INTERNAL_PORTAL_ROLE_LIST,
      },
      {
        label: "Catálogo y salud",
        href: "/internal/external-providers",
        icon: Plug,
        // Gateado por rol en el backend (admin/platform_admin/risk_analyst/compliance_analyst a
        // nivel de clase; algunas acciones de escritura restringidas a admin/platform_admin) — sin
        // permiso granular dedicado en /internal/permissions.
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
  {
    label: "Seguridad y auditoría",
    icon: LockKeyhole,
    items: [
      {
        label: "Seguridad sesión",
        href: "/internal/security/session",
        icon: LockKeyhole,
        permissions: [],
      },
      {
        label: "Terminal backend",
        href: "/internal/audit",
        icon: ShieldCheck,
        permissions: ["audit.events.read"],
      },
    ],
  },
  {
    label: "Administración",
    icon: Settings,
    items: [
      {
        label: "Usuarios internos",
        href: "/internal/settings/users",
        icon: Users,
        permissions: ["internal.users.read"],
      },
      {
        label: "Roles internos",
        href: "/internal/settings/roles",
        icon: ShieldCheck,
        permissions: ["internal.roles.read"],
      },
      {
        label: "Permisos internos",
        href: "/internal/settings/permissions",
        icon: ShieldCheck,
        permissions: ["internal.permissions.read"],
      },
      {
        label: "Sync catálogo",
        href: "/internal/settings/catalog-sync",
        icon: Settings,
        permissions: [
          "systems.endpoints.discover",
          "systems.endpoints.catalogSeedRefresh",
          "systems.tools.inferRequirements",
        ],
      },
      {
        label: "Perfil",
        href: "/internal/settings/profile",
        icon: UserCircle,
        permissions: [],
      },
    ],
  },
];
