import {
  FolderTree,
  Gauge,
  Landmark,
  ListChecks,
  MailCheck,
  Megaphone,
  MessageSquare,
  ShieldAlert,
  Stamp,
  Store,
} from "lucide-react";
import type { InternalNavGroup } from "./nav-config";
import { paymentClaimsNavTab } from "./nav-items-payment-claims";
import { supportNavItem } from "./nav-items-support";
import {
  CAMPAIGN_READ_ROLE_LIST,
  CREDIT_OPERATIONS_ROLE_LIST,
  INTERNAL_PORTAL_ROLE_LIST,
  LOAN_PORTFOLIO_ROLE_LIST,
  LOAN_RATING_ROLE_LIST,
  OPERATIONS_CASE_ROLE_LIST,
  PARTNER_OPERATIONS_ROLE_LIST,
  WORK_QUEUE_ROLE_LIST,
} from "@/shared/auth/portal-roles";

/**
 * El grupo «Operaciones»: siete entradas, lo que se abre cada día.
 *
 * Eran dieciséis (2026-10-07). Se fusionó lo que es el mismo objeto visto desde otro ángulo o
 * varias colas de pendientes del mismo equipo: cada fusión es UNA entrada con pestañas (`tabs`),
 * y cada pestaña conserva su ruta y su permiso. «Vistas del negocio» se fue a «Reportes» y
 * «Eventos de dominio» con «Procesos automáticos» a «Sistemas»: no son trabajo del operador.
 * «Productos de crédito» llegó del grupo «Crédito», que tenía esa sola entrada.
 */
export const navGroupOperations: InternalNavGroup = {
  label: "Operaciones",
  icon: ListChecks,
  items: [
    // «Formularios» se quitó (2026-09-29): duplicaba la tabla embebida en «Versiones de esquema»,
    // con el mismo rol (SUPER_ADMIN). `/internal/forms` redirige allí.
    {
      // Tres colas de pendientes del mismo operador.
      label: "Cola de trabajo",
      href: "/internal/operations/work-queue",
      icon: ShieldAlert,
      permissions: [],
      tabs: [
        {
          label: "Casos",
          href: "/internal/operations/work-queue",
          icon: ShieldAlert,
          // El backend gatea por rol (@Roles de `GET work-queue`), no por un permiso granular.
          // Absorbió «Revisión manual» y «Casos de fraude» (pestañas propias de la pantalla):
          // `fraud_analyst` entra y sólo ve «Fraude».
          permissions: [],
          roles: WORK_QUEUE_ROLE_LIST,
        },
        {
          label: "Contactos sin verificar",
          href: "/internal/operations/pending-contacts",
          icon: MailCheck,
          // Mismo gate por rol que la cola de trabajo (@Roles del OperationsController).
          permissions: [],
          roles: OPERATIONS_CASE_ROLE_LIST,
        },
        paymentClaimsNavTab,
      ],
    },
    {
      // El usuario del comercio es parte de su expediente.
      label: "Comercios",
      href: "/internal/operations/partners",
      icon: Stamp,
      permissions: [],
      tabs: [
        {
          label: "Expedientes",
          href: "/internal/operations/partners",
          icon: Stamp,
          // La verificación la DECIDE el Motor (PARTNER_KYB_REVIEW) al enviarse el expediente;
          // esta cola enseña su veredicto y resuelve lo que quedó sin caso. El backend gatea por
          // @Roles (`PartnerOperationsController`) y deja FUERA al rol `merchant`.
          permissions: [],
          roles: PARTNER_OPERATIONS_ROLE_LIST,
        },
        {
          label: "Usuarios",
          href: "/internal/merchant-users",
          icon: Store,
          // Identidad del canal del comercio, administrada por personal interno. El backend gatea
          // la cola por PERMISO (`merchant.users.read`; conceder/rechazar exige además
          // `merchant.users.manage`): con `[]` el ítem salía para todos y respondía 403.
          permissions: ["merchant.users.read"],
          roles: INTERNAL_PORTAL_ROLE_LIST,
        },
      ],
    },
    {
      // La misma cartera, por préstamo y agregada.
      label: "Préstamos y cartera",
      href: "/internal/operations/loans",
      icon: Landmark,
      permissions: [],
      tabs: [
        {
          label: "Préstamos",
          href: "/internal/operations/loans",
          icon: Landmark,
          permissions: [],
          roles: LOAN_PORTFOLIO_ROLE_LIST,
        },
        {
          label: "Calificación de cartera",
          href: "/internal/operations/portfolio",
          icon: Gauge,
          // Calificación contable (de Atlas) y salud de la entrega de desenlaces al Motor. El
          // backend gatea por @Roles (LOAN_RATING_ROLES): con la lista del portal entero, QA,
          // devops y el auditor veían el ítem y recibían un 403.
          permissions: [],
          roles: LOAN_RATING_ROLE_LIST,
        },
      ],
    },
    {
      label: "Productos de crédito",
      href: "/internal/operations/credit/products",
      icon: Landmark,
      // `CreditOperationsController` gatea por @Roles, sin permiso granular (`credit.*` no existe
      // todavía en el catálogo RBAC). Una solicitud no tiene entrada: se abre desde la ficha del
      // cliente o desde su caso `CR-…` en la cola de trabajo.
      permissions: [],
      roles: CREDIT_OPERATIONS_ROLE_LIST,
    },
    {
      label: "Archivos",
      href: "/internal/files",
      icon: FolderTree,
      // Aquí SÍ hay permiso granular: `expedientes.leer` existe en el catálogo de
      // /internal/permissions y lo exige el backend por carpeta.
      permissions: ["expedientes.leer"],
    },
    supportNavItem,
    {
      // Envío uno a uno y envío masivo.
      label: "Notificaciones",
      href: "/internal/notifications",
      icon: MessageSquare,
      permissions: [],
      tabs: [
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
      ],
    },
    // «Alertas» se quitó (2026-09-29): era la misma tabla que «Issues de calidad» (Gobierno y
    // calidad), con un «Reconocer» sin motivo. `/internal/alerts` redirige a la bandeja.
  ],
};
