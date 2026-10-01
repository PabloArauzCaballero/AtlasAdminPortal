"use client";

import { useMemo, useState } from "react";
import { isAtlasApiError } from "@/shared/api/errors";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { Card } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatNumber } from "@/shared/lib/format";
import { useExhaustedOutcomes } from "./hooks";
import { buildBacklogColumns } from "./portfolio-columns";
import { usePageSize } from "@/shared/lib/page-size";

const POR_PAGINA = 25;
const ES_ID = /^[1-9]\d*$/;

/**
 * Los desenlaces que agotaron reintentos, por páginas y con su total.
 *
 * Antes se pedían los 100 más antiguos sin total: con 140 agotados la tabla enseñaba 100 y nadie
 * sabía que faltaban 40. Ahora pagina el servidor y se puede acotar a un préstamo.
 */
export function PortfolioBacklog({ visible }: Readonly<{ visible: boolean }>) {
  const [page, setPage] = useState(1);
  const [loanId, setLoanId] = useState("");
  const prestamo = loanId.trim();
  const backlog = useExhaustedOutcomes(
    {
      page,
      limit: usePageSize(POR_PAGINA),
      // El servidor exige un número: con otra cosa a medio escribir no se filtra.
      ...(ES_ID.test(prestamo) ? { loanId: prestamo } : {}),
    },
    visible,
  );
  const items = useMemo(() => backlog.data?.items ?? [], [backlog.data]);
  const columnas = useMemo(
    () => withoutClientSorting(buildBacklogColumns()),
    [],
  );

  return (
    <Card className="p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-atlas-text">
          Desenlaces que agotaron reintentos
        </h2>
        {backlog.data?.meta ? (
          <span className="text-sm tabular-nums text-atlas-muted">
            {formatNumber(backlog.data.meta.total)} con este filtro
          </span>
        ) : null}
      </div>
      <p className="mb-4 text-sm text-atlas-muted">
        Cada fila es una decisión de la que el Motor nunca supo el resultado. No
        se reintentan solos: hay que arreglar la causa y volver a entregar desde
        Procesos automáticos › Ejecutar ahora.
      </p>
      {!visible ? (
        <p className="text-sm text-atlas-muted">
          Esta lista sólo la ven Análisis de riesgo y Administración. El número
          de agotados de arriba sí es el de toda la cartera.
        </p>
      ) : (
        <FilterBar
          search={loanId}
          searchPlaceholder="Número de préstamo…"
          searchTooltip="El número interno del préstamo, sólo dígitos (lo ves en su ficha). Acota la lista a sus desenlaces."
          onSearchChange={(value) => {
            setLoanId(value);
            setPage(1);
          }}
          onClear={() => {
            setLoanId("");
            setPage(1);
          }}
        />
      )}
      {visible && backlog.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {backlog.error ? (
        <ErrorState
          description={
            isAtlasApiError(backlog.error)
              ? backlog.error.message
              : "No se pudo leer la lista de desenlaces agotados."
          }
          requestId={
            isAtlasApiError(backlog.error) ? backlog.error.requestId : undefined
          }
          onRetry={() => void backlog.refetch()}
        />
      ) : null}
      {backlog.data ? (
        <DataTable
          data={items}
          columns={columnas}
          meta={backlog.data.meta}
          onPageChange={setPage}
          emptyTitle={
            prestamo
              ? "Ese préstamo no tiene desenlaces agotados."
              : "Ningún desenlace agotó sus reintentos."
          }
          emptyDescription="El Motor está recibiendo las observaciones de cosecha."
        />
      ) : null}
    </Card>
  );
}
