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
import { useFlowReviewQueue, useReviewFlowMutation } from "./hooks";
import { ESTADO, MOTIVO } from "./labels";
import type {
  FlowReviewDecision,
  FlowReviewItem,
  FlowReviewStatus,
} from "./types";

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
  const query = useFlowReviewQueue({ reviewStatus: estado, page, limit: 20 });
  const decidir = useReviewFlowMutation();
  const totalPaginas = query.data?.meta.totalPages ?? 1;
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
  }, [decidir, puedeRevisar]);

  return (
    <>
      <PageHeader
        icon={ClipboardCheck}
        eyebrow="Systems Ops · Flujos"
        title="Revisión de flujos"
        description="Flujos de riesgo alto cuyo análisis no se puede dar por bueno solo, y los ya revisados cuyo código cambió. Aprobar un flujo es aprobar ESE código: si cambia, vuelve aquí."
        actions={
          <select
            aria-label="Estado de revisión"
            className="rounded-md border border-atlas-border bg-white px-2 py-1 text-sm"
            value={estado}
            onChange={(event) => {
              setEstado(event.target.value as FlowReviewStatus);
              setPage(1);
            }}
          >
            {ESTADOS.map((valor) => (
              <option key={valor} value={valor}>
                {ESTADO[valor].label}
              </option>
            ))}
          </select>
        }
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
          emptyTitle="Nada que revisar con este estado"
          emptyDescription="La cola sólo recibe flujos de riesgo alto con análisis incierto y los revisados cuyo código cambió. Se llena al recargar el catálogo de Flujos."
        />
      ) : null}
    </>
  );
}
