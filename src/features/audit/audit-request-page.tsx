"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useActionLogsByRequest } from "@/features/systems/hooks";
import type { ActionLog } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import {
  MethodBadge,
  ModuleBadge,
  PiiBadge,
  RiskBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

export function AuditRequestPage({
  requestId,
}: Readonly<{ requestId: string }>) {
  const logs = useActionLogsByRequest(requestId);
  const first = logs.data?.[0];

  const columns = useMemo<ColumnDef<ActionLog>[]>(
    () => [
      {
        header: "Fecha",
        accessorKey: "occurredAt",
        cell: ({ row }) => formatDateTime(row.original.occurredAt),
      },
      {
        header: "Método",
        accessorKey: "method",
        cell: ({ row }) => <MethodBadge method={row.original.method} />,
      },
      {
        header: "Ruta",
        accessorKey: "routeTemplate",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.routeTemplate ??
              row.original.resolvedUrlSanitized ??
              "—"}
          </span>
        ),
      },
      {
        header: "Módulo",
        accessorKey: "module",
        cell: ({ row }) => <ModuleBadge value={row.original.module} />,
      },
      { header: "Acción", accessorKey: "actionName" },
      {
        header: "HTTP",
        accessorKey: "responseStatusCode",
        cell: ({ row }) => (
          <StatusBadge
            value={
              row.original.responseStatusCode
                ? String(row.original.responseStatusCode)
                : null
            }
          />
        ),
      },
      {
        header: "Duración",
        accessorKey: "durationMs",
        cell: ({ row }) => `${formatNumber(row.original.durationMs)} ms`,
      },
      {
        header: "Riesgo",
        accessorKey: "riskLevel",
        cell: ({ row }) => <RiskBadge value={row.original.riskLevel} />,
      },
      {
        header: "PII",
        accessorKey: "containsPii",
        cell: ({ row }) => <PiiBadge value={row.original.containsPii} />,
      },
    ],
    [],
  );

  return (
    <PermissionGate permissions={["audit.events.read"]}>
      <PageHeader
        eyebrow="Auditoría"
        title={`Request ${requestId}`}
        description="Eventos relacionados a un request específico."
      />
      {logs.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {logs.error ? (
        <ErrorState
          description={
            isAtlasApiError(logs.error)
              ? logs.error.message
              : "No se pudo cargar request."
          }
          requestId={
            isAtlasApiError(logs.error) ? logs.error.requestId : undefined
          }
          onRetry={() => void logs.refetch()}
        />
      ) : null}
      {first ? (
        <div className="mb-6">
          <KeyValueGrid
            items={[
              {
                label: "Correlation ID",
                value: first.correlationId,
                mono: true,
              },
              { label: "Actor", value: first.actorRole ?? first.actorType },
              {
                label: "Endpoint catalogado",
                value: first.endpointCatalogId
                  ? `#${first.endpointCatalogId}`
                  : "—",
                mono: true,
              },
              { label: "IP", value: first.ipAddress, mono: true },
              {
                label: "Target",
                value: `${first.targetType ?? "—"} ${first.targetId ?? ""}`,
              },
              {
                label: "Cliente",
                value: first.customerId ? `#${first.customerId}` : "—",
                mono: true,
              },
            ]}
          />
        </div>
      ) : null}
      {logs.data ? <DataTable data={logs.data} columns={columns} /> : null}
    </PermissionGate>
  );
}
