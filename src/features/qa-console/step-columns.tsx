"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDown, ArrowUp } from "lucide-react";
import type { TestStep } from "@/features/systems/types";
import { MethodBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Tooltip } from "@/shared/components/ui/tooltip";
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
            <Tooltip text="Ejecuta este paso una posición antes. El orden es el orden en que corre la suite.">
              <Button
                className="h-8 px-2 text-xs"
                aria-label={`Subir el paso ${row.original.name}`}
                disabled={isMoving || index <= 0}
                onClick={() => onMove(row.original, -1)}
              >
                <ArrowUp className="h-4 w-4" aria-hidden />
              </Button>
            </Tooltip>
            <Tooltip text="Ejecuta este paso una posición después. El orden es el orden en que corre la suite.">
              <Button
                className="h-8 px-2 text-xs"
                aria-label={`Bajar el paso ${row.original.name}`}
                disabled={isMoving || index >= totalSteps - 1}
                onClick={() => onMove(row.original, 1)}
              >
                <ArrowDown className="h-4 w-4" aria-hidden />
              </Button>
            </Tooltip>
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
