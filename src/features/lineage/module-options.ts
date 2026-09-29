"use client";

import { useMemo } from "react";
import { useDomainOverview } from "@/features/systems/hooks";
import type { Option } from "@/shared/lib/options";

/**
 * Los módulos del catálogo como opciones de filtro, sacados del mapa de dominios del SERVIDOR
 * (`/systems/domains/overview`) y no de los nodos cargados: antes las opciones salían del grafo
 * recibido y se autorrestringían al elegir una.
 */
export function useModuleOptions(): { options: Option[]; isLoading: boolean } {
  const overview = useDomainOverview();
  const options = useMemo(() => {
    const modules = new Set<string>();
    for (const domain of overview.data?.items ?? []) {
      for (const moduleName of domain.modules) modules.add(moduleName);
    }
    for (const entry of overview.data?.unassigned.modules ?? []) {
      modules.add(entry.module);
    }
    return [...modules]
      .sort((a, b) => a.localeCompare(b))
      .map((moduleName) => ({ value: moduleName, label: moduleName }));
  }, [overview.data]);
  return { options, isLoading: overview.isLoading };
}

export const NODE_TYPE_OPTIONS: Option[] = [
  {
    value: "table",
    label: "Tablas",
    description: "Sólo tablas del catálogo de datos.",
  },
  {
    value: "endpoint",
    label: "Rutas",
    description: "Sólo rutas del catálogo de endpoints.",
  },
];

export const SEVERITY_OPTIONS: Option[] = [
  {
    value: "LOW",
    label: "Baja",
    description: "Sólo lectura o impacto menor.",
  },
  {
    value: "MEDIUM",
    label: "Media",
    description: "Impacto moderado sobre la tabla.",
  },
  {
    value: "HIGH",
    label: "Alta",
    description: "Cambia datos sensibles o de negocio.",
  },
  {
    value: "CRITICAL",
    label: "Crítica",
    description: "Puede romper una operación de negocio.",
  },
];

export const FAMILY_OPTIONS: Option[] = [
  {
    value: "impact",
    label: "Endpoint → tabla",
    description: "Qué ruta lee o escribe qué tabla. Tiene severidad.",
  },
  {
    value: "relationship",
    label: "Tabla → tabla",
    description: "Qué tabla referencia a otra. No tiene severidad.",
  },
];
