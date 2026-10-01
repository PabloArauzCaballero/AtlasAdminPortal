"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { formatDateTime } from "@/shared/lib/format";
import { describeRunEvent } from "./run-events";
import type { QaRunEvent } from "./run-extras-types";

type Row = { event: QaRunEvent; label: string; detail: string };

const COLUMNS: ColumnDef<Row>[] = [
  {
    id: "sequence",
    header: "N.º",
    cell: ({ row }) => (
      <span className="font-mono text-xs tabular-nums">
        #{row.original.event.sequence}
      </span>
    ),
  },
  {
    id: "when",
    header: "Fecha",
    cell: ({ row }) => (
      <span className="whitespace-nowrap text-xs tabular-nums text-atlas-muted">
        {formatDateTime(row.original.event.createdAt)}
      </span>
    ),
  },
  {
    id: "milestone",
    header: "Hito",
    cell: ({ row }) => (
      <span className="font-medium text-atlas-text">{row.original.label}</span>
    ),
  },
  {
    id: "detail",
    header: "Detalle",
    cell: ({ row }) => (
      <span className="text-xs text-atlas-muted">
        {row.original.detail || "—"}
      </span>
    ),
  },
];

/**
 * El diario de la corrida como tabla. El servidor lo entrega por cursor (sólo lo nuevo desde el
 * último hito visto) y el portal lo acumula: aquí están TODOS los hitos leídos hasta ahora, así
 * que buscar y paginar se hace sobre ese diario completo, no sobre un trozo.
 */
export function RunEventsTable({
  events,
  live,
}: Readonly<{ events: readonly QaRunEvent[]; live: boolean }>) {
  const [q, setQ] = useState("");
  const rows = useMemo<Row[]>(
    () =>
      events.map((event) => {
        const view = describeRunEvent(event);
        return { event, label: view.label, detail: view.detail ?? "" };
      }),
    [events],
  );
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^#/, "");
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        String(row.event.sequence) === needle ||
        row.label.toLowerCase().includes(needle) ||
        row.detail.toLowerCase().includes(needle),
    );
  }, [rows, q]);
  const columns = useMemo(() => withoutClientSorting(COLUMNS), []);
  return (
    <div className="space-y-3" aria-live={live ? "polite" : undefined}>
      <FilterBar
        search={q}
        searchPlaceholder="Buscar en el diario…"
        searchTooltip="Recorre todos los hitos del diario leídos hasta ahora en este navegador (el servidor los entrega por cursor y aquí se acumulan): coincide con parte del hito o de su detalle, o con su número."
        onSearchChange={(value) => {
          setQ(value);
        }}
        onClear={() => {
          setQ("");
        }}
      />
      <DataTable
        data={filtered}
        columns={columns}
        emptyTitle="Ningún hito coincide con la búsqueda."
        emptyDescription="Cambia el texto de la búsqueda."
      />
    </div>
  );
}
