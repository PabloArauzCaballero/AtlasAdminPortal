import {
  BarChart3,
  ClipboardCheck,
  FileClock,
  Gauge,
  GraduationCap,
  Table2,
  TestTube2,
} from "lucide-react";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import type { InternalNavGroup } from "./nav-config";

/** «QA y reportes»: probar el sistema y leer lo que produce. Eran dos grupos (2026-10-07). */
export const qaReportsGroup: InternalNavGroup = {
  label: "QA y reportes",
  icon: BarChart3,
  items: [
    {
      label: "Laboratorio QA",
      href: "/internal/qa/lab",
      icon: TestTube2,
      permissions: [],
      tabs: [
        {
          label: "Laboratorio",
          href: "/internal/qa/lab",
          icon: TestTube2,
          permissions: ["systems.endpoints.read"],
        },
        {
          label: "Aprender a usarlo",
          href: "/internal/qa/aprender",
          icon: GraduationCap,
          permissions: ["systems.endpoints.read"],
        },
      ],
    },
    {
      // Definir, correr y cargar.
      label: "Pruebas",
      href: "/internal/qa/suites",
      icon: ClipboardCheck,
      permissions: [],
      tabs: [
        {
          label: "Baterías",
          href: "/internal/qa/suites",
          icon: ClipboardCheck,
          permissions: ["systems.qa.read"],
        },
        {
          label: "Ejecuciones",
          href: "/internal/qa/runs",
          icon: FileClock,
          permissions: ["systems.qa.read"],
        },
        {
          label: "Carga",
          href: "/internal/qa/stress",
          icon: Gauge,
          permissions: ["systems.stress.read"],
        },
      ],
    },
    {
      label: "Reportes",
      href: "/internal/reports",
      icon: BarChart3,
      permissions: ["reporting.read"],
    },
    {
      label: "Vistas del negocio",
      href: "/internal/views",
      icon: Table2,
      // Llegó de «Operaciones» (2026-10-07): son consultas, no pendientes. El backend gatea por
      // @Roles (diez roles internos, incluido readonly_auditor), sin permiso granular.
      permissions: [],
      roles: INTERNAL_PORTAL_ROLE_LIST,
    },
    {
      label: "Preparación de salida",
      href: "/internal/release-readiness",
      icon: ClipboardCheck,
      permissions: ["reporting.read"],
    },
  ],
};
