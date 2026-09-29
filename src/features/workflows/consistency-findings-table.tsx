"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  LocalListTable,
  type LocalListFilter,
} from "@/shared/components/data-table/local-list-table";
import { Badge } from "@/shared/components/ui/badges";
import type { WorkflowConsistencyFinding } from "./types";

const isError = (finding: WorkflowConsistencyFinding) =>
  String(finding.severity).toLowerCase() === "error";

const COLUMNS: ColumnDef<WorkflowConsistencyFinding>[] = [
  {
    header: "Gravedad",
    id: "severity",
    accessorFn: (finding) => (isError(finding) ? "error" : "warning"),
    cell: ({ row }) => (
      <Badge tone={isError(row.original) ? "critical" : "warning"}>
        {row.original.severity ?? "aviso"}
      </Badge>
    ),
  },
  {
    header: "Código",
    accessorKey: "code",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.code ?? "—"}</span>
    ),
  },
  {
    header: "Paso",
    accessorKey: "stepCode",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-atlas-muted">
        {row.original.stepCode ?? "—"}
      </span>
    ),
  },
  {
    header: "Qué pasa",
    accessorKey: "message",
    cell: ({ row }) => (
      <span className="block max-w-md text-xs text-atlas-muted">
        {row.original.message ?? ""}
      </span>
    ),
  },
];

const FILTERS: LocalListFilter<WorkflowConsistencyFinding>[] = [
  {
    name: "severity",
    label: "Gravedad",
    tooltip:
      "Separa los errores —un paso que apunta a una ruta que no existe— de los avisos, como roles que no coinciden.",
    options: [
      {
        value: "error",
        label: "Errores",
        description: "El flujo declarado no se puede ejecutar tal cual.",
      },
      {
        value: "warning",
        label: "Avisos",
        description:
          "Algo no cuadra del todo, pero el flujo sigue funcionando.",
      },
    ],
    test: (finding, value) => isError(finding) === (value === "error"),
  },
];

/** Los hallazgos de la comprobación: llegan todos en el informe, que se pide entero a demanda. */
export function ConsistencyFindingsTable({
  findings,
}: Readonly<{ findings: WorkflowConsistencyFinding[] }>) {
  return (
    <LocalListTable
      rows={findings}
      columns={COLUMNS}
      searchText={(finding) =>
        `${finding.code ?? ""} ${finding.stepCode ?? ""} ${finding.message ?? ""}`
      }
      searchPlaceholder="Buscar por código, paso o mensaje…"
      searchTooltip="Recorre todos los hallazgos del informe, que llega entero al pulsar «Comprobar»: coincide con parte del código, del paso o del mensaje."
      filters={FILTERS}
      emptyTitle="Cada paso del flujo apunta a una ruta que existe y con el rol que declara."
      emptyFilteredTitle="Ningún hallazgo coincide con la búsqueda."
    />
  );
}
