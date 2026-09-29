"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/shared/auth/auth-context";
import { WORK_QUEUE_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { DetailTabs } from "@/shared/components/navigation/detail-tabs";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { actionErrorMessage } from "./action-error";
import {
  WORK_QUEUE_PRIORITY_HELP,
  WORK_QUEUE_STATUS_HELP,
} from "./decision-options";
import { DecisionDialog } from "./decision-dialog";
import { useWorkQueue } from "./hooks";
import type { WorkQueueItem } from "./types";
import { buildWorkQueueColumns } from "./work-queue-columns";
import {
  DECIDE_ROLES,
  tabFromParam,
  WORK_QUEUE_TABS,
  type WorkQueueTab,
} from "./work-queue-tabs";

const POR_PAGINA = 20;

/** Opciones FIJAS (el catálogo de lo que el servidor escribe), no las de la página cargada. */
const opciones = (help: Record<string, string>) =>
  Object.entries(help).map(([value, description]) => ({
    value,
    label: value,
    description,
  }));
const STATUS_OPTIONS = opciones(WORK_QUEUE_STATUS_HELP);
const PRIORITY_OPTIONS = opciones(WORK_QUEUE_PRIORITY_HELP);

export function WorkQueuePage() {
  return (
    <RoleGate roles={WORK_QUEUE_ROLE_LIST}>
      <AuthorizedWorkQueuePage />
    </RoleGate>
  );
}

function AuthorizedWorkQueuePage() {
  const { hasAnyRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const pestañas = WORK_QUEUE_TABS.filter((tab) => hasAnyRole(tab.roles));
  const pedida = tabFromParam(params.get("cola"));
  // Quien sólo ve fraude cae en «Fraude» aunque la URL pida otra cola: el servidor le daría 403.
  const activa = pestañas.find((tab) => tab.value === pedida) ?? pestañas[0];

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [search, setSearch] = useState("");
  const [decidingItem, setDecidingItem] = useState<WorkQueueItem | null>(null);

  const cola = useWorkQueue({
    page,
    limit: POR_PAGINA,
    queue: activa.value,
    status,
    priority,
    q: search.trim(),
  });
  const items = useMemo(() => cola.data?.items ?? [], [cola.data]);
  const columns = useMemo(
    () =>
      withoutClientSorting(
        buildWorkQueueColumns(
          (item) => setDecidingItem(item),
          (item) => hasAnyRole(DECIDE_ROLES[item.workItemType]),
        ),
      ),
    [hasAnyRole],
  );
  const porTipo = cola.data?.summary?.byType ?? {};
  const etiqueta = (tab: (typeof pestañas)[number]) => {
    const cifra =
      tab.value === "all"
        ? porTipo.manual_review !== undefined && porTipo.fraud !== undefined
          ? porTipo.manual_review + porTipo.fraud
          : undefined
        : porTipo[tab.value];
    return cifra === undefined
      ? tab.label
      : `${tab.label} · ${formatNumber(cifra)}`;
  };
  const etiquetas = new Map(pestañas.map((tab) => [etiqueta(tab), tab.value]));

  const cambiarPestaña = (value: WorkQueueTab) => {
    const next = new URLSearchParams(params.toString());
    next.set("cola", value);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    setPage(1);
  };
  const error = cola.error
    ? actionErrorMessage(cola.error, activa.whoCan)
    : null;

  return (
    <>
      <PageHeader
        icon={ShieldAlert}
        eyebrow="Operaciones"
        title="Cola de trabajo"
        description="Casos de revisión manual y de fraude pendientes de decisión, en una sola cola con una pestaña por tipo."
      />
      <DetailTabs
        tabs={[...etiquetas.keys()]}
        active={etiqueta(activa)}
        onChange={(label) => cambiarPestaña(etiquetas.get(label) ?? "all")}
      />
      <BusinessContextNote>{activa.note}</BusinessContextNote>
      <FilterBar
        search={search}
        searchPlaceholder="Código de cliente o de caso…"
        searchTooltip="Busca por parte del código del cliente (CUS-…) o del caso (MR-…, FR-…). Con sólo dígitos también encuentra el número interno del caso o del cliente."
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            tooltip:
              "Acota la cola al momento del caso: abierto, en investigación (fraude) o cerrado.",
            options: STATUS_OPTIONS,
          },
          {
            name: "priority",
            label: "Prioridad",
            value: priority,
            tooltip:
              "Muestra primero lo urgente. En fraude es la severidad del patrón detectado.",
            options: PRIORITY_OPTIONS,
          },
        ]}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value);
          if (name === "priority") setPriority(value);
          setPage(1);
        }}
        onClear={() => {
          setStatus("");
          setPriority("");
          setSearch("");
          setPage(1);
        }}
      />
      {cola.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {error ? (
        <ErrorState
          description={error.message}
          requestId={error.requestId}
          onRetry={() => void cola.refetch()}
        />
      ) : null}
      {cola.data ? (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label={`${activa.label} con estos filtros`}
              value={formatNumber(cola.data.meta.total)}
            />
            {porTipo.manual_review !== undefined ? (
              <MetricCard
                label="Revisión manual con estos filtros"
                value={formatNumber(porTipo.manual_review)}
              />
            ) : null}
            {porTipo.fraud !== undefined ? (
              <MetricCard
                label="Fraude con estos filtros"
                value={formatNumber(porTipo.fraud)}
              />
            ) : null}
          </section>
          <DataTable
            data={items}
            columns={columns}
            meta={cola.data.meta}
            onPageChange={setPage}
            emptyTitle="No hay casos para los filtros actuales."
            emptyDescription="Prueba a quitar filtros o cambia de pestaña."
          />
        </div>
      ) : null}
      {decidingItem ? (
        <DecisionDialog
          item={decidingItem}
          onClose={() => setDecidingItem(null)}
        />
      ) : null}
    </>
  );
}
