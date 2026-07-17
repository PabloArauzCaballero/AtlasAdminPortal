"use client";

import { useMemo, useState } from "react";
import { useBusinessTerms } from "./hooks";
import { buildBusinessTermColumns } from "./term-columns";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { PageHeader } from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { uniqueTextOptions } from "@/shared/lib/options";
import { formatNumber } from "@/shared/lib/format";

export function BusinessGlossaryPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["businessMetadata.read"]}>
      <AuthorizedBusinessGlossaryPage />
    </PermissionGate>
  );
}

function AuthorizedBusinessGlossaryPage() {
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
    <>
      <PageHeader
        eyebrow="Glosario de negocio"
        title="Glosario de negocio"
        description="Términos funcionales administrados desde el servicio interno; no hay diccionario hardcodeado en la interfaz."
      />
      <BusinessContextNote>
        Un mismo concepto (por ejemplo, &quot;cliente activo&quot; o
        &quot;riesgo alto&quot;) puede significar cosas distintas para producto,
        riesgo y soporte si cada equipo lo interpreta a su manera. Este glosario
        existe para fijar una única definición oficial por dominio, tabla y
        columna, y así evitar decisiones tomadas sobre datos mal entendidos.
      </BusinessContextNote>
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
    </>
  );
}
