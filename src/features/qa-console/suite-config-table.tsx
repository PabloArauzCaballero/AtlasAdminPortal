"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { TestStep } from "@/features/systems/types";
import { DataTable } from "@/shared/components/data-table/data-table";
import { JsonCell } from "@/shared/components/ui/json-cell";

const isEmptyRecord = (value: unknown) =>
  !value ||
  (typeof value === "object" && Object.keys(value as object).length === 0);

const jsonColumn = (
  id: string,
  header: string,
  pick: (step: TestStep) => unknown,
): ColumnDef<TestStep> => ({
  id,
  header,
  enableSorting: false,
  cell: ({ row }) => {
    const value = pick(row.original);
    return (
      <JsonCell value={isEmptyRecord(value) ? null : JSON.stringify(value)} />
    );
  },
});

/**
 * La configuración de cada paso de la suite: el payload por defecto, lo que se comprueba, lo que
 * se extrae para los pasos siguientes y el esquema de lo configurable. Los pasos llegan enteros con
 * la suite, así que la tabla no lleva buscador ni paginación propios.
 */
export function SuiteConfigTable({ steps }: Readonly<{ steps: TestStep[] }>) {
  const columns = useMemo<ColumnDef<TestStep>[]>(
    () => [
      { header: "#", accessorKey: "stepOrder" },
      { header: "Paso", accessorKey: "name" },
      jsonColumn("payload", "Payload por defecto", (s) => s.defaultPayload),
      jsonColumn("assertions", "Comprobaciones", (s) => s.assertions),
      jsonColumn(
        "extractors",
        "Extrae para los siguientes",
        (s) => s.extractors,
      ),
      jsonColumn("schema", "Esquema configurable", (s) => s.configSchema),
    ],
    [],
  );
  return (
    <DataTable
      data={steps}
      columns={columns}
      emptyTitle="Esta suite no tiene pasos."
      emptyDescription="Agrega pasos en la pestaña «Pasos» para ver aquí su configuración."
    />
  );
}
