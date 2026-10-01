import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { Badge, MethodBadge, RiskBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { fecha } from "../async/labels";
import { useReviewFlowMutation } from "./hooks";
import { ESTADO, MOTIVO } from "./labels";
import type { FlowReviewDecision, FlowReviewItem } from "./types";

export function useFlowReviewColumns({
  puedeRevisar,
  items,
  seleccion,
  alternarUno,
  alternarPagina,
  onVerFlujo,
}: {
  puedeRevisar: boolean;
  items: FlowReviewItem[];
  seleccion: Map<string, FlowReviewItem>;
  alternarUno: (flujo: FlowReviewItem) => void;
  alternarPagina: () => void;
  onVerFlujo: (flowId: string) => void;
}) {
  const decidir = useReviewFlowMutation();

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
        header: () => (
          <input
            type="checkbox"
            aria-label="Seleccionar todos los de esta página"
            disabled={!puedeRevisar || items.length === 0}
            checked={
              items.length > 0 && items.every((f) => seleccion.has(f.id))
            }
            onChange={alternarPagina}
          />
        ),
        id: "seleccion",
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label={`Seleccionar ${row.original.path}`}
            disabled={!puedeRevisar}
            checked={seleccion.has(row.original.id)}
            onChange={() => alternarUno(row.original)}
          />
        ),
      },
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
                onClick={() => onVerFlujo(row.original.id)}
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
  }, [decidir, puedeRevisar, items, seleccion, alternarPagina, alternarUno, onVerFlujo]);

  return { columns, decidir };
}
