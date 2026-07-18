"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useActionLogs } from "@/features/systems/hooks";
import type { ActionLog } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import {
  MethodBadge,
  ModuleBadge,
  PiiBadge,
  RiskBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { MongoLogsSection } from "./mongo-logs-section";

const tabs = ["Terminal backend", "Auditoría SQL"];

const methodOptions = ["GET", "POST", "PUT", "PATCH", "DELETE"].map(
  (value) => ({ label: value, value }),
);
const riskOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((value) => ({
  label: value,
  value,
}));

export function AuditPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["audit.events.read"]}>
      <AuthorizedAuditPage />
    </PermissionGate>
  );
}

function AuthorizedAuditPage() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [page, setPage] = useState(1);
  const [requestId, setRequestId] = useState("");
  const [method, setMethod] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const logs = useActionLogs({ page, limit: 20, requestId, method, riskLevel });

  const columns = useMemo<ColumnDef<ActionLog>[]>(
    () => [
      {
        header: "Fecha",
        accessorKey: "occurredAt",
        cell: ({ row }) => formatDateTime(row.original.occurredAt),
      },
      {
        header: "Request ID",
        accessorKey: "requestId",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs text-blue-700 underline"
            href={`/internal/audit/request/${encodeURIComponent(row.original.requestId)}`}
          >
            {row.original.requestId}
          </Link>
        ),
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
      {
        header: "Actor",
        accessorKey: "actorRole",
        cell: ({ row }) =>
          row.original.actorRole ?? row.original.actorType ?? "—",
      },
      {
        header: "Status",
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
    <>
      <PageHeader
        title="Terminal y auditoría del backend"
        description="Eventos registrados por Systems Ops desde `/systems/action-logs`, más el tail crudo de `Archivo.log` sincronizado a MongoDB."
      />
      <BusinessContextNote>
        Cuando algo sale mal para un cliente — un pago rechazado, una decisión
        de riesgo incorrecta, un dato que cambió sin explicación — alguien
        necesita reconstruir exactamente qué pasó, cuándo y quién lo hizo. Esta
        auditoría existe para eso: es el registro forense de la plataforma.
      </BusinessContextNote>
      <DetailTabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      {activeTab === "Terminal backend" ? <MongoLogsSection /> : null}
      {activeTab === "Auditoría SQL" ? (
        <>
          <FilterBar
            search={requestId}
            searchPlaceholder="Filtrar por Request ID…"
            onSearchChange={(value) => {
              setRequestId(value);
              setPage(1);
            }}
            onFilterChange={(name, value) => {
              if (name === "method") setMethod(value);
              if (name === "riskLevel") setRiskLevel(value);
              setPage(1);
            }}
            onClear={() => {
              setRequestId("");
              setMethod("");
              setRiskLevel("");
              setPage(1);
            }}
            filters={[
              {
                name: "method",
                label: "Método",
                value: method,
                options: methodOptions,
              },
              {
                name: "riskLevel",
                label: "Riesgo",
                value: riskLevel,
                options: riskOptions,
              },
            ]}
          />
          {logs.isLoading ? <LoadingSkeleton rows={8} /> : null}
          {logs.error ? (
            <ErrorState
              description={
                isAtlasApiError(logs.error)
                  ? logs.error.message
                  : "No se pudo cargar auditoría."
              }
              requestId={
                isAtlasApiError(logs.error) ? logs.error.requestId : undefined
              }
              onRetry={() => void logs.refetch()}
            />
          ) : null}
          {logs.data ? (
            <DataTable
              data={logs.data.items}
              columns={columns}
              meta={logs.data.meta}
              onPageChange={setPage}
            />
          ) : null}
        </>
      ) : null}
    </>
  );
}
