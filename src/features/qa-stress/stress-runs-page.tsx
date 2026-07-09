"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useStressRuns } from "@/features/systems/hooks";
import type { StressRun } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { StatusBadge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { formatDateTime } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

const statusOptions = [
  "QUEUED",
  "RUNNING",
  "PASSED",
  "FAILED",
  "CANCELLED",
].map((value) => ({ label: value, value }));
const environmentOptions = ["LOCAL", "STAGING", "PRODUCTION_READONLY"].map(
  (value) => ({ label: value, value }),
);

export function StressRunsPage() {
  const [page, setPage] = useState(1);
  const [suiteId, setSuiteId] = useState("");
  const [status, setStatus] = useState("");
  const [environment, setEnvironment] = useState("");
  const [selectedRun, setSelectedRun] = useState<StressRun | null>(null);
  const runs = useStressRuns({ page, limit: 20, suiteId, status, environment });
  const columns = useMemo<ColumnDef<StressRun>[]>(
    () => [
      {
        header: "Run",
        accessorKey: "jobRunId",
        cell: ({ row }) => (
          <span className="font-mono text-xs">#{row.original.jobRunId}</span>
        ),
      },
      {
        header: "Job",
        accessorKey: "jobCode",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.jobCode}</span>
        ),
      },
      {
        header: "Estado",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
      },
      {
        header: "Creado",
        accessorKey: "createdAt",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        header: "Inicio",
        accessorKey: "startedAt",
        cell: ({ row }) => formatDateTime(row.original.startedAt),
      },
      {
        header: "Fin",
        accessorKey: "completedAt",
        cell: ({ row }) => formatDateTime(row.original.completedAt),
      },
      {
        header: "Actor",
        accessorKey: "triggeredById",
        cell: ({ row }) => row.original.triggeredById ?? "—",
      },
      {
        header: "Acciones",
        id: "actions",
        cell: ({ row }) => (
          <Button
            className="h-8 px-2 text-xs"
            onClick={() => setSelectedRun(row.original)}
          >
            Ver JSON
          </Button>
        ),
      },
    ],
    [],
  );
  return (
    <PermissionGate permissions={["systems.stress.read"]}>
      <PageHeader
        title="Historial de stress runs"
        description="Runs encolados como jobs internos. El servicio interno registra payload sanitizado y bloquea producción para stress."
      />
      <FilterBar
        search={suiteId}
        searchPlaceholder="Filtrar por suiteId/perfil si aplica…"
        onSearchChange={(value) => {
          setSuiteId(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value);
          if (name === "environment") setEnvironment(value);
          setPage(1);
        }}
        onClear={() => {
          setSuiteId("");
          setStatus("");
          setEnvironment("");
          setPage(1);
        }}
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            options: statusOptions,
          },
          {
            name: "environment",
            label: "Ambiente",
            value: environment,
            options: environmentOptions,
          },
        ]}
      />
      {runs.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {runs.error ? (
        <ErrorState
          description={
            isAtlasApiError(runs.error)
              ? runs.error.message
              : "No se pudo cargar stress runs."
          }
          requestId={
            isAtlasApiError(runs.error) ? runs.error.requestId : undefined
          }
          onRetry={() => void runs.refetch()}
        />
      ) : null}
      {runs.data ? (
        <DataTable
          data={runs.data.items}
          columns={columns}
          meta={runs.data.meta}
          onPageChange={setPage}
        />
      ) : null}
      <DrawerPanel
        open={Boolean(selectedRun)}
        title="Detalle stress run"
        onClose={() => setSelectedRun(null)}
      >
        {selectedRun ? <JsonViewer value={selectedRun} /> : null}
      </DrawerPanel>
    </PermissionGate>
  );
}
