"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { TestStep } from "@/features/systems/types";
import { MethodBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { formatBoolean } from "@/shared/lib/format";

export function buildStepColumns({
  onEdit,
  onMove,
  isMoving,
  totalSteps,
}: Readonly<{
  /** Ausente = el usuario no puede editar pasos. */
  onEdit?: (step: TestStep) => void;
  /** Ausente = el usuario no puede reordenar. */
  onMove?: (step: TestStep, direction: -1 | 1) => void;
  isMoving?: boolean;
  totalSteps: number;
}>): ColumnDef<TestStep>[] {
  const columns: ColumnDef<TestStep>[] = [
    { header: "#", accessorKey: "stepOrder" },
    { header: "Nombre", accessorKey: "name" },
    {
      header: "Método",
      accessorKey: "method",
      cell: ({ row }) => <MethodBadge method={row.original.method} />,
    },
    {
      header: "Ruta",
      accessorKey: "pathTemplate",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.pathTemplate}</span>
      ),
    },
    {
      header: "Endpoint",
      accessorKey: "endpointId",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.endpointId ? `#${row.original.endpointId}` : "—"}
        </span>
      ),
    },
    { header: "Input", accessorKey: "inputMode" },
    {
      header: "Continúa",
      accessorKey: "continueOnFailure",
      cell: ({ row }) => formatBoolean(row.original.continueOnFailure),
    },
    {
      header: "Cleanup",
      accessorKey: "cleanupRequired",
      cell: ({ row }) => formatBoolean(row.original.cleanupRequired),
    },
  ];

  if (onMove) {
    columns.push({
      header: "Orden",
      cell: ({ row, table }) => {
        // `table.getSortedRowModel()` refleja lo que ve el usuario; usar el
        // índice visible evita que "subir" haga algo distinto a lo que muestra
        // la tabla cuando está ordenada por otra columna.
        const index = table
          .getSortedRowModel()
          .rows.findIndex((sorted) => sorted.id === row.id);
        return (
          <div className="flex gap-1">
            <Button
              className="h-8 px-2 text-xs"
              aria-label={`Subir el paso ${row.original.name}`}
              disabled={isMoving || index <= 0}
              onClick={() => onMove(row.original, -1)}
            >
              ↑
            </Button>
            <Button
              className="h-8 px-2 text-xs"
              aria-label={`Bajar el paso ${row.original.name}`}
              disabled={isMoving || index >= totalSteps - 1}
              onClick={() => onMove(row.original, 1)}
            >
              ↓
            </Button>
          </div>
        );
      },
    });
  }

  if (onEdit) {
    columns.push({
      header: "Acción",
      cell: ({ row }) => (
        <Button
          className="h-8 px-2 text-xs"
          onClick={() => onEdit(row.original)}
        >
          Editar
        </Button>
      ),
    });
  }

  return columns;
}
