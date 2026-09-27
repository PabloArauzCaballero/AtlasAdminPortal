"use client";

import { Workflow } from "lucide-react";
import { useMemo, useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { PermissionGate } from "@/shared/auth/permission-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { uniqueTextOptions } from "@/shared/lib/options";
import {
  EMPTY_PROCESS_FILTERS,
  filterProcesses,
  type ProcessFilters,
} from "./filter";
import { useProcesses } from "./hooks";
import { PROCESSES_PERMISSION } from "./services";
import {
  PRIORITY_OPTIONS,
  PROCESS_TYPE_LABELS,
  STATUS_FILTER_OPTIONS,
  SYSTEM_LABELS,
} from "./labels";
import { buildProcessColumns } from "./processes-columns";
import { ProcessesSummaryTiles } from "./processes-summary-tiles";

export function ProcessesPage() {
  // El gate envuelve un componente aparte: con los hooks aquí la consulta saldría antes de que
  // el gate decidiera, y el usuario sin permiso vería un 403 en vez de «acceso restringido».
  return (
    <PermissionGate permissions={[PROCESSES_PERMISSION]}>
      <AuthorizedProcessesPage />
    </PermissionGate>
  );
}

const withDescriptions = (labels: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(labels).map(([value, label]) => [
      value,
      { label, description: `Sólo los procesos de ${label.toLowerCase()}.` },
    ]),
  );

function AuthorizedProcessesPage() {
  const processes = useProcesses();
  const [filters, setFilters] = useState<ProcessFilters>(EMPTY_PROCESS_FILTERS);
  const [page, setPage] = useState(1);
  const columns = useMemo(() => buildProcessColumns(), []);

  const setFilter = (name: string, value: string) => {
    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  const items = processes.data?.items;
  const typeOptions = useMemo(
    () =>
      uniqueTextOptions(
        (items ?? []).map((item) => item.processType),
        withDescriptions(PROCESS_TYPE_LABELS),
      ),
    [items],
  );
  const systemOptions = useMemo(
    () =>
      uniqueTextOptions(
        (items ?? []).flatMap((item) => item.systems),
        withDescriptions(SYSTEM_LABELS),
      ),
    [items],
  );
  const visible = useMemo(
    () => filterProcesses(items ?? [], filters, page),
    [items, filters, page],
  );

  return (
    <>
      <PageHeader
        icon={Workflow}
        eyebrow="Procesos"
        title="Procesos de Atlas"
        description="Cada proceso del negocio de principio a fin: para qué existe, quién lo empieza y quién lo cierra, qué pasa cuando falla y si cada paso que hace una persona tiene su pantalla."
      />
      <ProcessesSummaryTiles
        totals={processes.data?.totals}
        setStatus={(value) => setFilter("status", value)}
      />
      <FilterBar
        search={filters.q}
        searchPlaceholder="Buscar por nombre o número de proceso…"
        searchTooltip="Busca en el nombre, la descripción y el número del proceso (P-01, P-02…)."
        onSearchChange={(value) => setFilter("q", value)}
        onFilterChange={setFilter}
        onClear={() => {
          setFilters(EMPTY_PROCESS_FILTERS);
          setPage(1);
        }}
        filters={[
          {
            name: "processType",
            label: "Tipo",
            value: filters.processType,
            options: typeOptions,
            tooltip: "El ámbito del negocio al que pertenece el proceso.",
          },
          {
            name: "system",
            label: "Bloque",
            value: filters.system,
            options: systemOptions,
            tooltip:
              "Los procesos que pasan por este bloque de Atlas en alguna etapa.",
          },
          {
            name: "priority",
            label: "Prioridad",
            value: filters.priority,
            options: PRIORITY_OPTIONS,
            tooltip: "Qué tan grave es para el negocio que el proceso falle.",
          },
          {
            name: "status",
            label: "Estado",
            value: filters.status,
            options: STATUS_FILTER_OPTIONS,
            tooltip:
              "Si el proceso está documentado y si cada paso de personas tiene pantalla.",
          },
        ]}
      />
      {processes.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {processes.error ? (
        <ErrorState
          title="No se pudieron cargar los procesos."
          description={
            isAtlasApiError(processes.error)
              ? processes.error.message
              : "Revisa la conexión y vuelve a intentarlo."
          }
          requestId={
            isAtlasApiError(processes.error)
              ? processes.error.requestId
              : undefined
          }
          onRetry={() => void processes.refetch()}
        />
      ) : null}
      {processes.data ? (
        <DataTable
          data={visible.items}
          columns={columns}
          meta={visible.meta}
          onPageChange={setPage}
          emptyTitle={
            processes.data.items.length
              ? "Ningún proceso cumple estos filtros"
              : "Todavía no hay procesos declarados"
          }
          emptyDescription={
            processes.data.items.length
              ? "Quita algún filtro o cambia la búsqueda."
              : "Los procesos se declaran en el código de Atlas y aparecen aquí en cuanto se despliegan."
          }
        />
      ) : null}
    </>
  );
}
