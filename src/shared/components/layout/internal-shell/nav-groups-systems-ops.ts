import {
  Activity,
  BadgeCheck,
  ClipboardCheck,
  Hourglass,
  ListChecks,
  Network,
  Radio,
  ShieldAlert,
  Settings,
  Waypoints,
  Wrench,
} from "lucide-react";
import type { InternalNavGroup } from "./nav-config";
import {
  INTERNAL_PORTAL_ROLE_LIST,
  RUNTIME_JOB_ROLE_LIST,
} from "@/shared/auth/portal-roles";

/**
 * El grupo de Systems Ops, aparte del resto de la navegación.
 *
 * Es el único que crece con cada pantalla nueva del catálogo interno —endpoints, mapa de rutas,
 * herramientas, artefactos, revisión del catálogo— y con la última entrada dejó
 * `nav-groups-primary.ts` por encima de las 300 líneas que admite `yarn max-lines`. El resto de
 * grupos son estables, así que lo que se mueve es lo que se mueve.
 */
/*
 * Fusiones del 2026-10-07: las cinco vistas del mapa de rutas son una entrada con pestañas;
 * «Artefactos del motor» es pestaña de «Motor de decisiones» (Gobierno) y «Revisión del catálogo»
 * de «Catálogo de datos» (Datos). «Herramientas» y «Salud de la red» NO se fusionan: Herramientas
 * ya tiene dentro su propia pestaña «Salud», que es otra cosa.
 *
 * Fusiones del 2026-09-29 (auditoría de duplicados del menú): «Panel de control» vive ahora en
 * Inicio, «Salud herramientas» es la pestaña Salud de Herramientas y «Procesos de negocio» es la
 * pestaña «Pasos y flujos» de cada proceso. Sus rutas viejas redirigen; aquí ya no tienen ítem.
 */
export const systemsOpsGroup: InternalNavGroup = {
  label: "Sistemas",
  icon: Activity,
  items: [
    {
      label: "Operaciones del sistema",
      href: "/internal/systems/endpoints",
      icon: Activity,
      permissions: ["systems.endpoints.read"],
    },
    {
      // Las cinco cuelgan de `/internal/flows` y piden el mismo permiso: son vistas del mismo mapa.
      label: "Mapa de rutas",
      href: "/internal/flows",
      icon: Waypoints,
      permissions: [],
      tabs: [
        {
          label: "Mapa",
          href: "/internal/flows",
          icon: Waypoints,
          permissions: ["systems.flows.read"],
        },
        {
          label: "Trabajo pendiente",
          href: "/internal/flows/pending-work",
          icon: Hourglass,
          permissions: ["systems.flows.read"],
        },
        {
          label: "Deriva de permisos",
          href: "/internal/flows/rbac-drift",
          icon: ShieldAlert,
          permissions: ["systems.flows.read"],
        },
        {
          label: "Revisión de análisis",
          href: "/internal/flows/review",
          icon: ClipboardCheck,
          permissions: ["systems.flows.read"],
        },
        {
          label: "Compuerta de documentación",
          href: "/internal/flows/gate",
          icon: BadgeCheck,
          permissions: ["systems.flows.read"],
        },
      ],
    },
    {
      label: "Herramientas",
      href: "/internal/systems/tools",
      icon: Wrench,
      // Catálogo o Salud: cada pestaña pide el suyo, y con uno de los dos ya hay algo que ver.
      permissions: ["systems.tools.read", "systems.tools.health.read"],
    },
    {
      label: "Salud de la red",
      href: "/internal/systems/network-health",
      icon: Network,
      permissions: ["systems.network.read"],
    },
    {
      // Lo que el sistema hizo solo. Llegó de «Operaciones» (2026-10-07): no es trabajo del operador.
      label: "Actividad del sistema",
      href: "/internal/events",
      icon: Radio,
      permissions: [],
      tabs: [
        {
          label: "Eventos de dominio",
          href: "/internal/events",
          icon: Radio,
          // El backend gatea por @Roles y no hay permiso granular.
          permissions: [],
          roles: INTERNAL_PORTAL_ROLE_LIST,
        },
        {
          label: "Procesos automáticos",
          href: "/internal/jobs",
          icon: ListChecks,
          // El backend gatea por @Roles: con `internal.jobs.read` —que no existe en
          // /internal/permissions— no salía en el menú de NADIE. Quien sólo puede disparar jobs
          // (`system`) también entra, y la página le enseña sólo «Ejecutar ahora».
          permissions: [],
          roles: [
            ...new Set([
              ...INTERNAL_PORTAL_ROLE_LIST,
              ...RUNTIME_JOB_ROLE_LIST,
            ]),
          ],
        },
      ],
    },
    {
      label: "Actualizar inventario",
      href: "/internal/settings/catalog-sync",
      icon: Settings,
      permissions: [
        "systems.endpoints.discover",
        "systems.endpoints.catalogSeedRefresh",
        "systems.tools.inferRequirements",
      ],
    },
  ],
};
