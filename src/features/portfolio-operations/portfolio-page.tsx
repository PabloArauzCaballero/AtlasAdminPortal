"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Gauge } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { INTERNAL_PORTAL_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { engineUrl } from "@/shared/decision-engine/engine-links";
import { buildBacklogColumns, buildGradeColumns } from "./portfolio-columns";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Card } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog";
import { Field, Input } from "@/shared/components/ui/input";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import {
  formatAmount,
  formatDateTime,
  formatNumber,
} from "@/shared/lib/format";
import {
  useExhaustedOutcomes,
  useOutcomeDeliveryStatus,
  usePortfolioSummary,
  useRateCustomerMutation,
  useRateLoanMutation,
  useSweepRatingsMutation,
} from "./hooks";
import type { OutcomeDeliveryStatus } from "./types";

/**
 * Calificación de cartera.
 *
 * Esta vista era «Riesgo y desenlaces»: seis botones de runbook, tres de los cuales eran la única
 * forma de que ocurrieran la mora, la entrega de desenlaces al Motor y la calificación. Lo que
 * quedaba en ella era de dos dueños distintos:
 *
 * - La **calificación** (categoría de riesgo y previsión de cada deuda y su titular) es contable y
 *   es de Atlas. Se queda, y además corre sola cada seis horas (`sweep_debt_ratings`); el botón
 *   sirve para adelantarse a un cierre.
 * - Los **desenlaces** son la medida del acierto del Motor. Entregarlos es integración
 *   (`dispatch_loan_outcomes`, cada 15 minutos) y medirlos es del Motor (`/decision-quality`).
 *   Aquí sólo se enseña si la entrega va al día y se enlaza a donde se mide.
 */
export function PortfolioOperationsPage() {
  return (
    <RoleGate roles={INTERNAL_PORTAL_ROLE_LIST}>
      <AuthorizedPortfolioPage />
    </RoleGate>
  );
}

function AuthorizedPortfolioPage() {
  const [confirmarBarrido, setConfirmarBarrido] = useState(false);
  const [loanId, setLoanId] = useState("");
  const [customerId, setCustomerId] = useState("");

  const resumen = usePortfolioSummary();
  const entrega = useOutcomeDeliveryStatus();
  const backlog = useExhaustedOutcomes(100);
  const sweepRatings = useSweepRatingsMutation();
  const calificarCredito = useRateLoanMutation();
  const calificarCliente = useRateCustomerMutation();

  const grades = useMemo(() => resumen.data?.grades ?? [], [resumen.data]);
  const pendientes = useMemo(() => backlog.data?.items ?? [], [backlog.data]);
  const columnasGrado = useMemo(() => buildGradeColumns(), []);
  const columnasBacklog = useMemo(() => buildBacklogColumns(), []);

  return (
    <>
      <PageHeader
        icon={Gauge}
        eyebrow="Operación de cartera"
        title="Calificación de cartera"
        description="Categoría de riesgo y previsión de cada deuda con la política vigente. La calificación corre sola cada seis horas; recalificar a mano es para adelantarse a un cierre."
      />

      {resumen.isLoading ? <LoadingSkeleton rows={4} /> : null}
      {resumen.error ? (
        <ErrorState
          description={
            isAtlasApiError(resumen.error) &&
            resumen.error.message.includes("RATING_POLICY_NOT_ACTIVE")
              ? "No hay matriz de calificación vigente: sin política activa no se puede calificar nada."
              : isAtlasApiError(resumen.error)
                ? resumen.error.message
                : "No se pudo leer la cartera calificada."
          }
          requestId={
            isAtlasApiError(resumen.error) ? resumen.error.requestId : undefined
          }
          onRetry={() => void resumen.refetch()}
        />
      ) : null}

      {resumen.data ? (
        <div className="space-y-6">
          <section className="grid gap-4 grid-cols-1 sm:grid-cols-3">
            <MetricCard
              label="Créditos calificados"
              value={formatNumber(resumen.data.totals.loanCount)}
            />
            <MetricCard
              label="Exposición"
              value={formatAmount(resumen.data.totals.exposureAmount)}
            />
            <MetricCard
              label="Previsión"
              value={formatAmount(resumen.data.totals.provisionAmount)}
            />
          </section>

          <Card className="p-5">
            <h2 className="mb-1 text-base font-semibold text-atlas-text">
              Cartera por categoría
            </h2>
            <p className="mb-4 text-sm text-atlas-muted">
              {`Política ${resumen.data.policy.policyCode} ${resumen.data.policy.versionCode} · escala ${resumen.data.policy.scaleCode}`}
              {resumen.data.policy.contaminationEnabled
                ? " · el cliente hereda la PEOR categoría de sus deudas"
                : " · cada deuda se califica sola"}
            </p>
            <DataTable
              data={grades}
              columns={columnasGrado}
              emptyTitle="Sin deudas calificadas todavía."
              emptyDescription="El job sweep_debt_ratings las califica con la política vigente; «Recalificar la cartera» lo adelanta."
            />
          </Card>

          <Card className="p-5">
            <h2 className="mb-1 text-base font-semibold text-atlas-text">
              Recalificar
            </h2>
            <p className="mb-4 text-sm text-atlas-muted">
              Calificar un crédito recalifica también a su titular: su categoría
              se deriva por arrastre de todas sus operaciones, y hacerlo a
              medias dejaría la ficha mintiendo.
            </p>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div>
                <Button
                  disabled={sweepRatings.isPending}
                  onClick={() => setConfirmarBarrido(true)}
                >
                  Recalificar la cartera
                </Button>
              </div>
              <Field
                label="Recalificar un crédito"
                hint="Identificador del crédito."
              >
                <div className="flex gap-2">
                  <Input
                    value={loanId}
                    onChange={(e) => setLoanId(e.target.value)}
                  />
                  <Button
                    disabled={!loanId || calificarCredito.isPending}
                    onClick={() => void calificarCredito.mutateAsync(loanId)}
                  >
                    Calificar
                  </Button>
                </div>
              </Field>
              <Field
                label="Recalificar un cliente"
                hint="Identificador del cliente."
              >
                <div className="flex gap-2">
                  <Input
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  />
                  <Button
                    disabled={!customerId || calificarCliente.isPending}
                    onClick={() =>
                      void calificarCliente.mutateAsync(customerId)
                    }
                  >
                    Calificar
                  </Button>
                </div>
              </Field>
            </div>
          </Card>
        </div>
      ) : null}

      <section className="mt-6 space-y-6">
        <Card className="p-5">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-atlas-text">
              Desenlaces hacia el Motor
            </h2>
            <EnlaceMotor />
          </div>
          <p className="mb-4 text-sm text-atlas-muted">
            Cada crédito le cuenta al Motor cómo acabó a los 30, 90 y 180 días
            de la decisión. La mora los observa cada hora
            (sweep_loan_delinquency) y la entrega los manda cada quince
            minutos (dispatch_loan_outcomes). Lo que se mide con ellos
            —acierto, estabilidad, cosechas— vive en el Motor, no aquí.
          </p>
          {entrega.isLoading ? <LoadingSkeleton rows={2} /> : null}
          {entrega.error ? (
            <ErrorState
              description={
                isAtlasApiError(entrega.error)
                  ? entrega.error.message
                  : "No se pudo leer el estado de la entrega."
              }
              requestId={
                isAtlasApiError(entrega.error)
                  ? entrega.error.requestId
                  : undefined
              }
              onRetry={() => void entrega.refetch()}
            />
          ) : null}
          {entrega.data ? <EstadoEntrega estado={entrega.data} /> : null}
        </Card>

        <Card className="p-5">
          <h2 className="mb-1 text-base font-semibold text-atlas-text">
            Desenlaces que agotaron reintentos
          </h2>
          <p className="mb-4 text-sm text-atlas-muted">
            Cada fila es una decisión de la que el Motor nunca supo el
            resultado. No se reintentan solos: hay que arreglar la causa y
            volver a entregar desde «Jobs de runtime».
          </p>
          {backlog.isLoading ? <LoadingSkeleton rows={3} /> : null}
          <DataTable
            data={pendientes}
            columns={columnasBacklog}
            emptyTitle="Ningún desenlace agotó sus reintentos."
            emptyDescription="El Motor está recibiendo las observaciones de cosecha."
          />
        </Card>
      </section>

      <ConfirmDialog
        open={confirmarBarrido}
        title="Recalificar toda la cartera"
        description="Recorre los clientes con deuda viva y recalifica cada operación y su ficha. Devuelve cuántos se calificaron y cuáles fallaron."
        confirmText="Ejecutar"
        isLoading={sweepRatings.isPending}
        onCancel={() => setConfirmarBarrido(false)}
        onConfirm={() =>
          void sweepRatings
            .mutateAsync(500)
            .finally(() => setConfirmarBarrido(false))
        }
      />
    </>
  );
}

function EstadoEntrega({
  estado,
}: Readonly<{ estado: OutcomeDeliveryStatus }>) {
  return (
    <div className="space-y-3">
      {!estado.configured ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Falta la credencial del plano de gestión del Motor
          (DECISION_ENGINE_OUTCOME_API_KEY): el job no puede entregar nada y
          la cola sólo crece.
        </p>
      ) : null}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Esperando entrega"
          value={formatNumber(estado.pending)}
          hint={
            estado.oldestPendingObservedAt
              ? `El más antiguo se observó el ${formatDateTime(estado.oldestPendingObservedAt)}`
              : "Nada en cola"
          }
          tone={estado.pending > 0 ? "info" : "default"}
        />
        <MetricCard
          label="Reintentando"
          value={formatNumber(estado.retrying)}
          hint={`Hasta ${formatNumber(estado.maxAttempts)} intentos`}
          tone={estado.retrying > 0 ? "warning" : "default"}
        />
        <MetricCard
          label="Agotados"
          value={formatNumber(estado.exhausted)}
          tone={estado.exhausted > 0 ? "critical" : "default"}
        />
        <MetricCard
          label="Entregados"
          value={formatNumber(estado.sent)}
          hint={
            estado.lastSentAt
              ? `Última entrega: ${formatDateTime(estado.lastSentAt)}`
              : "Todavía ninguna"
          }
          tone="success"
        />
      </div>
    </div>
  );
}

function EnlaceMotor() {
  const enlace = engineUrl("/decision-quality");
  if (!enlace) return null;
  return (
    <a
      href={enlace}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm font-medium text-atlas-accent underline"
    >
      Medir en el Motor <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  );
}
