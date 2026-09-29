"use client";

import { useMemo, useState } from "react";
import { LOAN_READ_ROLE_LIST } from "@/shared/auth/portal-roles";
import { useAuth } from "@/shared/auth/auth-context";
import { DataTable } from "@/shared/components/data-table/data-table";
import { FilterBar } from "@/shared/components/data-table/filter-bar";
import { withoutClientSorting } from "@/shared/components/data-table/without-client-sorting";
import { Card } from "@/shared/components/ui/card";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { formatNumber } from "@/shared/lib/format";
import { CarteraError } from "./cartera-error";
import { buildLoanColumns } from "./customer-portfolio-columns";
import { usePortfolioLoans } from "./hooks";
import { DELINQUENCY_BUCKET_OPTIONS, LOAN_STATUS_OPTIONS } from "./loan-labels";

const POR_PAGINA = 25;

/**
 * La cartera entera, paginada y filtrada EN EL SERVIDOR (`GET /operations/loans`).
 *
 * El buscador manda `q`: parte del código del préstamo o del código del cliente (antes el código
 * se buscaba EXACTO y completo), con retardo para no consultar la base por tecla. Cambiar un filtro
 * vuelve a la página 1, porque la página 7 de otro filtro no significa nada.
 *
 * Cumplimiento puede listar la cartera pero NO abrir la ficha (`GET /loans/:id` no lo admite), así
 * que para ese rol la columna «Abrir» no se pinta: sería un enlace a un 403.
 */
export function LoansPortfolioTable() {
  const { hasAnyRole } = useAuth();
  const [codigo, setCodigo] = useState("");
  const [status, setStatus] = useState("");
  const [tramo, setTramo] = useState("");
  const [page, setPage] = useState(1);
  const codigoBuscado = useDebouncedValue(codigo.trim());
  const puedeAbrir = hasAnyRole(LOAN_READ_ROLE_LIST);

  const cartera = usePortfolioLoans({
    status: status || undefined,
    delinquencyBucket: tramo || undefined,
    q: codigoBuscado || undefined,
    page,
    pageSize: POR_PAGINA,
  });
  const columnas = useMemo(
    () =>
      withoutClientSorting(
        buildLoanColumns({ conCliente: true, conAbrir: puedeAbrir }),
      ),
    [puedeAbrir],
  );
  const data = cartera.data;

  return (
    <Card className="p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold text-atlas-text">
          Cartera de préstamos
        </h2>
        {data ? (
          <span className="text-sm tabular-nums text-atlas-muted">
            {formatNumber(data.total)} préstamos
          </span>
        ) : null}
      </div>
      <p className="mb-4 text-sm text-atlas-muted">
        Todos los préstamos del inquilino, los más recientes primero. El tramo
        de mora es el del último barrido, que corre cada hora.
      </p>
      <FilterBar
        search={codigo}
        searchPlaceholder="Código de préstamo o de cliente…"
        searchTooltip="Parte del código del préstamo (LOAN-7F…) o del cliente (CUS-…), sin distinguir mayúsculas. Con sólo dígitos también encuentra el número interno del préstamo o del cliente."
        filters={[
          {
            name: "status",
            label: "Estado",
            value: status,
            options: LOAN_STATUS_OPTIONS,
            tooltip:
              "Acota la lista al momento del ciclo en que está cada préstamo.",
            allLabel: "Todos los estados",
          },
          {
            name: "delinquencyBucket",
            label: "Tramo de mora",
            value: tramo,
            options: DELINQUENCY_BUCKET_OPTIONS,
            tooltip:
              "Cuántos días de atraso tiene la cuota más vieja sin pagar.",
            allLabel: "Todos los tramos",
          },
        ]}
        onSearchChange={(valor) => {
          setCodigo(valor);
          setPage(1);
        }}
        onFilterChange={(nombre, valor) => {
          if (nombre === "status") setStatus(valor);
          if (nombre === "delinquencyBucket") setTramo(valor);
          setPage(1);
        }}
        onClear={() => {
          setCodigo("");
          setStatus("");
          setTramo("");
          setPage(1);
        }}
      />
      {cartera.isLoading ? <LoadingSkeleton rows={6} /> : null}
      {cartera.error ? (
        <CarteraError
          error={cartera.error}
          generico="No se pudo leer la cartera de préstamos."
          onRetry={() => void cartera.refetch()}
        />
      ) : null}
      {data ? (
        <DataTable
          data={data.items}
          columns={columnas}
          meta={{
            page: data.page,
            limit: data.pageSize,
            total: data.total,
            totalPages: Math.max(1, Math.ceil(data.total / data.pageSize)),
          }}
          onPageChange={setPage}
          emptyTitle="Ningún préstamo con estos filtros."
          emptyDescription="Quita un filtro o acorta la búsqueda: busca por parte del código del préstamo o del cliente."
        />
      ) : null}
    </Card>
  );
}
