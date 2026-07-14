"use client";

import { useMemo, useState } from "react";
import {
  useDataEntities,
  useDomains,
  useEndpoints,
} from "@/features/systems/hooks";
import type { Domain } from "@/features/systems/types";
import { moduleKeyForDomainCode } from "@/features/systems/domain-module-map";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { buildEndpointColumns, buildEntityColumns } from "./lineage-columns";
import { DomainMapCard } from "./domain-map-card";
import { buildDomainNodes, countSensitiveNodes } from "./domain-nodes";

export function LineagePage() {
  const [q, setQ] = useState("");
  const endpoints = useEndpoints({ page: 1, limit: 100, q });
  const entities = useDataEntities({ page: 1, limit: 100, q });
  const domains = useDomains({ page: 1, limit: 100 });
  const error = endpoints.error ?? entities.error;

  const domainNodes = useMemo(
    () =>
      buildDomainNodes(endpoints.data?.items ?? [], entities.data?.items ?? []),
    [endpoints.data?.items, entities.data?.items],
  );
  // Indexado por módulo normalizado (no por domainCode) porque los nodos del
  // mapa se agrupan por el `module` de endpoints/tablas, no por el código de
  // dominio. Sin esto la descripción del dominio nunca resolvía.
  const domainsByCode = useMemo(() => {
    const map = new Map<string, Domain>();
    for (const domain of domains.data?.items ?? []) {
      map.set(moduleKeyForDomainCode(domain.domainCode), domain);
    }
    return map;
  }, [domains.data?.items]);
  const entityColumns = useMemo(() => buildEntityColumns(), []);
  const endpointColumns = useMemo(() => buildEndpointColumns(), []);

  return (
    <PermissionGate permissions={["lineage.read"]}>
      <PageHeader
        eyebrow="Linaje"
        title="Lineage e impacto operativo"
        description="Vista de relaciones derivada desde endpoints, dominios y entidades reales. La lógica está separada para mantener la pantalla liviana."
      />
      <BusinessContextNote>
        Antes de cambiar o borrar un endpoint o una tabla, alguien necesita
        saber qué más se rompe si lo tocan. Esta pantalla existe para responder
        &quot;si modifico esto, qué otras partes del sistema dependen de
        ello&quot; antes de que ese cambio cause un incidente en producción.
      </BusinessContextNote>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar dominio, tabla, endpoint o propósito…"
        onSearchChange={setQ}
        onClear={() => setQ("")}
      />

      {endpoints.isLoading || entities.isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : null}
      {error ? (
        <ErrorState
          description={
            isAtlasApiError(error)
              ? error.message
              : "No se pudo cargar lineage."
          }
          requestId={isAtlasApiError(error) ? error.requestId : undefined}
          onRetry={() => {
            void endpoints.refetch();
            void entities.refetch();
          }}
        />
      ) : null}

      {endpoints.data && entities.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Dominios detectados"
              value={formatNumber(domainNodes.length)}
            />
            <MetricCard
              label="Endpoints analizados"
              value={formatNumber(endpoints.data.items.length)}
            />
            <MetricCard
              label="Tablas analizadas"
              value={formatNumber(entities.data.items.length)}
            />
            <MetricCard
              label="Nodos sensibles"
              value={formatNumber(countSensitiveNodes(domainNodes))}
            />
          </section>

          <DomainMapCard nodes={domainNodes} domainsByCode={domainsByCode} />
          <LineageTableCard
            title="Tablas y acceso a impacto"
            description="Selecciona una tabla para ver endpoints que la afectan, operación y criticidad."
            data={entities.data.items}
            columns={entityColumns}
            emptyTitle="No hay entidades para el filtro aplicado."
          />
          <LineageTableCard
            title="Endpoints en el mapa"
            description="Resumen de endpoints incluidos en la búsqueda actual."
            data={endpoints.data.items}
            columns={endpointColumns}
            emptyTitle="No hay endpoints para el filtro aplicado."
          />
        </div>
      ) : null}
    </PermissionGate>
  );
}

function LineageTableCard<T>({
  title,
  description,
  data,
  columns,
  emptyTitle,
}: Readonly<{
  title: string;
  description: string;
  data: T[];
  columns: Parameters<typeof DataTable<T>>[0]["columns"];
  emptyTitle: string;
}>) {
  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title={title}
          description={description}
          className="mb-0"
        />
      </CardHeader>
      <CardContent>
        <DataTable data={data} columns={columns} emptyTitle={emptyTitle} />
      </CardContent>
    </Card>
  );
}
