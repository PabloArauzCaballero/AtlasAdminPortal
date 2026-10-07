import {
  BookOpen,
  ClipboardCheck,
  Database,
  GitBranch,
  History,
  SlidersHorizontal,
} from "lucide-react";
import type { InternalNavGroup } from "./nav-config";

/**
 * El grupo «Datos»: qué datos hay, qué significan, de dónde vienen y si están bien.
 *
 * Junta lo que eran cuatro grupos (2026-10-07): «Catálogo y metadatos», «Linaje» —un grupo de
 * una entrada—, «Esquema de datos» y las dos pantallas de calidad que vivían en «Gobierno».
 */
export const dataGroup: InternalNavGroup = {
  label: "Datos",
  icon: Database,
  items: [
    {
      // La cola de revisión es del propio catálogo: lo que falta por describir.
      label: "Catálogo de datos",
      href: "/internal/data-catalog/tables",
      icon: Database,
      permissions: [],
      tabs: [
        {
          label: "Tablas",
          href: "/internal/data-catalog/tables",
          icon: Database,
          permissions: ["catalog.data.read"],
        },
        {
          label: "Revisión del catálogo",
          href: "/internal/review-queue",
          icon: SlidersHorizontal,
          permissions: ["systems.reviewQueue.read"],
        },
      ],
    },
    {
      label: "Dominios y glosario",
      href: "/internal/business-metadata/domains",
      icon: BookOpen,
      permissions: [],
      tabs: [
        {
          // Dominios y glosario son una pantalla con dos pestañas; `/glossary` redirige a la segunda.
          label: "Dominios y glosario",
          href: "/internal/business-metadata/domains",
          icon: BookOpen,
          permissions: ["businessMetadata.read"],
        },
        {
          // «del motor»: es el vocabulario semántico del motor de decisión (eventos, atributos,
          // features), no el glosario de negocio. Mismo permiso que la pantalla y que AtlasBackend
          // reparte a quien la usa: con `businessMetadata.read` el ítem salía a quien después veía
          // «acceso restringido» y no salía a operaciones, que sí la lee.
          label: "Definiciones del motor",
          href: "/internal/business-metadata/definitions",
          icon: BookOpen,
          permissions: ["operations.definitions.read"],
        },
      ],
    },
    {
      label: "Catálogos operativos",
      href: "/internal/operations/catalogs",
      icon: Database,
      permissions: ["operations.catalogs.read"],
    },
    {
      // Una pantalla con pestañas (Grafo, Nodos, Relaciones e impacto, Mapa por dominio). Las
      // antiguas «Lineage oficial» e «Impacto lineage» redirigen a su pestaña.
      label: "Linaje",
      href: "/internal/lineage",
      icon: GitBranch,
      permissions: ["lineage.read"],
    },
    {
      // Estado e historia de lo mismo.
      label: "Esquema",
      href: "/internal/schema/versions",
      icon: Database,
      permissions: [],
      tabs: [
        {
          label: "Versiones",
          href: "/internal/schema/versions",
          icon: Database,
          // Gateado por rol en el backend (internal_operator/admin/platform_admin/risk_analyst/
          // readonly_auditor para lectura), sin permiso granular en /internal/permissions.
          permissions: [],
        },
        {
          label: "Historial de cambios",
          href: "/internal/schema/change-log",
          icon: History,
          permissions: [],
        },
      ],
    },
    {
      // La regla y su incumplimiento.
      label: "Calidad de datos",
      href: "/internal/data-quality/issues",
      icon: ClipboardCheck,
      permissions: [],
      tabs: [
        {
          label: "Incidencias",
          href: "/internal/data-quality/issues",
          icon: ClipboardCheck,
          permissions: ["dataQuality.issues.read"],
        },
        {
          label: "Reglas",
          href: "/internal/data-quality/rules",
          icon: ClipboardCheck,
          permissions: ["dataQuality.rules.read"],
        },
      ],
    },
  ],
};
