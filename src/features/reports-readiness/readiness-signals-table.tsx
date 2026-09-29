"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  LocalListTable,
  type LocalListFilter,
} from "@/shared/components/data-table/local-list-table";
import { StatusBadge } from "@/shared/components/ui/badges";

export type ReadinessSignal = { label: string; coverage: number };

export function signalStatus(coverage: number): string {
  if (coverage >= 80) return "READY";
  if (coverage >= 50) return "NEEDS_REVIEW";
  return "INCOMPLETE";
}

const COLUMNS: ColumnDef<ReadinessSignal>[] = [
  {
    header: "Señal",
    accessorKey: "label",
    cell: ({ row }) => (
      <span className="font-medium text-atlas-text">{row.original.label}</span>
    ),
  },
  {
    header: "Cobertura",
    accessorKey: "coverage",
    cell: ({ row }) => (
      <span className="tabular-nums">{row.original.coverage}%</span>
    ),
  },
  {
    header: "Estado",
    id: "status",
    accessorFn: (row) => signalStatus(row.coverage),
    cell: ({ row }) => (
      <StatusBadge value={signalStatus(row.original.coverage)} />
    ),
  },
];

const FILTERS: LocalListFilter<ReadinessSignal>[] = [
  {
    name: "status",
    label: "Estado",
    tooltip:
      "Deja sólo las señales con ese resultado: listas (80 % o más), por revisar (50 % o más) o incompletas.",
    options: [
      {
        value: "READY",
        label: "Listo",
        description: "La cobertura llega al 80 % o más.",
      },
      {
        value: "NEEDS_REVIEW",
        label: "Por revisar",
        description: "La cobertura está entre el 50 % y el 80 %.",
      },
      {
        value: "INCOMPLETE",
        label: "Incompleto",
        description: "La cobertura no llega al 50 %.",
      },
    ],
    test: (row, value) => signalStatus(row.coverage) === value,
  },
];

/** Las señales mínimas antes de construir reportes: un porcentaje de cobertura por cada una. */
export function ReadinessSignalsTable({
  signals,
}: Readonly<{ signals: ReadinessSignal[] }>) {
  return (
    <LocalListTable
      rows={signals}
      columns={COLUMNS}
      searchText={(signal) => signal.label}
      searchPlaceholder="Buscar por señal…"
      searchTooltip="Recorre las señales de preparación, que son pocas y llegan todas: coincide con parte de su nombre."
      filters={FILTERS}
      emptyTitle="No hay señales de preparación."
      emptyFilteredTitle="Ninguna señal coincide con la búsqueda."
    />
  );
}
