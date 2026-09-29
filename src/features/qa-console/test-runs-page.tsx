"use client";

import { ENVIRONMENT_OPTIONS, RUN_STATUS_OPTIONS } from "./qa-options";
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
import { TutorialLaunchButton } from "@/features/qa-tutorials/tutorial-launch-button";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { optionLabel } from "@/shared/lib/options";
import { isAtlasApiError } from "@/shared/api/errors";
import { FlaskConical } from "lucide-react";

const statusOptions = RUN_STATUS_OPTIONS;

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
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [environment, setEnvironment] = useState("");
  const runs = useTestRuns({ page, limit: 20, q, status, environment });

  const columns = useMemo<ColumnDef<TestRun>[]>(
    () => [
      {
        header: "Corrida",
        accessorKey: "runId",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs font-semibold text-atlas-accent underline"
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
            className="font-mono text-xs text-atlas-accent underline"
            href={`/internal/qa/suites/${row.original.suiteId}`}
          >
            #{row.original.suiteId}
          </Link>
        ),
      },
      {
        header: "Ambiente",
        accessorKey: "environment",
        cell: ({ row }) =>
          optionLabel(ENVIRONMENT_OPTIONS, row.original.environment),
      },
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
        icon={FlaskConical}
        title="Corridas de las suites QA"
        description="Cada ejecución de una suite de pruebas: contra qué ambiente, cuánto tardó y si pasó. ¿Quieres probar peticiones sueltas contra otra URL?"
        actions={
          <div className="flex gap-2">
            <TutorialLaunchButton tutorialId="qa-runs-interpret" />
            <Link href="/internal/qa/lab">
              <Button>Abrir QA Live Lab</Button>
            </Link>
          </div>
        }
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por suite o n.º de corrida…"
        searchTooltip="Busca el texto en el código o el nombre de la suite; si escribes un número, también la corrida con ese número."
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value);
          if (name === "environment") setEnvironment(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setStatus("");
          setEnvironment("");
          setPage(1);
        }}
        filters={[
          {
            name: "status",
            label: "Estado",
            tooltip:
              "Resultado de la corrida; FAILED es lo que conviene revisar primero.",
            value: status,
            options: statusOptions,
          },
          {
            name: "environment",
            label: "Ambiente",
            tooltip: "Entorno contra el que se ejecutó la suite.",
            value: environment,
            options: ENVIRONMENT_OPTIONS,
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
        <div data-tutorial-id="qa-runs-table">
          <DataTable
            data={runs.data.items}
            columns={columns}
            meta={runs.data.meta}
            onPageChange={setPage}
          />
        </div>
      ) : null}
    </>
  );
}
