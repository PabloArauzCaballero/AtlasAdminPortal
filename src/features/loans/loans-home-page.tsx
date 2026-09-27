"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Landmark } from "lucide-react";
import {
  LOAN_PORTFOLIO_ROLE_LIST,
  LOAN_RATING_ROLE_LIST,
  LOAN_READ_ROLE_LIST,
} from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Badge } from "@/shared/components/ui/badges";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Field, Input } from "@/shared/components/ui/input";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import { CarteraError } from "./cartera-error";
import { useRatingScale } from "./hooks";
import { formatRate } from "./loan-ui";
import type { RatingScaleGrade } from "./types";

/** Un identificador de la base: entero positivo, como lo valida el servidor. */
const ES_ID = /^[1-9][0-9]*$/;

/**
 * Entrada a la cartera: abrir un préstamo o la ficha de un cliente, y la escala de calificación.
 *
 * No hay lista global de préstamos porque el servidor no la ofrece al personal: los préstamos se
 * leen por cliente (`GET /customers/:id/loans`) o uno a uno. Por eso se entra por identificador;
 * desde la ficha del cliente se llega a todos los suyos.
 */
export function LoansHomePage() {
  return (
    <RoleGate roles={LOAN_PORTFOLIO_ROLE_LIST}>
      <PageHeader
        icon={Landmark}
        eyebrow="Cartera"
        title="Préstamos"
        description="Abre un préstamo por su número o la cartera de un cliente desde su ficha. Debajo, la escala con la que se califica cada deuda."
      />
      <BusinessContextNote>
        Desembolsar se hace desde la ficha del cliente, sobre su solicitud
        aprobada. Cobros, reversos y castigos, desde la ficha del préstamo.
      </BusinessContextNote>
      <div className="space-y-6">
        <RoleGate roles={LOAN_READ_ROLE_LIST} fallback={null}>
          <Buscar />
        </RoleGate>
        <RoleGate roles={LOAN_RATING_ROLE_LIST} fallback={null}>
          <Escala />
        </RoleGate>
      </div>
    </RoleGate>
  );
}

function Buscar() {
  const router = useRouter();
  const [loanId, setLoanId] = useState("");
  const [customerId, setCustomerId] = useState("");
  const loanValido = ES_ID.test(loanId.trim());
  const clienteValido = ES_ID.test(customerId.trim());

  return (
    <Card className="p-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (loanValido)
              router.push(`/internal/operations/loans/${loanId.trim()}`);
          }}
        >
          <Field
            label="Abrir un préstamo"
            tooltip="El número interno del préstamo, sólo dígitos. Ej.: 1024. Lo ves en la ficha del cliente."
            error={loanId && !loanValido ? "Sólo dígitos." : undefined}
          >
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                value={loanId}
                onChange={(e) => setLoanId(e.target.value)}
              />
              <Button type="submit" disabled={!loanValido}>
                Abrir
              </Button>
            </div>
          </Field>
        </form>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (clienteValido)
              router.push(
                `/internal/operations/customers/${customerId.trim()}/investigation-summary`,
              );
          }}
        >
          <Field
            label="Cartera de un cliente"
            tooltip="El número interno del cliente, sólo dígitos. Abre su ficha, con sus solicitudes, préstamos y calificación."
            error={customerId && !clienteValido ? "Sólo dígitos." : undefined}
          >
            <div className="flex gap-2">
              <Input
                inputMode="numeric"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              />
              <Button type="submit" disabled={!clienteValido}>
                Abrir ficha
              </Button>
            </div>
          </Field>
        </form>
      </div>
    </Card>
  );
}

const COLUMNAS_ESCALA: ColumnDef<RatingScaleGrade>[] = [
  {
    accessorKey: "grade",
    header: "Categoría",
    cell: ({ row }) => (
      <Badge tone={row.original.tone}>{row.original.grade}</Badge>
    ),
  },
  { accessorKey: "label", header: "Significado" },
  {
    id: "mora",
    header: "Días de atraso",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {row.original.maxDaysPastDue === null
          ? `${row.original.minDaysPastDue} o más`
          : `${row.original.minDaysPastDue} – ${row.original.maxDaysPastDue}`}
      </span>
    ),
  },
  {
    accessorKey: "provisionRate",
    header: "Previsión",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatRate(row.original.provisionRate)}
      </span>
    ),
  },
  { accessorKey: "help", header: "Cómo se lee" },
];

function Escala() {
  const escala = useRatingScale();
  const grades = useMemo(() => escala.data?.grades ?? [], [escala.data]);
  return (
    <Card className="p-5">
      <h2 className="mb-1 text-base font-semibold text-atlas-text">
        Escala de calificación vigente
      </h2>
      <p className="mb-4 text-sm text-atlas-muted">
        {escala.data
          ? `Política ${escala.data.policyCode} ${escala.data.versionCode}. `
          : null}
        Es regulatoria y versionada: se lee del servidor, nunca se copia aquí.
      </p>
      {escala.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {escala.error ? (
        <CarteraError
          error={escala.error}
          generico="No hay política de calificación activa: sin ella no se califica ninguna deuda."
          onRetry={() => void escala.refetch()}
        />
      ) : null}
      {escala.data ? (
        <DataTable
          data={grades}
          columns={COLUMNAS_ESCALA}
          emptyTitle="La política vigente no tiene categorías."
          emptyDescription="Revisa la política de calificación activa."
        />
      ) : null}
    </Card>
  );
}
