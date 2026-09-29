"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Badge } from "@/shared/components/ui/badges";
import type { QaAssertion } from "./assertions";

const COLUMNS: ColumnDef<QaAssertion>[] = [
  { id: "name", header: "Comprobación", accessorFn: (item) => item.name },
  {
    id: "actual",
    header: "Obtenido",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.actual}</span>
    ),
  },
  {
    id: "expected",
    header: "Esperado",
    enableSorting: false,
    cell: ({ row }) => (
      <span className="font-mono text-xs">{row.original.expected}</span>
    ),
  },
  {
    id: "result",
    header: "Resultado",
    accessorFn: (item) => (item.passed ? "OK" : "revisar"),
    cell: ({ row }) => (
      <Badge tone={row.original.passed ? "success" : "warning"}>
        {row.original.passed ? "OK" : "revisar"}
      </Badge>
    ),
  },
];

/**
 * Las comprobaciones de UNA prueba (estado HTTP, latencia, tamaño…): entran enteras con el
 * resultado que acaba de calcular este navegador, así que no llevan buscador ni paginación.
 */
export function QaChecksTable({
  items,
}: Readonly<{ items: readonly QaAssertion[] }>) {
  const data = useMemo(() => [...items], [items]);
  return (
    <DataTable
      data={data}
      columns={COLUMNS}
      emptyTitle="La prueba no evaluó ninguna comprobación."
      emptyDescription="Añade valores esperados a la operación para que se comprueben."
    />
  );
}
