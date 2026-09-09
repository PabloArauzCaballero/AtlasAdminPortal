"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { GitBranch, ShieldAlert, ShieldOff, Waypoints } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";
import {
  Badge,
  BlockBadge,
  MethodBadge,
  RiskBadge,
} from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatDateTime } from "@/shared/lib/format";
import { FlowDetailDrawer } from "./flow-detail-drawer";
import { FlowsFindingsTable } from "./flows-findings-table";
import {
  useFlowImports,
  useFlowModules,
  useFlows,
  useFlowsSummary,
} from "./hooks";
import { groupCount } from "./services";
import { FLOW_CLIENTS, FLOW_RISKS, FLOW_SYSTEMS, type Flow } from "./types";

const option = (value: string) => ({ label: value, value });

export function FlowsPage() {
  // El gate envuelve a un componente aparte a propósito: si los hooks de datos
  // vivieran aquí, las queries saldrían antes de que el gate decidiera.
  return (
    <PermissionGate permissions={["systems.flows.read"]}>
      <AuthorizedFlowsPage />
    </PermissionGate>
  );
}

type Filters = {
  q: string;
  systemCode: string;
  module: string;
  kind: string;
  risk: string;
  verification: string;
  caller: string;
  tested: string;
  withFindings: string;
};
const EMPTY: Filters = {
  q: "",
  systemCode: "",
  module: "",
  kind: "",
  risk: "",
  verification: "",
  caller: "",
  tested: "",
  withFindings: "",
};

function AuthorizedFlowsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const selectedFlowId = searchParams.get("flow");

  // El flujo abierto vive en la URL (`?flow=flow_…`) para que QA pueda pegar el enlace en un bug.
  const openFlow = useCallback(
    (flowId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (flowId) params.set("flow", flowId);
      else params.delete("flow");
      router.replace(
        params.size ? `${pathname}?${params.toString()}` : pathname,
        { scroll: false },
      );
    },
    [pathname, router, searchParams],
  );

  const flows = useFlows({ page, limit: 20, ...filters });
  const summary = useFlowsSummary();
  const modules = useFlowModules();
  const imports = useFlowImports();

  const setFilter = (name: string, value: string) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  const columns = useMemo<ColumnDef<Flow>[]>(
    () => [
      {
        header: "Ruta",
        accessorKey: "path",
        cell: ({ row }) => (
          <button
            type="button"
            className="inline-flex items-center gap-2 text-left font-mono text-xs text-atlas-accent underline"
            onClick={() => openFlow(row.original.id)}
          >
            <MethodBadge method={row.original.httpMethod} />
            {row.original.path}
          </button>
        ),
      },
      {
        header: "Bloque",
        accessorKey: "systemCode",
        cell: ({ row }) => <BlockBadge value={row.original.systemCode} />,
      },
      { header: "Módulo", accessorKey: "module" },
      {
        header: "Riesgo",
        accessorKey: "risk",
        cell: ({ row }) => <RiskBadge value={row.original.risk} />,
      },
      {
        header: "Autorización",
        accessorKey: "isPublic",
        cell: ({ row }) => {
          const flow = row.original;
          if (flow.isPublic) return <Badge tone="warning">Pública</Badge>;
          if (flow.internalPermissions.length)
            return <Badge tone="info">Permiso interno</Badge>;
          if (flow.roles.length)
            return <Badge tone="default">{flow.roles.length} roles</Badge>;
          return <Badge tone="muted">Sólo JWT</Badge>;
        },
      },
      {
        header: "Callers",
        accessorKey: "callers",
        cell: ({ row }) =>
          row.original.callers.length ? (
            row.original.callers.join(", ")
          ) : (
            <span className="text-atlas-muted">—</span>
          ),
      },
      {
        header: "Señales",
        accessorKey: "findingsCount",
        cell: ({ row }) => {
          const flow = row.original;
          return (
            <span className="inline-flex items-center gap-1 text-xs">
              <span title="Test que nombra la ruta">
                {flow.testStatus === "TESTED" ? "T✓" : "T✗"}
              </span>
              <span title="En el contrato OpenAPI">
                {flow.contractStatus === "IN_CONTRACT"
                  ? "C✓"
                  : flow.contractStatus === "CODE_ONLY"
                    ? "C✗"
                    : "C—"}
              </span>
              {flow.findingsCount ? (
                <Badge tone="warning">{flow.findingsCount}</Badge>
              ) : null}
            </span>
          );
        },
      },
    ],
    [openFlow],
  );

  const moduleOptions = useMemo(() => {
    const names = new Set(
      (modules.data ?? [])
        .filter(
          (m) => !filters.systemCode || m.systemCode === filters.systemCode,
        )
        .map((m) => m.module),
    );
    return [...names].sort().map(option);
  }, [modules.data, filters.systemCode]);

  const lastImport = imports.data?.[0];
  const critical = groupCount(summary.data?.byRisk, "risk", "CRITICAL");
  const broken = groupCount(
    summary.data?.byVerification,
    "verification",
    "BROKEN",
  );
  const stale = groupCount(summary.data?.byFreshness, "freshness", "STALE");

  return (
    <>
      <PageHeader
        icon={Waypoints}
        eyebrow="Systems Ops"
        title="Flujos"
        description="Mapa derivado del código: qué puede hacer cada usuario, por qué endpoint, con qué autorización, y qué falta (contrato, tests, callers). Se regenera desde el artefacto de flows:derive; abrir un flujo nunca lo ejecuta."
        actions={
          lastImport ? (
            <span className="text-xs text-atlas-muted">
              Última carga: {lastImport.systemCode} @{" "}
              <span className="font-mono">
                {lastImport.analyzedCommit?.slice(0, 7) ?? "—"}
              </span>{" "}
              · {formatDateTime(lastImport.createdAt)}
            </span>
          ) : null
        }
      />
      <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Flujos"
          value={summary.data?.total ?? "—"}
          icon={GitBranch}
          hint="Una fila por operación HTTP de cada bloque"
        />
        <button
          type="button"
          className="text-left"
          onClick={() => setFilter("risk", "CRITICAL")}
        >
          <MetricCard
            label="Críticos"
            value={summary.data ? critical : "—"}
            tone="critical"
            hint="Escriben en identidad, crédito, dinero o borran"
          />
        </button>
        <button
          type="button"
          className="text-left"
          onClick={() => setFilter("verification", "BROKEN")}
        >
          <MetricCard
            label="Rotos"
            value={summary.data ? broken : "—"}
            tone={broken ? "critical" : "success"}
            hint="Una corrida contradijo el mapa"
          />
        </button>
        <MetricCard
          label="Desactualizados"
          value={summary.data ? stale : "—"}
          tone={stale ? "warning" : "default"}
          hint="Cambió código desde la última verificación"
        />
        <MetricCard
          label="Escrituras públicas"
          value={summary.data?.publicWrites ?? "—"}
          icon={ShieldOff}
          tone={summary.data?.publicWrites ? "warning" : "default"}
          hint="POST/PUT/PATCH/DELETE con @Public"
        />
        <MetricCard
          label="Críticos sin test"
          value={summary.data?.untestedCritical ?? "—"}
          icon={ShieldAlert}
          tone={summary.data?.untestedCritical ? "warning" : "success"}
          hint="Riesgo HIGH o CRITICAL sin test que nombre la ruta"
        />
      </div>
      <FilterBar
        search={filters.q}
        searchPlaceholder="Buscar por ruta, handler, módulo o slug…"
        onSearchChange={(value) => setFilter("q", value)}
        onFilterChange={setFilter}
        onClear={() => {
          setFilters(EMPTY);
          setPage(1);
        }}
        filters={[
          {
            name: "systemCode",
            label: "Bloque",
            value: filters.systemCode,
            options: FLOW_SYSTEMS.map(option),
          },
          {
            name: "module",
            label: "Módulo",
            value: filters.module,
            options: moduleOptions,
          },
          {
            name: "risk",
            label: "Riesgo",
            value: filters.risk,
            options: FLOW_RISKS.map(option),
          },
          {
            name: "caller",
            label: "Cliente",
            value: filters.caller,
            options: [...FLOW_CLIENTS, ...FLOW_SYSTEMS].map(option),
          },
          {
            name: "tested",
            label: "Tests",
            value: filters.tested,
            options: [
              { label: "Con test", value: "true" },
              { label: "Sin test", value: "false" },
            ],
          },
          {
            name: "withFindings",
            label: "Hallazgos",
            value: filters.withFindings,
            options: [
              { label: "Con hallazgos", value: "true" },
              { label: "Sin hallazgos", value: "false" },
            ],
          },
        ]}
      />
      {flows.isLoading ? <LoadingSkeleton rows={10} /> : null}
      {flows.error ? (
        <ErrorState
          description={
            isAtlasApiError(flows.error)
              ? flows.error.message
              : "No se pudieron cargar los flujos."
          }
          requestId={
            isAtlasApiError(flows.error) ? flows.error.requestId : undefined
          }
          onRetry={() => void flows.refetch()}
        />
      ) : null}
      {flows.data ? (
        <DataTable
          data={flows.data.items}
          columns={columns}
          meta={flows.data.meta}
          onPageChange={setPage}
          emptyTitle="No se encontraron flujos para los filtros seleccionados"
          emptyDescription={
            summary.data?.total
              ? "Prueba con otros filtros."
              : "Aún no se cargó ningún artefacto de flows:derive. Corre la derivación y carga el resultado con systems.flows.analyze."
          }
        />
      ) : null}
      <Card className="mt-6">
        <CardHeader>
          <SectionHeader
            title="Hallazgos"
            description="Lo que los detectores encontraron al cruzar código, contrato, clientes y tests. Los falsos positivos conocidos están documentados en la herramienta."
          />
        </CardHeader>
        <CardContent>
          <FlowsFindingsTable />
        </CardContent>
      </Card>
      {summary.error && !summary.isLoading ? (
        <div className="mt-4">
          <Button onClick={() => void summary.refetch()}>
            Reintentar resumen
          </Button>
        </div>
      ) : null}
      <FlowDetailDrawer
        flowId={selectedFlowId}
        onClose={() => openFlow(null)}
      />
    </>
  );
}
