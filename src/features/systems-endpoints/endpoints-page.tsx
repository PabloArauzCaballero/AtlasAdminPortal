"use client";

import { ExportDownloadButton } from "@/features/data-exports/export-download-button";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePlatformBlocks, useEndpoints } from "@/features/systems/hooks";
import type { EndpointItem } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import {
  BlockBadge,
  MethodBadge,
  ModuleBadge,
  PiiBadge,
  ReviewStatusBadge,
  RiskBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { PageHeader } from "@/shared/components/layout/page-header";
import { formatBoolean, formatDateTime } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { Route } from "lucide-react";
import { reviewOptions, riskOptions } from "./endpoint-options";

export function EndpointsPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de
  // datos vivieran aquí, las queries saldrían en el render antes de que el
  // gate decidiera, y un usuario sin permiso dispararía igual las peticiones.
  return (
    <PermissionGate permissions={["systems.endpoints.read"]}>
      <AuthorizedEndpointsPage />
    </PermissionGate>
  );
}

function AuthorizedEndpointsPage() {
  const searchParams = useSearchParams();
  const initialQ = searchParams.get("q") ?? "";
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(initialQ);
  const [riskLevel, setRiskLevel] = useState("");
  const [reviewStatus, setReviewStatus] = useState("");
  // Bloque, y ya no «backend». El filtro anterior derivaba sus opciones de los 20 endpoints de la
  // página visible, así que sólo ofrecía filtrar por lo que ya se estaba viendo — y como todo venía
  // de Atlas Backend, tenía una sola opción. El bloque llega de `/systems/blocks`, que enumera los
  // tres siempre, aunque alguno todavía no aporte ninguna ruta.
  const [block, setBlock] = useState(searchParams.get("block") ?? "");
  const blocks = usePlatformBlocks();
  const query = { page, limit: 20, q, riskLevel, reviewStatus, block };
  const endpoints = useEndpoints(query);
  const blockOptions = useMemo(
    () =>
      (blocks.data ?? []).map((item) => ({
        label: `${item.name} (${item.endpoints})`,
        value: item.systemCode,
        description: `Sólo las rutas del bloque ${item.name}: ${item.endpoints} en el catálogo.`,
      })),
    [blocks.data],
  );

  const columns = useMemo<ColumnDef<EndpointItem>[]>(
    () => [
      {
        header: "Bloque",
        accessorKey: "systemCode",
        cell: ({ row }) => <BlockBadge value={row.original.systemCode} />,
      },
      {
        header: "Método",
        accessorKey: "method",
        cell: ({ row }) => <MethodBadge method={row.original.method} />,
      },
      {
        header: "Ruta",
        accessorKey: "fullPath",
        cell: ({ row }) => (
          <div>
            <Link
              className="font-mono text-xs font-semibold text-atlas-accent underline"
              href={`/internal/systems/endpoints/${row.original.endpointId}`}
            >
              {row.original.fullPath}
            </Link>
            <p className="mt-1 text-xs text-atlas-muted">
              {row.original.routeName ?? row.original.handlerName}
            </p>
          </div>
        ),
      },
      {
        header: "Módulo",
        accessorKey: "module",
        cell: ({ row }) => <ModuleBadge value={row.original.module} />,
      },
      {
        header: "Servicio",
        accessorKey: "backendService",
        cell: ({ row }) => (
          <span className="rounded-full border border-atlas-border bg-atlas-soft px-2 py-0.5 font-mono text-[11px] text-atlas-muted">
            {row.original.backendService ?? "atlas-backend"}
          </span>
        ),
      },
      {
        header: "Pruebas",
        cell: ({ row }) => (
          <Link
            className="text-xs font-semibold text-atlas-accent underline"
            href={`/internal/qa/lab?endpointId=${row.original.endpointId}`}
          >
            Laboratorio
          </Link>
        ),
      },
      {
        header: "Riesgo",
        accessorKey: "riskLevel",
        cell: ({ row }) => <RiskBadge value={row.original.riskLevel} />,
      },
      {
        header: "Datos personales",
        accessorKey: "containsPii",
        cell: ({ row }) => <PiiBadge value={row.original.containsPii} />,
      },
      {
        header: "Pide sesión",
        accessorKey: "requiresAuth",
        cell: ({ row }) => formatBoolean(row.original.requiresAuth),
      },
      {
        header: "Se prueba aquí",
        accessorKey: "isTestableFromPortal",
        cell: ({ row }) => formatBoolean(row.original.isTestableFromPortal),
      },
      {
        header: "Prueba de carga",
        accessorKey: "requiresStressTest",
        cell: ({ row }) => formatBoolean(row.original.requiresStressTest),
      },
      {
        header: "Revisión",
        accessorKey: "reviewStatus",
        cell: ({ row }) => (
          <ReviewStatusBadge value={row.original.reviewStatus} />
        ),
      },
      {
        header: "Estado",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
      },
      {
        header: "Actualizado",
        accessorKey: "updatedAt",
        cell: ({ row }) => (
          <span className="text-xs">
            {formatDateTime(row.original.updatedAt)}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <PageHeader
        icon={Route}
        title="Catálogo de operaciones"
        description="Las operaciones de todos los sistemas de Atlas, tal como están registradas."
        actions={
          <ExportDownloadButton
            downloadUrl="/api/v1/systems/endpoints"
            fileName="catalogo-de-operaciones"
          />
        }
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por ruta, módulo, propósito o nombre…"
        searchTooltip="Busca en el servidor, sin distinguir mayúsculas, en el código, la ruta, el nombre, el propósito, el módulo y el nombre interno."
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "riskLevel") setRiskLevel(value);
          if (name === "reviewStatus") setReviewStatus(value);
          if (name === "block") setBlock(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setRiskLevel("");
          setReviewStatus("");
          setBlock("");
          setPage(1);
        }}
        filters={[
          {
            name: "block",
            label: "Bloque",
            value: block,
            tooltip:
              "Deja sólo las rutas de un bloque de Atlas. Los bloques y sus cuentas salen del servidor, aunque alguno aún no aporte rutas.",
            options: blockOptions,
          },
          {
            name: "riskLevel",
            label: "Riesgo",
            value: riskLevel,
            tooltip:
              "Deja sólo las rutas con ese nivel de riesgo, según lo que hacen con los datos.",
            options: riskOptions,
          },
          {
            name: "reviewStatus",
            label: "Revisión",
            value: reviewStatus,
            tooltip:
              "Deja sólo las rutas cuya ficha está en ese estado de revisión humana.",
            options: reviewOptions,
          },
        ]}
      />
      {endpoints.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {endpoints.error ? (
        <ErrorState
          description={
            isAtlasApiError(endpoints.error)
              ? endpoints.error.message
              : "No se pudo cargar el catálogo de operaciones."
          }
          requestId={
            isAtlasApiError(endpoints.error)
              ? endpoints.error.requestId
              : undefined
          }
          onRetry={() => void endpoints.refetch()}
        />
      ) : null}
      {endpoints.data ? (
        <DataTable
          data={endpoints.data.items}
          columns={columns}
          meta={endpoints.data.meta}
          onPageChange={setPage}
          emptyTitle={
            q || riskLevel || reviewStatus || block
              ? "Ninguna ruta coincide con la búsqueda o los filtros."
              : "No hay rutas en el catálogo."
          }
          emptyDescription="Quita el texto o los filtros, o carga el catálogo desde Salud de la red."
        />
      ) : null}
    </>
  );
}
