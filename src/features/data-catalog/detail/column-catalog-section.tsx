"use client";

import { useMemo, useState } from "react";
import type { DataEntityColumn } from "@/features/systems/types";
import { useAuth } from "@/shared/auth/auth-context";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { ColumnReviewDialog } from "./column-review-dialog";
import {
  buildColumnCatalogColumns,
  filterColumns,
  hasDescription,
  reviewStatusOf,
} from "./column-catalog-columns";

const YES_NO = [
  { value: "yes", label: "Sí" },
  { value: "no", label: "No" },
];

const REVIEW_OPTIONS = [
  {
    value: "APPROVED",
    label: "Aprobadas",
    description: "Su metadata inferida ya fue revisada y dada por buena.",
  },
  {
    value: "PENDING",
    label: "Sin aprobar",
    description: "Todavía no tienen una revisión aprobada.",
  },
];

export function ColumnCatalogSection({
  columns,
}: Readonly<{ columns: DataEntityColumn[] }>) {
  const [q, setQ] = useState("");
  const [pii, setPii] = useState("");
  const [ml, setMl] = useState("");
  const [review, setReview] = useState("");
  const [reviewing, setReviewing] = useState<DataEntityColumn | null>(null);
  const { hasPermission } = useAuth();
  // El backend restringe el review de columna a system_admin/platform_admin.
  // `systems.reviewQueue.resolve` es el permiso del catálogo que cubre resolver
  // items de revisión; si el rol no alcanza, el backend responde 403.
  const canReview = hasPermission("systems.reviewQueue.resolve");
  const tableColumns = useMemo(
    () => buildColumnCatalogColumns(canReview, setReviewing),
    [canReview],
  );
  const filtered = useMemo(
    () =>
      filterColumns(columns, q).filter((column) => {
        if (pii === "yes" && !column.containsPii) return false;
        if (pii === "no" && column.containsPii) return false;
        if (ml === "yes" && !column.usedInMl) return false;
        if (ml === "no" && column.usedInMl) return false;
        const approved = reviewStatusOf(column) === "APPROVED";
        if (review === "APPROVED" && !approved) return false;
        if (review === "PENDING" && approved) return false;
        return true;
      }),
    [columns, q, pii, ml, review],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-1 md:grid-cols-3 xl:grid-cols-5">
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
        <MetricCard
          label="Aprobadas"
          value={columns.filter((c) => reviewStatusOf(c) === "APPROVED").length}
          hint="Columnas cuya metadata inferida ya fue revisada y dada por buena."
        />
      </div>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar columna, tipo o descripción..."
        searchTooltip="Recorre todas las columnas de esta tabla, que llegan enteras con su detalle: coincide con parte del nombre, del nombre de negocio, del tipo, de las descripciones o de la regla de validación."
        filters={[
          {
            name: "pii",
            label: "Datos personales",
            tooltip: "Columnas que guardan información de una persona.",
            value: pii,
            options: YES_NO,
          },
          {
            name: "ml",
            label: "Uso ML",
            tooltip: "Columnas que alimentan algún modelo.",
            value: ml,
            options: YES_NO,
          },
          {
            name: "review",
            label: "Revisión",
            tooltip: "Si la metadata inferida de la columna ya se aprobó.",
            value: review,
            options: REVIEW_OPTIONS,
          },
        ]}
        onSearchChange={setQ}
        onFilterChange={(name, value) => {
          if (name === "pii") setPii(value);
          if (name === "ml") setMl(value);
          if (name === "review") setReview(value);
        }}
        onClear={() => {
          setQ("");
          setPii("");
          setMl("");
          setReview("");
        }}
      />
      <DataTable
        data={filtered}
        columns={tableColumns}
        emptyTitle={
          columns.length === 0
            ? "Catálogo de columnas pendiente."
            : "Ninguna columna coincide con la búsqueda."
        }
        emptyDescription={
          columns.length === 0
            ? "Todavía no hay columnas registradas para esta tabla."
            : "Prueba con otro texto o quita los filtros."
        }
      />
      <ColumnReviewDialog
        column={reviewing}
        onClose={() => setReviewing(null)}
      />
    </div>
  );
}
