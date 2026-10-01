"use client";

import {
  ENVIRONMENT_OPTIONS,
  STRESS_RUN_STATUS_OPTIONS,
} from "@/features/qa-console/qa-options";
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
import { Waves } from "lucide-react";
import { usePageSize } from "@/shared/lib/page-size";

const statusOptions = STRESS_RUN_STATUS_OPTIONS;
const environmentOptions = ENVIRONMENT_OPTIONS;

export function StressRunsPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["systems.stress.read"]}>
      <AuthorizedStressRunsPage />
    </PermissionGate>
  );
}

function AuthorizedStressRunsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [environment, setEnvironment] = useState("");
  const [selectedRun, setSelectedRun] = useState<StressRun | null>(null);
  const runs = useStressRuns({
    page,
    limit: usePageSize(20),
    q,
    status,
    environment,
  });
  const columns = useMemo<ColumnDef<StressRun>[]>(
    () => [
      {
        header: "Corrida",
        accessorKey: "jobRunId",
        cell: ({ row }) => (
          <span className="font-mono text-xs">#{row.original.jobRunId}</span>
        ),
      },
      {
        header: "Proceso",
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
            Ver datos
          </Button>
        ),
      },
    ],
    [],
  );
  return (
    <>
      <PageHeader
        icon={Waves}
        title="Historial de corridas de carga"
        description="Corridas de carga encoladas desde un perfil. Se guardan con las cabeceras sensibles tapadas y producción está bloqueada para carga."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código de perfil o n.º de corrida…"
        searchTooltip="Busca el texto dentro del código del perfil (p. ej. LOANS) o, si escribes un número, la corrida con ese número."
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
              "Dónde está la corrida en la cola: en espera, ejecutándose, terminada o fallida.",
            value: status,
            options: statusOptions,
          },
          {
            name: "environment",
            label: "Ambiente",
            tooltip: "Ambiente con el que se encoló la corrida.",
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
              : "No se pudo cargar el historial de corridas de carga."
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
        title="Detalle de la corrida de carga"
        onClose={() => setSelectedRun(null)}
      >
        {selectedRun ? <JsonViewer value={selectedRun} /> : null}
      </DrawerPanel>
    </>
  );
}
