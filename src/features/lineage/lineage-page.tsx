"use client";

import { Waypoints } from "lucide-react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import {
  UrlTabPanel,
  UrlTabs,
  useUrlTab,
  type UrlTab,
} from "@/shared/components/layout/url-tabs";
import { LineageGraphTab } from "./lineage-graph-tab";
import { LineageNodesTab } from "./lineage-nodes-tab";
import { LineageImpactTab } from "./lineage-impact-tab";
import { LineageDomainMapTab } from "./lineage-domain-map-tab";

/**
 * Linaje: UNA pantalla con cuatro vistas del mismo grafo.
 *
 * Antes eran tres entradas del menú —«Relaciones» (derivada en el navegador sobre 100 endpoints y
 * 100 tablas), «Lineage oficial» (el grafo) e «Impacto lineage» (la lista de aristas)— que
 * contestaban la misma pregunta con cifras distintas. Las rutas viejas redirigen aquí con su
 * pestaña (`/internal/lineage/official` → `?vista=grafo`, `/internal/lineage/impact` →
 * `?vista=impacto`). Las cuatro pestañas piden `lineage.read`, el permiso que tenían las tres.
 */
export const LINEAGE_TABS: readonly UrlTab[] = [
  { value: "grafo", label: "Grafo" },
  { value: "nodos", label: "Nodos" },
  { value: "impacto", label: "Relaciones e impacto" },
  { value: "mapa", label: "Mapa por dominio" },
];

export function LineagePage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["lineage.read"]}>
      <AuthorizedLineagePage />
    </PermissionGate>
  );
}

function AuthorizedLineagePage() {
  const vista = useUrlTab("vista", LINEAGE_TABS);
  return (
    <>
      <PageHeader
        icon={Waypoints}
        eyebrow="Linaje"
        title="Lineage"
        description="Qué rutas leen o escriben cada tabla y cómo se relacionan las tablas entre sí, calculado sobre el catálogo completo."
      />
      <BusinessContextNote>
        Antes de cambiar o borrar una ruta o una tabla, alguien necesita saber
        qué más se rompe si la tocan. Esta pantalla responde &quot;si modifico
        esto, qué otras partes del sistema dependen de ello&quot; antes de que
        el cambio cause un incidente en producción.
      </BusinessContextNote>
      <UrlTabs param="vista" tabs={LINEAGE_TABS} label="Vistas del linaje" />
      <UrlTabPanel param="vista" value={vista}>
        {vista === "grafo" ? <LineageGraphTab /> : null}
        {vista === "nodos" ? <LineageNodesTab /> : null}
        {vista === "impacto" ? <LineageImpactTab /> : null}
        {vista === "mapa" ? <LineageDomainMapTab /> : null}
      </UrlTabPanel>
    </>
  );
}
