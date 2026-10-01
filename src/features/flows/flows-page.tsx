"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Waypoints, Workflow } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";

import {
  PageHeader,
  SectionHeader,
} from "@/shared/components/layout/page-header";

import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { FlowDetailDrawer } from "./flow-detail-drawer";
import { FlowsFindingsTable } from "./flows-findings-table";
import { FlowsHeaderActions } from "./flows-header-actions";
import {
  useFlowImports,
  useFlowModules,
  useFlows,
  useFlowsSummary,
  useVerifyFlowsMutation,
} from "./hooks";
import { groupCount } from "./services";
import type { Flow } from "./types";
import {
  CLIENT_OPTIONS,
  FRESHNESS_OPTIONS,
  RISK_OPTIONS,
  SYSTEM_OPTIONS,
  TESTED_OPTIONS,
  VERIFICATION_OPTIONS,
  WITH_FINDINGS_OPTIONS,
} from "./filter-options";
import { buildFlowColumns } from "./flows-columns";
import { FlowsSummaryTiles } from "./flows-summary-tiles";
import { FlowCatalogNotLoaded } from "./flow-catalog-not-loaded";
import { usePageSize } from "@/shared/lib/page-size";

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
  freshness: string;
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
  freshness: "",
  caller: "",
  tested: "",
  withFindings: "",
};

function AuthorizedFlowsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  // `?q=` permite llegar ya filtrado desde otra ficha (p. ej. «Ver en el mapa de rutas» de un endpoint).
  const [filters, setFilters] = useState<Filters>(() => ({
    ...EMPTY,
    q: searchParams.get("q") ?? "",
  }));
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

  const flows = useFlows({ page, limit: usePageSize(20), ...filters });
  const summary = useFlowsSummary();
  const modules = useFlowModules();
  const imports = useFlowImports();
  const verify = useVerifyFlowsMutation();

  const setFilter = (name: string, value: string) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  const columns = useMemo<ColumnDef<Flow>[]>(
    () => buildFlowColumns(openFlow),
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
        eyebrow="Sistemas"
        title="Mapa de rutas"
        description="Una fila por operación de la plataforma, sacada del código: qué puede hacer cada usuario, con qué autorización, y qué le falta (contrato, pruebas, quién la llama). Abrir una ficha nunca ejecuta la operación. Los procesos de negocio que usan estas operaciones están en «Procesos»."
        actions={<FlowsHeaderActions verify={verify} lastImport={lastImport} />}
      />
      <FlowCatalogNotLoaded />
      <FlowsSummaryTiles
        summary={summary.data}
        critical={critical}
        broken={broken}
        stale={stale}
        setFilter={setFilter}
      />
      <FilterBar
        search={filters.q}
        searchPlaceholder="Buscar por nombre, ruta o módulo…"
        searchTooltip="Busca en el servidor, sin distinguir mayúsculas, en el nombre de la operación, su ruta y su módulo."
        onSearchChange={(value) => setFilter("q", value)}
        onFilterChange={setFilter}
        onClear={() => {
          setFilters(EMPTY);
          setPage(1);
        }}
        filters={[
          {
            name: "systemCode",
            label: "Sistema",
            value: filters.systemCode,
            tooltip:
              "Deja sólo las operaciones del sistema elegido: núcleo, Motor, ERP o tableros.",
            options: SYSTEM_OPTIONS,
          },
          {
            name: "module",
            label: "Módulo",
            value: filters.module,
            tooltip:
              "Deja sólo las operaciones de un módulo. Las opciones se acotan al sistema elegido.",
            options: moduleOptions,
          },
          {
            name: "risk",
            label: "Riesgo",
            value: filters.risk,
            tooltip:
              "Deja sólo los flujos con ese nivel de riesgo, calculado según lo que escriben.",
            options: RISK_OPTIONS,
          },
          {
            name: "verification",
            label: "Verificación",
            value: filters.verification,
            tooltip:
              "Deja sólo los flujos según lo que dicen las corridas reales: verificados, sin verificar o rotos.",
            options: VERIFICATION_OPTIONS,
          },
          {
            name: "freshness",
            label: "Al día",
            value: filters.freshness,
            tooltip:
              "Separa las operaciones cuyo código cambió desde la última verificación de las que siguen al día.",
            options: FRESHNESS_OPTIONS,
          },
          {
            name: "caller",
            label: "Cliente",
            value: filters.caller,
            tooltip:
              "Deja sólo las operaciones que llama ese cliente: un portal, la app del cliente u otro sistema.",
            options: CLIENT_OPTIONS,
          },
          {
            name: "tested",
            label: "Pruebas",
            value: filters.tested,
            tooltip:
              "Separa los flujos que una prueba automática ejercita de los que no.",
            options: TESTED_OPTIONS,
          },
          {
            name: "withFindings",
            label: "Hallazgos",
            value: filters.withFindings,
            tooltip:
              "Separa los flujos con hallazgos abiertos de los detectores de los limpios.",
            options: WITH_FINDINGS_OPTIONS,
          },
        ]}
      />
      {filters.systemCode && filters.module ? (
        <div className="mb-3 flex justify-end">
          <Link
            href={`/internal/flows/graph?systemCode=${filters.systemCode}&module=${filters.module}`}
            className="inline-flex items-center gap-2 rounded-xl border border-atlas-border bg-white px-3 py-2 text-sm font-medium text-atlas-accent hover:bg-atlas-soft"
            data-testid="ver-diagrama-modulo"
          >
            <Workflow className="h-4 w-4" aria-hidden />
            Ver el diagrama del módulo {filters.module}
          </Link>
        </div>
      ) : null}
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
              : "Aún no se ha cargado el análisis de flujos."
          }
        />
      ) : null}
      <section className="mt-6">
        <SectionHeader
          title="Hallazgos"
          description="Lo que el análisis encontró al cruzar el código, lo documentado, quién llama a cada operación y las pruebas."
        />
        <FlowsFindingsTable />
      </section>
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
