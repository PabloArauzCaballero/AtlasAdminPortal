"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import { uniqueTextOptions } from "@/shared/lib/options";
import { DecisionDialog } from "./decision-dialog";
import { useWorkQueue } from "./hooks";
import { buildWorkQueueColumns } from "./work-queue-columns";
import type { WorkQueueItem } from "./types";

const queueOptions = [
  { label: "Revisión manual", value: "manual_review" },
  { label: "Fraude", value: "fraud" },
];

export function WorkQueuePage() {
  const [page, setPage] = useState(1);
  const [queue, setQueue] = useState("all");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [decidingItem, setDecidingItem] = useState<WorkQueueItem | null>(null);

  const workQueue = useWorkQueue({
    page,
    limit: 20,
    queue,
    status,
    priority,
    customerId,
  });
  const items = useMemo(() => workQueue.data?.items ?? [], [workQueue.data]);
  const columns = useMemo(
    () => buildWorkQueueColumns((item) => setDecidingItem(item)),
    [],
  );
  const statusOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.status)),
    [items],
  );
  const priorityOptions = useMemo(
    () => uniqueTextOptions(items.map((item) => item.priority)),
    [items],
  );

  return (
    <>
      <PageHeader
        eyebrow="Operaciones"
        title="Cola de trabajo"
        description="Casos de revisión manual y de fraude pendientes de decisión, combinados en una sola cola priorizada."
      />
      <BusinessContextNote>
        Cada fila es un caso real abierto por el backend (KYC insuficiente,
        patrón de fraude detectado, etc.). Decidir un caso lo cierra de forma
        auditable y, si corresponde, actualiza el estado del cliente. La
        decisión de fraude está restringida a analistas de fraude/admin en el
        backend — si tu rol no alcanza, la acción devuelve un error claro.
      </BusinessContextNote>
      <FilterBar
        search={customerId}
        searchPlaceholder="Buscar por ID de cliente…"
        filters={[
          {
            name: "queue",
            label: "Cola",
            value: queue === "all" ? "" : queue,
            options: queueOptions,
          },
          {
            name: "status",
            label: "Estado",
            value: status,
            options: statusOptions,
          },
          {
            name: "priority",
            label: "Prioridad",
            value: priority,
            options: priorityOptions,
          },
        ]}
        onSearchChange={(value) => {
          setCustomerId(value);
          setPage(1);
        }}
        onFilterChange={(name, value) => {
          if (name === "queue") setQueue(value || "all");
          if (name === "status") setStatus(value);
          if (name === "priority") setPriority(value);
          setPage(1);
        }}
        onClear={() => {
          setQueue("all");
          setStatus("");
          setPriority("");
          setCustomerId("");
          setPage(1);
        }}
      />
      {workQueue.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {workQueue.error ? (
        <ErrorState
          description={
            isAtlasApiError(workQueue.error)
              ? workQueue.error.message
              : "No se pudo cargar la cola de trabajo."
          }
          requestId={
            isAtlasApiError(workQueue.error)
              ? workQueue.error.requestId
              : undefined
          }
          onRetry={() => void workQueue.refetch()}
        />
      ) : null}
      {workQueue.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Casos en cola"
              value={formatNumber(workQueue.data.meta.total)}
            />
            <MetricCard
              label="Fraude visible"
              value={formatNumber(
                items.filter((item) => item.workItemType === "fraud").length,
              )}
            />
            <MetricCard
              label="Revisión manual visible"
              value={formatNumber(
                items.filter((item) => item.workItemType === "manual_review")
                  .length,
              )}
            />
          </section>
          <DataTable
            data={items}
            columns={columns}
            meta={workQueue.data.meta}
            onPageChange={setPage}
            emptyTitle="No hay casos para los filtros actuales."
            emptyDescription="La cola de revisión manual y fraude está vacía para este filtro."
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
