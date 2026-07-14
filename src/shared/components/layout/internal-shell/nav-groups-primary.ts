import {
  Activity,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Database,
  FileClock,
  Gauge,
  GitBranch,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  TestTube2,
  Wrench,
} from "lucide-react";
import type { InternalNavGroup } from "./nav-config";

export const navGroupsPrimary: InternalNavGroup[] = [
  {
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
        label: "Cola de revisión",
        href: "/internal/review-queue",
        icon: SlidersHorizontal,
        permissions: ["systems.reviewQueue.read"],
      },
    ],
  },
  {
    label: "Catálogo y metadata",
    icon: Database,
    items: [
      {
        label: "Catálogo de datos",
        href: "/internal/data-catalog/tables",
        icon: Database,
        permissions: ["catalog.data.read"],
      },
      {
        label: "Dominios",
        href: "/internal/business-metadata/domains",
        icon: BookOpen,
        permissions: ["businessMetadata.read"],
      },
      {
        label: "Glosario",
        href: "/internal/business-metadata/glossary",
        icon: BookOpen,
        permissions: ["businessMetadata.read"],
      },
      {
        label: "Definiciones",
        href: "/internal/business-metadata/definitions",
        icon: BookOpen,
        permissions: ["businessMetadata.read"],
      },
      {
        label: "Catálogos operativos",
        href: "/internal/operations/catalogs",
        icon: Database,
        permissions: ["operations.catalogs.read"],
      },
    ],
  },
  {
    label: "Lineage",
    icon: GitBranch,
    items: [
      {
        label: "Relaciones",
        href: "/internal/lineage",
        icon: GitBranch,
        permissions: ["lineage.read"],
      },
      {
        label: "Lineage oficial",
        href: "/internal/lineage/official",
        icon: GitBranch,
        permissions: ["lineage.read"],
      },
      {
        label: "Impacto lineage",
        href: "/internal/lineage/impact",
        icon: GitBranch,
        permissions: ["lineage.read"],
      },
    ],
  },
  {
    label: "Gobierno y calidad",
    icon: ShieldCheck,
    items: [
      {
        label: "Gobierno de datos",
        href: "/internal/governance",
        icon: ShieldCheck,
        permissions: ["governance.data.read"],
      },
      {
        label: "Políticas gobierno",
        href: "/internal/governance/policies",
        icon: ShieldCheck,
        permissions: ["governance.policies.read"],
      },
      {
        label: "Política riesgo",
        href: "/internal/risk-policy/current",
        icon: ShieldCheck,
        permissions: ["operations.riskPolicy.read"],
      },
      {
        label: "Issues calidad",
        href: "/internal/data-quality/issues",
        icon: ClipboardCheck,
        permissions: ["dataQuality.issues.read"],
      },
      {
        label: "Reglas calidad",
        href: "/internal/data-quality/rules",
        icon: ClipboardCheck,
        permissions: ["dataQuality.rules.read"],
      },
    ],
  },
  {
    label: "Reportes",
    icon: BarChart3,
    items: [
      {
        label: "Reportes",
        href: "/internal/reports",
        icon: BarChart3,
        permissions: ["reporting.read"],
      },
      {
        label: "Readiness Release",
        href: "/internal/release-readiness",
        icon: ClipboardCheck,
        permissions: ["reporting.read"],
      },
    ],
  },
  {
    label: "QA",
    icon: TestTube2,
    items: [
      {
        label: "Laboratorio QA",
        href: "/internal/qa/lab",
        icon: TestTube2,
        permissions: ["systems.endpoints.read"],
      },
      {
        label: "Suites QA",
        href: "/internal/qa/suites",
        icon: ClipboardCheck,
        permissions: ["systems.qa.read"],
      },
      {
        label: "Ejecuciones QA",
        href: "/internal/qa/runs",
        icon: FileClock,
        permissions: ["systems.qa.read"],
      },
      {
        label: "Carga QA",
        href: "/internal/qa/stress",
        icon: Gauge,
        permissions: ["systems.stress.read"],
      },
    ],
  },
];
