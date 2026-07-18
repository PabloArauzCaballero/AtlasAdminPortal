"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useTestRuns } from "@/features/systems/hooks";
import type { TestRun } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Button } from "@/shared/components/ui/button";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

const statusOptions = [
  { label: "Queued", value: "QUEUED" },
  { label: "Running", value: "RUNNING" },
  { label: "Passed", value: "PASSED" },
  { label: "Failed", value: "FAILED" },
  { label: "Cancelled", value: "CANCELLED" },
];

export function TestRunsPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["systems.qa.read"]}>
      <AuthorizedTestRunsPage />
    </PermissionGate>
  );
}

function AuthorizedTestRunsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const runs = useTestRuns({ page, limit: 20, status });

  const columns = useMemo<ColumnDef<TestRun>[]>(
    () => [
      {
        header: "Run",
        accessorKey: "runId",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs font-semibold text-blue-700 underline"
            href={`/internal/qa/runs/${row.original.runId}`}
          >
            #{row.original.runId}
          </Link>
        ),
      },
      {
        header: "Suite",
        accessorKey: "suiteId",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs text-blue-700 underline"
            href={`/internal/qa/suites/${row.original.suiteId}`}
          >
            #{row.original.suiteId}
          </Link>
        ),
      },
      { header: "Ambiente", accessorKey: "environment" },
      {
        header: "Estado",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
      },
      {
        header: "Duración",
        accessorKey: "durationMs",
        cell: ({ row }) => `${formatNumber(row.original.durationMs)} ms`,
      },
      {
        header: "Inicio",
        accessorKey: "startedAt",
        cell: ({ row }) => formatDateTime(row.original.startedAt),
      },
      {
        header: "Fin",
        accessorKey: "finishedAt",
        cell: ({ row }) => formatDateTime(row.original.finishedAt),
      },
      {
        header: "Creado",
        accessorKey: "createdAt",
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        title="Runs QA registrados en backend"
        description="Historial dinámico desde `/systems/test-runs`. ¿Quieres ejecutar requests directos contra otra URL?"
        actions={
          <Link href="/internal/qa/lab">
            <Button>Abrir QA Live Lab</Button>
          </Link>
        }
      />
      <FilterBar
        search=""
        searchPlaceholder="Búsqueda por suite pendiente del servicio interno"
        onSearchChange={() => undefined}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value);
          setPage(1);
        }}
        onClear={() => {
          setStatus("");
          setPage(1);
        }}
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            options: statusOptions,
          },
        ]}
      />
      {runs.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {runs.error ? (
        <ErrorState
          description={
            isAtlasApiError(runs.error)
              ? runs.error.message
              : "No se pudo cargar ejecuciones QA."
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
    </>
  );
}
