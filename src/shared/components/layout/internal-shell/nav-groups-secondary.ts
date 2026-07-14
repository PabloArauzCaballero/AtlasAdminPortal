import {
  Bell,
  BellRing,
  Database,
  Download,
  History,
  ListChecks,
  LockKeyhole,
  MessageSquare,
  Plug,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Siren,
  UserCircle,
  Users,
} from "lucide-react";
import type { InternalNavGroup } from "./nav-config";

export const navGroupsSecondary: InternalNavGroup[] = [
  {
    label: "Operaciones",
    icon: ListChecks,
    items: [
      {
        label: "Formularios",
        href: "/internal/forms",
        icon: ListChecks,
        permissions: [],
        // Solo superadmin: el listado también está embebido en "Versiones de esquema".
        roles: ["SUPER_ADMIN"],
      },
      {
        label: "Cola de trabajo",
        href: "/internal/operations/work-queue",
        icon: ShieldAlert,
        // El backend gatea por rol (@Roles internal_operator/risk_analyst/compliance_analyst/
        // fraud_analyst/admin/platform_admin), no por un permiso granular dedicado — no existe
        // "operations.workQueue.read" en el catálogo de /internal/permissions. Se deja visible y
        // el backend responde 403 con mensaje claro si el rol no alcanza.
        permissions: [],
      },
      {
        label: "Jobs internos",
        href: "/internal/jobs",
        icon: ListChecks,
        permissions: ["internal.jobs.read"],
      },
      {
        label: "Alertas",
        href: "/internal/alerts",
        icon: Bell,
        permissions: ["internal.alerts.read"],
      },
      {
        label: "Mensajería interna",
        href: "/internal/notifications",
        icon: MessageSquare,
        permissions: ["notifications.messages.read"],
      },
      {
        label: "Mis notificaciones",
        href: "/internal/my-notifications",
        icon: BellRing,
        // Autoservicio: cualquier usuario interno autenticado ve sus propias notificaciones,
        // sin importar su rol funcional — no requiere un permiso administrativo.
        permissions: [],
      },
      {
        label: "Exportaciones",
        href: "/internal/exports",
        icon: Download,
        permissions: ["internal.exports.read"],
      },
    ],
  },
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
