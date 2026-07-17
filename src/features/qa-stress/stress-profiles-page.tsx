"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useStressMatrix, useStressProfiles } from "@/features/systems/hooks";
import type { StressMatrixItem, StressProfile } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { DrawerPanel } from "@/shared/components/ui/drawer-panel";
import { StatusBadge } from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { StressProfileForm } from "./stress-profile-form";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import { formatBoolean, formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";

const statusOptions = ["ACTIVE", "DISABLED", "NEEDS_REVIEW", "DEPRECATED"].map(
  (value) => ({ label: value, value }),
);

export function StressProfilesPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const profiles = useStressProfiles({ page, limit: 20, q, status });
  const matrix = useStressMatrix({ page: 1, limit: 10, q });

  const profileColumns = useMemo<ColumnDef<StressProfile>[]>(
    () => [
      {
        header: "Perfil",
        accessorKey: "code",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs text-blue-700 hover:underline"
            href={`/internal/qa/stress/${row.original.profileId}`}
          >
            {row.original.code}
          </Link>
        ),
      },
      { header: "Nombre", accessorKey: "name" },
      {
        header: "Endpoint",
        accessorKey: "endpointId",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs text-blue-700 hover:underline"
            href={`/internal/systems/endpoints/${row.original.endpointId}`}
          >
            #{row.original.endpointId}
          </Link>
        ),
      },
      {
        header: "RPS",
        accessorKey: "targetRps",
        cell: ({ row }) => formatNumber(row.original.targetRps),
      },
      {
        header: "Duración",
        accessorKey: "durationSeconds",
        cell: ({ row }) => `${formatNumber(row.original.durationSeconds)} s`,
      },
      {
        header: "Concurrencia",
        accessorKey: "concurrency",
        cell: ({ row }) => formatNumber(row.original.concurrency),
      },
      {
        header: "Aprobación",
        accessorKey: "requiresApproval",
        cell: ({ row }) => formatBoolean(row.original.requiresApproval),
      },
      {
        header: "Estado",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
      },
    ],
    [],
  );

  const matrixColumns = useMemo<ColumnDef<StressMatrixItem>[]>(
    () => [
      {
        header: "Endpoint",
        accessorKey: "endpoint.fullPath",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs text-blue-700 hover:underline"
            href={`/internal/systems/endpoints/${row.original.endpoint.endpointId}`}
          >
            {row.original.endpoint.fullPath}
          </Link>
        ),
      },
      { header: "Módulo", accessorKey: "endpoint.module" },
      {
        header: "Requiere stress",
        accessorKey: "endpoint.requiresStressTest",
        cell: ({ row }) =>
          formatBoolean(row.original.endpoint.requiresStressTest),
      },
      {
        header: "Perfil habilitado",
        accessorKey: "hasEnabledProfile",
        cell: ({ row }) => formatBoolean(row.original.hasEnabledProfile),
      },
      {
        header: "Perfiles",
        accessorKey: "profiles",
        cell: ({ row }) => formatNumber(row.original.profiles.length),
      },
    ],
    [],
  );

  return (
    <PermissionGate permissions={["systems.stress.read"]}>
      <PageHeader
        eyebrow="QA Stress"
        title="Stress backend-driven"
        description="Administración de perfiles de stress y matriz de endpoints que requieren carga. Producción queda bloqueada por el servicio interno para stress runs. ¿Quieres ejecutar requests directos contra otra URL?"
        actions={
          <div className="flex gap-2">
            {/* No existe un permiso "systems.stress.manage" en el catálogo de
                /internal/permissions; el backend restringe el upsert a
                system_admin/platform_admin/qa_engineer/devops. Se usa el
                permiso de ejecución, que es el más cercano, y el backend
                responde 403 si el rol no alcanza. */}
            <PermissionGate
              permissions={["systems.stress.execute"]}
              fallback={null}
            >
              <Button variant="primary" onClick={() => setCreating(true)}>
                Nuevo perfil
              </Button>
            </PermissionGate>
            <Link href="/internal/qa/lab">
              <Button>Abrir QA Live Lab</Button>
            </Link>
          </div>
        }
      />
      <DrawerPanel
        open={creating}
        title="Nuevo perfil de stress"
        onClose={() => setCreating(false)}
      >
        <StressProfileForm onSaved={() => setCreating(false)} />
      </DrawerPanel>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar perfil o endpoint…"
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
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
      {profiles.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {profiles.error ? (
        <ErrorState
          description={
            isAtlasApiError(profiles.error)
              ? profiles.error.message
              : "No se pudo cargar perfiles de estrés."
          }
          requestId={
            isAtlasApiError(profiles.error)
              ? profiles.error.requestId
              : undefined
          }
          onRetry={() => void profiles.refetch()}
        />
      ) : null}
      {profiles.data ? (
        <DataTable
          data={profiles.data.items}
          columns={profileColumns}
          meta={profiles.data.meta}
          onPageChange={setPage}
        />
      ) : null}
      <Card className="mt-6">
        <CardHeader>
          <SectionHeader
            title="Matriz de cobertura"
            description="Endpoints que requieren stress test y cobertura de perfil habilitado."
            className="mb-0"
          />
        </CardHeader>
        <CardContent>
          {matrix.isLoading ? <LoadingSkeleton rows={5} /> : null}
          {matrix.error ? (
            <ErrorState
              description={
                isAtlasApiError(matrix.error)
                  ? matrix.error.message
                  : "No se pudo cargar matriz de stress."
              }
              requestId={
                isAtlasApiError(matrix.error)
                  ? matrix.error.requestId
                  : undefined
              }
            />
          ) : null}
          {matrix.data ? (
            <DataTable
              data={matrix.data.items}
              columns={matrixColumns}
              meta={matrix.data.meta}
            />
          ) : null}
        </CardContent>
      </Card>
    </PermissionGate>
  );
}
