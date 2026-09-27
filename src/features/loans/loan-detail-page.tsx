"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Landmark } from "lucide-react";
import {
  LOAN_MONEY_ROLE_LIST,
  LOAN_RATING_ROLE_LIST,
  LOAN_READ_ROLE_LIST,
  LOAN_WRITE_OFF_ROLE_LIST,
} from "@/shared/auth/portal-roles";
import { useAuth } from "@/shared/auth/auth-context";
import { RoleGate } from "@/shared/auth/role-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { KeyValueSection } from "@/shared/components/data-display/key-value";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { LoadingSkeleton } from "@/shared/components/ui/states";
import { formatAmount, formatDateTime, safeText } from "@/shared/lib/format";
import { CarteraError } from "./cartera-error";
import { useLoan } from "./hooks";
import {
  buildHistoryColumns,
  buildPaymentColumns,
  buildScheduleColumns,
  pendienteDeCuota,
} from "./loan-detail-columns";
import { tramoDeMora } from "./loan-labels";
import { EstadoCartera } from "./loan-ui";
import { PaymentDrawer } from "./payment-drawer";
import { LoanRatingCard } from "./rating-panels";
import { ReversalDrawer, WriteOffDrawer } from "./reason-drawer";
import type { LoanDetail, LoanPayment } from "./types";

/**
 * Ficha del préstamo: cabecera, calendario, cobros, historial y calificación, con las tres
 * operaciones que mueven su saldo —cobrar, reversar, castigar—.
 *
 * Se lee en UNA llamada (`GET /loans/:id`) porque la pregunta que se contesta aquí —«¿por qué
 * debe esto?»— es la relación entre las cuatro cosas, y pedirlas por separado dejaría a la
 * pantalla componiendo un estado que puede cambiar entre llamada y llamada.
 */
export function LoanDetailPage({ loanId }: Readonly<{ loanId: string }>) {
  return (
    <RoleGate roles={LOAN_READ_ROLE_LIST}>
      <Ficha loanId={loanId} />
    </RoleGate>
  );
}

type Panel =
  | { tipo: "cobro" }
  | { tipo: "castigo" }
  | { tipo: "reverso"; pago: LoanPayment }
  | null;

function Ficha({ loanId }: Readonly<{ loanId: string }>) {
  const prestamo = useLoan(loanId);
  const { hasAnyRole } = useAuth();
  const [panel, setPanel] = useState<Panel>(null);
  const puedeCobrar = hasAnyRole(LOAN_MONEY_ROLE_LIST);
  const puedeCastigar = hasAnyRole(LOAN_WRITE_OFF_ROLE_LIST);
  const loan = prestamo.data;
  const vigente = loan?.status === "active";

  const pendiente = useMemo(
    () =>
      loan ? loan.schedule.reduce((s, c) => s + pendienteDeCuota(c), 0) : 0,
    [loan],
  );
  const columnasCuotas = useMemo(
    () => buildScheduleColumns(loan?.currencyCode ?? ""),
    [loan?.currencyCode],
  );
  const columnasCobros = useMemo(
    () =>
      buildPaymentColumns({
        puedeReversar: puedeCobrar,
        onReversar: (pago) => setPanel({ tipo: "reverso", pago }),
      }),
    [puedeCobrar],
  );
  const columnasHistorial = useMemo(() => buildHistoryColumns(), []);

  return (
    <>
      <PageHeader
        icon={Landmark}
        eyebrow="Cartera"
        title={loan ? `Préstamo ${loan.loanCode}` : `Préstamo #${loanId}`}
        description="Calendario de cuotas, cobros aplicados e historial del préstamo. Desde aquí se registra un cobro, se reversa uno mal aplicado o se castiga la deuda incobrable."
        actions={
          loan && vigente ? (
            <div className="flex flex-wrap gap-2">
              {puedeCobrar ? (
                <Button
                  variant="primary"
                  onClick={() => setPanel({ tipo: "cobro" })}
                >
                  Registrar cobro
                </Button>
              ) : null}
              {puedeCastigar ? (
                <Button
                  variant="danger"
                  onClick={() => setPanel({ tipo: "castigo" })}
                >
                  Castigar
                </Button>
              ) : null}
            </div>
          ) : null
        }
      />
      {prestamo.isLoading ? <LoadingSkeleton rows={8} /> : null}
      {prestamo.error ? (
        <CarteraError
          error={prestamo.error}
          generico={`No se pudo leer el préstamo #${loanId}.`}
          onRetry={() => void prestamo.refetch()}
        />
      ) : null}
      {loan ? (
        <div className="space-y-6">
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <MetricCard
              label="Capital pendiente"
              value={`${formatAmount(loan.outstandingPrincipal)} ${loan.currencyCode}`}
            />
            <MetricCard
              label="Pendiente con interés y mora"
              value={`${formatAmount(pendiente)} ${loan.currencyCode}`}
            />
            <MetricCard
              label="Días de atraso"
              value={loan.daysPastDue}
              tone={loan.daysPastDue > 0 ? "warning" : "default"}
              hint={`Peor atraso: ${loan.worstDaysPastDue} días`}
            />
          </section>
          <Cabecera loan={loan} />
          <Card className="p-5">
            <h2 className="mb-4 text-base font-semibold text-atlas-text">
              Calendario de cuotas
            </h2>
            <DataTable
              data={loan.schedule}
              columns={columnasCuotas}
              emptyTitle="Sin cuotas."
              emptyDescription="El calendario se crea al desembolsar."
            />
          </Card>
          <Card className="p-5">
            <h2 className="mb-1 text-base font-semibold text-atlas-text">
              Cobros
            </h2>
            <p className="mb-4 text-sm text-atlas-muted">
              Un cobro reversado no desaparece: queda en la lista con su motivo.
            </p>
            <DataTable
              data={loan.payments}
              columns={columnasCobros}
              emptyTitle="Sin cobros todavía."
              emptyDescription="Los cobros registrados aquí o por la app aparecen en esta lista."
            />
          </Card>
          <RoleGate roles={LOAN_RATING_ROLE_LIST} fallback={null}>
            <LoanRatingCard loanId={loan.loanId} />
          </RoleGate>
          <Card className="p-5">
            <h2 className="mb-4 text-base font-semibold text-atlas-text">
              Historial
            </h2>
            <DataTable
              data={loan.history}
              columns={columnasHistorial}
              emptyTitle="Sin movimientos."
              emptyDescription="Cada desembolso, cobro, reverso, cambio de mora y castigo queda aquí."
            />
          </Card>
        </div>
      ) : null}
      {loan && panel?.tipo === "cobro" ? (
        <PaymentDrawer
          loan={loan}
          pendiente={pendiente}
          onClose={() => setPanel(null)}
        />
      ) : null}
      {loan && panel?.tipo === "castigo" ? (
        <WriteOffDrawer loan={loan} onClose={() => setPanel(null)} />
      ) : null}
      {loan && panel?.tipo === "reverso" ? (
        <ReversalDrawer
          loanId={loan.loanId}
          payment={panel.pago}
          onClose={() => setPanel(null)}
        />
      ) : null}
    </>
  );
}

function Cabecera({ loan }: Readonly<{ loan: LoanDetail }>) {
  return (
    <KeyValueSection
      title="Préstamo"
      items={[
        { label: "Estado", value: <EstadoCartera value={loan.status} /> },
        {
          label: "Cliente",
          value: (
            <Link
              className="underline"
              href={`/internal/operations/customers/${loan.customerId}/investigation-summary`}
            >
              #{loan.customerId}
            </Link>
          ),
        },
        {
          label: "Solicitud",
          value: safeText(loan.creditApplicationId),
          mono: true,
        },
        { label: "Comercio", value: safeText(loan.merchant?.displayName) },
        {
          label: "Capital prestado",
          value: `${formatAmount(loan.principalAmount)} ${loan.currencyCode}`,
        },
        {
          label: "Tasa anual",
          value: `${safeText(loan.annualInterestRate)} %`,
        },
        { label: "Plazo", value: `${loan.termMonths} meses` },
        { label: "Desembolsado", value: formatDateTime(loan.disbursedAt) },
        { label: "Primera cuota", value: safeText(loan.firstDueDate) },
        { label: "Vencimiento final", value: safeText(loan.maturityDate) },
        { label: "Tramo de mora", value: tramoDeMora(loan.delinquencyBucket) },
        ...(loan.writtenOffAt
          ? [
              { label: "Castigado", value: formatDateTime(loan.writtenOffAt) },
              {
                label: "Importe castigado",
                value: `${formatAmount(loan.writtenOffAmount)} ${loan.currencyCode}`,
              },
            ]
          : []),
        {
          label: "Ejecución del Motor que lo decidió",
          value: safeText(loan.decision.executionId),
          mono: true,
        },
      ]}
    />
  );
}
