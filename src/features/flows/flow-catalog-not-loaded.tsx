"use client";

import { EmptyState } from "@/shared/components/ui/states";
import { useFlowImports } from "./hooks";

/**
 * El mapa de Flujos no lo genera el despliegue: sale del artefacto de AtlasFlowIntelligence y alguien tiene que
 * cargarlo (`tools/load.mjs`). En un entorno recién desplegado las tablas están vacías, y cada pantalla de Flujos
 * mostraba ceros —«0 críticos», «nada que revisar»— que se leían como un sistema sano. Este aviso dice lo que pasa:
 * no hay nada cargado que medir. Sólo aparece cuando la API confirma que no hubo NINGUNA carga; mientras carga o si
 * falla, calla (el error ya lo muestra la propia pantalla).
 */
export function FlowCatalogNotLoaded() {
  const imports = useFlowImports();
  if (!imports.data || imports.data.length > 0) return null;
  return (
    <div className="mb-6" data-testid="flow-catalog-not-loaded">
      <EmptyState
        title="El mapa de flujos no está cargado en este entorno"
        description="Las operaciones, sus hallazgos y las pantallas que las llaman salen del análisis del código, y en este entorno todavía no se cargó. Lo carga el equipo técnico; hasta entonces las cifras están en cero: no se ha medido nada, no es que no haya nada."
      />
    </div>
  );
}
