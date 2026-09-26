"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { StatusBadge } from "@/shared/components/ui/badges";
import {
  formatAmount,
  formatDateTime,
  formatNumber,
} from "@/shared/lib/format";
import type { ExhaustedOutcome, PortfolioGrade } from "./types";

/**
 * Las columnas de las dos tablas de la vista de cartera.
 *
 * Salieron de `portfolio-page.tsx` porque la pantalla pasaba de las 300 líneas del gate
 * `max-lines`. Los importes van por `formatAmount` y no crudos: el backend devuelve
 * `"1510330.00"` y la tabla los enseñaba tal cual, siete dígitos seguidos que hay que contar con
 * el dedo para saber si son cien mil o un millón.
 */

export function buildGradeColumns(): ColumnDef<PortfolioGrade>[] {
  return [
    {
      accessorKey: "grade",
      header: "Categoría",
      cell: ({ row }) => <StatusBadge value={row.original.grade} />,
    },
    { accessorKey: "gradeLabel", header: "Significado" },
    {
      accessorKey: "loanCount",
      header: "Créditos",
      cell: ({ row }) => formatNumber(row.original.loanCount),
    },
    {
      accessorKey: "exposureAmount",
      header: "Exposición",
      cell: ({ row }) => formatAmount(row.original.exposureAmount),
    },
    {
      accessorKey: "provisionAmount",
      header: "Previsión",
      cell: ({ row }) => formatAmount(row.original.provisionAmount),
    },
  ];
}

export function buildBacklogColumns(): ColumnDef<ExhaustedOutcome>[] {
  return [
    {
      accessorKey: "loanId",
      header: "Crédito",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.loanId}</span>
      ),
    },
    {
      accessorKey: "decisionExecutionId",
      header: "Ejecución",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.decisionExecutionId}
        </span>
      ),
    },
    {
      accessorKey: "windowDays",
      header: "Ventana",
      cell: ({ row }) => `${row.original.windowDays} días`,
    },
    { accessorKey: "label", header: "Desenlace" },
    {
      accessorKey: "attempts",
      header: "Intentos",
      cell: ({ row }) => formatNumber(row.original.attempts),
    },
    { accessorKey: "lastError", header: "Último error" },
    {
      accessorKey: "observedAt",
      header: "Observado",
      cell: ({ row }) => formatDateTime(row.original.observedAt),
    },
  ];
}
