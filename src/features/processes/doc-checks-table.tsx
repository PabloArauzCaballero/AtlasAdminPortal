"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CircleCheck, CircleDashed } from "lucide-react";
import {
  LocalListTable,
  type LocalListFilter,
} from "@/shared/components/data-table/local-list-table";
import { Badge } from "@/shared/components/ui/badges";
import { DOC_CHECKS } from "./labels";
import type { ProcessDocumentation } from "./types";

type CheckRow = { key: string; label: string; hint: string; ok: boolean };

const COLUMNS: ColumnDef<CheckRow>[] = [
  {
    header: "Comprobación",
    accessorKey: "label",
    cell: ({ row }) => (
      <span className="font-medium text-atlas-text">{row.original.label}</span>
    ),
  },
  {
    header: "Estado",
    accessorKey: "ok",
    cell: ({ row }) =>
      row.original.ok ? (
        <Badge tone="success" icon={CircleCheck}>
          Cumple
        </Badge>
      ) : (
        <Badge tone="warning" icon={CircleDashed}>
          Falta
        </Badge>
      ),
  },
  {
    header: "Qué se mira",
    accessorKey: "hint",
    cell: ({ row }) => (
      <span className="text-atlas-muted">{row.original.hint}</span>
    ),
  },
];

const FILTERS: LocalListFilter<CheckRow>[] = [
  {
    name: "state",
    label: "Estado",
    tooltip:
      "Separa las comprobaciones que el proceso ya cumple de las que le faltan para contar como documentado.",
    options: [
      {
        value: "ok",
        label: "Cumplen",
        description: "El proceso ya cumple esta comprobación.",
      },
      {
        value: "missing",
        label: "Faltan",
        description: "Le falta cumplirla para contar como documentado.",
      },
    ],
    test: (row, value) => row.ok === (value === "ok"),
  },
];

/** Las cinco comprobaciones que hacen «documentado» a un proceso. Son cinco y fijas: llegan todas. */
export function DocChecksTable({
  documentation,
}: Readonly<{ documentation: ProcessDocumentation }>) {
  const rows: CheckRow[] = DOC_CHECKS.map((check) => ({
    key: check.key,
    label: check.label,
    hint: check.hint,
    ok: Boolean(documentation[check.key]),
  }));
  return (
    <LocalListTable
      rows={rows}
      columns={COLUMNS}
      searchText={(row) => `${row.label} ${row.hint}`}
      searchPlaceholder="Buscar por comprobación o por lo que se mira…"
      searchTooltip="Recorre las cinco comprobaciones de documentación, que son fijas y llegan todas: coincide con parte de su nombre o de su explicación."
      filters={FILTERS}
      emptyTitle="No hay comprobaciones de documentación."
      emptyFilteredTitle="Ninguna comprobación coincide con la búsqueda."
    />
  );
}
