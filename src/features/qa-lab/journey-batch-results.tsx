"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { Badge, StatusBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import type { Option } from "@/shared/lib/options";
import { JourneyStepResults } from "./journey-step-results";
import type {
  QaJourneyBatchResult,
  QaJourneyIterationResult,
} from "./journey-types";

const OUTCOME_OPTIONS: Option[] = [
  {
    value: "OK",
    label: "Sin fallos",
    description: "Personas cuyos pasos pasaron todos.",
  },
  {
    value: "ERROR",
    label: "Con fallos",
    description: "Personas con al menos un paso fallido.",
  },
];

const documentOf = (run: QaJourneyIterationResult) =>
  typeof run.persona.documentNumber === "string"
    ? run.persona.documentNumber
    : "";

/**
 * Filtra el lote entero, que ya está en el navegador (lo generó y ejecutó esta misma pantalla).
 * Busca por el número de persona o por su documento.
 */
export function filterIterations(
  runs: readonly QaJourneyIterationResult[],
  q: string,
  outcome: string,
): QaJourneyIterationResult[] {
  const raw = q.trim().toLowerCase();
  const byNumber = raw.startsWith("#");
  const needle = raw.replace(/^#/, "");
  return runs.filter((run) => {
    const failed = run.result.failedSteps > 0;
    if (outcome === "OK" && failed) return false;
    if (outcome === "ERROR" && !failed) return false;
    if (!needle) return true;
    if (String(run.index + 1) === needle) return true;
    // «#3» pide SÓLO la persona 3; sin «#», el texto también se busca dentro del documento.
    return (
      !byNumber &&
      (`persona ${run.index + 1}`.includes(needle) ||
        documentOf(run).toLowerCase().includes(needle))
    );
  });
}

/**
 * Resultado de un lote de journeys (`iterations` > 1). Con una sola corrida se ve exactamente
 * igual que antes (`JourneyStepResults` a secas, sin el cascarón del lote): el volumen no cambia
 * la lectura de un journey suelto.
 */
export function JourneyBatchResults({
  batch,
}: Readonly<{ batch: QaJourneyBatchResult }>) {
  const [q, setQ] = useState("");
  const [outcome, setOutcome] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const filtered = useMemo(
    () => filterIterations(batch.runs, q, outcome),
    [batch.runs, q, outcome],
  );
  const columns = useMemo(
    () =>
      withoutClientSorting(
        buildIterationColumns(openIndex, (index) => setOpenIndex(index)),
      ),
    [openIndex],
  );
  if (batch.iterations === 1 && batch.runs[0]) {
    return <JourneyStepResults result={batch.runs[0].result} />;
  }
  const open = batch.runs.find((run) => run.index === openIndex);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge value={batch.failedIterations === 0 ? "OK" : "WARNING"} />
        <Badge>
          {batch.passedIterations}/{batch.iterations} personas OK
        </Badge>
        <Badge tone="default">semilla: {batch.seed}</Badge>
        <Badge tone="default">concurrencia: {batch.concurrency}</Badge>
      </div>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por n.º de persona o documento…"
        searchTooltip="Recorre TODAS las personas del lote, que ya está en este navegador porque esta pantalla lo ejecutó: coincide con su número o con parte de su documento; «#3» pide sólo la persona 3."
        filters={[
          {
            name: "outcome",
            label: "Resultado",
            allLabel: "Todas las personas",
            tooltip:
              "Deja sólo las personas cuyos pasos pasaron todos, o las que tuvieron algún fallo.",
            value: outcome,
            options: OUTCOME_OPTIONS,
          },
        ]}
        onSearchChange={(value) => {
          setQ(value);
        }}
        onFilterChange={(_name, value) => {
          setOutcome(value);
        }}
        onClear={() => {
          setQ("");
          setOutcome("");
        }}
      />
      <DataTable
        data={filtered}
        columns={columns}
        emptyTitle="Ninguna persona coincide con la búsqueda."
        emptyDescription="Cambia el texto o quita el filtro de resultado."
      />
      {open ? (
        <section
          className="space-y-3 rounded-xl border border-atlas-border bg-atlas-soft/40 p-3"
          aria-label={`Detalle de la persona ${open.index + 1}`}
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-atlas-text">
              Persona {open.index + 1}
            </h3>
            <Button
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={() => setOpenIndex(null)}
            >
              Cerrar
            </Button>
          </div>
          <JourneyStepResults result={open.result} />
          <JsonViewer title="Persona simulada" value={open.persona} />
        </section>
      ) : null}
    </div>
  );
}

function buildIterationColumns(
  openIndex: number | null,
  onToggle: (index: number | null) => void,
): ColumnDef<QaJourneyIterationResult>[] {
  return [
    {
      id: "persona",
      header: "Persona",
      cell: ({ row }) => (
        <Badge tone="default">Persona {row.original.index + 1}</Badge>
      ),
    },
    {
      id: "result",
      header: "Resultado",
      cell: ({ row }) => (
        <StatusBadge
          value={row.original.result.failedSteps > 0 ? "ERROR" : "OK"}
        />
      ),
    },
    {
      id: "steps",
      header: "Pasos",
      cell: ({ row }) => (
        <span className="tabular-nums">
          {row.original.result.passedSteps}/{row.original.result.totalSteps}{" "}
          pasos
        </span>
      ),
    },
    {
      id: "document",
      header: "Documento",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-atlas-muted">
          {documentOf(row.original) || "—"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Detalle",
      meta: { pinRight: true },
      cell: ({ row }) => {
        const open = openIndex === row.original.index;
        return (
          <Button
            variant="ghost"
            className="h-8 px-2.5 text-xs"
            aria-expanded={open}
            aria-label={`${open ? "Ocultar" : "Ver"} el detalle de la persona ${row.original.index + 1}`}
            onClick={() => onToggle(open ? null : row.original.index)}
          >
            {open ? "Ocultar detalle" : "Ver detalle"}
          </Button>
        );
      },
    },
  ];
}
