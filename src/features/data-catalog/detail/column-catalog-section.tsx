"use client";

import { useMemo, useState } from "react";
import type { DataEntityColumn } from "@/features/systems/types";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Badge, PiiBadge } from "@/shared/components/ui/badges";
import { EmptyState } from "@/shared/components/ui/states";
import { safeText } from "@/shared/lib/format";

export function ColumnCatalogSection({
  columns,
}: Readonly<{ columns: DataEntityColumn[] }>) {
  const [q, setQ] = useState("");
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
      {filtered.length === 0 ? (
        <EmptyState
          title="Catálogo de columnas pendiente."
          description="El backend todavía no devolvió columnas para esta tabla."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((column) => (
            <ColumnCard
              key={column.columnId ?? column.columnName}
              column={column}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ColumnCard({ column }: Readonly<{ column: DataEntityColumn }>) {
  const validation = validationText(column.validationRule);
  return (
    <article className="flex flex-col rounded-xl border border-atlas-border bg-white p-4 shadow-subtle transition-shadow hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <code className="min-w-0 break-words font-mono text-sm font-semibold text-atlas-text">
          {safeText(column.columnName)}
        </code>
        {column.dataType ? (
          <Badge tone="info" className="shrink-0">
            {column.dataType}
          </Badge>
        ) : null}
      </div>

      <p className="mt-2 flex-1 text-xs leading-5 text-atlas-muted">
        {columnDescription(column)}
      </p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {column.containsPii ? <PiiBadge value /> : null}
        {column.usedInMl ? <Badge tone="warning">Uso ML</Badge> : null}
        <Badge tone={column.isNullable ? "muted" : "success"}>
          {column.isNullable ? "nullable" : "not null"}
        </Badge>
        {column.businessName ? (
          <Badge tone="muted">{column.businessName}</Badge>
        ) : null}
      </div>

      {validation ? (
        <div className="mt-3 rounded-md bg-atlas-soft p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-atlas-muted">
            Validación
          </p>
          <code className="mt-0.5 block break-words font-mono text-[11px] text-atlas-text">
            {validation}
          </code>
        </div>
      ) : null}
    </article>
  );
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

function columnDescription(column: DataEntityColumn) {
  return (
    column.businessDescription ??
    column.technicalDescription ??
    column.description ??
    "Sin descripción registrada."
  );
}
