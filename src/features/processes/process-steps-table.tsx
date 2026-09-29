"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useMemo } from "react";
import type { AtlasColumnMeta } from "@/shared/components/data-table/data-table";
import { LocalListTable } from "@/shared/components/data-table/local-list-table";
import { Badge, MethodBadge, RiskBadge } from "@/shared/components/ui/badges";
import {
  actorLabel,
  clientLabel,
  STEP_KIND_LABELS,
  systemLabel,
} from "./labels";
import { buildStepFilters } from "./process-steps-filters";
import { StageScreen } from "./stage-screen";
import type { ProcessStage, ProcessStep } from "./types";
import { WiringBadge } from "./wiring-badge";

/** Una fila por paso; una etapa sin pasos sale con una sola fila que lo dice. */
export type StepRow = {
  stage: ProcessStage;
  stageIndex: number;
  step: ProcessStep | null;
};

export function toStepRows(stages: ProcessStage[]): StepRow[] {
  return stages.flatMap((stage, stageIndex): StepRow[] =>
    stage.steps.length
      ? stage.steps.map((step) => ({ stage, stageIndex, step }))
      : [{ stage, stageIndex, step: null }],
  );
}

function TechnicalCell({ step }: Readonly<{ step: ProcessStep }>) {
  return (
    <div className="max-w-sm space-y-1 text-xs text-atlas-muted">
      <p>{STEP_KIND_LABELS[step.kind] ?? step.kind}</p>
      {step.kind === "http" && step.path ? (
        <p className="flex flex-wrap items-center gap-1 font-mono">
          <MethodBadge method={step.method} />
          {step.path}
        </p>
      ) : null}
      {step.job ? <p className="font-mono">Tarea: {step.job}</p> : null}
      {step.reason ? <p>Por qué no es una llamada: {step.reason}</p> : null}
      {step.events?.length ? (
        <p className="font-mono">Avisa con: {step.events.join(", ")}</p>
      ) : null}
    </div>
  );
}

export function ProcessStepsTable({
  stages,
  onOpenFlow,
}: Readonly<{
  stages: ProcessStage[];
  /** Sólo llega si quien mira tiene permiso sobre el mapa de rutas; sin él no hay enlace ni ficha. */
  onOpenFlow?: (flowId: string) => void;
}>) {
  const rows = useMemo(() => toStepRows(stages), [stages]);
  const filters = useMemo(() => buildStepFilters(stages), [stages]);
  const columns = useMemo<ColumnDef<StepRow>[]>(
    () => [
      {
        header: "Etapa",
        id: "stage",
        accessorFn: (row) => row.stageIndex,
        cell: ({ row }) => (
          <div data-testid={`etapa-${row.original.stage.code}`}>
            <p className="font-medium text-atlas-text">
              {`${row.original.stageIndex + 1}. ${row.original.stage.name}`}
              {row.original.stage.optional ? (
                <span className="ml-2 text-xs font-normal text-atlas-muted">
                  (opcional)
                </span>
              ) : null}
            </p>
          </div>
        ),
      },
      {
        header: "Quién actúa",
        id: "actor",
        accessorFn: (row) => actorLabel(row.stage.actor),
        cell: ({ row }) => (
          <div className="text-xs">
            <p>{actorLabel(row.original.stage.actor)}</p>
            <p className="text-atlas-muted">
              {clientLabel(row.original.stage.client)}
            </p>
          </div>
        ),
      },
      {
        header: "Pantalla",
        id: "screen",
        enableSorting: false,
        cell: ({ row }) => <StageScreen stage={row.original.stage} />,
      },
      {
        header: "Paso",
        id: "step",
        accessorFn: (row) => row.step?.name ?? "",
        cell: ({ row }) => {
          const { step } = row.original;
          if (!step)
            return (
              <span className="text-atlas-muted">
                Esta etapa no declara pasos.
              </span>
            );
          return (
            <div data-testid={`paso-${step.code}`} className="max-w-md">
              <p className="font-medium text-atlas-text">
                {step.name}
                {step.optional ? (
                  <span className="ml-2 text-xs font-normal text-atlas-muted">
                    (opcional)
                  </span>
                ) : null}
              </p>
              <p className="text-xs text-atlas-muted">{step.description}</p>
              {step.wiring === "unwired" ? (
                <p className="mt-1 text-xs font-medium text-red-800">
                  Ningún portal hace este paso todavía: hoy sólo se puede hacer
                  a mano o pidiéndolo a sistemas.
                </p>
              ) : null}
            </div>
          );
        },
      },
      {
        header: "Cableado",
        id: "wiring",
        accessorFn: (row) => row.step?.wiring ?? "",
        cell: ({ row }) =>
          row.original.step ? (
            <WiringBadge value={row.original.step.wiring} />
          ) : (
            "—"
          ),
      },
      {
        header: "Riesgo y prueba",
        id: "risk",
        enableSorting: false,
        cell: ({ row }) => {
          const step = row.original.step;
          if (!step) return "—";
          return (
            <div className="flex flex-wrap items-center gap-1">
              {step.risk ? <RiskBadge value={step.risk} /> : null}
              {step.verification === "VERIFIED" ? (
                <Badge tone="success">verificado</Badge>
              ) : null}
              {step.testStatus === "UNTESTED" ? (
                <Badge tone="muted">sin prueba</Badge>
              ) : null}
              {!step.risk &&
              step.verification !== "VERIFIED" &&
              step.testStatus !== "UNTESTED"
                ? "—"
                : null}
            </div>
          );
        },
      },
      {
        header: "Cómo se hace",
        id: "how",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.step ? <TechnicalCell step={row.original.step} /> : "—",
      },
      {
        header: "Bloque",
        id: "system",
        accessorFn: (row) => systemLabel(row.step?.system),
        cell: ({ row }) => (
          <span className="text-xs">
            {systemLabel(row.original.step?.system)}
          </span>
        ),
      },
      {
        header: "Quién la llama",
        id: "callers",
        enableSorting: false,
        cell: ({ row }) => {
          const step = row.original.step;
          if (!step || step.kind !== "http") return "—";
          return (
            <span className="text-xs">
              {step.callers.length
                ? step.callers.map(clientLabel).join(", ")
                : "Nadie, según el mapa de rutas"}
            </span>
          );
        },
      },
      {
        header: "Mapa de rutas",
        id: "actions",
        enableSorting: false,
        meta: { pinRight: true } satisfies AtlasColumnMeta,
        cell: ({ row }) => {
          const flowId = row.original.step?.flowId;
          if (!flowId || !onOpenFlow) return "—";
          return (
            <div className="flex flex-col items-start gap-1 text-xs">
              <button
                type="button"
                className="text-atlas-accent underline"
                onClick={() => onOpenFlow(flowId)}
              >
                Ver ficha técnica
              </button>
              <Link
                className="text-atlas-accent underline"
                href={`/internal/flows?flow=${encodeURIComponent(flowId)}`}
              >
                Abrir en el mapa de rutas
              </Link>
            </div>
          );
        },
      },
    ],
    [onOpenFlow],
  );

  return (
    <LocalListTable
      rows={rows}
      columns={columns}
      searchText={(row) =>
        `${row.stage.name} ${row.step?.name ?? ""} ${row.step?.description ?? ""} ${row.step?.path ?? ""} ${row.step?.code ?? ""}`
      }
      searchPlaceholder="Buscar por etapa, paso, descripción o ruta…"
      searchTooltip="Recorre todas las etapas y pasos del proceso, que llegan enteros en su ficha: coincide con parte del nombre de la etapa, del paso, de su descripción, de su código o de la ruta que llama."
      filters={filters}
      emptyTitle="Este proceso no declara etapas."
      emptyFilteredTitle="Ningún paso coincide con la búsqueda."
    />
  );
}
