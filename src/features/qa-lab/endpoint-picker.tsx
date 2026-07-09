"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import type { EndpointItem } from "@/features/systems/types";
import {
  MethodBadge,
  ModuleBadge,
  RiskBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { SectionHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { safeText } from "@/shared/lib/format";
import { useLabEndpoints } from "./hooks";

export function EndpointPicker({
  selectedId,
  onSelect,
}: Readonly<{ selectedId: string; onSelect: (endpointId: string) => void }>) {
  const [q, setQ] = useState("");
  const [manualId, setManualId] = useState(selectedId);
  const endpoints = useLabEndpoints({ page: 1, limit: 10, q });
  const columns = useMemo(() => buildColumns(onSelect), [onSelect]);

  function loadManual() {
    const value = manualId.trim();
    if (value) onSelect(value);
  }

  return (
    <Card>
      <CardHeader>
        <SectionHeader
          title="1. Seleccionar endpoint"
          description="Busca una ruta registrada o pega el identificador exacto del endpoint para ejecutar pruebas funcionales y de carga controlada."
          className="mb-0"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_260px_auto]">
          <FilterBar
            search={q}
            searchPlaceholder="Buscar ruta, módulo o acción..."
            onSearchChange={setQ}
            onClear={() => setQ("")}
          />
          <input
            className="h-11 rounded-lg border border-atlas-border bg-white px-3 text-sm font-mono"
            placeholder="endpointId"
            value={manualId}
            onChange={(event) => setManualId(event.target.value)}
          />
          <Button className="h-11" variant="primary" onClick={loadManual}>
            Cargar endpoint
          </Button>
        </div>
        {selectedId ? (
          <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Endpoint seleccionado:{" "}
            <span className="font-mono">#{selectedId}</span>
          </p>
        ) : null}
        {endpoints.isLoading ? <LoadingSkeleton rows={4} /> : null}
        {endpoints.error ? (
          <EndpointPickerError error={endpoints.error} />
        ) : null}
        {endpoints.data ? (
          <DataTable
            data={endpoints.data.items}
            columns={columns}
            meta={endpoints.data.meta}
            emptyTitle="No se encontraron endpoints."
            emptyDescription="Ajusta la búsqueda o pega el endpointId directamente."
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function buildColumns(
  onSelect: (endpointId: string) => void,
): ColumnDef<EndpointItem>[] {
  return [
    {
      header: "Método",
      cell: ({ row }) => <MethodBadge method={row.original.method} />,
    },
    {
      header: "Ruta",
      cell: ({ row }) => (
        <Link
          className="font-mono text-xs text-blue-700 hover:underline"
          href={`/internal/systems/endpoints/${row.original.endpointId}`}
        >
          {safeText(row.original.fullPath ?? row.original.routePath)}
        </Link>
      ),
    },
    {
      header: "Módulo",
      cell: ({ row }) => <ModuleBadge value={row.original.module} />,
    },
    {
      header: "Riesgo",
      cell: ({ row }) => <RiskBadge value={row.original.riskLevel} />,
    },
    {
      header: "Estado",
      cell: ({ row }) => <StatusBadge value={row.original.status} />,
    },
    {
      header: "Acción",
      cell: ({ row }) => (
        <Button onClick={() => onSelect(row.original.endpointId)}>
          Probar
        </Button>
      ),
    },
  ];
}

function EndpointPickerError({ error }: Readonly<{ error: unknown }>) {
  return (
    <ErrorState
      description={
        isAtlasApiError(error)
          ? error.message
          : "No se pudo cargar el catálogo de endpoints."
      }
      requestId={isAtlasApiError(error) ? error.requestId : undefined}
    />
  );
}
