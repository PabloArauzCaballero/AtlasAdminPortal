"use client";

import { useMemo, useState } from "react";
import { useBusinessTerms } from "./hooks";
import { buildBusinessTermColumns } from "./term-columns";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { PageHeader } from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { uniqueTextOptions } from "@/shared/lib/options";
import { formatNumber } from "@/shared/lib/format";

export function BusinessGlossaryPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState("");
  const terms = useBusinessTerms({ page, limit: 20, q, domain });
  const items = useMemo(() => terms.data?.items ?? [], [terms.data?.items]);
  const columns = useMemo(() => buildBusinessTermColumns(), []);
  const domainOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.domain)),
    [items],
  );

  return (
    <PermissionGate permissions={["businessMetadata.read"]}>
      <PageHeader
        eyebrow="Fase 8"
        title="Glosario de negocio"
        description="Términos funcionales administrados desde el servicio interno; no hay diccionario hardcodeado en la interfaz."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar término, dominio o definición…"
        filters={[
          {
            name: "domain",
            label: "Dominio",
            value: domain,
            options: domainOptions,
          },
        ]}
        onSearchChange={(value) => {
          setPage(1);
          setQ(value);
        }}
        onFilterChange={(_, value) => {
          setPage(1);
          setDomain(value);
        }}
        onClear={() => {
          setPage(1);
          setQ("");
          setDomain("");
        }}
      />
      {terms.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {terms.error ? (
        <ErrorState
          description={
            isAtlasApiError(terms.error)
              ? terms.error.message
              : "No se pudo cargar el glosario."
          }
          requestId={
            isAtlasApiError(terms.error) ? terms.error.requestId : undefined
          }
          onRetry={() => void terms.refetch()}
        />
      ) : null}
      {terms.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Términos"
              value={formatNumber(terms.data.meta.total)}
            />
            <MetricCard label="Mostrados" value={formatNumber(items.length)} />
            <MetricCard
              label="Dominios visibles"
              value={formatNumber(domainOptions.length)}
            />
            <MetricCard
              label="Sin dueño"
              value={formatNumber(items.filter((item) => !item.owner).length)}
            />
          </section>
          <Card>
            <CardContent>
              <DataTable
                data={items}
                columns={columns}
                meta={terms.data.meta}
                onPageChange={setPage}
                emptyTitle="No hay términos para el filtro aplicado."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PermissionGate>
  );
}
