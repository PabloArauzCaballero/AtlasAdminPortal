"use client";

import { useMemo, useState } from "react";
import type { DataEntityColumn } from "@/features/systems/types";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { safeText } from "@/shared/lib/format";
import { buildColumnCatalogColumns } from "../entity-detail-columns";

export function ColumnCatalogSection({
  columns,
}: Readonly<{ columns: DataEntityColumn[] }>) {
  const [q, setQ] = useState("");
  const tableColumns = useMemo(() => buildColumnCatalogColumns(), []);
  const filtered = useMemo(() => filterColumns(columns, q), [columns, q]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Columnas" value={columns.length} />
        <MetricCard
          label="PII"
          value={columns.filter((c) => c.containsPii).length}
        />
        <MetricCard
          label="Uso ML"
          value={columns.filter((c) => c.usedInMl).length}
        />
        <MetricCard
          label="Descritas"
          value={columns.filter(hasDescription).length}
        />
      </div>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar columna, tipo o descripción..."
        onSearchChange={setQ}
        onClear={() => setQ("")}
      />
      <DataTable
        data={filtered}
        columns={tableColumns}
        emptyTitle="Catálogo de columnas pendiente."
        emptyDescription="El backend todavía no devolvió columnas para esta tabla. Revisa data_catalog_columns o el sync de modelos."
      />
    </div>
  );
}

function filterColumns(columns: DataEntityColumn[], q: string) {
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

function hasDescription(column: DataEntityColumn) {
  return Boolean(
    column.businessDescription ??
    column.technicalDescription ??
    column.description,
  );
}
