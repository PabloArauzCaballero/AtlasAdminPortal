"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { useActionLogs } from "@/features/systems/hooks";
import type { ActionLog } from "@/features/systems/types";
import { DataTable } from "@/shared/components/data-table/data-table";
import {
  MethodBadge,
  ModuleBadge,
  PiiBadge,
  RiskBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { AuditFilterPanel } from "./audit-filter-panel";
import {
  camposDeFiltro,
  consultaDeAuditoria,
  TAMANO_POR_DEFECTO,
  type AuditFilterState,
} from "./audit-filters";
import { useActionLogFilterCatalog } from "./audit-hooks";
import { usePageSize } from "@/shared/lib/page-size";

/**
 * La auditoría SQL: la bitácora de acciones con los filtros que publica el servidor.
 *
 * Si el catálogo de filtros no llega (servidor anterior o error), la barra se queda con el
 * buscador por Request ID y la tabla sigue funcionando: los filtros son una ayuda, no una
 * condición para ver la bitácora.
 */
export function AuditSqlSection() {
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState<AuditFilterState>({});
  const catalogo = useActionLogFilterCatalog();
  const logs = useActionLogs(
    consultaDeAuditoria(estado, page, usePageSize(TAMANO_POR_DEFECTO)),
  );

  const columns = useMemo<ColumnDef<ActionLog>[]>(
    () => [
      {
        header: "Fecha",
        accessorKey: "occurredAt",
        cell: ({ row }) => formatDateTime(row.original.occurredAt),
      },
      {
        header: "Código de referencia",
        accessorKey: "requestId",
        cell: ({ row }) => (
          <Link
            className="font-mono text-xs text-atlas-accent underline"
            href={`/internal/audit/request/${encodeURIComponent(row.original.requestId)}`}
          >
            {row.original.requestId}
          </Link>
        ),
      },
      {
        header: "Método",
        accessorKey: "method",
        cell: ({ row }) => <MethodBadge method={row.original.method} />,
      },
      {
        header: "Ruta",
        accessorKey: "routeTemplate",
        cell: ({ row }) => (
          <span className="font-mono text-xs">
            {row.original.routeTemplate ??
              row.original.resolvedUrlSanitized ??
              "—"}
          </span>
        ),
      },
      {
        header: "Módulo",
        accessorKey: "module",
        cell: ({ row }) => <ModuleBadge value={row.original.module} />,
      },
      {
        header: "Quién",
        accessorKey: "actorRole",
        cell: ({ row }) =>
          row.original.actorRole ?? row.original.actorType ?? "—",
      },
      {
        header: "Resultado",
        accessorKey: "responseStatusCode",
        cell: ({ row }) => (
          <StatusBadge
            value={
              row.original.responseStatusCode
                ? String(row.original.responseStatusCode)
                : null
            }
          />
        ),
      },
      {
        header: "Duración",
        accessorKey: "durationMs",
        cell: ({ row }) => `${formatNumber(row.original.durationMs)} ms`,
      },
      {
        header: "Riesgo",
        accessorKey: "riskLevel",
        cell: ({ row }) => <RiskBadge value={row.original.riskLevel} />,
      },
      {
        header: "Datos personales",
        accessorKey: "containsPii",
        cell: ({ row }) => <PiiBadge value={row.original.containsPii} />,
      },
    ],
    [],
  );

  return (
    <>
      <AuditFilterPanel
        campos={camposDeFiltro(catalogo.data)}
        estado={estado}
        onChange={(siguiente) => {
          setEstado(siguiente);
          setPage(1);
        }}
        onClear={() => {
          setEstado({});
          setPage(1);
        }}
      />
      {catalogo.error ? (
        <p role="status" className="mb-3 text-xs text-amber-800">
          No se pudieron cargar todos los filtros; por ahora solo puedes buscar
          por código de referencia.
        </p>
      ) : null}
      {logs.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {logs.error ? (
        <ErrorState
          description={
            isAtlasApiError(logs.error)
              ? logs.error.message
              : "No se pudo cargar auditoría."
          }
          requestId={
            isAtlasApiError(logs.error) ? logs.error.requestId : undefined
          }
          onRetry={() => void logs.refetch()}
        />
      ) : null}
      {logs.data ? (
        <DataTable
          data={logs.data.items}
          columns={columns}
          meta={logs.data.meta}
          onPageChange={setPage}
        />
      ) : null}
    </>
  );
}
