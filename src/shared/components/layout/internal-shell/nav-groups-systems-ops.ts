import {
  Activity,
  BadgeCheck,
  Boxes,
  ClipboardCheck,
  Hourglass,
  Network,
  ShieldAlert,
  SlidersHorizontal,
  Waypoints,
  Wrench,
} from "lucide-react";
import type { InternalNavGroup } from "./nav-config";

/**
 * El grupo de Systems Ops, aparte del resto de la navegación.
 *
 * Es el único que crece con cada pantalla nueva del catálogo interno —endpoints, mapa de rutas,
 * herramientas, artefactos, revisión del catálogo— y con la última entrada dejó
 * `nav-groups-primary.ts` por encima de las 300 líneas que admite `yarn max-lines`. El resto de
 * grupos son estables, así que lo que se mueve es lo que se mueve.
 */
/*
 * Fusiones del 2026-09-29 (auditoría de duplicados del menú): «Panel de control» vive ahora en
 * Inicio, «Salud herramientas» es la pestaña Salud de Herramientas y «Procesos de negocio» es la
 * pestaña «Pasos y flujos» de cada proceso. Sus rutas viejas redirigen; aquí ya no tienen ítem.
 */
export const systemsOpsGroup: InternalNavGroup = {
  label: "Systems Ops",
  icon: Activity,
  items: [
    {
      label: "Endpoints",
      href: "/internal/systems/endpoints",
      icon: Activity,
      permissions: ["systems.endpoints.read"],
    },
    {
      label: "Mapa de rutas",
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
      label: "Revisión de análisis de flujos",
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
    {
      label: "Herramientas",
      href: "/internal/systems/tools",
      icon: Wrench,
      permissions: ["systems.tools.read"],
    },
    {
      label: "Salud de la red",
      href: "/internal/systems/network-health",
      icon: Network,
      permissions: ["systems.network.read"],
    },
    {
      label: "Artefactos del motor",
      href: "/internal/systems/decision-engine/artifacts",
      icon: Boxes,
      permissions: ["systems.decisionEngine.artifacts.read"],
    },
    {
      label: "Revisión del catálogo",
      href: "/internal/review-queue",
      icon: SlidersHorizontal,
      permissions: ["systems.reviewQueue.read"],
    },
  ],
};
