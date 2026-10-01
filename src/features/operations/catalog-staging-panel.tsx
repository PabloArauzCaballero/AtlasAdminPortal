"use client";

import { useMemo, useState } from "react";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import {
  buildStagingColumns,
  ORIGEN_PROPUESTA_OPTIONS,
} from "./catalog-staging-columns";
import { StagingDecisionDialog } from "./catalog-staging-decision-dialog";
import { useStagingItems } from "./catalog-staging-hooks";
import { editableTarget, MAX_BATCH } from "./catalog-staging-logic";
import type { StagingDecision, StagingItem } from "./catalog-staging-types";
import type { ContextCatalog } from "./types";
import { usePageSize } from "@/shared/lib/page-size";

const POR_PAGINA = 20;

/**
 * Los ítems que una ingesta dejó pendientes de revisión, con decisión en lote.
 *
 * Tras ingerir se acota a ESA ingesta (lo que la persona acaba de subir); sin ingesta reciente,
 * enseña todo lo pendiente del catálogo. Los aprobados caen en la última versión del catálogo si
 * todavía es editable; si no, se explica que primero hay que crear una versión borrador.
 */
export function CatalogStagingPanel({
  catalogCode,
  ingestionJobId,
  currentVersion,
}: Readonly<{
  catalogCode: string;
  ingestionJobId?: string;
  currentVersion?: ContextCatalog["currentVersion"];
}>) {
  const [onlyThisIngestion, setOnlyThisIngestion] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [origen, setOrigen] = useState("");
  /*
   * El lote se guarda con los ÍTEMS y no sólo con sus ids: la tabla pagina en el servidor, así que
   * una selección hecha en la página 1 sigue siendo válida en la 2 y «Aprobar seleccionados (N)»
   * cuenta todo lo marcado, no sólo lo que se ve.
   */
  const [selected, setSelected] = useState<Map<string, StagingItem>>(new Map());
  const [deciding, setDeciding] = useState<StagingDecision | null>(null);
  const scoped = Boolean(ingestionJobId) && onlyThisIngestion;
  const items = useStagingItems({
    catalogCode,
    reviewStatus: "pending_review",
    ...(scoped ? { ingestionJobId } : {}),
    ...(q.trim() ? { q: q.trim() } : {}),
    ...(origen ? { aiSuggested: origen === "true" } : {}),
    page,
    limit: usePageSize(POR_PAGINA),
  });
  const target = editableTarget(currentVersion);
  const rows = useMemo(() => items.data?.items ?? [], [items.data]);
  const chosen = useMemo(() => [...selected.values()], [selected]);
  const resumen = items.data?.summary;
  const filtrando = Boolean(q.trim() || origen);
  const columns = useMemo(
    () =>
      buildStagingColumns({
        seleccionado: (id) => selected.has(id),
        alternar: (item) =>
          setSelected((previous) => {
            const next = new Map(previous);
            if (next.has(item.stagingItemId)) next.delete(item.stagingItemId);
            else if (next.size < MAX_BATCH) next.set(item.stagingItemId, item);
            return next;
          }),
        tope: selected.size >= MAX_BATCH,
      }),
    [selected],
  );

  const reiniciar = () => {
    setPage(1);
    setSelected(new Map());
  };

  return (
    <section
      aria-label="Ítems pendientes de revisión"
      className="space-y-3 rounded-lg border border-atlas-border p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-atlas-text">
            Pendientes de revisión
            {items.data ? ` (${formatNumber(items.data.meta.total)})` : ""}
          </p>
          <p className="text-xs text-atlas-muted">
            {scoped
              ? `Sólo los de la ingesta ${ingestionJobId}.`
              : `Todo lo pendiente del catálogo ${catalogCode}.`}
          </p>
        </div>
        {ingestionJobId ? (
          <Button
            type="button"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => {
              setOnlyThisIngestion((value) => !value);
              reiniciar();
            }}
          >
            {scoped ? "Ver todo el catálogo" : "Ver sólo esta ingesta"}
          </Button>
        ) : null}
      </div>

      {resumen ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Pendientes"
            value={formatNumber(resumen.pendingReview)}
            tone={resumen.pendingReview > 0 ? "warning" : "default"}
          />
          <MetricCard
            label="Aprobados"
            value={formatNumber(resumen.approved)}
          />
          <MetricCard
            label="Rechazados"
            value={formatNumber(resumen.rejected)}
          />
          <MetricCard
            label="Sugeridos por IA"
            value={formatNumber(resumen.aiSuggested)}
          />
        </div>
      ) : null}

      {!target ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
          Para aprobar hace falta una versión en borrador o en aprobación: la
          última de este catálogo
          {currentVersion
            ? ` (${currentVersion.versionCode}) ya no se puede editar`
            : " no existe"}
          . Crea una versión nueva con «Nueva versión» y vuelve aquí.
        </p>
      ) : null}

      <FilterBar
        search={q}
        searchPlaceholder="Buscar por código, nombre o n.º del ítem…"
        searchTooltip="Busca en el servidor, entre todos los ítems pendientes del alcance de arriba: coincide con parte del código propuesto, del nombre propuesto o del número del ítem."
        filters={[
          {
            name: "origen",
            label: "Propuesta",
            value: origen,
            options: ORIGEN_PROPUESTA_OPTIONS,
            tooltip:
              "Si el ítem lo sugirió la IA o vino tal cual en el lote ingerido.",
          },
        ]}
        onSearchChange={(valor) => {
          setQ(valor);
          setPage(1);
        }}
        onFilterChange={(_nombre, valor) => {
          setOrigen(valor);
          setPage(1);
        }}
        onClear={() => {
          setQ("");
          setOrigen("");
          setPage(1);
        }}
      />

      {items.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {items.error ? (
        <ErrorState
          title="No se pudieron leer los ítems pendientes"
          description={
            isAtlasApiError(items.error)
              ? items.error.message
              : "Error inesperado."
          }
          requestId={
            isAtlasApiError(items.error) ? items.error.requestId : undefined
          }
          onRetry={() => void items.refetch()}
        />
      ) : null}
      {items.data ? (
        <DataTable
          data={rows}
          columns={columns}
          meta={items.data.meta}
          onPageChange={setPage}
          emptyTitle={
            filtrando
              ? "Ningún ítem pendiente coincide con la búsqueda."
              : "Nada pendiente"
          }
          emptyDescription={
            filtrando
              ? "Cambia o borra el texto y el filtro."
              : "No hay ítems esperando decisión en este alcance."
          }
        />
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="primary"
          className="h-8 text-xs"
          disabled={chosen.length === 0 || !target}
          onClick={() => setDeciding("approve")}
        >
          Aprobar seleccionados ({chosen.length})
        </Button>
        <Button
          type="button"
          variant="danger"
          className="h-8 text-xs"
          disabled={chosen.length === 0 || !target}
          onClick={() => setDeciding("reject")}
        >
          Rechazar seleccionados ({chosen.length})
        </Button>
      </div>

      {deciding && target ? (
        <StagingDecisionDialog
          decision={deciding}
          items={chosen}
          target={target}
          onClose={() => {
            setDeciding(null);
            setSelected(new Map());
          }}
        />
      ) : null}
    </section>
  );
}
