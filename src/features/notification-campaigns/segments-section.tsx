"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { isAtlasApiError } from "@/shared/api/errors";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { Button } from "@/shared/components/ui/button";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { describeRule } from "./campaign-options";
import { useAudienceSegments } from "./hooks";
import type { AudienceSegment } from "./types";

/**
 * Los segmentos guardados, en sólo lectura. Se definen en el ERP al armar una campaña; aquí se ve
 * a quién incluye cada uno para entender a quién le llegó una campaña que los usa.
 */
export function SegmentsSection() {
  const [status, setStatus] = useState<"active" | "archived">("active");
  const [q, setQ] = useState("");
  const segments = useAudienceSegments(status, q);
  const columns = useMemo(() => buildSegmentColumns(), []);

  return (
    <div className="space-y-4">
      {/*
       * El estado NO va en la barra de filtros: su opción «sin filtrar» promete «todas las filas» y
       * el servidor siempre devuelve un estado (activos por defecto). Es un conmutador de dos vistas.
       */}
      <FilterBar
        search={q}
        searchPlaceholder="Buscar segmento por nombre o descripción…"
        searchTooltip="Busca en el servidor, por partes, en el nombre y la descripción del segmento. La lista es completa: no se pagina."
        onSearchChange={setQ}
        onClear={() => setQ("")}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-atlas-muted">
          {status === "active"
            ? "Segmentos disponibles para nuevas campañas. El tamaño es el último calculado, antes de descontar a quien no aceptó avisos comerciales."
            : "Segmentos archivados: ya no se ofrecen al crear campañas, pero las que los usaron conservan su audiencia."}
        </p>
        <Button
          className="h-8 px-2 text-xs"
          onClick={() =>
            setStatus((value) => (value === "active" ? "archived" : "active"))
          }
        >
          {status === "active" ? "Ver archivados" : "Ver activos"}
        </Button>
      </div>
      {segments.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {segments.error ? (
        <ErrorState
          description={
            isAtlasApiError(segments.error)
              ? segments.error.message
              : "No se pudieron cargar los segmentos."
          }
          requestId={
            isAtlasApiError(segments.error)
              ? segments.error.requestId
              : undefined
          }
          onRetry={() => void segments.refetch()}
        />
      ) : null}
      {segments.data ? (
        <DataTable
          data={segments.data}
          columns={columns}
          emptyTitle={
            q
              ? "Ningún segmento coincide con la búsqueda."
              : status === "active"
                ? "No hay segmentos guardados."
                : "No hay segmentos archivados."
          }
          emptyDescription="Los segmentos se guardan desde el ERP al definir la audiencia de una campaña."
        />
      ) : null}
    </div>
  );
}

function buildSegmentColumns(): ColumnDef<AudienceSegment>[] {
  return [
    {
      accessorKey: "name",
      header: "Segmento",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-atlas-text">
            {row.original.name}
          </p>
          {row.original.description ? (
            <p className="truncate text-xs text-atlas-muted">
              {row.original.description}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      id: "rules",
      header: "A quién incluye",
      cell: ({ row }) => <SegmentRules segment={row.original} />,
    },
    {
      id: "size",
      header: "Tamaño",
      cell: ({ row }) => {
        const estimate = row.original.lastEstimate;
        if (!estimate) return <span className="text-atlas-muted">—</span>;
        return (
          <div className="text-xs">
            <p className="text-atlas-text">{`${formatNumber(estimate.total)} personas`}</p>
            <p className="text-atlas-muted">
              {`${formatNumber(estimate.withPushDevice)} con app · ${formatNumber(estimate.withVerifiedEmail)} con correo`}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "lastEstimatedAt",
      header: "Calculado",
      cell: ({ row }) => formatDateTime(row.original.lastEstimatedAt),
    },
  ];
}

function SegmentRules({ segment }: Readonly<{ segment: AudienceSegment }>) {
  const rules = segment.definition?.rules ?? [];
  if (rules.length === 0)
    return (
      <span className="text-xs">Sin filtros: toda la base de clientes</span>
    );
  const joiner = segment.definition?.match === "any" ? "o" : "y";
  return (
    <ul className="space-y-0.5 text-xs">
      {rules.map((rule, index) => (
        <li key={`${rule.attribute}-${index}`}>
          {index > 0 ? (
            <span className="mr-1 text-atlas-muted">{joiner}</span>
          ) : null}
          {describeRule(rule)}
        </li>
      ))}
    </ul>
  );
}
