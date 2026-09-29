"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { DataEntityColumn } from "@/features/systems/types";
import {
  Badge,
  PiiBadge,
  ReviewStatusBadge,
} from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { safeText } from "@/shared/lib/format";

/**
 * `DataEntityColumn` tiene índice `[key: string]: unknown` porque el contrato de
 * columnas todavía no está congelado, así que `reviewStatus` llega sin tipo.
 * Se estrecha acá en lugar de castear en cada uso.
 */
export function reviewStatusOf(column: DataEntityColumn): string | undefined {
  return typeof column.reviewStatus === "string"
    ? column.reviewStatus
    : undefined;
}

function validationText(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function filterColumns(columns: DataEntityColumn[], q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return columns;
  return columns.filter((column) =>
    [
      column.columnName,
      column.businessName,
      column.dataType,
      column.businessDescription,
      column.technicalDescription,
      column.validationRule,
    ]
      .map(safeText)
      .join(" ")
      .toLowerCase()
      .includes(needle),
  );
}

export function hasDescription(column: DataEntityColumn) {
  return Boolean(
    column.businessDescription ??
    column.technicalDescription ??
    column.description,
  );
}

export function columnDescription(column: DataEntityColumn) {
  return (
    column.businessDescription ??
    column.technicalDescription ??
    column.description ??
    "Sin descripción registrada."
  );
}

/**
 * Las columnas de UNA tabla física: llegan enteras con el detalle de la entidad, así que la tabla
 * ordena y filtra en el cliente sobre la lista completa.
 */
export function buildColumnCatalogColumns(
  canReview: boolean,
  onReview: (column: DataEntityColumn) => void,
): ColumnDef<DataEntityColumn>[] {
  return [
    {
      header: "Columna",
      accessorFn: (column) => safeText(column.columnName),
      cell: ({ row }) => (
        <code className="break-words font-mono text-xs font-semibold text-atlas-text">
          {safeText(row.original.columnName)}
        </code>
      ),
    },
    {
      header: "Tipo",
      accessorFn: (column) => column.dataType ?? "",
      cell: ({ row }) =>
        row.original.dataType ? (
          <Badge tone="info">{row.original.dataType}</Badge>
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      header: "Descripción",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="block max-w-md text-xs leading-5 text-atlas-muted">
          {columnDescription(row.original)}
        </span>
      ),
    },
    {
      header: "Nombre de negocio",
      accessorFn: (column) => safeText(column.businessName),
      cell: ({ row }) =>
        row.original.businessName ? (
          <Badge tone="muted">{row.original.businessName}</Badge>
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
    {
      header: "Datos personales",
      accessorFn: (column) => (column.containsPii ? 1 : 0),
      cell: ({ row }) =>
        row.original.containsPii ? (
          <PiiBadge value />
        ) : (
          <span className="text-atlas-muted">No</span>
        ),
    },
    {
      header: "Uso ML",
      accessorFn: (column) => (column.usedInMl ? 1 : 0),
      cell: ({ row }) =>
        row.original.usedInMl ? (
          <Badge tone="warning">Uso ML</Badge>
        ) : (
          <span className="text-atlas-muted">No</span>
        ),
    },
    {
      header: "Nulos",
      accessorFn: (column) => (column.isNullable ? 1 : 0),
      cell: ({ row }) => (
        <Badge tone={row.original.isNullable ? "muted" : "success"}>
          {row.original.isNullable ? "nullable" : "not null"}
        </Badge>
      ),
    },
    {
      header: "Validación",
      enableSorting: false,
      cell: ({ row }) => {
        const validation = validationText(row.original.validationRule);
        return validation ? (
          <code className="block max-w-xs break-words font-mono text-[11px] text-atlas-text">
            {validation}
          </code>
        ) : (
          <span className="text-atlas-muted">—</span>
        );
      },
    },
    {
      header: "Revisión",
      accessorFn: (column) => reviewStatusOf(column) ?? "",
      cell: ({ row }) => (
        <ReviewStatusBadge value={reviewStatusOf(row.original)} />
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      enableSorting: false,
      meta: { pinRight: true },
      cell: ({ row }) =>
        // Sin `columnId` no hay a qué apuntar el PATCH: el backend todavía no devuelve el id en
        // todas las respuestas de columnas.
        canReview && row.original.columnId ? (
          <Button
            className="h-8 px-2 text-xs"
            onClick={() => onReview(row.original)}
          >
            Revisar
          </Button>
        ) : (
          <span className="text-atlas-muted">—</span>
        ),
    },
  ];
}
