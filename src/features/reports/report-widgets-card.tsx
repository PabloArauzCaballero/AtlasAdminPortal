"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { LocalListTable } from "@/shared/components/data-table/local-list-table";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { safeText } from "@/shared/lib/format";
import type { ReportWidget } from "./types";

const COLUMNS: ColumnDef<ReportWidget>[] = [
  {
    header: "Apartado",
    accessorKey: "title",
    cell: ({ row }) => (
      <span className="font-medium text-atlas-text">{row.original.title}</span>
    ),
  },
  {
    header: "Qué muestra",
    accessorKey: "description",
    cell: ({ row }) => (
      <span className="text-atlas-muted">
        {safeText(row.original.description)}
      </span>
    ),
  },
];

/**
 * Qué apartados trae el informe. Decía que «la definición visual viene desde BD»: viene de
 * `portal-report-definitions.ts` en AtlasBackend, no de ninguna tabla. Y enseñaba el `queryKey`, el
 * tipo de gráfico y la configuración en JSON, que no le dicen nada a quien lee el informe.
 */
export function ReportWidgetsCard({
  widgets,
}: Readonly<{ widgets: ReportWidget[] }>) {
  return (
    <section>
      <SectionHeader
        title="Qué calcula"
        description="Los apartados que salen al calcular el informe."
      />
      <LocalListTable
        rows={widgets}
        columns={COLUMNS}
        searchText={(widget) => `${widget.title} ${widget.description ?? ""}`}
        searchPlaceholder="Buscar por apartado o descripción…"
        searchTooltip="Recorre los apartados del informe, que llegan todos con su definición: coincide con parte del título o de la descripción."
        emptyTitle="Este informe no declara apartados."
        emptyFilteredTitle="Ningún apartado coincide con la búsqueda."
      />
    </section>
  );
}
