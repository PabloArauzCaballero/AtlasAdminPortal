"use client";

import {
  DEFINITION_STATUS_OPTIONS,
  DEFINITION_TYPE_OPTIONS,
} from "./operations-filter-options";

import { FileText } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useDefinitions } from "@/features/operations/hooks";
import { toRows, type DefinitionRow } from "./definition-rows";
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
import { ReviewStatusBadge, StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber, safeText } from "@/shared/lib/format";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { usePageSize } from "@/shared/lib/page-size";

export function DefinitionsPage() {
  // Los hooks viven en el hijo: aquí saldrían antes de que el gate decidiera.
  return (
    <PermissionGate permissions={["operations.definitions.read"]}>
      <AuthorizedDefinitionsPage />
    </PermissionGate>
  );
}

/**
 * Paginada en el servidor. Antes eran cuatro listas sin límite y el «buscador» mandaba `domain`
 * (igualdad exacta, con `min(2)`: una sola letra respondía 400). Ahora `q` busca en código y
 * nombre, y las tarjetas cuentan cada tipo con el filtro entero (`summary`).
 */
function AuthorizedDefinitionsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const definitions = useDefinitions({
    page,
    limit: usePageSize(20),
    q,
    type,
    status,
  });
  const summary = definitions.data?.summary;
  const rows = useMemo(
    () => (definitions.data ? toRows(definitions.data) : []),
    [definitions.data],
  );
  const columns = useMemo<ColumnDef<DefinitionRow>[]>(
    () =>
      withoutClientSorting([
        { header: "Tipo", accessorKey: "type" },
        {
          header: "Código",
          accessorKey: "code",
          cell: ({ row }) => (
            <span className="font-mono text-xs font-semibold">
              {row.original.code}
            </span>
          ),
        },
        {
          header: "Nombre",
          accessorKey: "name",
          cell: ({ row }) => (
            <span className="font-medium">{row.original.name}</span>
          ),
        },
        {
          header: "Familia/alcance",
          accessorKey: "family",
          cell: ({ row }) => safeText(row.original.family),
        },
        {
          header: "Dato",
          accessorKey: "dataType",
          cell: ({ row }) => safeText(row.original.dataType),
        },
        {
          header: "Riesgo",
          accessorKey: "riskDimension",
          cell: ({ row }) => safeText(row.original.riskDimension),
        },
        { header: "Flags", accessorKey: "flags" },
        {
          header: "Dominio",
          accessorKey: "domainCode",
          cell: ({ row }) => safeText(row.original.domainCode),
        },
        {
          header: "Dueño",
          accessorKey: "ownerTeam",
          cell: ({ row }) => safeText(row.original.ownerTeam),
        },
        {
          header: "Tablas",
          accessorKey: "relatedTables",
          cell: ({ row }) =>
            row.original.relatedTables.length
              ? row.original.relatedTables.join(", ")
              : "—",
        },
        {
          header: "Revisión",
          accessorKey: "reviewStatus",
          cell: ({ row }) => (
            <ReviewStatusBadge value={row.original.reviewStatus} />
          ),
        },
        {
          header: "Activo",
          accessorKey: "isActive",
          cell: ({ row }) => (
            <StatusBadge
              value={row.original.isActive ? "active" : "inactive"}
            />
          ),
        },
      ]),
    [],
  );
  return (
    <>
      <PageHeader
        icon={FileText}
        eyebrow="Motor de decisión"
        title="Definiciones del motor"
        description="El vocabulario del motor de decisión: eventos, observaciones, atributos e indicadores calculados que pueden alimentar reglas y modelos."
      />
      <BusinessContextNote>
        Antes de que el modelo de riesgo o un reporte pueda usar una señal (un
        evento, un atributo, un indicador calculado), esa señal tiene que estar
        definida en algún lugar: qué significa, de dónde sale y qué tipo de dato
        es. Esta pantalla es ese diccionario técnico-de-negocio para las señales
        que alimentan decisiones automatizadas. El dominio de cada fila fue
        inferido automáticamente desde su dimensión de riesgo (columna
        &quot;Revisión&quot; = «Revisión pendiente»), no es información
        confirmada por una persona todavía.
      </BusinessContextNote>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código o nombre…"
        searchTooltip="Busca el texto dentro del código o del nombre de la definición."
        filters={[
          {
            name: "type",
            label: "Tipo",
            tooltip:
              "Qué clase de dato define: evento, observación, atributo o variable del modelo.",
            value: type,
            options: DEFINITION_TYPE_OPTIONS,
          },
          {
            name: "status",
            label: "Estado",
            tooltip: "Si la definición está en uso por el motor o retirada.",
            value: status,
            options: DEFINITION_STATUS_OPTIONS,
          },
        ]}
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "type") setType(value || "all");
          if (name === "status") setStatus(value || "all");
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setType("all");
          setStatus("all");
          setPage(1);
        }}
      />
      {definitions.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {definitions.error ? (
        <ErrorState
          description={
            isAtlasApiError(definitions.error)
              ? definitions.error.message
              : "No se pudieron cargar definiciones."
          }
          requestId={
            isAtlasApiError(definitions.error)
              ? definitions.error.requestId
              : undefined
          }
          onRetry={() => void definitions.refetch()}
        />
      ) : null}
      {definitions.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Eventos" value={formatNumber(summary?.events)} />
            <MetricCard
              label="Observaciones"
              value={formatNumber(summary?.observations)}
            />
            <MetricCard
              label="Atributos"
              value={formatNumber(summary?.attributes)}
            />
            <MetricCard
              label="Features"
              value={formatNumber(summary?.features)}
            />
          </section>
          <Card>
            <CardHeader>
              <SectionHeader
                title="Inventario semántico"
                description="Base para ML, scoring, QA y reportería sin campos ambiguos."
                className="mb-0"
              />
            </CardHeader>
            <CardContent>
              <DataTable
                data={rows}
                columns={columns}
                meta={definitions.data.meta}
                onPageChange={setPage}
                emptyTitle="No hay definiciones para los filtros aplicados."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
