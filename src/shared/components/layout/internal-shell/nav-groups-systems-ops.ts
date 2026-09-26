import {
  Activity,
  BadgeCheck,
  Boxes,
  ClipboardCheck,
  Gauge,
  Hourglass,
  Network,
  Route,
  ShieldAlert,
  SlidersHorizontal,
  Stethoscope,
  Waypoints,
  Wrench,
} from "lucide-react";
import type { InternalNavGroup } from "./nav-config";

/**
 * El grupo de Systems Ops, aparte del resto de la navegación.
 *
 * Es el único que crece con cada pantalla nueva del catálogo interno —endpoints, flujos, procesos,
 * herramientas, salud, artefactos, cola de revisión— y con la última entrada dejó
 * `nav-groups-primary.ts` por encima de las 300 líneas que admite `yarn max-lines`. El resto de
 * grupos son estables, así que lo que se mueve es lo que se mueve.
 */
export const systemsOpsGroup: InternalNavGroup = {
  label: "Systems Ops",
  icon: Activity,
  items: [
    {
      label: "Panel de control",
      href: "/internal/systems/dashboard",
      icon: Gauge,
      permissions: ["systems.endpoints.read", "systems.tools.health.read"],
    },
    {
      label: "Endpoints",
      href: "/internal/systems/endpoints",
      icon: Activity,
      permissions: ["systems.endpoints.read"],
    },
    {
      label: "Flujos",
      href: "/internal/flows",
      icon: Waypoints,
      permissions: ["systems.flows.read"],
    },
    {
      label: "Procesos de negocio",
      href: "/internal/flows/business",
      icon: Route,
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
      label: "Revisión de flujos",
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
      label: "Salud herramientas",
      href: "/internal/systems/tools/health",
      icon: Stethoscope,
      permissions: ["systems.tools.health.read"],
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
      label: "Cola de revisión",
      href: "/internal/review-queue",
      icon: SlidersHorizontal,
      permissions: ["systems.reviewQueue.read"],
    },
  ],
};
