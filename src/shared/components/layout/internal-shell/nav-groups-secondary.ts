import {
  Bell,
  BellRing,
  Database,
  DatabaseZap,
  Download,
  Gauge,
  History,
  ListChecks,
  LockKeyhole,
  MessageSquare,
  PlayCircle,
  Radio,
  Plug,
  Settings,
  Store,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Stamp,
  Table2,
  UserCircle,
  Users,
} from "lucide-react";
import type { InternalNavGroup } from "./nav-config";
import {
  INTERNAL_PORTAL_ROLE_LIST,
  RUNTIME_JOB_ROLE_LIST,
} from "@/shared/auth/portal-roles";

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
        label: "Vistas del negocio",
        href: "/internal/views",
        icon: Table2,
        // Igual que el resto de Operaciones: el backend gatea por @Roles (diez roles internos,
        // incluido readonly_auditor) y no hay permiso granular en /internal/permissions.
        permissions: [],
        roles: INTERNAL_PORTAL_ROLE_LIST,
      },
      {
        label: "Usuarios de comercio",
        href: "/internal/merchant-users",
        icon: Store,
        // Identidad del canal del comercio, administrada por personal interno: aquí no entra un
        // comercio. La membresía (a qué comercio pertenece) vive en el ERP, en otra base.
        permissions: [],
        roles: INTERNAL_PORTAL_ROLE_LIST,
      },
      {
        label: "Verificar comercios",
        href: "/internal/operations/partners",
        icon: Stamp,
        // El backend gatea por @Roles y deja FUERA al rol `merchant`: de aquí en adelante el
        // onboarding es verificación, no autoservicio.
        permissions: [],
        roles: INTERNAL_PORTAL_ROLE_LIST,
      },
      {
        label: "Cartera y desenlaces",
        href: "/internal/operations/portfolio",
        icon: Gauge,
        // El backend gatea por @Roles (risk_analyst/internal_operator/admin/platform_admin).
        permissions: [],
        roles: INTERNAL_PORTAL_ROLE_LIST,
      },
      {
        label: "Eventos de dominio",
        href: "/internal/events",
        icon: Radio,
        // Mismo criterio que jobs: el backend gatea por @Roles y no hay permiso granular.
        permissions: [],
        roles: INTERNAL_PORTAL_ROLE_LIST,
      },
      {
        label: "Jobs internos",
        href: "/internal/jobs",
        icon: ListChecks,
        // Igual que "Cola de trabajo": el backend gatea por @Roles, no por permiso granular.
        // Con `internal.jobs.read` —que no existe en /internal/permissions— el ítem no salía
        // en el menú de NADIE y la pantalla quedaba inalcanzable salvo escribiendo la URL.
        permissions: [],
        roles: INTERNAL_PORTAL_ROLE_LIST,
      },
      {
        label: "Jobs de runtime",
        href: "/internal/operations/runtime-jobs",
        icon: PlayCircle,
        permissions: [],
        roles: RUNTIME_JOB_ROLE_LIST,
      },
      {
        label: "Alertas",
        href: "/internal/alerts",
        icon: Bell,
        permissions: [],
        roles: INTERNAL_PORTAL_ROLE_LIST,
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
        permissions: [],
        roles: INTERNAL_PORTAL_ROLE_LIST,
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
