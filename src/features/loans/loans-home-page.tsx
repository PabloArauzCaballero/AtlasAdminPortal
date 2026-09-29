"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";
import {
  LOAN_PORTFOLIO_ROLE_LIST,
  LOAN_RATING_ROLE_LIST,
  LOAN_READ_ROLE_LIST,
} from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { BusinessContextNote } from "@/shared/components/layout/business-context-note";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Field, Input } from "@/shared/components/ui/input";
import { LoansPortfolioTable } from "./loans-portfolio-table";

/** Un identificador de la base: entero positivo, como lo valida el servidor. */
const ES_ID = /^[1-9][0-9]*$/;

/**
 * Entrada a la cartera: la tabla paginada de todos los préstamos (`GET /operations/loans`), abrir
 * uno por su número o la ficha de un cliente. La escala de calificación vive en «Calificación de cartera».
 *
 * La lista la puede leer también cumplimiento; abrir la ficha, no. Por eso el acceso por número
 * va con el gate de lectura del préstamo y la tabla con el de la cartera.
 */
export function LoansHomePage() {
  return (
    <RoleGate roles={LOAN_PORTFOLIO_ROLE_LIST}>
      <PageHeader
        icon={Landmark}
        eyebrow="Cartera"
        title="Préstamos"
        description="Toda la cartera, filtrable por estado, tramo de mora y código. Abre un préstamo por su número o la cartera de un cliente desde su ficha."
      />
      <BusinessContextNote>
        Desembolsar se hace desde la ficha del cliente, sobre su solicitud
        aprobada. Cobros, reversos y castigos, desde la ficha del préstamo.
      </BusinessContextNote>
      <div className="space-y-6">
        <RoleGate roles={LOAN_READ_ROLE_LIST} fallback={null}>
          <Buscar />
        </RoleGate>
        <LoansPortfolioTable />
        <RoleGate roles={LOAN_RATING_ROLE_LIST} fallback={null}>
          <p className="text-sm text-atlas-muted">
            La escala de calificación vigente (categorías, días de atraso y
            previsión) y la cartera por categoría están en{" "}
            <Link
              href="/internal/operations/portfolio"
              className="text-atlas-accent underline"
            >
              Calificación de cartera
            </Link>
            .
          </p>
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
