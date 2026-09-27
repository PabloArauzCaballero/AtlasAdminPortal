"use client";

import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import {
  LOAN_MONEY_ROLE_LIST,
  LOAN_RATING_ROLE_LIST,
  LOAN_READ_ROLE_LIST,
} from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { useAuth } from "@/shared/auth/auth-context";
import { DataTable } from "@/shared/components/data-table/data-table";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import { CarteraError } from "./cartera-error";
import {
  buildApplicationColumns,
  buildLoanColumns,
} from "./customer-portfolio-columns";
import { DisburseDrawer } from "./disburse-drawer";
import { useCustomerApplications, useCustomerLoans } from "./hooks";
import { explicarErrorDeCartera } from "./loan-labels";
import { guardarArchivo } from "./loan-ui";
import { CustomerRatingCard } from "./rating-panels";
import { downloadSpendingReport } from "./services";
import type { CreditApplicationSummary } from "./types";

/**
 * La cartera del cliente dentro de su ficha: calificación, solicitudes (con el desembolso) y
 * préstamos (con enlace a su detalle), más el informe de gasto en PDF.
 *
 * Cada bloque va con el gate de SU ruta: la calificación la lee también cumplimiento, los
 * préstamos no; desembolsar sólo operación y administración. Un bloque sin permiso no se pinta
 * —la ficha la usan diez roles y enseñar un «Acceso restringido» por bloque sería ruido—.
 */
export function CustomerPortfolioSection({
  customerId,
}: Readonly<{ customerId: string }>) {
  return (
    <section className="space-y-4" aria-labelledby="cartera-del-cliente">
      <h2
        id="cartera-del-cliente"
        className="text-base font-semibold text-atlas-text"
      >
        Cartera del cliente
      </h2>
      <RoleGate roles={LOAN_RATING_ROLE_LIST} fallback={null}>
        <CustomerRatingCard customerId={customerId} />
      </RoleGate>
      <RoleGate roles={LOAN_READ_ROLE_LIST} fallback={null}>
        <Solicitudes customerId={customerId} />
        <Prestamos customerId={customerId} />
      </RoleGate>
    </section>
  );
}

function Solicitudes({ customerId }: Readonly<{ customerId: string }>) {
  const { hasAnyRole } = useAuth();
  const solicitudes = useCustomerApplications(customerId);
  const [aDesembolsar, setADesembolsar] =
    useState<CreditApplicationSummary | null>(null);
  const puedeDesembolsar = hasAnyRole(LOAN_MONEY_ROLE_LIST);
  const columnas = useMemo(
    () =>
      buildApplicationColumns({
        puedeDesembolsar,
        onDesembolsar: setADesembolsar,
      }),
    [puedeDesembolsar],
  );

  return (
    <Card className="p-5">
      <h3 className="mb-1 text-sm font-semibold text-atlas-text">
        Solicitudes de crédito
      </h3>
      <p className="mb-4 text-sm text-atlas-muted">
        Una solicitud aprobada, y aceptada por el comercio cuando hay comercio,
        se desembolsa desde aquí. Hasta entonces el cliente no debe nada.
      </p>
      {solicitudes.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {solicitudes.error ? (
        <CarteraError
          error={solicitudes.error}
          generico="No se pudieron leer las solicitudes del cliente."
          onRetry={() => void solicitudes.refetch()}
        />
      ) : null}
      {solicitudes.data ? (
        <DataTable
          data={solicitudes.data.applications}
          columns={columnas}
          emptyTitle="El cliente no ha pedido ningún crédito."
          emptyDescription="Las solicitudes nacen en la app del cliente o en el comercio."
        />
      ) : null}
      {aDesembolsar ? (
        <DisburseDrawer
          application={aDesembolsar}
          onClose={() => setADesembolsar(null)}
        />
      ) : null}
    </Card>
  );
}

function Prestamos({ customerId }: Readonly<{ customerId: string }>) {
  const prestamos = useCustomerLoans(customerId);
  const columnas = useMemo(() => buildLoanColumns(), []);
  const informe = useMutation({
    mutationFn: () => downloadSpendingReport(customerId),
    onSuccess: (archivo) => guardarArchivo(archivo.blob, archivo.nombre),
  });

  return (
    <Card className="p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-atlas-text">Préstamos</h3>
        <Button
          onClick={() => informe.mutate()}
          isLoading={informe.isPending}
          loadingText="Preparando PDF…"
        >
          <FileDown className="h-4 w-4" aria-hidden="true" />
          Informe de gasto (PDF)
        </Button>
      </div>
      <p className="mb-4 text-sm text-atlas-muted">
        Lo que el cliente debe hoy, préstamo por préstamo. Abre uno para ver su
        calendario, registrar un cobro, reversarlo o castigarlo. El informe de
        gasto es el mismo PDF que el cliente descarga en la app.
      </p>
      {informe.error ? (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {explicarErrorDeCartera(
            informe.error,
            "No se pudo generar el informe de gasto.",
          )}
        </p>
      ) : null}
      {prestamos.isLoading ? <LoadingSkeleton rows={3} /> : null}
      {prestamos.error ? (
        <CarteraError
          error={prestamos.error}
          generico="No se pudieron leer los préstamos del cliente."
          onRetry={() => void prestamos.refetch()}
        />
      ) : null}
      {prestamos.data ? (
        <DataTable
          data={prestamos.data.items}
          columns={columnas}
          emptyTitle="Sin préstamos."
          emptyDescription="Aparecen aquí al desembolsar una solicitud aprobada."
        />
      ) : null}
    </Card>
  );
}
