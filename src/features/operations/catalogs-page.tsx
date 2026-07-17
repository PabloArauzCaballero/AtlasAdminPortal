"use client";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CatalogIngestionForm } from "@/features/operations/catalog-ingestion-form";
import { CatalogVersionCreateForm } from "@/features/operations/catalog-version-create-form";
import { useOperationCatalogs } from "@/features/operations/hooks";
import type { ContextCatalog } from "@/features/operations/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { Button } from "@/shared/components/ui/button";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatBoolean, formatNumber, safeText } from "@/shared/lib/format";
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

function AuthorizedOperationCatalogsPage() {
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("all");
  const [active, setActive] = useState("all");
  const [creatingFor, setCreatingFor] = useState<string | null>(null);
  const [ingestingFor, setIngestingFor] = useState<string | null>(null);
  const router = useRouter();
  const catalogs = useOperationCatalogs({ domain, status, active });
  const items = catalogs.data?.items ?? [];
  const columns = useMemo<ColumnDef<ContextCatalog>[]>(
    () => [
      {
        header: "Código",
        accessorKey: "catalogCode",
        cell: ({ row }) => (
          <span className="font-mono text-xs font-semibold">
            {row.original.catalogCode}
          </span>
        ),
      },
      {
        header: "Catálogo",
        accessorKey: "catalogName",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.catalogName}</span>
        ),
      },
      {
        header: "Dominio",
        accessorKey: "domain",
        cell: ({ row }) => safeText(row.original.domain),
      },
      {
        header: "Dueño",
        accessorKey: "ownerTeam",
        cell: ({ row }) => safeText(row.original.ownerTeam),
      },
      {
        header: "Activo",
        accessorKey: "isActive",
        cell: ({ row }) => formatBoolean(row.original.isActive),
      },
      {
        header: "Versión",
        id: "version",
        // `currentVersion` es la versión MÁS RECIENTE del catálogo (el backend
        // la resuelve con `findLatestVersionsByCatalogIds`, ordenando por
        // validFrom DESC, id DESC), no solo la publicada. Por eso un borrador
        // recién creado es alcanzable desde acá: este enlace es la entrada al
        // flujo de aprobación.
        cell: ({ row }) => {
          const version = row.original.currentVersion;
          if (!version) return safeText(null);
          return (
            <Link
              href={`/internal/operations/catalogs/${row.original.catalogCode}/versions/${version.catalogVersionId}`}
              className="font-mono text-xs font-semibold text-blue-700 hover:underline"
            >
              {version.versionCode}
            </Link>
          );
        },
      },
      {
        header: "Estado",
        id: "status",
        cell: ({ row }) => (
          <StatusBadge
            value={row.original.currentVersion?.status ?? "sin_version"}
          />
        ),
      },
      {
        header: "Acciones",
        id: "actions",
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button
              className="h-7 px-2 text-xs"
              onClick={() => setCreatingFor(row.original.catalogCode)}
            >
              Nueva versión
            </Button>
            <Button
              className="h-7 px-2 text-xs"
              onClick={() => setIngestingFor(row.original.catalogCode)}
            >
              Ingerir
            </Button>
          </div>
        ),
      },
    ],
    [],
  );
  return (
    <>
      <PageHeader
        eyebrow="Catálogos"
        title="Catálogos operativos"
        description="Conectado a `/operations/catalogs`. Verifica catálogos, versiones, dueños y estados antes de generar reportes o reglas nuevas."
      />
      <BusinessContextNote>
        Los catálogos operativos son las listas de valores que usan las reglas
        de negocio (motivos de rechazo, tipos de documento, estados de proceso,
        etc.). Si un catálogo tiene una versión sin aprobar o sin dueño, una
        regla de riesgo o de cobranza puede estar operando sobre datos
        desactualizados sin que nadie lo note.
      </BusinessContextNote>
      <FilterBar
        search={domain}
        searchPlaceholder="Filtrar por dominio…"
        filters={[
          {
            name: "status",
            label: "Estado versión",
            value: status,
            options: [
              "draft",
              "pending_approval",
              "approved",
              "published",
              "retired",
              "all",
            ].map((value) => ({ value, label: value })),
          },
          {
            name: "active",
            label: "Activo",
            value: active,
            options: [
              { value: "all", label: "Todos" },
              { value: "true", label: "Activos" },
              { value: "false", label: "Inactivos" },
            ],
          },
        ]}
        onSearchChange={setDomain}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value || "all");
          if (name === "active") setActive(value || "all");
        }}
        onClear={() => {
          setDomain("");
          setStatus("all");
          setActive("all");
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
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Catálogos" value={formatNumber(items.length)} />
            <MetricCard
              label="Activos"
              value={formatNumber(items.filter((i) => i.isActive).length)}
            />
            <MetricCard
              label="Publicados"
              value={formatNumber(
                items.filter((i) => i.currentVersion?.status === "published")
                  .length,
              )}
            />
            <MetricCard
              label="Sin versión"
              value={formatNumber(
                items.filter((i) => !i.currentVersion).length,
              )}
            />
          </section>
          <Card>
            <CardHeader>
              <SectionHeader
                title="Inventario"
                description="Este listado viene del módulo operativo real."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <DataTable
                data={items}
                columns={columns}
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
          catalogCode={ingestingFor}
          onClose={() => setIngestingFor(null)}
        />
      ) : null}
    </>
  );
}
