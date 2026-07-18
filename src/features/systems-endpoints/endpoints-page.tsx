"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useEndpoints } from "@/features/systems/hooks";
import type { EndpointItem } from "@/features/systems/types";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import {
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
import { uniqueTextOptions } from "@/shared/lib/options";
import { isAtlasApiError } from "@/shared/api/errors";

const riskOptions = [
  { label: "Riesgo bajo", value: "LOW" },
  { label: "Riesgo medio", value: "MEDIUM" },
  { label: "Riesgo alto", value: "HIGH" },
  { label: "Riesgo crítico", value: "CRITICAL" },
];

const reviewOptions = [
  { label: "Auto detectado", value: "AUTO_DETECTED" },
  { label: "Necesita revisión", value: "NEEDS_REVIEW" },
  { label: "Aprobado", value: "APPROVED" },
  { label: "Rechazado", value: "REJECTED" },
];

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
  const [backendService, setBackendService] = useState("");
  const query = { page, limit: 20, q, riskLevel, reviewStatus, backendService };
  const endpoints = useEndpoints(query);
  const backendOptions = useMemo(
    () =>
      uniqueTextOptions(
        (endpoints.data?.items ?? []).map(
          (item) => item.backendService ?? "atlas-backend",
        ),
      ),
    [endpoints.data?.items],
  );

  const columns = useMemo<ColumnDef<EndpointItem>[]>(
    () => [
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
              className="font-mono text-xs font-semibold text-blue-700 underline"
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
        header: "Backend",
        accessorKey: "backendService",
        cell: ({ row }) => (
          <span className="rounded-full border border-atlas-border bg-atlas-soft px-2 py-0.5 font-mono text-[11px] text-atlas-muted">
            {row.original.backendService ?? "atlas-backend"}
          </span>
        ),
      },
      {
        header: "QA",
        cell: ({ row }) => (
          <Link
            className="text-xs font-semibold text-blue-700 underline"
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
        header: "PII",
        accessorKey: "containsPii",
        cell: ({ row }) => <PiiBadge value={row.original.containsPii} />,
      },
      {
        header: "Auth",
        accessorKey: "requiresAuth",
        cell: ({ row }) => formatBoolean(row.original.requiresAuth),
      },
      {
        header: "Testable",
        accessorKey: "isTestableFromPortal",
        cell: ({ row }) => formatBoolean(row.original.isTestableFromPortal),
      },
      {
        header: "Stress",
        accessorKey: "requiresStressTest",
        cell: ({ row }) => formatBoolean(row.original.requiresStressTest),
      },
      {
        header: "Review",
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
        title="Catálogo de endpoints"
        description="Listado dinámico desde `/systems/endpoints`. No se usan rutas hardcodeadas como datos finales."
      />
      <FilterBar
        search={q}
        searchPlaceholder="Buscar por ruta, módulo o propósito…"
        onSearchChange={(value) => {
          setQ(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "riskLevel") setRiskLevel(value);
          if (name === "reviewStatus") setReviewStatus(value);
          if (name === "backendService") setBackendService(value);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setRiskLevel("");
          setReviewStatus("");
          setBackendService("");
          setPage(1);
        }}
        filters={[
          {
            name: "backendService",
            label: "Backend",
            value: backendService,
            options: backendOptions,
          },
          {
            name: "riskLevel",
            label: "Riesgo",
            value: riskLevel,
            options: riskOptions,
          },
          {
            name: "reviewStatus",
            label: "Revisión",
            value: reviewStatus,
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
              : "No se pudo cargar endpoints."
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
        />
      ) : null}
    </>
  );
}
