"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  LocalListTable,
  type LocalListFilter,
} from "@/shared/components/data-table/local-list-table";
import { Badge } from "@/shared/components/ui/badges";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { RESPONSE_STATUS_OPTIONS } from "../audit/audit-options";
import { explainStatus } from "../finding-codes";
import { etiquetaTipoConsulta } from "../provider-display";
import type { ProviderRequestRow } from "../types";

const COLUMNS: ColumnDef<ProviderRequestRow>[] = [
  {
    header: "Cuándo",
    accessorKey: "requestedAt",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-atlas-muted">
        {formatDateTime(row.original.requestedAt)}
      </span>
    ),
  },
  {
    header: "Proveedor",
    accessorKey: "providerCode",
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold">
        {row.original.providerCode ?? "—"}
      </span>
    ),
  },
  {
    header: "Qué se pidió",
    id: "requestType",
    accessorFn: (request) => etiquetaTipoConsulta(request.requestType),
    cell: ({ row }) => (
      <span className="text-atlas-muted">
        {etiquetaTipoConsulta(row.original.requestType)}
      </span>
    ),
  },
  {
    header: "Resultado",
    accessorKey: "responseStatus",
    cell: ({ row }) => {
      const explicacion = row.original.responseStatus
        ? explainStatus(row.original.responseStatus)
        : null;
      return (
        <Badge tone={explicacion?.tone ?? "default"}>
          {explicacion?.label ?? row.original.responseStatus ?? "—"}
        </Badge>
      );
    },
  },
  {
    header: "Tardó",
    accessorKey: "latencyMs",
    cell: ({ row }) =>
      row.original.latencyMs === null
        ? "—"
        : `${formatNumber(row.original.latencyMs)} ms`,
  },
];

const FILTERS: LocalListFilter<ProviderRequestRow>[] = [
  {
    name: "status",
    label: "Resultado",
    tooltip:
      "Deja sólo las llamadas que acabaron de esa manera: completada, fallida, bloqueada por costo…",
    options: RESPONSE_STATUS_OPTIONS,
    test: (request, value) =>
      (request.responseStatus ?? "").toUpperCase() === value,
  },
];

/** Las últimas llamadas a proveedores del período. Llegan todas con el tablero: son las más recientes, no una página. */
export function RecentRequestsTable({
  requests,
}: Readonly<{ requests: ProviderRequestRow[] }>) {
  return (
    <LocalListTable
      rows={requests}
      columns={COLUMNS}
      searchText={(request) =>
        `${request.providerCode ?? ""} ${etiquetaTipoConsulta(request.requestType)} ${request.requestId}`
      }
      searchPlaceholder="Buscar por proveedor, consulta o solicitud…"
      searchTooltip="Recorre las últimas llamadas del período, que llegan todas con el tablero (son las más recientes, no una página): coincide con parte del proveedor, del tipo de consulta o del número de solicitud."
      filters={FILTERS}
      emptyTitle="No se llamó a ningún proveedor en este período."
      emptyFilteredTitle="Ninguna llamada coincide con la búsqueda."
    />
  );
}
