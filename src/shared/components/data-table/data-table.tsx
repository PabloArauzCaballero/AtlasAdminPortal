"use client";

import {
  ColumnDef,
  Header,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { EmptyState } from "@/shared/components/ui/states";
import { Button } from "@/shared/components/ui/button";
import type { PaginationMeta } from "@/shared/api/types";

export function DataTable<T>({
  data,
  columns,
  meta,
  onPageChange,
  emptyTitle = "No hay registros para mostrar.",
  emptyDescription = "Aún no hay configuración registrada para este apartado.",
}: Readonly<{
  data: T[];
  columns: ColumnDef<T>[];
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      <div className="animate-fade-in overflow-hidden rounded-2xl border border-atlas-border bg-white shadow-card">
        <div className="flex items-center justify-between border-b border-atlas-border bg-slate-50/70 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-atlas-muted">
            Registros
          </p>
          <span className="rounded-full border border-atlas-border bg-white px-2.5 py-1 text-xs font-semibold text-atlas-accent shadow-sm">
            {meta?.total ?? data.length}
          </span>
        </div>
        <div className="atlas-scrollbar atlas-table-scroll max-h-[560px] overflow-auto">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-atlas-muted shadow-[0_1px_0_0_theme(colors.atlas.border)]">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <HeaderCell key={header.id} header={header} />
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="transition-colors hover:bg-atlas-accentSoft/60"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 align-top text-sm text-atlas-text"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {meta ? <Pagination meta={meta} onPageChange={onPageChange} /> : null}
    </div>
  );
}

function HeaderCell<T>({ header }: Readonly<{ header: Header<T, unknown> }>) {
  const canSort = header.column.getCanSort();
  const sorted = header.column.getIsSorted();
  return (
    <th className="border-b border-atlas-border px-4 py-3 text-left align-middle">
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 text-left",
          canSort && "hover:text-atlas-text",
        )}
        onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
      >
        {header.isPlaceholder
          ? null
          : flexRender(header.column.columnDef.header, header.getContext())}
        {sorted === "asc" ? <ChevronUp className="h-3 w-3" /> : null}
        {sorted === "desc" ? <ChevronDown className="h-3 w-3" /> : null}
      </button>
    </th>
  );
}

function Pagination({
  meta,
  onPageChange,
}: Readonly<{
  meta: PaginationMeta;
  onPageChange?: (page: number) => void;
}>) {
  return (
    <div className="flex flex-col gap-2 text-xs text-atlas-muted sm:flex-row sm:items-center sm:justify-between">
      <span>
        Página {meta.page} de {meta.totalPages || 1} · {meta.total} registros
      </span>
      <div className="flex gap-2">
        <Button
          disabled={meta.page <= 1}
          onClick={() => onPageChange?.(meta.page - 1)}
        >
          Anterior
        </Button>
        <Button
          disabled={meta.totalPages <= meta.page}
          onClick={() => onPageChange?.(meta.page + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
}
