"use client";

import { ColumnDef } from "@tanstack/react-table";
import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import {
  useActionLogFilterCatalog,
  useActionLogs,
} from "@/features/systems/hooks";
import type { ActionLog } from "@/features/systems/types";
import { DataTable } from "@/shared/components/data-table/data-table";
import {
  MethodBadge,
  ModuleBadge,
  PiiBadge,
  RiskBadge,
  StatusBadge,
} from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Select } from "@/shared/components/ui/input";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatDateTime, formatNumber } from "@/shared/lib/format";
import { isAtlasApiError } from "@/shared/api/errors";
import { AuditEventDrawer } from "./audit-event-drawer";
import { AuditFilterBar } from "./audit-filter-bar";
import {
  camposDeFiltro,
  consultaDeAuditoria,
  TAMANO_POR_DEFECTO,
  TAMANOS_DE_PAGINA,
  type AuditFilterState,
} from "./audit-filters";

/**
 * La bitácora de auditoría: filtrar, paginar y abrir un evento.
 *
 * Vive en su propio archivo y no dentro de `audit-page.tsx` porque la página
 * tiene dos pestañas que no comparten nada salvo el encabezado, y meter las dos
 * en el mismo componente obligaba a leer la de MongoDB para entender ésta.
 *
 * Tres cosas cambiaron respecto de la versión anterior y las tres eran defectos:
 *
 * 1. **Los filtros los publica el backend.** Antes eran tres, con las opciones
 *    copiadas a mano, sobre un endpoint que acepta once.
 * 2. **El tamaño de página se elige.** Estaba fijo en 20 y no había forma de ver
 *    más sin pasar página doce veces.
 * 3. **Una fila se puede abrir.** Los veinte campos de un evento no caben en una
 *    tabla, así que la mitad no se veía en ninguna parte.
 */
export function AuditSqlSection() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<number>(TAMANO_POR_DEFECTO);
  const [filtros, setFiltros] = useState<AuditFilterState>({});
  const [abierto, setAbierto] = useState<ActionLog | null>(null);

  const catalogo = useActionLogFilterCatalog();
  const campos = useMemo(() => camposDeFiltro(catalogo.data), [catalogo.data]);
  const logs = useActionLogs(consultaDeAuditoria(filtros, page, limit));

  /*
   * Cambiar un filtro o el tamaño devuelve a la página 1. Sin esto, filtrar
   * desde la página 7 de un listado que ahora tiene 2 dejaba la tabla vacía —y
   * «no hay resultados» es indistinguible de «estás fuera de rango»—.
   */
  const cambiarFiltros = (siguiente: AuditFilterState) => {
    setFiltros(siguiente);
    setPage(1);
  };

  const columns = useMemo<ColumnDef<ActionLog>[]>(
    () => [
      {
        header: "Fecha",
        accessorKey: "occurredAt",
        cell: ({ row }) =>
          row.original.occurredAt ? formatDateTime(row.original.occurredAt) : "—",
      },
      {
        header: "Acción",
        accessorKey: "actionName",
        cell: ({ row }) => (
          // La acción primero y la ruta debajo: «Actualizar cliente» es lo que
          // alguien busca; `PATCH /customers/:id` es cómo se hizo.
          <div className="min-w-0">
            <p className="truncate text-sm text-atlas-text">
              {row.original.actionName ?? "Acción no declarada"}
            </p>
            <p className="truncate font-mono text-[0.6875rem] text-atlas-muted">
              {row.original.routeTemplate ??
                row.original.resolvedUrlSanitized ??
                "—"}
            </p>
          </div>
        ),
      },
      {
        header: "Método",
        accessorKey: "method",
        cell: ({ row }) => <MethodBadge method={row.original.method} />,
      },
      {
        header: "Módulo",
        accessorKey: "module",
        cell: ({ row }) => <ModuleBadge value={row.original.module} />,
      },
      {
        header: "Actor",
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
              row.original.responseStatusCode === null
                ? null
                : String(row.original.responseStatusCode)
            }
          />
        ),
      },
      {
        header: "Duración",
        accessorKey: "durationMs",
        cell: ({ row }) =>
          row.original.durationMs === null
            ? "—"
            : `${formatNumber(row.original.durationMs)} ms`,
      },
      {
        header: "Riesgo",
        accessorKey: "riskLevel",
        cell: ({ row }) => <RiskBadge value={row.original.riskLevel} />,
      },
      {
        header: "PII",
        accessorKey: "containsPii",
        cell: ({ row }) => <PiiBadge value={row.original.containsPii} />,
      },
      {
        id: "detalle",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            className="h-7 px-2"
            onClick={() => setAbierto(row.original)}
            aria-label={`Ver detalle del evento de ${formatDateTime(row.original.occurredAt ?? "")}`}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <>
      <AuditFilterBar
        campos={campos}
        estado={filtros}
        onChange={cambiarFiltros}
        onClear={() => cambiarFiltros({})}
      />

      {logs.isLoading ? <LoadingSkeleton rows={8} /> : null}

      {logs.error ? (
        <ErrorState
          description={
            isAtlasApiError(logs.error)
              ? logs.error.message
              : "No se pudo cargar la auditoría."
          }
          requestId={
            isAtlasApiError(logs.error) ? logs.error.requestId : undefined
          }
          onRetry={() => void logs.refetch()}
        />
      ) : null}

      {logs.data && logs.data.items.length === 0 ? (
        <EmptyState
          title="No se encontraron eventos"
          description={
            Object.keys(filtros).length > 0
              ? "No hay registros que coincidan con los filtros actuales."
              : "Todavía no se ha registrado ninguna acción en este tenant."
          }
          action={
            Object.keys(filtros).length > 0 ? (
              <Button onClick={() => cambiarFiltros({})}>Limpiar filtros</Button>
            ) : undefined
          }
        />
      ) : null}

      {logs.data && logs.data.items.length > 0 ? (
        <>
          <div className="mb-2 flex items-center justify-end gap-2">
            <label
              htmlFor="audit-tamano"
              className="text-xs text-atlas-muted"
            >
              Registros por página
            </label>
            <Select
              id="audit-tamano"
              className="w-24"
              value={String(limit)}
              onChange={(event) => {
                setLimit(Number(event.target.value));
                setPage(1);
              }}
            >
              {TAMANOS_DE_PAGINA.map((tamano) => (
                <option key={tamano} value={tamano}>
                  {tamano}
                </option>
              ))}
            </Select>
          </div>
          <DataTable
            data={logs.data.items}
            columns={columns}
            meta={logs.data.meta}
            onPageChange={setPage}
          />
        </>
      ) : null}

      <AuditEventDrawer evento={abierto} onClose={() => setAbierto(null)} />
    </>
  );
}
