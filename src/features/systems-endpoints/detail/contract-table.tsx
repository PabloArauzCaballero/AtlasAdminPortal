"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { LocalListTable } from "@/shared/components/data-table/local-list-table";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { safeText } from "@/shared/lib/format";
import { toRows, type ContractRow } from "./contract-rows";

const COLUMNS: ColumnDef<ContractRow>[] = [
  {
    header: "Campo",
    accessorKey: "name",
    cell: ({ row }) => (
      <span className="font-mono text-xs text-atlas-text">
        {safeText(row.original.name)}
      </span>
    ),
  },
  {
    header: "Tipo / valor",
    accessorKey: "type",
    cell: ({ row }) => (
      <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-atlas-text">
        {safeText(row.original.type)}
      </span>
    ),
  },
  {
    header: "Descripción",
    accessorKey: "description",
    cell: ({ row }) => (
      <span className="block max-w-xl text-sm text-atlas-muted">
        {safeText(row.original.description)}
      </span>
    ),
  },
];

/** Un contrato del endpoint (payload, respuesta, parámetros) como tabla de campos. */
export function ContractTable({
  title,
  value,
}: Readonly<{ title: string; value: unknown }>) {
  const rows = toRows(value);
  return (
    <section>
      <SectionHeader
        title={title}
        description="Contrato interpretado desde la metadata registrada en el catálogo."
      />
      <LocalListTable
        rows={rows}
        columns={COLUMNS}
        searchText={(row) => `${row.name} ${row.type} ${row.description}`}
        searchPlaceholder="Buscar por campo, tipo o descripción…"
        searchTooltip="Recorre todos los campos de este contrato, que llegan enteros con la ficha del endpoint: coincide con parte del nombre, del tipo o de la descripción."
        emptyTitle="Contrato pendiente."
        emptyDescription="Revisa la seed de payloads, respuestas esperadas o el proceso de descubrimiento de endpoints."
        emptyFilteredTitle="Ningún campo coincide con la búsqueda."
      />
    </section>
  );
}
