"use client";

import { useMemo, useState } from "react";
import { ClipboardList, ShieldAlert } from "lucide-react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { uniqueTextOptions } from "@/shared/lib/options";
import { actionErrorMessage } from "./action-error";
import { useCaseQueue } from "./customer-actions-hooks";
import type { CaseQueue } from "./customer-actions-types";
import { DecisionDialog } from "./decision-dialog";
import {
  WORK_QUEUE_PRIORITY_HELP,
  WORK_QUEUE_STATUS_HELP,
} from "./decision-options";
import type { WorkQueueItem } from "./types";
import { buildWorkQueueColumns } from "./work-queue-columns";

const COPY: Record<
  CaseQueue,
  { title: string; description: string; note: string; whoCan: string }
> = {
  manual_review: {
    title: "Casos de revisión manual",
    description:
      "Altas con identidad o datos dudosos que decide una persona, del más reciente al más antiguo.",
    note: "Sólo los casos de revisión manual, sin mezclarlos con fraude: se recorren por páginas enteras aunque la cola sea larga. Decidir un caso lo cierra y, si corresponde, cambia el estado del cliente.",
    whoCan: "operación, riesgo, cumplimiento y administración",
  },
  fraud: {
    title: "Casos de fraude",
    description:
      "Patrones de fraude detectados sobre clientes, del más reciente al más antiguo.",
    note: "Sólo los casos de fraude. Cualquier rol de operación los ve; decidirlos es exclusivo de analistas de fraude y administración, y el resto recibe un aviso al intentarlo.",
    whoCan: "fraude, operación, riesgo, cumplimiento y administración",
  },
};

/**
 * Una de las dos colas de casos por separado, paginada por cursor.
 *
 * La cola combinada (`work-queue`) pagina por posición y a partir de cierto volumen se vuelve cara;
 * estas dos rutas por cursor existían para eso y nadie las llamaba. Se reutilizan las columnas y el
 * diálogo de decisión de la cola combinada: la fila es la misma.
 */
export function CaseQueuePage({ queue }: Readonly<{ queue: CaseQueue }>) {
  const copy = COPY[queue];
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [decidingItem, setDecidingItem] = useState<WorkQueueItem | null>(null);

  // El servidor sólo acepta un ID numérico: mientras se escribe otra cosa, no se filtra.
  const cola = useCaseQueue(queue, {
    status,
    priority,
    customerId: /^[1-9]\d*$/.test(customerId.trim()) ? customerId.trim() : "",
  });
  const items = useMemo(
    () => cola.data?.pages.flatMap((page) => page.items) ?? [],
    [cola.data],
  );
  const columns = useMemo(
    () => buildWorkQueueColumns((item) => setDecidingItem(item)),
    [],
  );
  const statusOptions = useMemo(
    () =>
      uniqueTextOptions(
        items.map((item) => item.status),
        WORK_QUEUE_STATUS_HELP,
      ),
    [items],
  );
  const priorityOptions = useMemo(
    () =>
      uniqueTextOptions(
        items.map((item) => item.priority),
        WORK_QUEUE_PRIORITY_HELP,
      ),
    [items],
  );
  const error = cola.error ? actionErrorMessage(cola.error, copy.whoCan) : null;

  return (
    <>
      <PageHeader
        icon={queue === "fraud" ? ShieldAlert : ClipboardList}
        eyebrow="Operaciones"
        title={copy.title}
        description={copy.description}
      />
      <BusinessContextNote>{copy.note}</BusinessContextNote>
      <FilterBar
        search={customerId}
        searchPlaceholder="Buscar por ID de cliente…"
        searchTooltip="Pega el identificador exacto del cliente para ver sólo sus casos."
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            tooltip:
              "Acota la cola al momento del caso; los estados salen de los casos cargados.",
            options: statusOptions,
          },
          {
            name: "priority",
            label: queue === "fraud" ? "Severidad" : "Prioridad",
            value: priority,
            tooltip:
              "Muestra primero lo urgente: el servidor la asigna al abrir el caso.",
            options: priorityOptions,
          },
        ]}
        onSearchChange={setCustomerId}
        onFilterChange={(name, value) => {
          if (name === "status") setStatus(value);
          if (name === "priority") setPriority(value);
        }}
        onClear={() => {
          setStatus("");
          setPriority("");
          setCustomerId("");
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
        <div className="space-y-3">
          <DataTable
            data={items}
            columns={columns}
            emptyTitle="No hay casos para los filtros actuales."
            emptyDescription="Prueba a quitar filtros o vuelve más tarde."
          />
          {cola.hasNextPage ? (
            <Button
              variant="secondary"
              onClick={() => void cola.fetchNextPage()}
              isLoading={cola.isFetchingNextPage}
              loadingText="Cargando…"
              data-testid="case-queue-more"
            >
              Cargar más casos
            </Button>
          ) : items.length > 0 ? (
            <p className="text-xs text-atlas-muted">
              No hay más casos: {items.length} en total.
            </p>
          ) : null}
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
