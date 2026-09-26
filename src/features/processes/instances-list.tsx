"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useMemo } from "react";
import {
  DataTable,
  type AtlasColumnMeta,
} from "@/shared/components/data-table/data-table";
import { Badge, StatusBadge } from "@/shared/components/ui/badges";
import { cn } from "@/shared/lib/cn";
import type { ProcessInstance, ProcessInstancesResponse } from "./types";

type Supported = Extract<ProcessInstancesResponse, { supported: true }>;

/** Recuento por estado; cada cifra filtra la lista. Pulsar la activa la quita. */
export function StatusCounts({
  byStatus,
  active,
  onSelect,
}: Readonly<{
  byStatus: Supported["byStatus"];
  active: string;
  onSelect: (status: string) => void;
}>) {
  if (!byStatus.length) return null;
  return (
    <div className="mb-4 flex flex-wrap gap-2" aria-label="Casos por estado">
      {byStatus.map((row) => (
        <button
          key={row.status}
          type="button"
          aria-pressed={active === row.status}
          onClick={() => onSelect(active === row.status ? "" : row.status)}
          className={cn(
            "flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-left text-sm shadow-subtle transition-colors hover:bg-atlas-soft",
            active === row.status
              ? "border-atlas-accent ring-1 ring-atlas-accent"
              : "border-atlas-border",
          )}
        >
          <StatusBadge value={row.status} />
          <span className="font-semibold tabular-nums">{row.total}</span>
          <span className="text-xs text-atlas-muted">
            {row.open ? "en curso" : "cerrados"}
          </span>
        </button>
      ))}
    </div>
  );
}

export function InstancesList({
  data,
  selected,
  onOpen,
  onPageChange,
}: Readonly<{
  data: Supported;
  selected: string | null;
  onOpen: (id: string) => void;
  onPageChange: (page: number) => void;
}>) {
  const columns = useMemo<ColumnDef<ProcessInstance>[]>(
    () => [
      {
        header: "Caso",
        accessorKey: "label",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.label ?? row.original.id}
          </span>
        ),
      },
      {
        header: "Estado",
        accessorKey: "status",
        cell: ({ row }) => <StatusBadge value={row.original.status} />,
      },
      {
        header: "Situación",
        accessorKey: "open",
        cell: ({ row }) =>
          row.original.open ? (
            <Badge tone="info">En curso</Badge>
          ) : (
            <Badge tone="muted">Cerrado</Badge>
          ),
      },
      {
        id: "actions",
        header: "Avance",
        meta: { pinRight: true } satisfies AtlasColumnMeta,
        cell: ({ row }) => (
          <button
            type="button"
            aria-current={selected === row.original.id ? "true" : undefined}
            className="text-sm font-medium text-atlas-accent underline"
            onClick={() => onOpen(row.original.id)}
          >
            {selected === row.original.id ? "Abierto" : "Ver avance"}
          </button>
        ),
      },
    ],
    [onOpen, selected],
  );
  return (
    <DataTable
      data={data.items}
      columns={columns}
      meta={{
        page: data.page,
        limit: data.pageSize,
        total: data.total,
        totalPages: Math.max(1, Math.ceil(data.total / data.pageSize)),
      }}
      onPageChange={onPageChange}
      emptyTitle="No hay casos con estos filtros"
      emptyDescription="Quita el filtro de estado o cambia la búsqueda."
    />
  );
}
