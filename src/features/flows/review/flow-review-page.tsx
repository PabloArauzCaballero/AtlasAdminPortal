"use client";

import { ClipboardCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/shared/auth/auth-context";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DataTable } from "@/shared/components/data-table/data-table";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { FlowDetailDrawer } from "../flow-detail-drawer";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { useFlowReviewQueue } from "./hooks";
import { ESTADO, ESTADO_AYUDA } from "./labels";
import type { FlowReviewStatus } from "./types";
import { FlowCatalogNotLoaded } from "../flow-catalog-not-loaded";
import { useBulkReviewSelection } from "./use-bulk-review-selection";
import { BulkReviewToolbar } from "./bulk-review-toolbar";
import { useFlowReviewColumns } from "./use-flow-review-columns";

const ESTADOS: FlowReviewStatus[] = [
  "NEEDS_REVIEW",
  "APPROVED",
  "REJECTED",
  "AUTO_DETECTED",
];

/**
 * Lo que el análisis dedujo de un flujo, confirmado o rechazado por una persona.
 *
 * La cola es corta a propósito: riesgo alto con un análisis que no se puede dar por bueno solo, y lo ya
 * revisado cuyo código cambió desde entonces. Aprobar un flujo es aprobar ESE código, así que cuando
 * cambia vuelve aquí.
 */
export function FlowReviewPage() {
  return (
    <PermissionGate permissions={["systems.flows.read"]}>
      <AuthorizedFlowReviewPage />
    </PermissionGate>
  );
}

function AuthorizedFlowReviewPage() {
  const { hasPermission } = useAuth();
  const puedeRevisar = hasPermission("systems.flows.review");
  const [estado, setEstado] = useState<FlowReviewStatus>("NEEDS_REVIEW");
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const query = useFlowReviewQueue({
    reviewStatus: estado,
    page,
    limit: 20,
    ...(q.trim() ? { q: q.trim() } : {}),
  });
  // La ficha del flujo, para que quien decide vea lo que aprueba: la cola sólo enseña ruta y motivos.
  const [abierto, setAbierto] = useState<string | null>(null);
  const items = useMemo(() => query.data?.items ?? [], [query.data]);
  const {
    seleccion,
    seleccionEnPagina,
    masivo,
    alternarUno,
    alternarPagina,
    decidirMasivo,
    limpiarSeleccion,
  } = useBulkReviewSelection(items);
  const { columns, decidir } = useFlowReviewColumns({
    puedeRevisar,
    items,
    seleccion,
    alternarUno,
    alternarPagina,
    onVerFlujo: setAbierto,
  });
  // Con la cola vacía el servidor dice `totalPages: 0`; bajar a la «página 0» pedía `page=0`, que el
  // servidor rechaza con 400. El suelo es la página 1.
  const totalPaginas = Math.max(1, query.data?.meta.totalPages ?? 1);
  // Al decidir el último elemento de la última página, esa página deja de existir: sin esto la tabla se
  // quedaba vacía («nada que revisar») mientras las anteriores seguían llenas.
  useEffect(() => {
    if (query.data && page > totalPaginas) setPage(totalPaginas);
  }, [page, query.data, totalPaginas]);

  return (
    <>
      <PageHeader
        icon={ClipboardCheck}
        eyebrow="Sistemas · Mapa de rutas"
        title="Revisión de análisis de flujos"
        description="Flujos de riesgo alto cuyo análisis no se puede dar por bueno solo, y los ya revisados cuyo código cambió. Aprobar un flujo es aprobar ESE código: si cambia, vuelve aquí."
      />
      <FlowCatalogNotLoaded />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por nombre, ruta o módulo…"
        searchTooltip="Busca en el servidor, sin distinguir mayúsculas, en el nombre de la operación, su ruta y su módulo."
        filters={[
          {
            name: "estado",
            label: "Estado de revisión",
            value: estado === "NEEDS_REVIEW" ? "" : estado,
            allLabel: ESTADO.NEEDS_REVIEW.label,
            tooltip:
              "Elige qué parte de la cola ves: lo que espera revisión, lo aprobado, lo rechazado o lo detectado sin pedir revisión. Sin elegir, la cola de pendientes.",
            options: ESTADOS.filter((valor) => valor !== "NEEDS_REVIEW").map(
              (valor) => ({
                value: valor,
                label: ESTADO[valor].label,
                description: ESTADO_AYUDA[valor],
              }),
            ),
          },
        ]}
        onFilterChange={(_name, valor) => {
          setEstado(valor ? (valor as FlowReviewStatus) : "NEEDS_REVIEW");
          setPage(1);
        }}
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setEstado("NEEDS_REVIEW");
          setPage(1);
        }}
      />
      {!puedeRevisar ? (
        <p className="mb-4 text-xs text-atlas-muted">
          Puedes ver la cola, pero decidir exige el permiso
          systems.flows.review.
        </p>
      ) : null}
      <BulkReviewToolbar
        puedeRevisar={puedeRevisar}
        seleccion={seleccion}
        seleccionEnPagina={seleccionEnPagina}
        masivo={masivo}
        onDecidir={(reviewStatus) => void decidirMasivo(reviewStatus)}
        onLimpiar={limpiarSeleccion}
      />
      {decidir.error ? (
        <p className="mb-4 text-xs text-red-700">
          {isAtlasApiError(decidir.error)
            ? decidir.error.message
            : "No se pudo aplicar la decisión."}
        </p>
      ) : null}
      {query.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {query.error ? (
        <ErrorState
          description={
            isAtlasApiError(query.error)
              ? query.error.message
              : "No se pudo cargar la cola de revisión."
          }
          requestId={
            isAtlasApiError(query.error) ? query.error.requestId : undefined
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}
      {query.data ? (
        <DataTable
          data={query.data.items}
          columns={columns}
          meta={query.data.meta}
          onPageChange={setPage}
          emptyTitle={
            q.trim()
              ? "Ningún flujo de la cola coincide con la búsqueda"
              : "Nada que revisar con este estado"
          }
          emptyDescription="La cola sólo recibe flujos de riesgo alto con análisis incierto y los revisados cuyo código cambió. Se llena al recargar el mapa de rutas."
        />
      ) : null}
      <FlowDetailDrawer flowId={abierto} onClose={() => setAbierto(null)} />
    </>
  );
}
