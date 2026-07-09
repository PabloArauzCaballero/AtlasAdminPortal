"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import { useTestRun } from "@/features/systems/hooks";
import type { TestStepRun } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { KeyValueGrid } from "@/shared/components/data-display/key-value";
import { Card, CardContent } from "@/shared/components/ui/card";
import { JsonViewer } from "@/shared/components/ui/json-viewer";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

export function TestRunDetailPage({ runId }: Readonly<{ runId: string }>) {
  const run = useTestRun(runId);
  const columns = useMemo<ColumnDef<TestStepRun>[]>(
    () => [
      {
        header: "Step run",
        accessorKey: "stepRunId",
        cell: ({ row }) => (
          <span className="font-mono text-xs">#{row.original.stepRunId}</span>
        ),
      },
      {
        header: "Step",
        accessorKey: "stepId",
        cell: ({ row }) => (
          <span className="font-mono text-xs">#{row.original.stepId}</span>
        ),
      },
      {
        header: "Estado",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
      },
      { header: "HTTP", accessorKey: "statusCode" },
      {
        header: "Duración",
        accessorKey: "durationMs",
        cell: ({ row }) => `${formatNumber(row.original.durationMs)} ms`,
      },
      {
        header: "Error",
        accessorKey: "errorMessage",
        cell: ({ row }) => (
          <span className="text-xs text-red-700">
            {row.original.errorMessage ?? "—"}
          </span>
        ),
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
    <PermissionGate permissions={["systems.qa.read"]}>
      {run.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {run.error ? (
        <ErrorState
          description={
            isAtlasApiError(run.error)
              ? run.error.message
              : "No se pudo cargar la ejecución."
          }
          requestId={
            isAtlasApiError(run.error) ? run.error.requestId : undefined
          }
          onRetry={() => void run.refetch()}
        />
      ) : null}
      {run.data ? (
        <>
          <PageHeader
            eyebrow={`Run #${run.data.run.runId}`}
            title={`Ejecución QA ${run.data.run.status}`}
            description={`Ambiente: ${run.data.run.environment}`}
            actions={<StatusBadge value={run.data.run.status} />}
          />
          <div className="space-y-6">
            <KeyValueGrid
              items={[
                {
                  label: "Suite",
                  value: `#${run.data.run.suiteId}`,
                  mono: true,
                },
                { label: "Ambiente", value: run.data.run.environment },
                { label: "Disparado por", value: run.data.run.triggeredBy },
                {
                  label: "Duración",
                  value: `${formatNumber(run.data.run.durationMs)} ms`,
                },
                {
                  label: "Inicio",
                  value: formatDateTime(run.data.run.startedAt),
                },
                {
                  label: "Fin",
                  value: formatDateTime(run.data.run.finishedAt),
                },
              ]}
            />
            <Card>
              <CardContent>
                <JsonViewer
                  title="Resumen"
                  value={run.data.run.summary ?? {}}
                />
              </CardContent>
            </Card>
            <section>
              <SectionHeader title="Steps ejecutados" />
              <DataTable data={run.data.steps} columns={columns} />
            </section>
          </div>
        </>
      ) : null}
    </PermissionGate>
  );
}
