"use client";

import { useMemo, useState } from "react";
import { RoleGate } from "@/shared/auth/role-gate";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import { buildDataExportColumns } from "./export-columns";
import { useDataExports } from "./hooks";
import { Download } from "lucide-react";

export function ExportsPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST}>
      <AuthorizedExportsPage />
    </RoleGate>
  );
}

function AuthorizedExportsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const exportsQuery = useDataExports({ page, limit: 20, q });
  const items = useMemo(
    () => exportsQuery.data?.items ?? [],
    [exportsQuery.data],
  );
  const columns = useMemo(() => buildDataExportColumns(), []);
  const rows = items.reduce(
    (total, item) => total + (item.metadata?.rows ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        icon={Download}
        eyebrow="Exportaciones"
        title="Exportaciones"
        description="Catálogos que se pueden descargar enteros en JSON. Atlas no guarda un historial de exportaciones: cada descarga se genera al momento, con tu sesión."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar catálogo…"
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setPage(1);
        }}
      />
      {exportsQuery.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {exportsQuery.error ? (
        <ErrorState
          description={
            isAtlasApiError(exportsQuery.error)
              ? exportsQuery.error.message
              : "No se pudieron cargar los catálogos descargables."
          }
          requestId={
            isAtlasApiError(exportsQuery.error)
              ? exportsQuery.error.requestId
              : undefined
          }
          onRetry={() => void exportsQuery.refetch()}
        />
      ) : null}
      {exportsQuery.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <MetricCard
              label="Catálogos descargables"
              value={formatNumber(exportsQuery.data.meta.total)}
            />
            <MetricCard label="Filas en total" value={formatNumber(rows)} />
          </section>
          <DataTable
            data={items}
            columns={columns}
            meta={exportsQuery.data.meta}
            onPageChange={setPage}
            emptyTitle="Ningún catálogo coincide con la búsqueda."
          />
        </div>
      ) : null}
    </>
  );
}
