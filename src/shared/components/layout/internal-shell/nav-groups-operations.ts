import {
  Download,
  FolderTree,
  Gauge,
  Landmark,
  LifeBuoy,
  ListChecks,
  MailCheck,
  Megaphone,
  MessageSquare,
  Radio,
  ShieldAlert,
  Stamp,
  Store,
  Table2,
  UserCog,
} from "lucide-react";
import type { InternalNavGroup } from "./nav-config";
import { paymentClaimsNavItem } from "./nav-items-payment-claims";
import {
  CAMPAIGN_READ_ROLE_LIST,
  INTERNAL_PORTAL_ROLE_LIST,
  LOAN_PORTFOLIO_ROLE_LIST,
  LOAN_RATING_ROLE_LIST,
  OPERATIONS_CASE_ROLE_LIST,
  PARTNER_OPERATIONS_ROLE_LIST,
  RUNTIME_JOB_ROLE_LIST,
  SUPPORT_ADMIN_ROLE_LIST,
  WORK_QUEUE_ROLE_LIST,
} from "@/shared/auth/portal-roles";

/** El grupo «Operaciones», aparte del resto del menú secundario para que cada archivo quepa en 300 líneas. */
export const navGroupOperations: InternalNavGroup = {
  label: "Operaciones",
  icon: ListChecks,
  items: [
    // «Formularios» se quitó (2026-09-29): duplicaba la tabla embebida en «Versiones de esquema»,
    // con el mismo rol (SUPER_ADMIN). `/internal/forms` redirige allí.
    {
      label: "Contactos sin verificar",
      href: "/internal/operations/pending-contacts",
      icon: MailCheck,
      // Mismo gate por rol que la cola de trabajo (@Roles del OperationsController).
      permissions: [],
      roles: OPERATIONS_CASE_ROLE_LIST,
    },
    {
      label: "Cola de trabajo",
      href: "/internal/operations/work-queue",
      icon: ShieldAlert,
      // El backend gatea por rol (@Roles de `GET work-queue`), no por un permiso granular. Absorbió
      // «Revisión manual» y «Casos de fraude» (pestañas): `fraud_analyst` entra y sólo ve «Fraude».
      permissions: [],
      roles: WORK_QUEUE_ROLE_LIST,
    },
    {
      label: "Soporte",
      href: "/internal/support",
      icon: LifeBuoy,
      // Mismo criterio que "Cola de trabajo": el backend gatea por @Roles y, además, exige un
      // perfil de agente vivo que no vive en el catálogo de permisos. Se deja visible porque un
      // ítem oculto no explica nada; la pantalla sí dice qué falta y dónde habilitarlo.
      permissions: [],
    },
    {
      label: "Agentes de soporte",
      href: "/internal/support/agents",
      icon: UserCog,
      // Habilitar agentes decide quién puede leer expedientes de soporte —con la conversación
      // completa dentro—, así que el backend lo restringe a admin y platform_admin.
      permissions: [],
      roles: SUPPORT_ADMIN_ROLE_LIST,
    },
    {
      label: "Archivos",
      href: "/internal/files",
      icon: FolderTree,
      // Aquí SÍ hay permiso granular: `expedientes.leer` existe en el catálogo de
      // /internal/permissions y lo exige el backend por carpeta. Es lo que distingue esta
      // entrada del resto de Operaciones, gateadas por @Roles a falta de permiso propio.
      permissions: ["expedientes.leer"],
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
      // El backend gatea la cola por PERMISO (`merchant.users.read`; conceder/rechazar exige
      // además `merchant.users.manage`): con `[]` el ítem salía para todos y respondía 403.
      permissions: ["merchant.users.read"],
      roles: INTERNAL_PORTAL_ROLE_LIST,
    },
    {
      label: "Expedientes de comercio",
      href: "/internal/operations/partners",
      icon: Stamp,
      // La verificación la DECIDE el Motor (PARTNER_KYB_REVIEW) al enviarse el expediente; esta
      // cola enseña su veredicto y resuelve lo que quedó sin caso. El backend gatea por @Roles
      // (`PartnerOperationsController`: los cuatro de abajo) y deja FUERA al rol `merchant`: de
      // aquí en adelante el onboarding es verificación. Es una copia declarada de su lista.
      permissions: [],
      roles: PARTNER_OPERATIONS_ROLE_LIST,
    },
    {
      label: "Calificación de cartera",
      href: "/internal/operations/portfolio",
      icon: Gauge,
      // Calificación contable (de Atlas) y salud de la entrega de desenlaces al Motor. Los
      // desenlaces se MIDEN en el Motor; entregarlos es un job, no un botón.
      // El backend gatea por @Roles: leer el resumen, operación, riesgo, cumplimiento y
      // administración (LOAN_RATING_ROLES). Con la lista del portal entero, QA, devops y el
      // auditor veían el ítem y recibían un 403.
      permissions: [],
      roles: LOAN_RATING_ROLE_LIST,
    },
    {
      label: "Préstamos",
      href: "/internal/operations/loans",
      icon: Landmark,
      permissions: [],
      roles: LOAN_PORTFOLIO_ROLE_LIST,
    },
    paymentClaimsNavItem,
    {
      label: "Eventos de dominio",
      href: "/internal/events",
      icon: Radio,
      // Mismo criterio que jobs: el backend gatea por @Roles y no hay permiso granular.
      permissions: [],
      roles: INTERNAL_PORTAL_ROLE_LIST,
    },
    {
      label: "Jobs",
      href: "/internal/jobs",
      icon: ListChecks,
      // Igual que "Cola de trabajo": el backend gatea por @Roles, no por permiso granular.
      // Con `internal.jobs.read` —que no existe en /internal/permissions— el ítem no salía
      // en el menú de NADIE y la pantalla quedaba inalcanzable salvo escribiendo la URL.
      // Une las dos pestañas: quien sólo puede disparar jobs (`system`) también entra, y la
      // página le enseña sólo «Ejecutar ahora».
      permissions: [],
      roles: [
        ...new Set([...INTERNAL_PORTAL_ROLE_LIST, ...RUNTIME_JOB_ROLE_LIST]),
      ],
    },
    // «Alertas» se quitó (2026-09-29): era la misma tabla que «Issues de calidad» (Gobierno y
    // calidad), con un «Reconocer» sin motivo. `/internal/alerts` redirige a la bandeja.
    {
      label: "Mensajería interna",
      href: "/internal/notifications",
      icon: MessageSquare,
      permissions: ["notifications.messages.read"],
    },
    {
      label: "Campañas",
      href: "/internal/notifications/campaigns",
      icon: Megaphone,
      // `@Roles` en el servidor, sin permiso granular: leer lo puede internal_operator.
      permissions: [],
      roles: CAMPAIGN_READ_ROLE_LIST,
    },
    {
      label: "Exportaciones",
      href: "/internal/exports",
      icon: Download,
      permissions: [],
      roles: INTERNAL_PORTAL_ROLE_LIST,
    },
  ],
};
