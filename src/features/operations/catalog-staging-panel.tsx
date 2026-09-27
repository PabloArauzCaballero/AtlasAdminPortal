"use client";

import { useState } from "react";
import { Button } from "@/shared/components/ui/button";
import {
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from "@/shared/components/ui/states";
import { isAtlasApiError } from "@/shared/api/errors";
import { formatNumber } from "@/shared/lib/format";
import { StagingDecisionDialog } from "./catalog-staging-decision-dialog";
import { useStagingItems } from "./catalog-staging-hooks";
import {
  approvalBlocker,
  editableTarget,
  MAX_BATCH,
} from "./catalog-staging-logic";
import type { StagingDecision, StagingItem } from "./catalog-staging-types";
import type { ContextCatalog } from "./types";

const PAGE_SIZE = 50;

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deciding, setDeciding] = useState<StagingDecision | null>(null);
  const scoped = Boolean(ingestionJobId) && onlyThisIngestion;
  const items = useStagingItems({
    catalogCode,
    reviewStatus: "pending_review",
    ...(scoped ? { ingestionJobId } : {}),
    page,
    pageSize: PAGE_SIZE,
  });
  const target = editableTarget(currentVersion);
  const rows = items.data?.items ?? [];
  const chosen = rows.filter((item) => selected.has(item.stagingItemId));
  const pages = Math.max(1, Math.ceil((items.data?.total ?? 0) / PAGE_SIZE));

  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_BATCH) next.add(id);
      return next;
    });
  }

  return (
    <section
      aria-label="Ítems pendientes de revisión"
      className="space-y-3 rounded-lg border border-atlas-border p-3"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-atlas-text">
            Pendientes de revisión
            {items.data ? ` (${formatNumber(items.data.total)})` : ""}
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
              setPage(1);
              setSelected(new Set());
            }}
          >
            {scoped ? "Ver todo el catálogo" : "Ver sólo esta ingesta"}
          </Button>
        ) : null}
      </div>

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
      {items.data && rows.length === 0 ? (
        <EmptyState
          title="Nada pendiente"
          description="No hay ítems esperando decisión en este alcance."
        />
      ) : null}
      {rows.length > 0 ? (
        <ul className="max-h-80 divide-y divide-atlas-border overflow-auto rounded-lg border border-atlas-border">
          {rows.map((item) => (
            <StagingRow
              key={item.stagingItemId}
              item={item}
              checked={selected.has(item.stagingItemId)}
              onToggle={() => toggle(item.stagingItemId)}
            />
          ))}
        </ul>
      ) : null}

      {pages > 1 ? (
        <div className="flex items-center justify-end gap-2 text-xs">
          <Button
            type="button"
            className="h-7 px-2 text-xs"
            disabled={page <= 1}
            onClick={() => setPage((value) => value - 1)}
          >
            Anterior
          </Button>
          <span className="tabular-nums text-atlas-muted">
            Página {page} de {pages}
          </span>
          <Button
            type="button"
            className="h-7 px-2 text-xs"
            disabled={page >= pages}
            onClick={() => setPage((value) => value + 1)}
          >
            Siguiente
          </Button>
        </div>
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
            setSelected(new Set());
          }}
        />
      ) : null}
    </section>
  );
}

function StagingRow({
  item,
  checked,
  onToggle,
}: Readonly<{ item: StagingItem; checked: boolean; onToggle: () => void }>) {
  const blocker = approvalBlocker(item);
  const name = item.proposedItemName ?? item.proposedItemCode ?? "Sin nombre";
  return (
    <li className="flex items-start gap-3 px-3 py-2 text-sm">
      <input
        type="checkbox"
        className="mt-1"
        checked={checked}
        aria-label={`Seleccionar ${name}`}
        onChange={onToggle}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-atlas-text">{name}</p>
        <p className="font-mono text-xs text-atlas-muted">
          {item.proposedItemCode ?? "—"} · #{item.stagingItemId}
          {item.aiSuggested ? " · sugerido por IA" : ""}
        </p>
      </div>
      {blocker ? (
        <span className="shrink-0 text-xs text-amber-800">{blocker}</span>
      ) : null}
    </li>
  );
}
