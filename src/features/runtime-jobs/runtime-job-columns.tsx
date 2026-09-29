"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import type { RuntimeJobDefinition } from "./types";

/**
 * Columnas de la tabla de jobs que se pueden disparar a mano. El catálogo vive en el código de la
 * pantalla —es un conjunto cerrado y pequeño—, así que la tabla ordena y filtra en el cliente.
 */
export function buildRuntimeJobColumns(
  onRun: (definition: RuntimeJobDefinition) => void,
): ColumnDef<RuntimeJobDefinition>[] {
  return [
    {
      header: "Job",
      accessorKey: "title",
      cell: ({ row }) => (
        <div className="max-w-xs">
          <p className="text-sm font-semibold text-atlas-text">
            {row.original.title}
          </p>
          <p className="font-mono text-xs text-atlas-muted">
            {row.original.code}
          </p>
        </div>
      ),
    },
    {
      header: "Para qué sirve",
      enableSorting: false,
      accessorKey: "business",
      cell: ({ row }) => (
        <span className="line-clamp-3 block max-w-md text-xs text-atlas-muted">
          {row.original.business}
        </span>
      ),
    },
    {
      header: "Impacto",
      accessorFn: (definition) => (definition.destructive ? 1 : 0),
      cell: ({ row }) =>
        row.original.destructive ? (
          <Badge tone="critical">Borra o anonimiza</Badge>
        ) : (
          <Badge tone="muted">Mueve cola o recalcula</Badge>
        ),
    },
    {
      header: "Ensayo",
      accessorFn: (definition) => (definition.supportsDryRun === false ? 0 : 1),
      cell: ({ row }) =>
        row.original.supportsDryRun === false ? (
          <Badge tone="warning">Sólo en real</Badge>
        ) : (
          <Badge tone="success">Con ensayo</Badge>
        ),
    },
    {
      header: "Parámetros",
      enableSorting: false,
      accessorFn: (definition) => definition.fields.length,
      cell: ({ row }) => (
        <span className="block max-w-xs text-xs text-atlas-muted">
          {row.original.fields.length === 0
            ? "Ninguno"
            : row.original.fields.map((field) => field.label).join(" · ")}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      enableSorting: false,
      meta: { pinRight: true },
      cell: ({ row }) => (
        <Button
          variant="secondary"
          className="h-8 px-2 text-xs"
          onClick={() => onRun(row.original)}
        >
          Ejecutar…
        </Button>
      ),
    },
  ];
}
