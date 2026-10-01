"use client";

import {
  CATALOG_ACTIVE_OPTIONS,
  CATALOG_VERSION_STATUS_OPTIONS,
} from "./operations-filter-options";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CatalogIngestionForm } from "@/features/operations/catalog-ingestion-form";
import { CatalogVersionCreateForm } from "@/features/operations/catalog-version-create-form";
import { useOperationCatalogs } from "@/features/operations/hooks";
import type { ContextCatalog } from "@/features/operations/types";
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
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import { buildCatalogColumns } from "./catalog-columns";
import { Boxes } from "lucide-react";
import { usePageSize } from "@/shared/lib/page-size";
export function OperationCatalogsPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["operations.catalogs.read"]}>
      <AuthorizedOperationCatalogsPage />
    </PermissionGate>
  );
}

/**
 * Paginada en el servidor con `q` (código, nombre, dominio o dueño). Antes era un `findAll` sin
 * límite y el buscador mandaba `domain` exacto con `min(2)`: una letra respondía 400. Las tarjetas
 * salen del `summary` del servidor, que cuenta el filtro entero.
 */
function AuthorizedOperationCatalogsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [active, setActive] = useState("all");
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [ingestingFor, setIngestingFor] = useState<ContextCatalog | null>(null);
  const router = useRouter();
  const catalogs = useOperationCatalogs({
    page,
    limit: usePageSize(20),
    q,
    status,
    active,
  });
  const summary = catalogs.data?.summary;
  const items = catalogs.data?.items ?? [];
  const columns = useMemo(
    () =>
      buildCatalogColumns({
        onCreateVersion: setCreatingFor,
        onIngest: setIngestingFor,
      }),
    [],
  );
  return (
    <>
      <PageHeader
        icon={Boxes}
        eyebrow="Catálogos"
        title="Catálogos operativos"
        description="Las listas de valores que usan las reglas: versión más reciente, dueño y estado de aprobación de cada catálogo."
      />
      <BusinessContextNote>
        Los catálogos operativos son las listas de valores que usan las reglas
        de negocio (motivos de rechazo, tipos de documento, estados de proceso,
        etc.). Si un catálogo tiene una versión sin aprobar o sin dueño, una
        regla de riesgo o de cobranza puede estar operando sobre datos
        desactualizados sin que nadie lo note.
      </BusinessContextNote>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código, nombre, dominio o dueño…"
        searchTooltip="Busca el texto dentro del código, el nombre, el dominio o el equipo dueño del catálogo."
        filters={[
          {
            name: "status",
            label: "Estado versión",
            tooltip:
              "Momento del ciclo de aprobación de la versión vigente de cada catálogo.",
            value: status,
            options: CATALOG_VERSION_STATUS_OPTIONS,
          },
          {
            name: "active",
            label: "Activo",
            tooltip:
              "Si el catálogo está encendido para el motor o apagado sin borrarse.",
            value: active,
            options: CATALOG_ACTIVE_OPTIONS,
          },
        ]}
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value || "all");
          if (name === "active") setActive(value || "all");
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setStatus("all");
          setActive("all");
          setPage(1);
        }}
      />
      {catalogs.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {catalogs.error ? (
        <ErrorState
          description={
            isAtlasApiError(catalogs.error)
              ? catalogs.error.message
              : "No se pudieron cargar catálogos."
          }
          requestId={
            isAtlasApiError(catalogs.error)
              ? catalogs.error.requestId
              : undefined
          }
          onRetry={() => void catalogs.refetch()}
        />
      ) : null}
      {catalogs.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Catálogos"
              value={formatNumber(summary?.total)}
            />
            <MetricCard label="Activos" value={formatNumber(summary?.active)} />
            <MetricCard
              label="Publicados"
              value={formatNumber(summary?.published)}
            />
            <MetricCard
              label="Sin versión"
              value={formatNumber(summary?.withoutVersion)}
            />
          </section>
          <Card>
            <CardHeader>
              <SectionHeader
                title="Inventario"
                description="Ordenados por código. «Publicados» cuenta los catálogos cuya versión más reciente está publicada."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <DataTable
                data={items}
                columns={columns}
                meta={catalogs.data.meta}
                onPageChange={setPage}
                emptyTitle="No hay catálogos para los filtros aplicados."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {creatingFor ? (
        <CatalogVersionCreateForm
          catalogCode={creatingFor}
          onCreated={(versionId) => {
            // Se va directo al borrador recién creado: es donde sigue el flujo
            // (enviarlo a aprobación), y evita que el operador tenga que
            // buscarlo de vuelta en el listado.
            const code = creatingFor;
            setCreatingFor(null);
            router.push(
              `/internal/operations/catalogs/${code}/versions/${versionId}`,
            );
          }}
          onClose={() => setCreatingFor(null)}
        />
      ) : null}

      {ingestingFor ? (
        <CatalogIngestionForm
          catalogCode={ingestingFor.catalogCode}
          currentVersion={ingestingFor.currentVersion}
          onClose={() => setIngestingFor(null)}
        />
      ) : null}
    </>
  );
}
