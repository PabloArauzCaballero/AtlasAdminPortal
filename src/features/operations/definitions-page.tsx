"use client";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useDefinitions } from "@/features/operations/hooks";
import type { DefinitionListResponse } from "@/features/operations/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber, safeText } from "@/shared/lib/format";
type DefinitionRow = {
  id: string;
  type: string;
  code: string;
  name: string;
  family: string | null;
  dataType: string | null;
  riskDimension: string | null;
  flags: string;
  isActive: boolean;
};
function toRows(data: DefinitionListResponse): DefinitionRow[] {
  return [
    ...data.events.map((i) => ({
      id: i.eventDefinitionId,
      type: "Evento",
      code: i.eventCode,
      name: i.eventName,
      family: i.eventFamily ?? i.sourcePackage,
      dataType: null,
      riskDimension: i.riskDimension,
      flags: i.isHighVolume ? "Alto volumen" : "—",
      isActive: i.isActive,
    })),
    ...data.observations.map((i) => ({
      id: i.observationDefinitionId,
      type: "Observación",
      code: i.observationCode,
      name: i.observationName,
      family: i.sourceGroup,
      dataType: i.dataType,
      riskDimension: i.riskDimension,
      flags: "—",
      isActive: i.isActive,
    })),
    ...data.attributes.map((i) => ({
      id: i.attributeDefinitionId,
      type: "Atributo",
      code: i.attributeCode,
      name: i.attributeName,
      family: i.entityScope,
      dataType: i.dataType,
      riskDimension: i.riskDimension,
      flags: i.isSensitive ? "Sensible" : "—",
      isActive: i.isActive,
    })),
    ...data.features.map((i) => ({
      id: i.featureDefinitionId,
      type: "Feature",
      code: i.featureCode,
      name: i.featureName,
      family: i.featureFamily,
      dataType: i.dataType,
      riskDimension: i.riskDimension,
      flags:
        [i.isModelInput ? "Modelo" : null, i.isPolicyRuleInput ? "Regla" : null]
          .filter(Boolean)
          .join(", ") || "—",
      isActive: i.isActive,
    })),
  ];
}
export function DefinitionsPage() {
  const [domain, setDomain] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const definitions = useDefinitions({ domain, type, status });
  const rows = useMemo(
    () => (definitions.data ? toRows(definitions.data) : []),
    [definitions.data],
  );
  const columns = useMemo<ColumnDef<DefinitionRow>[]>(
    () => [
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
        header: "Activo",
        accessorKey: "isActive",
        cell: ({ row }) => (
          <StatusBadge value={row.original.isActive ? "active" : "inactive"} />
        ),
      },
    ],
    [],
  );
  return (
    <PermissionGate permissions={["operations.definitions.read"]}>
      <PageHeader
        eyebrow="Fase 4"
        title="Definiciones de negocio"
        description="Eventos, observaciones, atributos y features reales desde `/operations/definitions`."
      />
      <FilterBar
        search={domain}
        searchPlaceholder="Filtrar por dominio…"
        filters={[
          {
            name: "type",
            label: "Tipo",
            value: type,
            options: [
              "all",
              "event",
              "observation",
              "attribute",
              "feature",
            ].map((value) => ({ value, label: value })),
          },
          {
            name: "status",
            label: "Estado",
            value: status,
            options: ["all", "active", "inactive"].map((value) => ({
              value,
              label: value,
            })),
          },
        ]}
        onSearchChange={setDomain}
        onFilterChange={(name, value) => {
          if (name === "type") setType(value || "all");
          if (name === "status") setStatus(value || "all");
        }}
        onClear={() => {
          setDomain("");
          setType("all");
          setStatus("all");
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
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Eventos"
              value={formatNumber(definitions.data.events.length)}
            />
            <MetricCard
              label="Observaciones"
              value={formatNumber(definitions.data.observations.length)}
            />
            <MetricCard
              label="Atributos"
              value={formatNumber(definitions.data.attributes.length)}
            />
            <MetricCard
              label="Features"
              value={formatNumber(definitions.data.features.length)}
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
                emptyTitle="No hay definiciones para los filtros aplicados."
              />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PermissionGate>
  );
}
