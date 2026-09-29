"use client";

import { useMemo } from "react";
import { Gauge } from "lucide-react";
import { isAtlasApiError } from "@/shared/api/errors";
import { LOAN_RATING_ROLE_LIST } from "@/shared/auth/portal-roles";
import { RoleGate } from "@/shared/auth/role-gate";
import { DataTable } from "@/shared/components/data-table/data-table";
import { buildBacklogColumns, buildGradeColumns } from "./portfolio-columns";
import { EnlaceMotor, EstadoEntrega } from "./portfolio-delivery";
import { MetricCard } from "@/shared/components/layout/metric-card";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Card } from "@/shared/components/ui/card";
import { ErrorState, LoadingSkeleton } from "@/shared/components/ui/states";
import { formatAmount, formatNumber } from "@/shared/lib/format";
import { useAuth } from "@/shared/auth/auth-context";
import { OUTCOME_BACKLOG_ROLES } from "./access";
import {
  useExhaustedOutcomes,
  useOutcomeDeliveryStatus,
  usePortfolioSummary,
} from "./hooks";
import { PortfolioRerate } from "./portfolio-rerate";

/**
 * Calificación de cartera.
 *
 * Esta vista era «Riesgo y desenlaces»: seis botones de runbook, tres de los cuales eran la única
 * forma de que ocurrieran la mora, la entrega de desenlaces al Motor y la calificación. Lo que
 * quedaba en ella era de dos dueños distintos:
 *
 * - La **calificación** (categoría de riesgo y previsión de cada deuda y su titular) es contable y
 *   es de Atlas. Se queda, y además corre sola cada seis horas (`sweep_debt_ratings`); el botón
 *   sirve para adelantarse a un cierre. Los nombres de las tareas se quedan en este comentario:
 *   en pantalla se dice qué hacen, no cómo se llaman por dentro.
 * - Los **desenlaces** son la medida del acierto del Motor. Entregarlos es integración
 *   (`dispatch_loan_outcomes`, cada 15 minutos) y medirlos es del Motor (`/decision-quality`).
 *   Aquí sólo se enseña si la entrega va al día y se enlaza a donde se mide.
 */
export function PortfolioOperationsPage() {
  return (
    // El resumen lo sirve `CreditRatingOperationsController` a operación, riesgo, cumplimiento y
    // administración (LOAN_RATING_ROLES): con la lista del portal entero, QA, devops y el auditor
    // entraban y recibían un 403.
    <RoleGate roles={LOAN_RATING_ROLE_LIST}>
      <AuthorizedPortfolioPage />
    </RoleGate>
  );
}

function AuthorizedPortfolioPage() {
  const { hasAnyRole } = useAuth();
  const veBacklog = hasAnyRole(OUTCOME_BACKLOG_ROLES);
  const resumen = usePortfolioSummary();
  const entrega = useOutcomeDeliveryStatus();
  const backlog = useExhaustedOutcomes(100, veBacklog);

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
              emptyDescription="La calificación automática las califica cada seis horas con la política vigente; «Recalificar la cartera» la adelanta."
            />
          </Card>

          <PortfolioRerate />
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
            de la decisión. Una tarea automática revisa la mora cada hora y otra
            se los manda al Motor cada quince minutos. Lo que se mide con ellos
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
            volver a entregar desde Jobs › Ejecutar ahora.
          </p>
          {!veBacklog ? (
            <p className="text-sm text-atlas-muted">
              Esta lista sólo la ven Análisis de riesgo y Administración. El
              número de agotados de arriba sí es el de toda la cartera.
            </p>
          ) : null}
          {veBacklog && backlog.isLoading ? <LoadingSkeleton rows={3} /> : null}
          {backlog.error ? (
            <ErrorState
              description={
                isAtlasApiError(backlog.error)
                  ? backlog.error.message
                  : "No se pudo leer la lista de desenlaces agotados."
              }
              requestId={
                isAtlasApiError(backlog.error)
                  ? backlog.error.requestId
                  : undefined
              }
              onRetry={() => void backlog.refetch()}
            />
          ) : null}
          {backlog.data ? (
            <DataTable
              data={pendientes}
              columns={columnasBacklog}
              emptyTitle="Ningún desenlace agotó sus reintentos."
              emptyDescription="El Motor está recibiendo las observaciones de cosecha."
            />
          ) : null}
        </Card>
      </section>
    </>
  );
}
