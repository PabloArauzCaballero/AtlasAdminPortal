"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/shared/auth/auth-context";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Badge, MethodBadge, RiskBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { fecha } from "../async/labels";
import { FlowDetailDrawer } from "../flow-detail-drawer";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { useFlowReviewQueue, useReviewFlowMutation } from "./hooks";
import { ESTADO, ESTADO_AYUDA, MOTIVO } from "./labels";
import type {
  FlowReviewDecision,
  FlowReviewItem,
  FlowReviewStatus,
} from "./types";
import { FlowCatalogNotLoaded } from "../flow-catalog-not-loaded";

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
  const decidir = useReviewFlowMutation();
  // La ficha del flujo, para que quien decide vea lo que aprueba: la cola sólo enseña ruta y motivos.
  const [abierto, setAbierto] = useState<string | null>(null);
  // Con la cola vacía el servidor dice `totalPages: 0`; bajar a la «página 0» pedía `page=0`, que el
  // servidor rechaza con 400. El suelo es la página 1.
  const totalPaginas = Math.max(1, query.data?.meta.totalPages ?? 1);
  // Al decidir el último elemento de la última página, esa página deja de existir: sin esto la tabla se
  // quedaba vacía («nada que revisar») mientras las anteriores seguían llenas.
  useEffect(() => {
    if (query.data && page > totalPaginas) setPage(totalPaginas);
  }, [page, query.data, totalPaginas]);

  const columns = useMemo<ColumnDef<FlowReviewItem>[]>(() => {
    const accion = (
      flujo: FlowReviewItem,
      reviewStatus: FlowReviewDecision["reviewStatus"],
      texto: string,
      variant?: "danger",
    ) => (
      <Button
        className="h-8 px-2 text-xs"
        variant={variant}
        disabled={!puedeRevisar || decidir.isPending}
        title={puedeRevisar ? undefined : "Requiere systems.flows.review"}
        onClick={() => {
          decidir.reset();
          decidir.mutate({
            flowId: flujo.id,
            body: { reviewStatus, depsHash: flujo.depsHash },
          });
        }}
      >
        {texto}
      </Button>
    );
    return [
      {
        header: "Riesgo",
        accessorKey: "risk",
        cell: ({ row }) => <RiskBadge value={row.original.risk} />,
      },
      {
        header: "Flujo",
        accessorKey: "path",
        cell: ({ row }) => (
          <span className="flex flex-col gap-1">
            <span className="flex items-center gap-2">
              <MethodBadge method={row.original.httpMethod} />
              <span className="font-mono text-xs">{row.original.path}</span>
              <Button
                className="h-7 px-2 text-xs"
                onClick={() => setAbierto(row.original.id)}
              >
                Ver flujo
              </Button>
            </span>
            <span className="text-xs text-atlas-muted">
              {row.original.systemCode} · {row.original.module}
            </span>
          </span>
        ),
      },
      {
        header: "Por qué",
        accessorKey: "reasons",
        cell: ({ row }) => (
          <span className="flex flex-wrap gap-1">
            {row.original.reasons.map((motivo) => (
              <span key={motivo} title={MOTIVO[motivo]?.hint}>
                <Badge tone="warning">{MOTIVO[motivo]?.label ?? motivo}</Badge>
              </span>
            ))}
            {row.original.codeChangedSinceReview ? (
              <Badge tone="info">El código cambió tras revisarse</Badge>
            ) : null}
          </span>
        ),
      },
      {
        header: "Estado",
        accessorKey: "reviewStatus",
        cell: ({ row }) => {
          const etiqueta = ESTADO[row.original.reviewStatus];
          return (
            <span className="flex flex-col gap-1">
              <Badge tone={etiqueta?.tone ?? "muted"} dot>
                {etiqueta?.label ?? row.original.reviewStatus}
              </Badge>
              {row.original.reviewedAt ? (
                <span className="text-xs text-atlas-muted">
                  {row.original.reviewedBy ?? "—"} ·{" "}
                  {fecha(row.original.reviewedAt)}
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        header: "Decisión",
        id: "acciones",
        cell: ({ row }) => (
          <span className="flex flex-wrap gap-1">
            {accion(row.original, "APPROVED", "Aprobar")}
            {accion(row.original, "REJECTED", "Rechazar", "danger")}
            {row.original.reviewStatus !== "NEEDS_REVIEW"
              ? accion(row.original, "NEEDS_REVIEW", "Devolver a revisión")
              : null}
          </span>
        ),
      },
    ];
  }, [decidir, puedeRevisar, setAbierto]);

  return (
    <>
      <PageHeader
        icon={ClipboardCheck}
        eyebrow="Systems Ops · Mapa de rutas"
        title="Revisión de análisis de flujos"
        description="Flujos de riesgo alto cuyo análisis no se puede dar por bueno solo, y los ya revisados cuyo código cambió. Aprobar un flujo es aprobar ESE código: si cambia, vuelve aquí."
      />
      <FlowCatalogNotLoaded />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por ruta, handler, módulo o slug…"
        searchTooltip="Busca en el servidor, sin distinguir mayúsculas ni tildes, en el nombre, la ruta, el handler, el controlador, el módulo y el identificador legible del flujo."
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
